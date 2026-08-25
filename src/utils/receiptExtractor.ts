import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedReceiptData } from '../types';

export interface ExtractionResult {
  sucesso: boolean;
  dados?: ExtractedReceiptData;
  error?: string;
}

const OCR_PROMPT = `Você é um especialista em extração de dados de notas e ordens de abastecimento (comprovantes de combustível / O.S. / notas de abastecimento de aviação e veículos em aeroportos e postos).
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

/**
 * Extracts receipt data via Backend API first, with graceful client-side Gemini fallback.
 */
export async function extractReceiptData(
  base64: string,
  mimeType: string = 'image/jpeg',
  customApiKey?: string
): Promise<ExtractionResult> {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

  // 1. First, attempt to call the server-side API (Full-stack container)
  try {
    const res = await fetch('/api/extract-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: cleanBase64,
        mimeType: mimeType || 'image/jpeg',
      }),
    });

    const text = await res.text();
    if (res.ok && text) {
      try {
        const json = JSON.parse(text);
        if (json.sucesso && json.dados) {
          return { sucesso: true, dados: json.dados };
        } else if (json.error) {
          return { sucesso: false, error: json.error };
        }
      } catch (parseErr) {
        console.warn('Backend returned non-JSON response:', text);
      }
    }
  } catch (netErr: any) {
    console.warn('Backend /api/extract-receipt not available or failed:', netErr.message);
  }

  // 2. Client-side fallback if customApiKey or import.meta.env key exists
  const clientKey = customApiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (clientKey && clientKey.trim()) {
    try {
      const ai = new GoogleGenAI({ apiKey: clientKey.trim() });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            {
              text: OCR_PROMPT,
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
              produto: { type: Type.STRING, description: 'Produto/Combustível' },
              volume: { type: Type.STRING, description: 'Volume abastecido em litros' },
              obs: { type: Type.STRING, description: 'Observações, placa, equipamento' },
              assinaturaCliente: { type: Type.STRING, description: 'Assinatura e matrícula' },
              confidenceNotes: { type: Type.STRING, description: 'Notas de confiança' },
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

      const responseText = response.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        return { sucesso: true, dados: parsed };
      }
    } catch (clientErr: any) {
      console.error('Client Gemini extraction failed:', clientErr);
      return {
        sucesso: false,
        error: `Erro ao processar imagem via Gemini: ${clientErr.message || 'Falha na leitura.'}`,
      };
    }
  }

  // 3. Informative error message when running on static host without backend or API key
  return {
    sucesso: false,
    error:
      'Não foi possível conectar ao servidor de IA (ex: ao hospedar em site estático como Cloudflare Pages). Você pode preencher os campos abaixo manualmente ou adicionar sua Chave do Gemini em "Configurações" (ícone de engrenagem) para ativar a leitura por IA.',
  };
}
