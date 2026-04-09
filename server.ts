import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import multer from "multer";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import { IngestionStore, ExtractedDocument, ExtractedChunk, ExtractedPage, DocumentType } from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const STORE_PATH = path.join(__dirname, "data-store.json");
const upload     = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Disable the worker for server-side use
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = "";

// ---------------------------------------------------------------------------
// Persistent store (server-side backup — primary store is client IndexedDB)
// ---------------------------------------------------------------------------

async function loadStore(): Promise<IngestionStore> {
  try {
    const data = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveStore(store: IngestionStore) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

let store: IngestionStore = {};
loadStore().then((s) => (store = s));

// ---------------------------------------------------------------------------
// Chunking helpers
// ---------------------------------------------------------------------------

const CHUNK_SIZE    = 2000;  // ~500 tokens
const CHUNK_OVERLAP = 400;   // ~100 tokens
const MAX_CHUNKS    = 200;

function chunkText(
  text: string,
  sourceId: string,
  pageNumber?: number
): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = [];
  let index = 0;
  let pos   = 0;

  while (pos < text.length && chunks.length < MAX_CHUNKS) {
    const end   = Math.min(pos + CHUNK_SIZE, text.length);
    const slice = text.slice(pos, end).trim();

    if (slice.length > 50) {                    // skip trivially short chunks
      chunks.push({
        id:         `${sourceId}-chunk-${index}`,
        text:       slice,
        pageNumber,
        sourceId,
        charStart:  pos,
        charEnd:    end,
      });
      index++;
    }

    if (end === text.length) break;
    pos += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Document ingestion
// ---------------------------------------------------------------------------

async function ingestPDF(
  buffer: Buffer,
  docId: string
): Promise<{ pages: ExtractedPage[]; chunks: ExtractedChunk[] }> {
  const pages:  ExtractedPage[]  = [];
  const chunks: ExtractedChunk[] = [];

  try {
    const uint8 = new Uint8Array(buffer);
    const pdf   = await (pdfjsLib as any).getDocument({ data: uint8, disableFontFace: true, verbosity: 0 }).promise;

    for (let p = 1; p <= pdf.numPages; p++) {
      try {
        const page    = await pdf.getPage(p);
        const content = await page.getTextContent();
        const text    = content.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > 0) {
          pages.push({ pageNumber: p, text });
          const pageChunks = chunkText(text, docId, p);
          for (const c of pageChunks) {
            if (chunks.length < MAX_CHUNKS) chunks.push(c);
          }
        }
      } catch (pageErr) {
        console.warn(`Could not extract page ${p}:`, pageErr);
      }
    }
  } catch (err) {
    console.warn("PDF extraction failed (possibly encrypted/image-only):", err);
    // Return empty — analysis will still work via base64
  }

  return { pages, chunks };
}

async function ingestDOCX(
  buffer: Buffer,
  docId: string
): Promise<{ pages: ExtractedPage[]; chunks: ExtractedChunk[] }> {
  const pages:  ExtractedPage[]  = [];
  const chunks: ExtractedChunk[] = [];

  try {
    const result    = await mammoth.extractRawText({ buffer });
    const fullText  = result.value;

    // Approximate page breaks: split on double newlines, group ~3000 chars per page
    const PAGE_SIZE = 3000;
    let pageNumber  = 1;
    let pos         = 0;

    while (pos < fullText.length) {
      const end  = Math.min(pos + PAGE_SIZE, fullText.length);
      const text = fullText.slice(pos, end).trim();

      if (text.length > 0) {
        pages.push({ pageNumber, text });
        const pageChunks = chunkText(text, docId, pageNumber);
        for (const c of pageChunks) {
          if (chunks.length < MAX_CHUNKS) chunks.push(c);
        }
        pageNumber++;
      }

      pos += PAGE_SIZE;
    }
  } catch (err) {
    console.warn("DOCX extraction failed:", err);
  }

  return { pages, chunks };
}

async function ingestDocument(
  buffer:       Buffer,
  mimetype:     string,
  originalname: string,
  type:         DocumentType,
  fileSize:     number
): Promise<ExtractedDocument> {
  const id  = `doc-${Date.now()}-${type}`;
  const now = new Date().toISOString();

  let pages:  ExtractedPage[]  = [];
  let chunks: ExtractedChunk[] = [];

  if (mimetype === "application/pdf") {
    ({ pages, chunks } = await ingestPDF(buffer, id));
  } else if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    ({ pages, chunks } = await ingestDOCX(buffer, id));
  }

  console.log(`  Ingested "${originalname}": ${pages.length} pages, ${chunks.length} chunks`);

  return {
    id,
    name: originalname,
    type,
    pages,
    chunks,
    metadata: { fileSize, mimeType: mimetype, uploadedAt: now },
  };
}

// ---------------------------------------------------------------------------
// Gemini part builder — uses extracted text for DOCX, base64 for PDF
// ---------------------------------------------------------------------------

async function buildGeminiPart(
  buffer:   Buffer,
  mimetype: string,
  doc:      ExtractedDocument
): Promise<{ inlineData?: { data: string; mimeType: string }; text?: string }> {
  if (mimetype === "application/pdf") {
    // Use base64 for Gemini vision — most accurate for PDFs
    return { inlineData: { data: buffer.toString("base64"), mimeType: "application/pdf" } };
  }
  // For DOCX, build a structured text representation from extracted pages
  const text = doc.pages?.map(p => `[Page ${p.pageNumber}]\n${p.text}`).join("\n\n")
    ?? `Document: ${doc.name}`;
  return { text: `Document: ${doc.name}\n\n${text}` };
}

// ---------------------------------------------------------------------------
// Gemini analysis
// ---------------------------------------------------------------------------

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    executiveConclusion:     { type: Type.STRING },
    scopeStatus:             { type: Type.STRING },
    primaryResponsibility:   { type: Type.STRING },
    secondaryResponsibility: { type: Type.STRING },
    extraMoneyLikely:        { type: Type.BOOLEAN },
    extraTimeLikely:         { type: Type.BOOLEAN },
    claimableAmount:         { type: Type.STRING },
    extraDays:               { type: Type.STRING },
    noticeDeadline:          { type: Type.STRING },
    strategicRecommendation: { type: Type.STRING },
    keyRisks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title:       { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["title", "description"],
      },
    },
  },
  required: [
    "executiveConclusion", "scopeStatus", "primaryResponsibility",
    "secondaryResponsibility", "extraMoneyLikely", "extraTimeLikely",
    "claimableAmount", "extraDays", "noticeDeadline",
    "strategicRecommendation", "keyRisks",
  ],
};

