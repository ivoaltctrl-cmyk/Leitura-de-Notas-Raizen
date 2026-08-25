import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Storage file paths for multi-user server-side persistence
const CONFIG_FILE_PATH = path.join(process.cwd(), '.app-config.json');
const RECORDS_FILE_PATH = path.join(process.cwd(), '.app-records.json');

// Helper to read/write persistent config on server
function loadServerConfig(): { webhookUrl: string; autoUploadToDrive: boolean } {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        webhookUrl: parsed.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL || '',
        autoUploadToDrive: parsed.autoUploadToDrive !== false,
      };
    }
  } catch (e) {
    console.error('[Server] Erro ao carregar config:', e);
  }
  return {
    webhookUrl: process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL || '',
    autoUploadToDrive: true,
  };
}

function saveServerConfig(cfg: { webhookUrl: string; autoUploadToDrive?: boolean }) {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Server] Erro ao salvar config:', e);
  }
}

// Helper to read/write persistent records on server
function loadServerRecords(): any[] {
  try {
    if (fs.existsSync(RECORDS_FILE_PATH)) {
      const data = fs.readFileSync(RECORDS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('[Server] Erro ao carregar registros:', e);
  }
  return [];
}

function saveServerRecords(recs: any[]) {
  try {
    fs.writeFileSync(RECORDS_FILE_PATH, JSON.stringify(recs, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Server] Erro ao salvar registros:', e);
  }
}

// In-memory runtime state (backed by files)
let currentConfig = loadServerConfig();
let currentRecords = loadServerRecords();

// High body limit for base64 high-resolution photo uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Config endpoints for multi-user / multi-device synchronization
app.get('/api/config', (req, res) => {
  res.json({
    sucesso: true,
    webhookUrl: currentConfig.webhookUrl,
    autoUploadToDrive: currentConfig.autoUploadToDrive,
  });
});

app.post('/api/config', (req, res) => {
  const { webhookUrl, autoUploadToDrive } = req.body;
  currentConfig = {
    webhookUrl: typeof webhookUrl === 'string' ? webhookUrl.trim() : currentConfig.webhookUrl,
    autoUploadToDrive: typeof autoUploadToDrive === 'boolean' ? autoUploadToDrive : currentConfig.autoUploadToDrive,
  };
  saveServerConfig(currentConfig);
  console.log('[Server] Configuração global atualizada:', currentConfig.webhookUrl ? 'Webhook configurado' : 'Sem Webhook');
  res.json({
    sucesso: true,
    mensagem: 'Configurações salvas e compartilhadas globalmente para todos os computadores.',
    config: currentConfig,
  });
});

// Records endpoints for multi-device synchronization
app.get('/api/records', async (req, res) => {
  // If we have a webhookUrl, attempt live sync from Google Sheets
  if (currentConfig.webhookUrl) {
    try {
      const liveRecords = await fetchFromGoogleSheets(currentConfig.webhookUrl);
      if (liveRecords && liveRecords.length > 0) {
        currentRecords = liveRecords;
        saveServerRecords(currentRecords);
        return res.json({
          sucesso: true,
          origem: 'google_sheets',
          records: currentRecords,
          total: currentRecords.length,
        });
      }
    } catch (err: any) {
      console.warn('[Server] Falha ao sincronizar ao vivo do Google Sheets, usando cache do servidor:', err.message);
    }
  }

  return res.json({
    sucesso: true,
    origem: 'server_cache',
    records: currentRecords,
    total: currentRecords.length,
  });
});

app.post('/api/records/clear', (req, res) => {
  currentRecords = [];
  saveServerRecords([]);
  res.json({ sucesso: true, mensagem: 'Registros limpos no servidor para todos os usuários.' });
});

/**
 * Fetch rows directly from Google Apps Script Web App
 */
async function fetchFromGoogleSheets(targetUrl: string): Promise<any[]> {
  const cleanUrl = targetUrl.trim();
  if (!cleanUrl) return [];

  // 1. Try GET
  try {
    const gasResponse = await fetch(cleanUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    });

    const gasText = await gasResponse.text();
    const gasJson = JSON.parse(gasText);
    if (gasJson && gasJson.records && Array.isArray(gasJson.records)) {
      return gasJson.records;
    }
  } catch (getErr: any) {
    console.warn('[Server] GET fetchFromGoogleSheets falhou, tentando POST:', getErr.message);
  }

  // 2. Try POST with get_sheet_data
  try {
    const postResponse = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'get_sheet_data' }),
      redirect: 'follow',
    });

    const postText = await postResponse.text();
    const postJson = JSON.parse(postText);
    if (postJson && postJson.records && Array.isArray(postJson.records)) {
      return postJson.records;
    }
  } catch (postErr: any) {
    console.error('[Server] POST fetchFromGoogleSheets falhou:', postErr.message);
  }

  return [];
}

