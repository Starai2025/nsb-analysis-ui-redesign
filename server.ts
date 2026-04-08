import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import "dotenv/config";
import { IngestionStore } from "./src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const app = express();
  const PORT = 3000;

  // API Routes
  app.post("/api/save-analysis", express.json(), async (req, res) => {
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
