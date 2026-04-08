import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs/promises";
import "dotenv/config";
import { IngestionStore, DocumentType } from "./src/types";
import { GoogleGenAI, Type } from "@google/genai";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORE_PATH = path.join(__dirname, "data-store.json");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
  const app = express();
  const PORT = 3000;

  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.post("/api/analyze", upload.fields([
    { name: 'contract', maxCount: 1 },
    { name: 'correspondence', maxCount: 1 }
  ]), async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.contract || !files.correspondence) {
      return res.status(400).json({ error: "Missing contract or correspondence file" });
    }

    const contractFile = files.contract[0];
    const correspondenceFile = files.correspondence[0];

    try {
      // 1. Run analysis with gemini-3-flash-preview using inlineData
      const prompt = `
        You are a senior construction contract manager. Analyze the following contract and correspondence.
        
        Provide a decision summary in JSON format with the following fields:
        - executiveConclusion (string, max 3 sentences)
        - scopeStatus (string, e.g., "In Scope", "Out of Scope")
        - primaryResponsibility (string)
        - secondaryResponsibility (string)
        - extraMoneyLikely (boolean)
        - extraTimeLikely (boolean)
        - claimableAmount (string)
        - extraDays (string)
        - noticeDeadline (string, ISO date)
        - strategicRecommendation (string)
        - keyRisks (array of { title: string, description: string })
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { data: contractFile.buffer.toString('base64'), mimeType: contractFile.mimetype || 'application/pdf' } },
              { inlineData: { data: correspondenceFile.buffer.toString('base64'), mimeType: correspondenceFile.mimetype || 'application/pdf' } },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveConclusion: { type: Type.STRING },
              scopeStatus: { type: Type.STRING },
              primaryResponsibility: { type: Type.STRING },
              secondaryResponsibility: { type: Type.STRING },
              extraMoneyLikely: { type: Type.BOOLEAN },
              extraTimeLikely: { type: Type.BOOLEAN },
              claimableAmount: { type: Type.STRING },
              extraDays: { type: Type.STRING },
              noticeDeadline: { type: Type.STRING },
              strategicRecommendation: { type: Type.STRING },
              keyRisks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const analysis = JSON.parse(result.text);

      // 2. Update store
      store.analysis = analysis;
      store.contract = {
        id: `doc-${Date.now()}`,
        name: contractFile.originalname,
        type: 'contract',
        metadata: { fileSize: contractFile.size, mimeType: contractFile.mimetype, uploadedAt: new Date().toISOString() }
      };
      store.correspondence = {
        id: `doc-${Date.now()}-corr`,
        name: correspondenceFile.originalname,
        type: 'correspondence',
        metadata: { fileSize: correspondenceFile.size, mimeType: correspondenceFile.mimetype, uploadedAt: new Date().toISOString() }
      };

      await saveStore(store);

      res.json({ success: true, analysis });
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze documents" });
    }
  });

  app.post("/api/save-analysis", express.json(), async (req, res) => {
    try {
      const { analysis, contract, correspondence } = req.body;
      store.analysis = analysis;
      if (contract) store.contract = contract;
      if (correspondence) store.correspondence = correspondence;
      await saveStore(store);
      res.json({ success: true });
    } catch (error) {
      console.error("Save error:", error);
      res.status(500).json({ error: "Failed to save analysis" });
    }
  });

  app.get("/api/store", (req, res) => {
    res.json(store);
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