const SYSTEM_INSTRUCTION = `
You are a senior construction contract manager with expertise in AIA A201, DBIA 540,
and standard heavy civil contract forms.

Your task: analyze the provided contract and correspondence to determine the impact
of a proposed change.

Rules:
1. Be concise — no repetition, no padding.
2. Do not generate long ID strings or numbers.
3. Focus on legal and financial implications.
4. If a value cannot be determined from the documents, use "Not specified" — never hallucinate.
5. noticeDeadline must be a valid ISO 8601 date string (YYYY-MM-DD) or "Not specified".
6. scopeStatus must be exactly "In Scope" or "Out of Scope".

Return ONLY valid JSON matching the schema. No markdown, no preamble.
`.trim();

async function runAnalysis(contractPart: any, correspondencePart: any): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the server.");

  const ai     = new GoogleGenAI({ apiKey });
  const prompt = "Analyze the contract and correspondence. Return the decision summary JSON.";

  const callGemini = (model: string) =>
    ai.models.generateContent({
      model,
      contents: { parts: [contractPart, correspondencePart, { text: prompt }] },
      config: {
        systemInstruction:  SYSTEM_INSTRUCTION,
        responseMimeType:   "application/json",
        responseSchema:     RESPONSE_SCHEMA,
        temperature:        0.1,
      },
    });

  let response;
  try {
    response = await callGemini("gemini-2.0-flash");
  } catch (err) {
    console.warn("Flash model failed, falling back to gemini-1.5-pro:", err);
    response = await callGemini("gemini-1.5-pro");
  }

  const text = response.text?.trim();
  if (!text) throw new Error("Empty response from Gemini.");

  const first = text.indexOf("{");
  const last  = text.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON object in Gemini response.");

  const analysis = JSON.parse(text.substring(first, last + 1));

  const required = ["executiveConclusion", "scopeStatus", "primaryResponsibility", "keyRisks"];
  for (const field of required) {
    if (analysis[field] === undefined || analysis[field] === null) {
      throw new Error(`Gemini response missing required field: ${field}`);
    }
  }

  return analysis;
}

