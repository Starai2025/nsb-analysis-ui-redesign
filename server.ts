import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import multer from "multer";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import Anthropic from "@anthropic-ai/sdk";
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

    if (slice.length > 50) {
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
// Build Claude message content from ingested document
// ---------------------------------------------------------------------------

function buildDocumentContent(
  buffer:   Buffer,
  mimetype: string,
  doc:      ExtractedDocument
): Anthropic.MessageParam["content"] {
  if (mimetype === "application/pdf") {
    // Send as base64 PDF document block — Claude reads it natively
    return [
      {
        type:   "document",
        source: {
          type:       "base64",
          media_type: "application/pdf",
          data:       buffer.toString("base64"),
        },
        title:       doc.name,
        cache_control: { type: "ephemeral" },
      } as any,
    ];
  }

  // DOCX: send structured page text
  const text = doc.pages?.map((p) => `[Page ${p.pageNumber}]\n${p.text}`).join("\n\n")
    ?? `Document: ${doc.name}`;

  return [{ type: "text", text: `Document: ${doc.name}\n\n${text}` }];
}

// ---------------------------------------------------------------------------
// Claude analysis — structured output via tool use
// ---------------------------------------------------------------------------

const ANALYSIS_TOOL: Anthropic.Tool = {
  name:        "submit_analysis",
  description: "Submit the structured contract change analysis result.",
  input_schema: {
    type: "object",
    properties: {
      executiveConclusion:     { type: "string", description: "2-3 sentence summary of the overall impact. Max 300 chars." },
      scopeStatus:             { type: "string", enum: ["In Scope", "Out of Scope"] },
      primaryResponsibility:   { type: "string", description: "Who bears primary responsibility. Max 100 chars." },
      secondaryResponsibility: { type: "string", description: "Secondary responsible party. Max 100 chars." },
      extraMoneyLikely:        { type: "boolean" },
      extraTimeLikely:         { type: "boolean" },
      claimableAmount:         { type: "string", description: "e.g. '$50,000' or 'Not specified'" },
      extraDays:               { type: "string", description: "e.g. '14 days' or 'Not specified'" },
      noticeDeadline:          { type: "string", description: "ISO 8601 date (YYYY-MM-DD) or 'Not specified'" },
      strategicRecommendation: { type: "string", description: "Recommended course of action. Max 500 chars." },
      keyRisks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title:       { type: "string", description: "Max 50 chars" },
            description: { type: "string", description: "Max 200 chars" },
          },
          required: ["title", "description"],
        },
        minItems: 1,
        maxItems: 6,
      },
    },
    required: [
      "executiveConclusion", "scopeStatus", "primaryResponsibility",
      "secondaryResponsibility", "extraMoneyLikely", "extraTimeLikely",
      "claimableAmount", "extraDays", "noticeDeadline",
      "strategicRecommendation", "keyRisks",
    ],
  },
};

const SYSTEM_PROMPT = `You are a senior construction contract manager with deep expertise in AIA A201, DBIA 540, and standard heavy civil contract forms.

Your task: analyze the provided contract and correspondence to determine the legal and financial impact of a proposed change.

Rules:
1. Be concise — no repetition, no padding.
2. Focus on legal and financial implications.
3. If a value cannot be determined from the documents, use "Not specified" — never hallucinate.
4. noticeDeadline must be a valid ISO 8601 date (YYYY-MM-DD) or "Not specified".
5. scopeStatus must be exactly "In Scope" or "Out of Scope".
6. Always call the submit_analysis tool with your findings — do not respond with plain text.`;

async function runAnalysis(
  contractBuffer:   Buffer,
  contractMime:     string,
  contractDoc:      ExtractedDocument,
  corrBuffer:       Buffer,
  corrMime:         string,
  corrDoc:          ExtractedDocument,
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server.");

  const client = new Anthropic({ apiKey });

  const contractContent  = buildDocumentContent(contractBuffer, contractMime,  contractDoc);
  const corrContent      = buildDocumentContent(corrBuffer,     corrMime,       corrDoc);

  const userContent: Anthropic.MessageParam["content"] = [
    ...(contractContent as any[]),
    ...(corrContent as any[]),
    {
      type: "text",
      text: "Analyze these documents and call submit_analysis with your findings.",
    },
  ];

  const response = await client.messages.create({
    model:      "claude-sonnet-4-5",
    max_tokens: 2048,
    system:     SYSTEM_PROMPT,
    tools:      [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "submit_analysis" },
    messages:   [{ role: "user", content: userContent }],
  });

  // Extract the tool use block
  const toolUse = response.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
  if (!toolUse) throw new Error("Claude did not call the submit_analysis tool.");

  const analysis = toolUse.input as any;

  // Validate required fields
  const required = ["executiveConclusion", "scopeStatus", "primaryResponsibility", "keyRisks"];
  for (const field of required) {
    if (!analysis[field]) throw new Error(`Analysis response missing required field: ${field}`);
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
        const files        = req.files as Record<string, Express.Multer.File[]>;
        const contractFile = files?.contract?.[0];
        const corrFile     = files?.correspondence?.[0];

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

        // Step 1: Ingest both documents
        const [contractDoc, correspondenceDoc] = await Promise.all([
          ingestDocument(contractFile.buffer, contractFile.mimetype, contractFile.originalname, "contract",       contractFile.size),
          ingestDocument(corrFile.buffer,     corrFile.mimetype,     corrFile.originalname,     "correspondence", corrFile.size),
        ]);

        // Step 2: Run Claude analysis
        console.log("Running Claude analysis...");
        const analysis = await runAnalysis(
          contractFile.buffer, contractFile.mimetype, contractDoc,
          corrFile.buffer,     corrFile.mimetype,     correspondenceDoc,
        );

        const projectData = {
          name:            String(req.body.projectName     || ""),
          contractNumber:  String(req.body.contractNumber  || ""),
          changeRequestId: String(req.body.changeRequestId || ""),
        };

        // Step 3: Persist metadata to server backup
        const contractDocMeta  = { ...contractDoc,      pages: undefined, chunks: undefined };
        const corrDocMeta      = { ...correspondenceDoc, pages: undefined, chunks: undefined };
        store = { analysis, projectData, contract: contractDocMeta, correspondence: corrDocMeta };
        await saveStore(store);

        console.log("Analysis complete.\n");

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
