// Chama a API REST do Gemini diretamente via fetch (compatível com o runtime de Workers do Cloudflare Pages,
// que não suporta o SDK @google/genai baseado em Node).

const EXTRACTION_PROMPT = `Você é um especialista de alta precisão em leitura e extração de ordens de serviço e comprovantes de abastecimento de combustível e aviação (WFS / Raízen).
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

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    numero: { type: 'STRING', description: 'Número do comprovante/OS (Coluna A)' },
    formaPagamento: { type: 'STRING', description: 'Forma de pagamento (Coluna B)' },
    cliente: { type: 'STRING', description: 'Nome do cliente/empresa (Coluna C)' },
    horaChegada: { type: 'STRING', description: 'Hora da chegada HH:MM (Coluna D)' },
    inicioAbastecimento: { type: 'STRING', description: 'Início do abastecimento HH:MM (Coluna E)' },
    terminoAbastecimento: { type: 'STRING', description: 'Término do abastecimento HH:MM (Coluna F)' },
    produto: { type: 'STRING', description: 'Produto/Combustível (Coluna G)' },
    volume: { type: 'STRING', description: 'Volume abastecido em litros ex: 224,00 (Coluna H)' },
    obs: { type: 'STRING', description: 'Observações, placa, equipamento (Coluna I)' },
    assinaturaCliente: { type: 'STRING', description: 'Assinatura e matrícula do cliente (Coluna J)' },
    confidenceNotes: { type: 'STRING', description: 'Notas de confiança da leitura' },
  },
  required: [
    'numero', 'formaPagamento', 'cliente', 'horaChegada', 'inicioAbastecimento',
    'terminoAbastecimento', 'produto', 'volume', 'obs', 'assinaturaCliente',
  ],
};

export async function extractReceiptWithGemini(apiKey: string, base64: string, mimeType: string) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada nas variáveis de ambiente do Cloudflare Pages.');
  }

  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const cleanMimeType = mimeType || 'image/jpeg';

  const model = 'gemini-3.7-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { inlineData: { data: cleanBase64, mimeType: cleanMimeType } },
          { text: EXTRACTION_PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API retornou ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Nenhuma resposta gerada pelo modelo Gemini.');
  }

  return JSON.parse(text);
}
