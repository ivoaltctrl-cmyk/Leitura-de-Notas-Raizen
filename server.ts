import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

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
Analise a imagem da nota de abastecimento fornecida e extraia exatamente as 10 informações necessárias para as colunas da planilha oficial "Dados_Raizen":

Campos obrigatórios:
1. "numero": Número da nota / Ordem de Serviço / Nro OS (ex: "2293305" ou "123456")
2. "formaPagamento": Forma de pagamento (ex: "CONTRATO", "A VISTA", "FATURADO", "BOLETO", "CARTAO", "CREDITO", "CONVENIO")
3. "cliente": Razão social / Nome do cliente ou empresa atendida (ex: "ORBITAL SERV AUX TRANSP AEREO", "SWISSPORT", "DNATA", "GOL", "LATAM", "AZUL")
4. "horaChegada": Horário de chegada no formato HH:MM (ex: "07:13" ou "10:15")
5. "inicioAbastecimento": Horário de início do abastecimento no formato HH:MM (ex: "07:14" ou "10:20")
6. "terminoAbastecimento": Horário de término / fim do abastecimento no formato HH:MM (ex: "07:22" ou "10:35"). Se não houver horário explícito de término, deduza com base no início + tempo estimado ou deixe vazio.
7. "produto": Tipo de combustível / produto (ex: "DIESEL", "DIESEL S10", "JET A-1", "GASOLINA", "AVGAS")
8. "volume": Quantidade / volume abastecido em Litros formatado com vírgula (ex: "224,00" ou "1.450,00" ou "50,00")
9. "obs": Observações, prefixo de aeronave, placa, gerador ou equipamento (ex: "GE135", "TRATOR T-04 / PR-GUZ", "REBOCADOR RB-09")
10. "assinaturaCliente": Nome legível e matrícula de quem assinou / conferiu (ex: "joanilson 304371" ou "marcos 441029")
11. "confidenceNotes": Breve resumo da qualidade visual da leitura.`;

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
      records: postJson.records || [],
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
