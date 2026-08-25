import { GoogleGenAI, Type } from '@google/genai';

// Instância da SDK oficial do Gemini utilizando a variável de ambiente segura
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Modelo configurado exatamente para a versão 3.6-flash solicitada
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
 * Processa a imagem do canhoto de abastecimento via Gemini Vision API (3.6 Flash)
 */
export async function extractReceiptWithGemini(
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

  try {
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
      throw new Error('A resposta da API retornou vazia.');
    }

    const extractedData: ExtractionResult = JSON.parse(response.text);
    return extractedData;
  } catch (error) {
    console.error('Erro na extração via Gemini API:', error);
    throw error;
  }
}
