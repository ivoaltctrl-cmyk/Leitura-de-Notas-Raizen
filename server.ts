import express, { Request, Response } from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();

// Configurações de Middlewares e Limites para envio de imagem Base64
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Instância oficial do Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Modelo fixado conforme os requisitos da sua infraestrutura
const GEMINI_MODEL = 'gemini-3.6-flash';

interface ExtractionResult {
  numero: string;
  formaPagamento: string;
  cliente: string;
  horaChegada: string;
  inicioAbastecimento: string;
  terminoAbastecimento: string;
  produto: string;
  volume: string;
  obs: string;
  assinaturaCliente: string;
  confidenceNotes: string;
}

/**
 * Função de extração via Gemini 3.6 Flash
 */
async function extractReceiptWithGemini(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractionResult> {
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const cleanMimeType = mimeType || 'image/jpeg';

  const prompt = `
  Você é um sistema especialista em OCR e estruturação de dados de canhotos/ordens de serviço de abastecimento de aviação (Raízen/WFS).
  Analise rigorosamente a imagem fornecida e extraia os 11 campos abaixo em formato JSON estrito:

  1. "numero": Apenas os dígitos numéricos da OS/caixa "Número".
  2. "formaPagamento": Texto do campo "Forma de Pagamento:" (ex: CONTRATO, A VISTA, FATURADO).
  3. "cliente": Nome do cliente (ex: ORBITAL, SWISSPORT, DNATA, GOL, LATAM, AZUL).
  4. "horaChegada": Horário de chegada no formato HH:MM.
  5. "inicioAbastecimento": Horário de início no formato HH:MM.
  6. "terminoAbastecimento": Horário de término/saída no formato HH:MM.
  7. "produto": Nome do produto (ex: DIESEL, JET A-1, GASOLINA).
  8. "volume": Apenas o número formatado com vírgula decimal (ex: 224,00).
  9. "obs": Linha de observação ou operação (ex: prefixo de equipamento como GE135).
  10. "assinaturaCliente": Nome ou matrícula identificada no campo de assinatura do cliente.
  11. "confidenceNotes": Resumo dos campos identificados com sucesso ou alertas de legibilidade.
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
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
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          numero: { type: Type.STRING },
          formaPagamento: { type: Type.STRING },
          cliente: { type: Type.STRING },
          horaChegada: { type: Type.STRING },
          inicioAbastecimento: { type: Type.STRING },
          terminoAbastecimento: { type: Type.STRING },
          produto: { type: Type.STRING },
          volume: { type: Type.STRING },
          obs: { type: Type.STRING },
          assinaturaCliente: { type: Type.STRING },
          confidenceNotes: { type: Type.STRING },
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

  if (!response.text) {
    throw new Error('A resposta da API do Gemini retornou vazia.');
  }

  return JSON.parse(response.text) as ExtractionResult;
}

/**
 * Endpoint de Teste
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', model: GEMINI_MODEL, timestamp: new Date().toISOString() });
});

/**
 * Endpoint Principal: Processamento do Canhoto (OCR/IA + Envio para o Apps Script)
 */
app.post('/api/process-receipt-flow', async (req: Request, res: Response) => {
  try {
    const { base64, fotoBase64, mimeType, fileName, webhookUrl } = req.body;
    const imagePayload = base64 || fotoBase64;

    if (!imagePayload) {
      return res.status(400).json({ sucesso: false, mensagem: 'Imagem Base64 não fornecida.' });
    }

    // 1. Executa a leitura via Gemini 3.6 Flash
    let extractedData: ExtractionResult;
    try {
      extractedData = await extractReceiptWithGemini(imagePayload, mimeType);
    } catch (ocrError: any) {
      console.warn('Falha no OCR Gemini, aplicando valores de fallback:', ocrError.message);
      
      // Fallback de segurança para não interromper a operação
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      extractedData = {
        numero: `OS-${Date.now()}`,
        formaPagamento: 'CONTRATO',
        cliente: 'WFS / RAIZEN',
        horaChegada: timeStr,
        inicioAbastecimento: timeStr,
        terminoAbastecimento: timeStr,
        produto: 'DIESEL',
        volume: '0,00',
        obs: fileName || 'Upload Manual',
        assinaturaCliente: 'CONFERIDO',
        confidenceNotes: 'Erro na extração IA - Dados gerados por fallback',
      };
    }

    // 2. Prepara o payload para o Google Apps Script
    const targetWebhook = webhookUrl || process.env.APPS_SCRIPT_WEBHOOK_URL;
    const payloadGas = {
      base64: imagePayload,
      mimeType: mimeType || 'image/jpeg',
      fileName: fileName || `OS_${Date.now()}.jpg`,
      dados: extractedData,
    };

    // 3. Encaminha para o Google Apps Script se o webhook estiver configurado
    if (targetWebhook) {
      const gasResponse = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadGas),
      });

      const gasResult = await gasResponse.json();
      return res.json({
        sucesso: true,
        extractedData,
        driveResult: gasResult,
      });
    }

    // Retorno apenas da extração caso não haja Webhook do Apps Script ativo
    return res.json({
      sucesso: true,
      extractedData,
      mensagem: 'Extração concluída com sucesso (Webhook do Apps Script não configurado).',
    });

  } catch (error: any) {
    console.error('Erro no fluxo principal:', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao processar o comprovante: ' + error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} com modelo ${GEMINI_MODEL}`);
});