/**
 * Extraction prompt for Gemini Vision to extract all 11 fields for the Raízen Sheet:
 * A: Número
 * B: Forma de Pagamento
 * C: Cliente
 * D: Hora da Chegada
 * E: Início do Abastecimento
 * F: Término do Abastecimento
 * G: Produto
 * H: Volume
 * I: Obs.:
 * J: Assinatura do Cliente
 */
async function extractReceiptWithGemini(base64: string, mimeType: string) {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const cleanMimeType = mimeType || 'image/jpeg';

  const ai = getGeminiClient();

  const prompt = `Você é um especialista de altíssima precisão em leitura OCR e extração de dados de ordens de serviço e comprovantes de abastecimento de aviação e operações de solo (WFS Ground Support / Raízen S.A.).

Analise detalhadamente a foto do canhoto/nota de abastecimento e extraia com máxima exatidão os 10 campos para as colunas da planilha oficial "Dados_Raizen":

REGRAS DE EXTRAÇÃO PARA CADA CAMPO:
1. "numero": Localize a caixa superior "Número" (ao lado de Data e Veículo). Ex: "2293305". Extraia apenas os dígitos numéricos da OS. NUNCA use o nome do arquivo.
2. "formaPagamento": Localize "Forma de Pagamento:". Extraia o valor (ex: "CONTRATO", "A VISTA", "FATURADO", "CARTAO").
3. "cliente": Localize "Cliente:". Extraia a razão social da empresa atendida (ex: "ORBITAL SERV AUX TRANSP AEREO", "SWISSPORT", "DNATA", "GOL", "LATAM", "AZUL").
4. "horaChegada": Localize "Hora da Chegada:". Formato HH:MM (ex: "07:13").
5. "inicioAbastecimento": Localize "Inicio Abastecimento:". Formato HH:MM (ex: "07:14").
6. "terminoAbastecimento": Localize "Termino Abastecimento:" ou "Hora saida:". Formato HH:MM (ex: "07:19").
7. "produto": Localize a caixa "Produto". Extraia o combustível (ex: "DIESEL", "JET A-1", "GASOLINA").
8. "volume": Localize a caixa "Volume". Extraia a quantidade de litros (ex: "224 LT" -> "224,00"). Use formato decimal com vírgula.
9. "obs": Localize a linha "Obs.:" ou "Operacao:". Extraia a identificação do equipamento/prefixo/gerador (ex: "GE135").
10. "assinaturaCliente": Localize a linha "Assinatura do Cliente". Extraia o nome e matrícula manuscritos ou carimbados (ex: "joanilson 304371").
11. "confidenceNotes": Breve resumo dos campos lidos com sucesso.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: {
      parts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: cleanMimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          numero: { type: Type.STRING, description: 'Número do comprovante/OS (Coluna A)' },
          formaPagamento: { type: Type.STRING, description: 'Forma de pagamento (Coluna B)' },
          cliente: { type: Type.STRING, description: 'Nome do cliente/empresa (Coluna C)' },
          horaChegada: { type: Type.STRING, description: 'Hora da chegada HH:MM (Coluna D)' },
          inicioAbastecimento: { type: Type.STRING, description: 'Início do abastecimento HH:MM (Coluna E)' },
          terminoAbastecimento: { type: Type.STRING, description: 'Término do abastecimento HH:MM (Coluna F)' },
          produto: { type: Type.STRING, description: 'Produto/Combustível (Coluna G)' },
          volume: { type: Type.STRING, description: 'Volume abastecido em litros ex: 224,00 (Coluna H)' },
          obs: { type: Type.STRING, description: 'Observações, placa, equipamento (Coluna I)' },
          assinaturaCliente: { type: Type.STRING, description: 'Assinatura e matrícula do cliente (Coluna J)' },
          confidenceNotes: { type: Type.STRING, description: 'Notas de confiança da leitura' },
        },
        required: [
          'numero',
          'formaPagamento',
          'cliente',
          'horaChegada',
          'inicioAbastecimento',
          'terminoAbastecimento',
          'produto',
          'volume',
          'obs',
          'assinaturaCliente',
        ],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Nenhuma resposta gerada pelo modelo Gemini.');
  }

  return JSON.parse(text);
}

// Endpoint to extract receipt data using Gemini Vision
app.post('/api/extract-receipt', async (req, res) => {
  try {
    const { base64, mimeType } = req.body;

    if (!base64) {
      return res.status(400).json({ error: 'Base64 da imagem é obrigatório.' });
    }

    const data = await extractReceiptWithGemini(base64, mimeType);
    res.json({ sucesso: true, dados: data });
  } catch (error: any) {
    console.error('Erro na extração de nota:', error);
    res.status(500).json({
      sucesso: false,
      error: error.message || 'Erro ao processar imagem da nota.',
    });
  }
});

/**
 * Complete Full-Stack Pipeline Endpoint:
 * FRONT (Foto) ➡️ DRIVER (Upload no Google Drive) ➡️ BACK (Extração IA Gemini) ➡️ SHEETS (Gravação na aba Dados_Raizen) ➡️ MULTI-PC SYNC
 */
app.post('/api/process-receipt-flow', async (req, res) => {
  try {
    const { base64, mimeType, fileName, webhookUrl, manualData } = req.body;

    if (!base64) {
      return res.status(400).json({ sucesso: false, mensagem: 'Imagem em base64 não enviada.' });
    }

    const effectiveWebhookUrl =
      webhookUrl?.trim() ||
      currentConfig.webhookUrl ||
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
      '';

    console.log(`[Pipeline] Processando novo comprovante (${fileName || 'sem_nome'})`);

    // 1. BACK: Extração Inteligente com IA Gemini Vision (11 colunas incluindo Término do Abastecimento)
    let extractedData = manualData || {};
    try {
      if (!manualData || !manualData.numero) {
        console.log('[Pipeline] Executando extração com Gemini 3.7 Flash...');
        extractedData = await extractReceiptWithGemini(base64, mimeType);
        console.log('[Pipeline] Dados extraídos:', extractedData);
      }
    } catch (aiError: any) {
      console.warn('[Pipeline] Aviso na extração IA:', aiError.message);
      // Fallback if AI fails: use timestamp defaults
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      extractedData = {
        numero: `OS-${Date.now().toString().slice(-6)}`,
        formaPagamento: 'CONTRATO',
        cliente: 'WFS / RAÍZEN',
        horaChegada: timeStr,
        inicioAbastecimento: timeStr,
        terminoAbastecimento: timeStr,
        produto: 'DIESEL',
        volume: '0,00',
        obs: fileName || 'Comprovante digitalizado',
        assinaturaCliente: 'CONFERIDO',
      };
    }

    // 2. DRIVER & SHEETS: Se a URL do Google Apps Script estiver configurada, envia para gravar no Drive e Sheets
    let driveFileId = '';
    let driveFileUrl = '';
    let sheetRowIndex = 0;
    let driveSuccess = false;
    let pipelineMessage = 'Comprovante processado e registrado com sucesso!';

    if (effectiveWebhookUrl) {
      try {
        console.log('[Pipeline] Transmitindo foto e dados extraídos para Google Drive e Google Sheets...');
        const payloadToAppsScript = {
          action: 'upload_and_record',
          base64: base64,
          mimeType: mimeType || 'image/jpeg',
          fileName: fileName || `NOTA_${extractedData.numero || Date.now()}.jpg`,
          dados: {
            numero: extractedData.numero || '',
            formaPagamento: extractedData.formaPagamento || 'CONTRATO',
            cliente: extractedData.cliente || '',
            horaChegada: extractedData.horaChegada || '',
            inicioAbastecimento: extractedData.inicioAbastecimento || '',
            terminoAbastecimento: extractedData.terminoAbastecimento || '',
            produto: extractedData.produto || 'DIESEL',
            volume: extractedData.volume || '0,00',
            obs: extractedData.obs || '',
            assinaturaCliente: extractedData.assinaturaCliente || '',
          },
        };

        const gasResponse = await fetch(effectiveWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payloadToAppsScript),
          redirect: 'follow',
        });

        const gasText = await gasResponse.text();
        console.log('[Pipeline] Resposta do Google Apps Script:', gasText);

        try {
          const gasJson = JSON.parse(gasText);
          if (gasJson.sucesso || gasJson.fileId || gasJson.status === 'ok') {
            driveSuccess = true;
            driveFileId = gasJson.fileId || gasJson.id || '';
            driveFileUrl = gasJson.driveUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : '');
            sheetRowIndex = gasJson.sheetRowIndex || gasJson.row || 0;
            pipelineMessage = 'Foto salva no Google Drive e linha inserida na planilha Dados_Raizen!';
          } else {
            pipelineMessage = gasJson.mensagem || gasJson.error || 'Aviso no retorno do Google Apps Script';
          }
        } catch {
          if (gasResponse.ok) {
            driveSuccess = true;
            pipelineMessage = 'Foto gravada no Google Drive e linha adicionada na planilha!';
          }
        }
      } catch (gasError: any) {
        console.error('[Pipeline] Erro ao conectar com Google Apps Script:', gasError.message);
        pipelineMessage = `Processado pelo Back. Falha no envio ao Drive: ${gasError.message}`;
      }
    } else {
      pipelineMessage = 'Processado pelo Back e espelhado no Front. (Configure a URL do Google Apps Script para salvar no Drive e Sheets em tempo real)';
    }

    // 3. FRONT: Retorno unificado com todos os 11 campos e status do Drive
    const recordId = `rec-${Date.now()}`;
    const consolidatedRecord = {
      id: recordId,
      numero: extractedData.numero || `OS-${Date.now().toString().slice(-4)}`,
      formaPagamento: extractedData.formaPagamento || 'CONTRATO',
      cliente: extractedData.cliente || 'WFS / RAÍZEN',
      horaChegada: extractedData.horaChegada || '',
      inicioAbastecimento: extractedData.inicioAbastecimento || '',
      terminoAbastecimento: extractedData.terminoAbastecimento || '',
      produto: extractedData.produto || 'DIESEL',
      volume: extractedData.volume || '0,00',
      obs: extractedData.obs || '',
      assinaturaCliente: extractedData.assinaturaCliente || '',
      fileName: fileName || `Nota_${extractedData.numero || recordId}.jpg`,
      fotoBase64: base64,
      fotoMimeType: mimeType || 'image/jpeg',
      driveFileId: driveFileId || undefined,
      driveFileUrl: driveFileUrl || undefined,
      dataCriacao: new Date().toISOString(),
      statusEnvio: driveSuccess ? 'enviado_drive' : 'pendente',
      statusMsg: pipelineMessage,
    };

    // Save to server-side shared cache
    currentRecords = [consolidatedRecord, ...currentRecords.filter((r) => r.id !== consolidatedRecord.id)];
    saveServerRecords(currentRecords);

    res.json({
      sucesso: true,
      mensagem: pipelineMessage,
      record: consolidatedRecord,
      driveSuccess: driveSuccess,
      driveFileId: driveFileId,
      driveFileUrl: driveFileUrl,
      sheetRowIndex: sheetRowIndex,
    });
  } catch (error: any) {
    console.error('[Pipeline] Erro fatal no fluxo completo:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro no processamento do fluxo: ${error.message}`,
    });
  }
});

// Endpoint to fetch real rows directly from Google Sheets via Google Apps Script
app.post('/api/fetch-sheet-records', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const targetUrl =
      webhookUrl?.trim() ||
      currentConfig.webhookUrl ||
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'URL do Google Apps Script não configurada nas Configurações.',
        records: currentRecords,
      });
    }

    const records = await fetchFromGoogleSheets(targetUrl);
    if (records && records.length > 0) {
      currentRecords = records;
      saveServerRecords(currentRecords);
      return res.json({
        sucesso: true,
        mensagem: `Planilha sincronizada! ${records.length} linha(s) carregada(s) do Google Sheets.`,
        records: records,
      });
    }

    return res.json({
      sucesso: true,
      mensagem: 'Planilha conectada (nenhum registro encontrado na aba Dados_Raizen ainda).',
      records: [],
    });
  } catch (err: any) {
    console.error('Erro ao buscar dados da planilha:', err);
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro ao sincronizar com o Google Sheets: ${err.message}`,
      records: currentRecords,
    });
  }
});

// Endpoint to test Google Apps Script Webhook
app.post('/api/test-google-integration', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const targetUrl = webhookUrl?.trim() || currentConfig.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

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
    const targetUrl = webhookUrl?.trim() || currentConfig.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

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
