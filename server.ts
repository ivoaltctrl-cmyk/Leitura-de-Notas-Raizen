import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Global CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// High body limit for base64 high-resolution photo uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Persistent configuration storage (so all PCs, mobile devices, and incognito sessions share the same webhook URL and token)
const CONFIG_FILE_PATH = path.join(process.cwd(), 'app_config.json');

interface AppConfig {
  webhookUrl: string;
  autoUploadToDrive: boolean;
  sheetUrl?: string;
  secretToken?: string;
  updatedAt?: string;
}

let cachedConfig: AppConfig = {
  webhookUrl:
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbxjvAIKgEW0fVFRNL3x60Uyb7IVOnZ9Hxlik3BYrMu7IiE2lhykrDyKD0DYfkxwEW014w/exec',
  autoUploadToDrive: true,
  sheetUrl: '',
  secretToken: process.env.GOOGLE_APPS_SCRIPT_TOKEN || process.env.VITE_GOOGLE_APPS_SCRIPT_TOKEN || '',
};

// Load saved config on startup
try {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      cachedConfig = {
        ...cachedConfig,
        ...parsed,
      };
      console.log('[Config] Configuração carregada com sucesso do disco:', cachedConfig.webhookUrl ? cachedConfig.webhookUrl.slice(0, 45) + '...' : '(vazio)', cachedConfig.secretToken ? '(Token configurado)' : '(Sem token)');
    }
  }
} catch (e: any) {
  console.warn('[Config] Aviso ao ler app_config.json:', e.message);
}

function saveConfigToDisk(config: AppConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    console.log('[Config] Configuração salva em disco com sucesso.');
  } catch (e: any) {
    console.error('[Config] Erro ao salvar em disco:', e.message);
  }
}

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

// Config Endpoints (Shared across all devices, browsers and incognito sessions)
app.get('/api/config', (req, res) => {
  res.json({
    sucesso: true,
    config: {
      webhookUrl: cachedConfig.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL || '',
      autoUploadToDrive: cachedConfig.autoUploadToDrive ?? true,
      sheetUrl: cachedConfig.sheetUrl || '',
      secretToken: cachedConfig.secretToken || '',
      updatedAt: cachedConfig.updatedAt || new Date().toISOString(),
    },
  });
});

