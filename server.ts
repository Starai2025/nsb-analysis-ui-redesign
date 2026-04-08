import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import multer from "multer";
import mammoth from "mammoth";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import { IngestionStore } from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORE_PATH = path.join(__dirname, "data-store.json");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ---------------------------------------------------------------------------
// Persistent store (file-based for Phase 1; replaced by IndexedDB in Phase 2)
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
// Document processing helpers
// ---------------------------------------------------------------------------

async function processFile(
  buffer: Buffer,
  mimetype: string,
  originalname: string
): Promise<{ inlineData?: { data: string; mimeType: string }; text?: string }> {
  if (mimetype === "application/pdf") {
    return { inlineData: { data: buffer.toString("base64"), mimeType: "application/pdf" } };
  }
  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return { text: `Document: ${originalname}\n\n${result.value}` };
  }
  throw new Error(`Unsupported file type: ${mimetype}`);
}

// ---------------------------------------------------------------------------
// Gemini analysis (server-side only — key never leaves the server)
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

  const ai = new GoogleGenAI({ apiKey });
  const prompt = "Analyze the contract and correspondence. Return the decision summary JSON.";

  const callGemini = (model: string) =>
    ai.models.generateContent({
      model,
      contents: { parts: [contractPart, correspondencePart, { text: prompt }] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
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
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Core analysis endpoint ─────────────────────────────────────────────────
  app.post(
    "/api/analyze",
    upload.fields([
      { name: "contract",       maxCount: 1 },
      { name: "correspondence", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as Record<string, Express.Multer.File[]>;
        const contractFile       = files?.contract?.[0];
        const correspondenceFile = files?.correspondence?.[0];

        if (!contractFile || !correspondenceFile) {
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
        if (!supported.includes(correspondenceFile.mimetype)) {
          res.status(400).json({ error: `Unsupported correspondence type: ${correspondenceFile.mimetype}` });
          return;
        }

        console.log(`Analyzing: "${contractFile.originalname}" + "${correspondenceFile.originalname}"`);

        const [contractPart, correspondencePart] = await Promise.all([
          processFile(contractFile.buffer, contractFile.mimetype, contractFile.originalname),
          processFile(correspondenceFile.buffer, correspondenceFile.mimetype, correspondenceFile.originalname),
        ]);

        const analysis = await runAnalysis(contractPart, correspondencePart);

        const projectData = {
          name:            String(req.body.projectName        || ""),
          contractNumber:  String(req.body.contractNumber     || ""),
          changeRequestId: String(req.body.changeRequestId    || ""),
        };

        const now = new Date().toISOString();
        const contractDoc = {
          id:   `doc-${Date.now()}`,
          name: contractFile.originalname,
          type: "contract" as const,
          metadata: { fileSize: contractFile.size, mimeType: contractFile.mimetype, uploadedAt: now },
        };
        const correspondenceDoc = {
          id:   `doc-${Date.now()}-corr`,
          name: correspondenceFile.originalname,
          type: "correspondence" as const,
          metadata: { fileSize: correspondenceFile.size, mimeType: correspondenceFile.mimetype, uploadedAt: now },
        };

        store = { analysis, projectData, contract: contractDoc, correspondence: correspondenceDoc };
        await saveStore(store);

        console.log("Analysis complete and saved.");
        res.json({ success: true, analysis, projectData });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed.";
        console.error("Analysis error:", message);
        res.status(500).json({ error: message });
      }
    }
  );

  // ── Patch analysis edits (from DecisionSummaryPage) ───────────────────────
  app.post("/api/save-analysis", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const { analysis, projectData } = req.body;
      if (analysis)    store.analysis    = analysis;
      if (projectData) store.projectData = projectData;
      await saveStore(store);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to save analysis." });
    }
  });

  // ── Read current store ─────────────────────────────────────────────────────
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
