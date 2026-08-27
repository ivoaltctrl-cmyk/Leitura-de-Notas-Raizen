import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { extractPendingFromImage, generateDemandMessage } from "./server/geminiService.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

// Local Data Storage Directory for Backend Persistence
const DATA_DIR = path.resolve(__dirname, "data");
const DB_FILE = path.resolve(DATA_DIR, "database.json");

// Ensure data folder and default database exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface AppDatabase {
  employees: any[];
  contracts: any[];
  areas: any[];
  trabalhistas: any[];
  demandLogs: any[];
  brandConfig: any;
  lastUpdated: string;
}

function readDb(): AppDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Erro ao ler database.json:", err);
  }
  return {
    employees: [],
    contracts: [],
    areas: [],
    trabalhistas: [],
    demandLogs: [],
    brandConfig: null,
    lastUpdated: new Date().toISOString(),
  };
}

function saveDb(db: Partial<AppDatabase>): AppDatabase {
  const current = readDb();
  const merged: AppDatabase = {
    employees: db.employees !== undefined ? db.employees : current.employees,
    contracts: db.contracts !== undefined ? db.contracts : current.contracts,
    areas: db.areas !== undefined ? db.areas : current.areas,
    trabalhistas: db.trabalhistas !== undefined ? db.trabalhistas : current.trabalhistas,
    demandLogs: db.demandLogs !== undefined ? db.demandLogs : current.demandLogs,
    brandConfig: db.brandConfig !== undefined ? db.brandConfig : current.brandConfig,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

// -------------------------------------------------------------
// Backend Persistence Endpoints (Sincronização Front <-> Back)
// -------------------------------------------------------------
app.get("/api/data", (_req, res) => {
  const db = readDb();
  res.json({ success: true, ...db });
});

app.post("/api/data", (req, res) => {
  try {
    const updated = saveDb(req.body);
    res.json({ success: true, lastUpdated: updated.lastUpdated });
  } catch (error: any) {
    console.error("Erro ao salvar dados no backend:", error);
    res.status(500).json({ error: error.message || "Erro ao salvar dados no backend" });
  }
});

// Update specific collection endpoint
app.post("/api/data/:collection", (req, res) => {
  try {
    const { collection } = req.params;
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Dados não fornecidos" });
    }
    const current = readDb();
    if (collection in current) {
      const updated = saveDb({ [collection]: data });
      return res.json({ success: true, collection, count: Array.isArray(data) ? data.length : 1, lastUpdated: updated.lastUpdated });
    }
    res.status(400).json({ error: `Coleção inválida: ${collection}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health Endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI OCR Scanning via Gemini
app.post("/api/scan-pending", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Imagem base64 não fornecida." });
    }
    const data = await extractPendingFromImage(imageBase64, mimeType);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Erro no OCR Gemini:", error);
    res.status(500).json({ error: error.message || "Erro ao processar imagem com IA" });
  }
});

// AI Demand Message Generation
app.post("/api/generate-demand-message", async (req, res) => {
  try {
    const data = await generateDemandMessage(req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Erro ao gerar mensagem de cobrança:", error);
    res.status(500).json({ error: error.message || "Erro ao gerar cobrança" });
  }
});

// Serve frontend in production
const distPath = path.resolve(__dirname, "dist");
app.use(express.static(distPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