app.post('/api/config', (req, res) => {
  try {
    const { webhookUrl, autoUploadToDrive, sheetUrl, secretToken } = req.body || {};
    cachedConfig = {
      webhookUrl: typeof webhookUrl === 'string' ? webhookUrl.trim() : cachedConfig.webhookUrl,
      autoUploadToDrive: typeof autoUploadToDrive === 'boolean' ? autoUploadToDrive : cachedConfig.autoUploadToDrive,
      sheetUrl: typeof sheetUrl === 'string' ? sheetUrl.trim() : cachedConfig.sheetUrl,
      secretToken: typeof secretToken === 'string' ? secretToken.trim() : cachedConfig.secretToken || '',
      updatedAt: new Date().toISOString(),
    };
    saveConfigToDisk(cachedConfig);
    res.json({
      sucesso: true,
      mensagem: 'Configuração salva no servidor com sucesso para todos os usuários e dispositivos!',
      config: cachedConfig,
    });
  } catch (e: any) {
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro ao salvar configuração: ${e.message}`,
    });
  }
});

/**
 * Extraction prompt for Gemini Vision to extract all 11 fields for the Raízen Sheet:
 * A: Número
 * B: Forma de Pagamento
 * C: Cliente
 * D: Hora da Chegada
 * E: Início do Abastecimento
 * F: Término do Abastecimento (CRITICAL)
 * G: Produto
 * H: Volume
 * I: Obs.:
 * J: Assinatura do Cliente
 */
async function extractReceiptWithGemini(base64: string, mimeType: string) {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const cleanMimeType = mimeType || 'image/jpeg';

  const ai = getGeminiClient();

  const prompt = `Você é um especialista de alta precisão em leitura e extração de ordens de serviço e comprovantes de abastecimento de combustível e aviação (WFS / Raízen).
Analise a imagem da nota de abastecimento fornecida e extraia exatamente as informações necessárias para as colunas da planilha oficial "Dados_Raizen":

Campos obrigatórios:
1. "numero": Número da nota / Ordem de Serviço / Nro OS (ex: "2293305" ou "123456")
2. "dataAbastecimento": Data do abastecimento no formato DD/MM/AAAA (ex: "26/08/2026"). Se não houver ano explícito, use a data atual.
3. "formaPagamento": Forma de pagamento (ex: "CONTRATO", "A VISTA", "FATURADO", "BOLETO", "CARTAO", "CREDITO", "CONVENIO")
4. "cliente": Razão social / Nome do cliente ou empresa atendida (ex: "ORBITAL SERV AUX TRANSP AEREO", "SWISSPORT", "DNATA", "GOL", "LATAM", "AZUL")
5. "horaChegada": Horário de chegada no formato HH:MM (ex: "07:13" ou "10:15")
6. "inicioAbastecimento": Horário de início do abastecimento no formato HH:MM (ex: "07:14" ou "10:20")
7. "terminoAbastecimento": Horário de término / fim do abastecimento no formato HH:MM (ex: "07:22" ou "10:35"). Se não houver horário explícito de término, deduza com base no início + tempo estimado ou deixe vazio.
8. "produto": Tipo de combustível / produto (ex: "DIESEL", "DIESEL S10", "JET A-1", "GASOLINA", "AVGAS")
9. "volume": Quantidade / volume abastecido em Litros formatado com vírgula (ex: "224,00" ou "1.450,00" ou "50,00")
10. "obs": Observações, prefixo de aeronave, placa, gerador ou equipamento (ex: "GE135", "TRATOR T-04 / PR-GUZ", "REBOCADOR RB-09")
11. "assinaturaCliente": Nome legível e matrícula de quem assinou / conferiu (ex: "joanilson 304371" ou "marcos 441029")
12. "confidenceNotes": Breve resumo da qualidade visual da leitura.`;

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
          dataAbastecimento: { type: Type.STRING, description: 'Data do abastecimento formato DD/MM/AAAA (Coluna B)' },
          formaPagamento: { type: Type.STRING, description: 'Forma de pagamento (Coluna C)' },
          cliente: { type: Type.STRING, description: 'Nome do cliente/empresa (Coluna D)' },
          horaChegada: { type: Type.STRING, description: 'Hora da chegada HH:MM (Coluna E)' },
          inicioAbastecimento: { type: Type.STRING, description: 'Início do abastecimento HH:MM (Coluna F)' },
          terminoAbastecimento: { type: Type.STRING, description: 'Término do abastecimento HH:MM (Coluna G)' },
          produto: { type: Type.STRING, description: 'Produto/Combustível (Coluna H)' },
          volume: { type: Type.STRING, description: 'Volume abastecido em litros ex: 224,00 (Coluna I)' },
          obs: { type: Type.STRING, description: 'Observações, placa, equipamento (Coluna J)' },
          assinaturaCliente: { type: Type.STRING, description: 'Assinatura e matrícula do cliente (Coluna K)' },
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
 * FRONT (Foto) ➡️ DRIVER (Upload no Google Drive) ➡️ BACK (Extração IA Gemini) ➡️ SHEETS (Gravação na aba Dados_Raizen) ➡️ FRONT (Espelhamento)
 */
app.post('/api/process-receipt-flow', async (req, res) => {
  try {
    const { base64, mimeType, fileName, webhookUrl, manualData } = req.body;

    if (!base64) {
      return res.status(400).json({ sucesso: false, mensagem: 'Imagem em base64 não enviada.' });
    }

    const effectiveWebhookUrl =
      webhookUrl?.trim() ||
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
            dataAbastecimento: extractedData.dataAbastecimento || new Date().toLocaleDateString('pt-BR'),
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
          headers: { 'Content-Type': 'application/json' },
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

    // 3. FRONT: Retorno unificado com todos os campos e status do Drive
    const recordId = `rec-${Date.now()}`;
    const consolidatedRecord = {
      id: recordId,
      numero: extractedData.numero || `OS-${Date.now().toString().slice(-4)}`,
      dataAbastecimento: extractedData.dataAbastecimento || new Date().toLocaleDateString('pt-BR'),
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

// Helper to parse GViz JSON response from Google Sheets
function parseGVizResponse(text: string) {
  // GViz wraps JSON in google.visualization.Query.setResponse(...)
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
  if (!match || !match[1]) {
    throw new Error('Formato GViz inválido retornado pelo Google Sheets.');
  }
  const data = JSON.parse(match[1]);
  if (!data || !data.table || !data.table.rows) {
    return [];
  }

  const rows = data.table.rows;
  const cols = data.table.cols || [];
  const records: any[] = [];

  const colLabels = cols.map((c: any) => String(c?.label || '').toLowerCase());
  const hasDateCol = colLabels.some((l: string) => l.includes('data'));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.c) continue;
    const cells = row.c;

    const getVal = (idx: number): string => {
      if (!cells[idx]) return '';
      const cell = cells[idx];
      if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
      if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
      return '';
    };

    let colNumero = '';
    let colData = '';
    let colForma = '';
    let colCliente = '';
    let colChegada = '';
    let colInicio = '';
    let colTermino = '';
    let colProduto = '';
    let colVolume = '';
    let colObs = '';
    let colAssinatura = '';
    let colFoto = '';
    let colValorLitro = '';
    let colValorTotal = '';

    if (hasDateCol || cells.length >= 12) {
      colNumero = getVal(0);
      colData = getVal(1);
      colForma = getVal(2);
      colCliente = getVal(3);
      colChegada = getVal(4);
      colInicio = getVal(5);
      colTermino = getVal(6);
      colProduto = getVal(7);
      colVolume = getVal(8);
      colObs = getVal(9);
      colAssinatura = getVal(10);
      colFoto = getVal(11);
      colValorLitro = getVal(12);
      colValorTotal = getVal(13);
    } else {
      colNumero = getVal(0);
      colForma = getVal(1);
      colCliente = getVal(2);
      colChegada = getVal(3);
      colInicio = getVal(4);
      colTermino = getVal(5);
      colProduto = getVal(6);
      colVolume = getVal(7);
      colObs = getVal(8);
      colAssinatura = getVal(9);
      colFoto = getVal(10);
      colValorLitro = getVal(11);
      colValorTotal = getVal(12);
    }

    // Skip empty rows
    if (!colNumero && !colCliente && !colVolume && !colProduto) continue;
    // Skip header row if it matches column titles
    if (colNumero.toLowerCase() === 'número' || colNumero.toLowerCase() === 'numero' || colCliente.toLowerCase() === 'cliente') continue;

    records.push({
      id: `sheet-row-${i + 2}-${colNumero || i}`,
      numero: colNumero || `OS-${String(i + 1).padStart(4, '0')}`,
      dataAbastecimento: colData || '',
      formaPagamento: colForma || 'CONTRATO',
      cliente: colCliente || 'WFS / RAÍZEN',
      horaChegada: colChegada || '',
      inicioAbastecimento: colInicio || '',
      terminoAbastecimento: colTermino || '',
      produto: colProduto || 'DIESEL',
      volume: colVolume || '0,00',
      obs: colObs || '',
      assinaturaCliente: colAssinatura || '',
      driveFileUrl: colFoto || '',
      valorLitro: colValorLitro || '',
      valorTotal: colValorTotal || '',
      dataCriacao: new Date().toISOString(),
      statusEnvio: 'enviado_drive',
      statusMsg: 'Sincronizado da planilha Google Sheets',
    });
  }

  return records.reverse();
}

// Helper to parse CSV rows from Google Sheets
function parseCSVRows(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const records: any[] = [];
  const headerLine = lines[0].toLowerCase();
  const hasDateCol = headerLine.includes('data');

  // Skip header (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parser supporting quotes
    const cells: string[] = [];
    let insideQuote = false;
    let currentCell = '';

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if ((char === ',' || char === ';') && !insideQuote) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        cells.push(currentCell.trim());
      }
    }
    cells.push(currentCell.trim());

    const clean = (idx: number) => (cells[idx] || '').replace(/^["']|["']$/g, '').trim();

    let colNumero = '';
    let colData = '';
    let colForma = '';
    let colCliente = '';
    let colChegada = '';
    let colInicio = '';
    let colTermino = '';
    let colProduto = '';
    let colVolume = '';
    let colObs = '';
    let colAssinatura = '';
    let colFoto = '';
    let colValorLitro = '';
    let colValorTotal = '';

    if (hasDateCol || cells.length >= 12) {
      colNumero = clean(0);
      colData = clean(1);
      colForma = clean(2);
      colCliente = clean(3);
      colChegada = clean(4);
      colInicio = clean(5);
      colTermino = clean(6);
      colProduto = clean(7);
      colVolume = clean(8);
      colObs = clean(9);
      colAssinatura = clean(10);
      colFoto = clean(11);
      colValorLitro = clean(12);
      colValorTotal = clean(13);
    } else {
      colNumero = clean(0);
      colForma = clean(1);
      colCliente = clean(2);
      colChegada = clean(3);
      colInicio = clean(4);
      colTermino = clean(5);
      colProduto = clean(6);
      colVolume = clean(7);
      colObs = clean(8);
      colAssinatura = clean(9);
      colFoto = clean(10);
      colValorLitro = clean(11);
      colValorTotal = clean(12);
    }

    if (!colNumero && !colCliente && !colVolume) continue;

    records.push({
      id: `csv-row-${i + 1}-${colNumero || i}`,
      numero: colNumero || `OS-${String(i).padStart(4, '0')}`,
      dataAbastecimento: colData || '',
      formaPagamento: colForma || 'CONTRATO',
      cliente: colCliente || 'WFS / RAÍZEN',
      horaChegada: colChegada || '',
      inicioAbastecimento: colInicio || '',
      terminoAbastecimento: colTermino || '',
      produto: colProduto || 'DIESEL',
      volume: colVolume || '0,00',
      obs: colObs || '',
      assinaturaCliente: colAssinatura || '',
      driveFileUrl: colFoto || '',
      valorLitro: colValorLitro || '',
      valorTotal: colValorTotal || '',
      dataCriacao: new Date().toISOString(),
      statusEnvio: 'enviado_drive',
      statusMsg: 'Sincronizado via exportação da planilha',
    });
  }

  return records.reverse();
}

// Endpoint to fetch real rows directly from Google Sheets via Google Apps Script or Google Sheets URL
app.post('/api/fetch-sheet-records', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { webhookUrl, sheetUrl } = req.body;
    const targetWebhook =
      webhookUrl?.trim() ||
      cachedConfig.webhookUrl ||
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
      '';

    const targetSheet = sheetUrl?.trim() || cachedConfig.sheetUrl || '';

    // Check if user provided a direct Google Sheet URL in webhookUrl or sheetUrl
    const potentialSheetUrl = targetSheet || (targetWebhook.includes('docs.google.com/spreadsheets') ? targetWebhook : '');

    if (potentialSheetUrl) {
      const sheetIdMatch = potentialSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || potentialSheetUrl.match(/^([a-zA-Z0-9-_]{20,})$/);
      if (sheetIdMatch && sheetIdMatch[1]) {
        const sheetId = sheetIdMatch[1];
        console.log(`[Fetch Sheets] Consultando diretamente planilha ID: ${sheetId}...`);

        // Try GViz API with sheet=Dados_Raizen
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Dados_Raizen`;
          const gvizRes = await fetch(gvizUrl, { redirect: 'follow' });
          if (gvizRes.ok) {
            const gvizText = await gvizRes.text();
            if (gvizText.includes('google.visualization.Query.setResponse')) {
              const records = parseGVizResponse(gvizText);
              return res.json({
                sucesso: true,
                mensagem: `Planilha sincronizada diretamente via Google Sheets (${records.length} registros em Dados_Raizen)!`,
                records: records,
                origem: 'gviz_dados_raizen',
              });
            }
          }
        } catch (gvizErr) {
          console.warn('[Fetch Sheets] GViz Dados_Raizen falhou:', gvizErr);
        }

        // Try GViz without sheet param (first tab)
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
          const gvizRes = await fetch(gvizUrl, { redirect: 'follow' });
          if (gvizRes.ok) {
            const gvizText = await gvizRes.text();
            if (gvizText.includes('google.visualization.Query.setResponse')) {
              const records = parseGVizResponse(gvizText);
              return res.json({
                sucesso: true,
                mensagem: `Planilha sincronizada diretamente via Google Sheets (${records.length} registros)!`,
                records: records,
                origem: 'gviz_primeira_aba',
              });
            }
          }
        } catch (gvizErr2) {
          console.warn('[Fetch Sheets] GViz primeira aba falhou:', gvizErr2);
        }

        // Try CSV export fallback
        try {
          const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=Dados_Raizen`;
          const csvRes = await fetch(csvUrl, { redirect: 'follow' });
          if (csvRes.ok) {
            const csvText = await csvRes.text();
            if (!csvText.startsWith('<!DOCTYPE') && !csvText.startsWith('<html')) {
              const records = parseCSVRows(csvText);
              return res.json({
                sucesso: true,
                mensagem: `Planilha sincronizada via export CSV (${records.length} registros)!`,
                records: records,
                origem: 'csv_export',
              });
            }
          }
        } catch (csvErr) {
          console.warn('[Fetch Sheets] CSV export falhou:', csvErr);
        }
      }
    }

    if (!targetWebhook) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'URL do Google Apps Script ou Link da Planilha não configurada em Configurações.',
        records: [],
      });
    }

    console.log(`[Fetch Sheets] Consultando Google Apps Script Web App: ${targetWebhook.slice(0, 50)}...`);
    const { secretToken } = req.body;

    // 1. Try GET request first (Standard Google Apps Script doGet)
    try {
      const tokenParam = secretToken ? `&token=${encodeURIComponent(secretToken.trim())}` : '';
      const getUrl = targetWebhook.includes('?') 
        ? `${targetWebhook}&action=get_sheet_data${tokenParam}` 
        : `${targetWebhook}?action=get_sheet_data${tokenParam}`;
      const gasResponse = await fetch(getUrl, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain' },
        redirect: 'follow',
      });

      const gasText = await gasResponse.text();
      console.log(`[Fetch Sheets] Resposta GET do Apps Script (status ${gasResponse.status}):`, gasText.slice(0, 200));

      // Check if Apps Script returned HTML login or authorization error page
      if (gasText.includes('accounts.google.com') || gasText.includes('<!DOCTYPE html>') || gasText.includes('<html')) {
        return res.json({
          sucesso: false,
          mensagem: 'O Google Apps Script retornou uma página de autenticação. Na implantação do Apps Script, selecione: "Quem pode acessar: Qualquer pessoa" (Anyone) e gere uma nova versão da implantação.',
          records: [],
        });
      }

      try {
        const gasJson = JSON.parse(gasText);
        const recordsList = gasJson.records || gasJson.dados || gasJson.data || (Array.isArray(gasJson) ? gasJson : null);
        if (recordsList && Array.isArray(recordsList)) {
          // Standardize record format
          const formattedRecords = recordsList.map((r: any, idx: number) => ({
            id: r.id || `sheet-row-${idx + 1}`,
            numero: r.numero || r['Número'] || r.Numero || `OS-${String(idx + 1).padStart(4, '0')}`,
            dataAbastecimento: r.dataAbastecimento || r.data || r['Data do Abastecimento'] || r['Data'] || '',
            formaPagamento: r.formaPagamento || r['Forma de Pagamento'] || 'CONTRATO',
            cliente: r.cliente || r['Cliente'] || 'WFS / RAÍZEN',
            horaChegada: r.horaChegada || r['Hora da Chegada'] || '',
            inicioAbastecimento: r.inicioAbastecimento || r['Início do Abastecimento'] || r['Inicio do Abastecimento'] || '',
            terminoAbastecimento: r.terminoAbastecimento || r['Término do Abastecimento'] || r['Termino do Abastecimento'] || '',
            produto: r.produto || r['Produto'] || 'DIESEL',
            volume: r.volume || r['Volume'] || '0,00',
            obs: r.obs || r['Obs.:'] || r['Obs'] || '',
            assinaturaCliente: r.assinaturaCliente || r['Assinatura do Cliente'] || '',
            driveFileUrl: r.driveFileUrl || r.driveUrl || r.fileUrl || r['Foto da Nota'] || '',
            valorLitro: r.valorLitro || r['Valor/Litro'] || r['Valor Litro'] || '',
            valorTotal: r.valorTotal || r['Valor Total'] || r['Total (R$)'] || '',
            dataCriacao: r.dataCriacao || new Date().toISOString(),
            statusEnvio: 'enviado_drive',
            statusMsg: 'Sincronizado da planilha Dados_Raizen',
          }));

          return res.json({
            sucesso: true,
            mensagem: gasJson.mensagem || `Planilha sincronizada com sucesso! (${formattedRecords.length} lançamentos)`,
            records: formattedRecords,
          });
        }
      } catch (jsonErr) {
        console.warn('[Fetch Sheets] Resposta GET não é JSON válido:', jsonErr);
      }
    } catch (getErr: any) {
      console.warn('[Fetch Sheets] Erro no GET Apps Script:', getErr.message);
    }

    // 2. Try POST request with action: 'get_sheet_data'
    try {
      const postResponse = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'get_sheet_data' }),
        redirect: 'follow',
      });

      const postText = await postResponse.text();
      console.log(`[Fetch Sheets] Resposta POST do Apps Script (status ${postResponse.status}):`, postText.slice(0, 200));

      if (postText.includes('accounts.google.com') || postText.includes('<!DOCTYPE html>')) {
        return res.json({
          sucesso: false,
          mensagem: 'O Google Apps Script retornou uma página de autenticação. Na implantação do Apps Script, selecione: "Quem pode acessar: Qualquer pessoa" (Anyone).',
          records: [],
        });
      }

      try {
        const postJson = JSON.parse(postText);
        const recordsList = postJson.records || postJson.dados || postJson.data || (Array.isArray(postJson) ? postJson : null);
        if (recordsList && Array.isArray(recordsList)) {
          const formattedRecords = recordsList.map((r: any, idx: number) => ({
            id: r.id || `sheet-row-${idx + 1}`,
            numero: r.numero || r['Número'] || r.Numero || `OS-${String(idx + 1).padStart(4, '0')}`,
            dataAbastecimento: r.dataAbastecimento || r.data || r['Data do Abastecimento'] || r['Data'] || '',
            formaPagamento: r.formaPagamento || r['Forma de Pagamento'] || 'CONTRATO',
            cliente: r.cliente || r['Cliente'] || 'WFS / RAÍZEN',
            horaChegada: r.horaChegada || r['Hora da Chegada'] || '',
            inicioAbastecimento: r.inicioAbastecimento || r['Início do Abastecimento'] || r['Inicio do Abastecimento'] || '',
            terminoAbastecimento: r.terminoAbastecimento || r['Término do Abastecimento'] || r['Termino do Abastecimento'] || '',
            produto: r.produto || r['Produto'] || 'DIESEL',
            volume: r.volume || r['Volume'] || '0,00',
            obs: r.obs || r['Obs.:'] || r['Obs'] || '',
            assinaturaCliente: r.assinaturaCliente || r['Assinatura do Cliente'] || '',
            driveFileUrl: r.driveFileUrl || r.driveUrl || r.fileUrl || r['Foto da Nota'] || '',
            valorLitro: r.valorLitro || r['Valor/Litro'] || r['Valor Litro'] || '',
            valorTotal: r.valorTotal || r['Valor Total'] || r['Total (R$)'] || '',
            dataCriacao: r.dataCriacao || new Date().toISOString(),
            statusEnvio: 'enviado_drive',
            statusMsg: 'Sincronizado da planilha Dados_Raizen',
          }));

          return res.json({
            sucesso: true,
            mensagem: postJson.mensagem || `Planilha sincronizada (${formattedRecords.length} lançamentos)`,
            records: formattedRecords,
          });
        }
      } catch (parseErr) {
        console.warn('[Fetch Sheets] Resposta POST não é JSON:', parseErr);
      }
    } catch (postErr: any) {
      console.error('[Fetch Sheets] Erro no POST Apps Script:', postErr.message);
    }

    return res.json({
      sucesso: false,
      mensagem: 'Não foi possível carregar os registros do Google Sheets. Verifique se o código atualizado do Apps Script foi implantado na planilha como Web App (Qualquer pessoa) ou forneça o link da planilha.',
      records: [],
    });
  } catch (err: any) {
    console.error('Erro fatal ao buscar dados da planilha:', err);
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
    const { webhookUrl, secretToken } = req.body || {};
    const targetUrl = webhookUrl?.trim() || cachedConfig.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'URL do Webhook do Google Apps Script não configurada.',
      });
    }

    const effectiveToken = (secretToken || cachedConfig.secretToken || '').trim();

    const testPayload: any = {
      action: 'ping_test',
      timestamp: new Date().toISOString(),
    };
    if (effectiveToken) {
      testPayload.token = effectiveToken;
    }

    const separator = targetUrl.includes('?') ? '&' : '?';
    const testUrlWithToken = effectiveToken ? `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}` : targetUrl;

    const response = await fetch(testUrlWithToken, {
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

// Endpoint to trigger Google Apps Script AI Robot on-demand
app.post('/api/trigger-gas-processing', async (req, res) => {
  try {
    const { webhookUrl, secretToken } = req.body || {};
    const targetUrl = webhookUrl?.trim() || cachedConfig.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'URL do Google Apps Script não informada.',
      });
    }

    const effectiveToken = (secretToken || cachedConfig.secretToken || '').trim();
    const payload: any = {
      action: 'processar_agora',
      timestamp: new Date().toISOString(),
    };

    if (effectiveToken) {
      payload.token = effectiveToken;
    }

    const separator = targetUrl.includes('?') ? '&' : '?';
    const targetUrlWithToken = effectiveToken ? `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}` : targetUrl;

    console.log(`[Robô GAS] Acionando processamento sob demanda no Apps Script...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos para processar lote

    const response = await fetch(targetUrlWithToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const isSuccess = response.ok && responseData?.sucesso !== false;

    res.json({
      sucesso: isSuccess,
      mensagem: responseData?.mensagem || (isSuccess ? 'Robô executado com sucesso!' : 'Falha ao acionar robô.'),
      data: responseData,
    });
  } catch (error: any) {
    console.error('Erro ao acionar robô Apps Script:', error);
    res.json({
      sucesso: false,
      mensagem: `Erro ao acionar robô: ${error.message || 'Tempo limite esgotado'}`,
    });
  }
});

