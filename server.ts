import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// High body limit for base64 high-resolution photo uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Endpoint to fetch real rows directly from Google Sheets via Google Apps Script
app.post('/api/fetch-sheet-records', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const targetUrl =
      webhookUrl?.trim() ||
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'URL do Google Apps Script não configurada nas Configurações.',
        records: [],
      });
    }

    // 1. Try GET request first (standard Google Apps Script doGet)
    try {
      const gasResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'follow',
      });

      const gasText = await gasResponse.text();
      try {
        const gasJson = JSON.parse(gasText);
        if (gasJson.records && Array.isArray(gasJson.records)) {
          return res.json({
            sucesso: true,
            mensagem: gasJson.mensagem || `Planilha sincronizada (${gasJson.records.length} registros)`,
            records: gasJson.records,
          });
        }
        if (Array.isArray(gasJson)) {
          return res.json({
            sucesso: true,
            mensagem: `Planilha sincronizada (${gasJson.length} registros)`,
            records: gasJson,
          });
        }
      } catch {
        // Fall through to POST
      }
    } catch (getErr) {
      console.warn('GET request to Apps Script failed, falling back to POST:', getErr);
    }

    // 2. Fallback POST with action: 'get_sheet_data'
    const postResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'get_sheet_data' }),
      redirect: 'follow',
    });

    const postText = await postResponse.text();
    const postJson = JSON.parse(postText);

    return res.json({
      sucesso: postJson.sucesso !== false,
      mensagem: postJson.mensagem || 'Planilha sincronizada!',
      records: postJson.records || (Array.isArray(postJson) ? postJson : []),
    });
  } catch (err: any) {
    console.error('Erro ao buscar dados da planilha:', err);
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro ao sincronizar com o Google Sheets: ${err.message}`,
      records: [],
    });
  }
});

// Endpoint to test Google Apps Script Webhook
app.post('/api/test-google-integration', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const targetUrl = webhookUrl?.trim() || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'URL do Webhook do Google Apps Script não configurada.',
      });
    }

    const testPayload = {
      action: 'ping_test',
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(testPayload),
      redirect: 'follow',
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        responseData = {
          sucesso: true,
          mensagem: 'Conexão confirmada com sucesso com o Web App do Google Apps Script!',
        };
      } else {
        responseData = {
          sucesso: false,
          mensagem: `Google retornou status ${response.status}: ${responseText.slice(0, 150)}`,
        };
      }
    }

    const isSuccess = response.ok && (responseData?.sucesso !== false);

    res.json({
      sucesso: isSuccess,
      mensagem: responseData?.mensagem || (isSuccess ? 'Conexão confirmada com o Google Drive e Sheets!' : 'Falha na resposta do Google Apps Script.'),
      raw: responseData,
    });
  } catch (error: any) {
    console.error('Erro ao testar integração Google:', error);
    res.json({
      sucesso: false,
      mensagem: `Erro ao conectar com Google Apps Script: ${error.message || 'Verifique a URL informada'}`,
    });
  }
});

// Endpoint proxy for Direct Google Apps Script upload (Direct front -> Drive)
app.post('/api/upload-drive-proxy', async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;
    const targetUrl = webhookUrl?.trim() || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'URL do Webhook do Google Apps Script não informada.',
      });
    }

    if (!payload || !payload.base64) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Payload com imagem base64 é obrigatório.',
      });
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = {
        sucesso: response.ok,
        mensagem: response.ok ? 'Foto enviada para a pasta do Google Drive com sucesso!' : responseText,
      };
    }

    res.json(responseData);
  } catch (error: any) {
    console.error('Erro no proxy para o Google Apps Script:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro ao conectar com Google Apps Script: ${error.message}`,
    });
  }
});

// Start Vite server or serve static build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
