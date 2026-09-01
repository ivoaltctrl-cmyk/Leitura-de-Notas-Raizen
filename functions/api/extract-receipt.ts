import { GoogleGenAI, Type } from '@google/genai';
import { handleOptions } from './_authHelper';

export const onRequestOptions = handleOptions;

export async function extractReceiptWithGemini(base64: string, mimeType: string, apiKey: string) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no ambiente.');
  }

  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const cleanMimeType = mimeType || 'image/jpeg';

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `Você é um especialista de máxima precisão em auditoria e extração OCR de ordens de serviço e comprovantes de abastecimento de combustível (WFS / Raízen / Shell).
Analise a imagem da nota de abastecimento com rigor absoluto, sem inventar dados e sem arredondamentos arbitrários.

=== REGRAS DE EXTRAÇÃO E FEW-SHOT DA OPERAÇÃO ===
1. "volume" (QUANTIDADE ABASTECIDA):
   - Deve ser SEMPRE formatado com 2 casas decimais no padrão brasileiro (ex: "35,00", "37,00", "120,50").
   - Se na nota constar "37" ou "37.000" ou "37,00", registre explicitamente "37,00".
   - Verifique a prova real: Volume = Valor Total / Preço Unitário para desempatar visualmente números difíceis (ex: 3 vs 8, 5 vs 6).

2. "obs" (EQUIPAMENTO, PLACA, PREFIXO - FEW-SHOT):
   - Mantenha a sequência exata de letras e números do equipamento ou placa.
   - Exemplos de padrões da operação: "GASOL XXD / TZ01A81", "GASOL XXD", "QTA-01", "GPU-04", "TRATOR-12", "REBOCADOR 03", "VAN-08".
   - Não confunda Z com T, nem 1 com I ou O com 0.

3. "numero": Número da nota / Ordem de Serviço / Nro OS (ex: "2393379", "2393515").

4. "dataAbastecimento": Formato DD/MM/AAAA (ex: "27/08/2026"). Se não constar, use a data atual.

5. "horaChegada", "inicioAbastecimento", "terminoAbastecimento":
   - Formato HH:MM (ex: "12:51", "16:14", "16:15").

6. "formaPagamento": Forma de pagamento (ex: "CONTRATO", "FATURADO", "A VISTA", "BOLETO").

7. "cliente": Razão social / Cliente (ex: "ORBITAL SERV AUX TRANSP AEREO", "WFS", "GOL", "LATAM", "AZUL").

8. "produto": Produto / Combustível (ex: "GASOLINA", "DIESEL", "DIESEL S10", "JET A-1").

9. "assinaturaCliente": Nome legível e matrícula de quem assinou / conferiu.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
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
      temperature: 0.0,
      topP: 0.1,
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
          volume: { type: Type.STRING, description: 'Volume abastecido em litros com 2 decimais ex: 35,00 ou 37,00 (Coluna I)' },
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

export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const { base64, mimeType } = body || {};

    if (!base64) {
      return new Response(
        JSON.stringify({ error: 'Base64 da imagem é obrigatório.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    const apiKey = context.env?.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
    const data = await extractReceiptWithGemini(base64, mimeType, apiKey);

    return new Response(
      JSON.stringify({ sucesso: true, dados: data }),
      { status: 200, headers: responseHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ sucesso: false, error: error.message || 'Erro ao processar imagem da nota.' }),
      { status: 500, headers: responseHeaders }
    );
  }
};
