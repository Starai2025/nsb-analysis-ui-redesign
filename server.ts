import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import "dotenv/config";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { IngestionStore } from "./src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: "uploads/" });
const STORE_PATH = path.join(__dirname, "data-store.json");

// Persistent store for MVP
async function loadStore(): Promise<IngestionStore> {
  try {
    const data = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveStore(store: IngestionStore) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

let store: IngestionStore = {};
loadStore().then(s => store = s);

async function startServer() {
  // Ensure uploads directory exists
  try {
    await fs.mkdir("uploads", { recursive: true });
  } catch (e) {}

  const app = express();
  const PORT = 3000;

  // API Routes
  app.post("/api/save-analysis", express.json({ limit: '50mb' }), async (req, res) => {
    console.log("Save analysis request received");
    try {
      const { analysis, contract, correspondence } = req.body;
      store.analysis = analysis;
      if (contract) store.contract = contract;
      if (correspondence) store.correspondence = correspondence;
      await saveStore(store);
      console.log("Analysis saved successfully");
      res.json({ success: true });
    } catch (error) {
      console.error("Save error:", error);
      res.status(500).json({ error: "Failed to save analysis" });
    }
  });

  app.get("/api/store", (req, res) => {
    res.json(store);
  });

  app.post("/api/analyze", upload.fields([{ name: 'contract' }, { name: 'correspondence' }]), async (req, res) => {
    console.log("Backend analysis request received");
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.contract || !files.correspondence) {
      return res.status(400).json({ error: "Missing files" });
    }

    const contractFile = files.contract[0];
    const correspondenceFile = files.correspondence[0];

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");

      const genAI = new GoogleGenerativeAI(apiKey);
      const fileManager = new GoogleAIFileManager(apiKey);
      
      console.log("Uploading files to Gemini File API...");
      
      const [contractUpload, correspondenceUpload] = await Promise.all([
        fileManager.uploadFile(contractFile.path, { mimeType: contractFile.mimetype, displayName: contractFile.originalname }),
        fileManager.uploadFile(correspondenceFile.path, { mimeType: correspondenceFile.mimetype, displayName: correspondenceFile.originalname })
      ]);

      console.log("Files uploaded. Starting analysis...");

      const systemInstruction = `
        You are a senior construction contract manager. Your task is to analyze a contract and correspondence to determine the impact of a proposed change.
        
        CRITICAL: 
        1. Be concise. 
        2. Do NOT repeat yourself. 
        3. Do NOT generate long strings of numbers or IDs. 
        4. Focus on the legal and financial implications.
        
        You MUST return a valid JSON object following this schema:
        {
          "executiveConclusion": "string (max 300 chars)",
          "scopeStatus": "In Scope" | "Out of Scope",
          "primaryResponsibility": "string (max 100 chars)",
          "secondaryResponsibility": "string (max 100 chars)",
          "extraMoneyLikely": boolean,
          "extraTimeLikely": boolean,
          "claimableAmount": "string (e.g. $50,000)",
          "extraDays": "string (e.g. 14 days)",
          "noticeDeadline": "ISO date string",
          "strategicRecommendation": "string (max 500 chars)",
          "keyRisks": [
            { "title": "string (max 50 chars)", "description": "string (max 200 chars)" }
          ]
        }
        
        Return ONLY the JSON. No markdown, no preamble, no explanation.
      `;

      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction
      });

      const prompt = "Analyze the attached contract and correspondence and provide the decision summary JSON.";

      const result = await model.generateContent([
        { fileData: { fileUri: contractUpload.file.uri, mimeType: contractUpload.file.mimeType } },
        { fileData: { fileUri: correspondenceUpload.file.uri, mimeType: correspondenceUpload.file.mimeType } },
        { text: prompt }
      ]);

      const responseText = result.response.text();
      console.log("Analysis completed by Gemini");
      
      // Extract JSON from response
      const text = responseText.trim();
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      const jsonString = text.substring(firstBrace, lastBrace + 1);
      const analysis = JSON.parse(jsonString);

      // Cleanup temp files
      await Promise.all([
        fs.unlink(contractFile.path),
        fs.unlink(correspondenceFile.path)
      ]);

      res.json({ analysis });
    } catch (error) {
      console.error("Analysis error:", error);
      // Cleanup on error
      try {
        await Promise.all([
          fs.unlink(contractFile.path),
          fs.unlink(correspondenceFile.path)
        ]);
      } catch (e) {}
      
      res.status(500).json({ error: error instanceof Error ? error.message : "Analysis failed" });
    }
  });

  app.post("/api/generate-report", async (req, res) => {
    try {
      // Simulate backend processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      res.json({ success: true, reportId: `report-${Date.now()}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
