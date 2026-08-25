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

// Endpoint to extract receipt data using Gemini Vision
app.post('/api/extract-receipt', async (req, res) => {
  try {
    const { base64, mimeType } = req.body;

    if (!base64) {
      return res.status(400).json({ error: 'Base64 da imagem é obrigatório.' });
    }

    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const cleanMimeType = mimeType || 'image/jpeg';

    const ai = getGeminiClient();

    const prompt = `Você é um especialista em extração de dados de notas e ordens de abastecimento (comprovantes de combustível / O.S. / notas de abastecimento de aviação e veículos em aeroportos e postos).
Analise a imagem da nota de abastecimento fornecida e extraia exatamente as informações abaixo.
Se algum campo não for encontrado na imagem, retorne string vazia "" ou deduza com base no contexto visível.

Campos requeridos:
1. "numero": Número da nota / Ordem de Serviço / Nro OS (ex: "2293305" ou "123456")
2. "formaPagamento": Forma de pagamento (ex: "CONTRATO", "A VISTA", "FATURADO", "BOLETO", "CARTAO", "CREDITO", "CONVENIO")
3. "cliente": Razão social / Nome do cliente ou empresa atendida (ex: "ORBITAL SERV AUX TRANSP AEREO", "GOL", "LATAM", "AZUL", etc.)
4. "horaChegada": Horário de chegada do veículo/aeronave no formato HH:MM (ex: "07:13")
5. "inicioAbastecimento": Horário de início do abastecimento no formato HH:MM (ex: "07:14")
6. "produto": Tipo de combustível / produto (ex: "DIESEL", "DIESEL S10", "JET A-1", "GASOLINA", "AVGAS")
7. "volume": Quantidade / volume abastecido em Litros formatado com vírgula (ex: "224,00" ou "50,00")
8. "obs": Observações, prefixo, placa, equipamento ou número do caminhão/gerador/voo (ex: "GE135", "EQ-02", "PREFIXO PR-GUZ")
9. "assinaturaCliente": Nome e matrícula/documento de quem assinou ou recebeu (ex: "joanilson 304371" ou "Carlos Silva - 12948")
10. "confidenceNotes": Breve observação sobre a qualidade da leitura ou confiança dos campos.`;

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
            numero: { type: Type.STRING, description: 'Número do comprovante/OS' },
            formaPagamento: { type: Type.STRING, description: 'Forma de pagamento (CONTRATO, etc)' },
            cliente: { type: Type.STRING, description: 'Nome do cliente/empresa' },
            horaChegada: { type: Type.STRING, description: 'Hora da chegada HH:MM' },
            inicioAbastecimento: { type: Type.STRING, description: 'Início do abastecimento HH:MM' },
            produto: { type: Type.STRING, description: 'Produto/Combustível (DIESEL, JET A-1, etc)' },
            volume: { type: Type.STRING, description: 'Volume abastecido em litros (ex: 224,00)' },
            obs: { type: Type.STRING, description: 'Observações, placa, equipamento' },
            assinaturaCliente: { type: Type.STRING, description: 'Assinatura e matrícula do cliente' },
            confidenceNotes: { type: Type.STRING, description: 'Notas de confiança da leitura' },
          },
          required: [
            'numero',
            'formaPagamento',
            'cliente',
            'horaChegada',
            'inicioAbastecimento',
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
      return res.status(500).json({ error: 'Nenhuma resposta gerada pela IA.' });
    }

    const data = JSON.parse(text);
    res.json({ sucesso: true, dados: data });
  } catch (error: any) {
    console.error('Erro na extração de nota:', error);
    res.status(500).json({
      sucesso: false,
      error: error.message || 'Erro ao processar imagem da nota.',
    });
  }
});

// Endpoint proxy for Google Apps Script Web App (to prevent browser CORS errors)
app.post('/api/upload-drive-proxy', async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;

    if (!webhookUrl) {
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

    // Call user's Google Apps Script doPost endpoint
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = {
        sucesso: response.ok,
        mensagem: responseText || 'Resposta recebida do Google Apps Script',
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