// Endpoint to update fuel price per liter and recalculate total value across date range and product
app.post('/api/update-fuel-prices', async (req, res) => {
  try {
    const { webhookUrl, secretToken, dataInicio, dataFim, produto, valorLitro } = req.body || {};
    const targetUrl = webhookUrl?.trim() || cachedConfig.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'URL do Google Apps Script não informada.',
      });
    }

    const valorLitroNum = typeof valorLitro === 'number' ? valorLitro : parseFloat(String(valorLitro || 0).replace(',', '.'));
    if (isNaN(valorLitroNum) || valorLitroNum < 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Valor do litro inválido.',
      });
    }

    const effectiveToken = (secretToken || cachedConfig.secretToken || '').trim();
    const payload: any = {
      action: 'update_fuel_prices',
      dataInicio: dataInicio || '',
      dataFim: dataFim || dataInicio || '',
      produto: produto || 'TODOS',
      valorLitro: valorLitroNum,
      timestamp: new Date().toISOString(),
    };

    if (effectiveToken) {
      payload.token = effectiveToken;
    }

    const separator = targetUrl.includes('?') ? '&' : '?';
    const targetUrlWithToken = effectiveToken ? `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}` : targetUrl;

    console.log(`[Update Prices] Enviando atualização de valor R$ ${valorLitroNum}/L para Apps Script (${payload.produto}, datas: ${payload.dataInicio || 'todas'} até ${payload.dataFim || 'todas'})...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(targetUrlWithToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const isSuccess = response.ok && responseData?.sucesso !== false;

    res.json({
      sucesso: isSuccess,
      mensagem: responseData?.mensagem || (isSuccess ? 'Valores atualizados na planilha com sucesso!' : 'Falha ao atualizar valores na planilha.'),
      totalAtualizados: responseData?.totalAtualizados,
      totalVolume: responseData?.totalVolume,
      totalFinanceiro: responseData?.totalFinanceiro,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar valores no Apps Script:', error);
    res.json({
      sucesso: false,
      mensagem: `Erro ao atualizar valores: ${error.message || 'Falha de comunicação'}`,
    });
  }
});

// Endpoint proxy for Direct Google Apps Script upload (Direct front -> Drive)
app.post('/api/upload-drive-proxy', async (req, res) => {
  try {
    const { webhookUrl, payload, secretToken } = req.body || {};
    const targetUrl = webhookUrl?.trim() || cachedConfig.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

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

    // Attach secret token if available in payload, body or server cached config
    const effectiveToken = (payload.token || secretToken || cachedConfig.secretToken || '').trim();
    if (effectiveToken) {
      payload.token = effectiveToken;
    }

    // Build target URL with token param as well for maximum compatibility
    const separator = targetUrl.includes('?') ? '&' : '?';
    const uploadUrlWithToken = effectiveToken ? `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}` : targetUrl;

    console.log(`[Upload Proxy] Enviando foto (${payload.fileName || 'sem_nome'}) para Google Apps Script com token: ${effectiveToken ? 'SIM' : 'NÃO'}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

    const response = await fetch(uploadUrlWithToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      if (responseText.includes('Acesso não autorizado') || responseText.includes('Token')) {
        responseData = {
          sucesso: false,
          mensagem: 'Acesso não autorizado pelo Google Apps Script. Verifique se o Token de Segurança está idêntico em Configurações e no script.',
        };
      } else {
        responseData = {
          sucesso: response.ok,
          mensagem: response.ok ? 'Foto enviada para a pasta do Google Drive com sucesso!' : responseText,
        };
      }
    }

    if (responseData && responseData.sucesso === false) {
      console.warn('[Upload Proxy] Resposta de insucesso do Apps Script:', responseData.mensagem);
    }

    res.json(responseData);
  } catch (error: any) {
    console.error('Erro no proxy para o Google Apps Script:', error);
    const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
    res.status(500).json({
      sucesso: false,
      mensagem: isTimeout 
        ? 'O envio demorou mais que o esperado (tempo limite). Verifique a conexão com o Google Apps Script.' 
        : `Erro ao conectar com Google Apps Script: ${error.message}`,
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