// ---------------------------------------------------------------------------
// Express server
// ---------------------------------------------------------------------------

async function startServer() {
  const app  = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Core: ingest + analyze ─────────────────────────────────────────────────
  app.post(
    "/api/analyze",
    upload.fields([
      { name: "contract",       maxCount: 1 },
      { name: "correspondence", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files          = req.files as Record<string, Express.Multer.File[]>;
        const contractFile   = files?.contract?.[0];
        const corrFile       = files?.correspondence?.[0];

        if (!contractFile || !corrFile) {
          res.status(400).json({ error: "Both 'contract' and 'correspondence' files are required." });
          return;
        }

        const supported = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (!supported.includes(contractFile.mimetype)) {
          res.status(400).json({ error: `Unsupported contract type: ${contractFile.mimetype}` });
          return;
        }
        if (!supported.includes(corrFile.mimetype)) {
          res.status(400).json({ error: `Unsupported correspondence type: ${corrFile.mimetype}` });
          return;
        }

        console.log(`\nIngesting: "${contractFile.originalname}" + "${corrFile.originalname}"`);

        // Step 1: Ingest both documents (extract pages + chunks)
        const [contractDoc, correspondenceDoc] = await Promise.all([
          ingestDocument(contractFile.buffer, contractFile.mimetype, contractFile.originalname, "contract",      contractFile.size),
          ingestDocument(corrFile.buffer,     corrFile.mimetype,     corrFile.originalname,     "correspondence", corrFile.size),
        ]);

        // Step 2: Build Gemini parts from ingested docs
        const [contractPart, correspondencePart] = await Promise.all([
          buildGeminiPart(contractFile.buffer, contractFile.mimetype, contractDoc),
          buildGeminiPart(corrFile.buffer,     corrFile.mimetype,     correspondenceDoc),
        ]);

        // Step 3: Run analysis
        console.log("Running Gemini analysis...");
        const analysis = await runAnalysis(contractPart, correspondencePart);

        const projectData = {
          name:            String(req.body.projectName     || ""),
          contractNumber:  String(req.body.contractNumber  || ""),
          changeRequestId: String(req.body.changeRequestId || ""),
        };

        // Step 4: Persist to server backup store (without large page text to keep file small)
        const contractDocMeta  = { ...contractDoc,      pages: undefined, chunks: undefined };
        const corrDocMeta      = { ...correspondenceDoc, pages: undefined, chunks: undefined };
        store = { analysis, projectData, contract: contractDocMeta, correspondence: corrDocMeta };
        await saveStore(store);

        console.log("Analysis complete.\n");

        // Step 5: Return full ingested docs to client for IndexedDB storage
        res.json({
          success:        true,
          analysis,
          projectData,
          contract:       contractDoc,
          correspondence: correspondenceDoc,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed.";
        console.error("Analysis error:", message);
        res.status(500).json({ error: message });
      }
    }
  );

  // ── Patch edits from DecisionSummaryPage ───────────────────────────────────
  app.post("/api/save-analysis", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const { analysis, projectData } = req.body;
      if (analysis)    store.analysis    = analysis;
      if (projectData) store.projectData = projectData;
      await saveStore(store);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to save analysis." });
    }
  });

  // ── Read backup store ──────────────────────────────────────────────────────
  app.get("/api/store", (_req, res) => {
    res.json(store);
  });

  // ── Vite / static ──────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    try {
      await fs.access(distPath);
      app.use(express.static(distPath));
      app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
    } catch {
      console.warn("Dist not found — falling back to Vite middleware.");
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      app.use(vite.middlewares);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV ?? "development"})`);
  });
}

startServer().catch((err) => {
  console.error("CRITICAL SERVER ERROR:", err);
  process.exit(1);
});
