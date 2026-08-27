import type { IncomingMessage, ServerResponse } from "http";
import { extractPendingFromImage, generateDemandMessage } from "./geminiService.ts";

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Protect against overly huge uploads (15MB limit for images)
      if (body.length > 20 * 1024 * 1024) {
        reject(new Error("Arquivo muito grande (limite de 20MB)"));
      }
    });
    req.on("end", () => {
      try {
        if (!body) return resolve({});
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", (err) => reject(err));
  });
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  const url = req.url || "";

  if (!url.startsWith("/api/")) {
    return next();
  }

  // Health check
  if (url === "/api/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }

  // Scan screenshot / image endpoint
  if (url === "/api/scan-pending" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const { imageBase64, mimeType = "image/png" } = body;

      if (!imageBase64) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Imagem base64 não fornecida." }));
        return;
      }

      const extracted = await extractPendingFromImage(imageBase64, mimeType);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: extracted }));
    } catch (error: any) {
      console.error("Erro no OCR Gemini:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: error.message || "Erro ao processar imagem com IA",
        })
      );
    }
    return;
  }

  // Generate demand message
  if (url === "/api/generate-demand-message" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const result = await generateDemandMessage(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (error: any) {
      console.error("Erro ao gerar demanda:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: error.message || "Erro ao gerar mensagem de cobrança",
        })
      );
    }
    return;
  }

  // Not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint não encontrado" }));
}
