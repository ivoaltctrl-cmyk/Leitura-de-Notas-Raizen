import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Shared server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export interface ExtractedPendingDoc {
  tipo:
    | "ORDEM_DE_SERVICO"
    | "ATESTADO_SAUDE_OCUPACIONAL"
    | "FICHA_EPI"
    | "TREINAMENTO_RADIOPROTECAO"
    | "OUTRO";
  nomeDocumento: string;
  status: "EM_DIA" | "PENDENTE" | "VENCIDO" | "EM_ANALISE" | "NAO_APLICAVEL";
  dataEmissao?: string;
  dataVencimento?: string;
  observacoes?: string;
  obrigatorio?: boolean;
}

export interface ExtractedEmployeeData {
  nome: string;
  matricula?: string;
  cpf?: string;
  cargo?: string;
  setor?: string;
  empresa?: string;
  contrato?: string;
  indicadorPercentual?: number;
  statusGeral: "EM_DIA" | "PENDENTE" | "CRITICO" | "BLOQUEADO";
  resumoGeral?: string;
  pendencias: ExtractedPendingDoc[];
}

export async function extractPendingFromImage(
  imageBase64: string,
  mimeType: string = "image/png"
): Promise<ExtractedEmployeeData> {
  // Clean base64 string if it has data url prefix
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

  const prompt = `Você é um especialista em Segurança e Saúde no Trabalho (SST) e conformidade documental industrial.
Analise a imagem da tela fornecida (print de sistema interno de gestão de funcionários e pendências de SST).

O sistema contém informações de funcionários com pendências e indicadores, especialmente:
1. ORDEM DE SERVIÇO (OS - NR-01)
2. ATESTADO DE SAÚDE OCUPACIONAL (ASO - NR-07)
3. FICHA DE DISTRIBUIÇÃO / ENTREGA DE EPI (NR-06)
4. CERTIFICADO DE TREINAMENTO DE RADIOPROTEÇÃO (Proteção Radiológica / CNEN / NR-32)
5. Outros documentos ou treinamentos (NR-10, NR-35, Integração, etc. se estiverem visíveis).

Extraia com máxima precisão todos os campos da imagem:
- Nome completo do funcionário
- Matrícula / Registro / ID
- CPF (se visível)
- Cargo / Função
- Setor / Departamento / Unidade
- Empresa / Contratada
- Código ou Nome do Contrato
- Indicador do site (porcentagem de conformidade ou score visível na tela, ou calcule baseado nos itens)
- Status Geral ('EM_DIA', 'PENDENTE', 'CRITICO', 'BLOQUEADO')
- Resumo conciso em português das pendências encontradas
- Lista detalhada de cada documento/pendência:
  - tipo: classifique exatamente como 'ORDEM_DE_SERVICO', 'ATESTADO_SAUDE_OCUPACIONAL', 'FICHA_EPI', 'TREINAMENTO_RADIOPROTECAO' ou 'OUTRO'
  - nomeDocumento: nome exato ou legível do documento
  - status: 'EM_DIA', 'PENDENTE', 'VENCIDO', 'EM_ANALISE' ou 'NAO_APLICAVEL'
  - dataEmissao: se houver data de emissão/realização (formato YYYY-MM-DD ou DD/MM/YYYY)
  - dataVencimento: se houver data de validade/vencimento
  - observacoes: qualquer anotação específica relevante encontrada na tela
  - obrigatorio: true se for item crítico para entrada em área controlada/obra.

Se algum dado não estiver claro na imagem, forneça uma dedução razoável ou deixe como vazio/null, mas sempre priorize fidelidade total à imagem.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING, description: "Nome do funcionário" },
          matricula: { type: Type.STRING, description: "Matrícula do funcionário" },
          cpf: { type: Type.STRING, description: "CPF do funcionário" },
          cargo: { type: Type.STRING, description: "Cargo ou função" },
          setor: { type: Type.STRING, description: "Setor, área ou departamento" },
          empresa: { type: Type.STRING, description: "Empresa ou prestadora de serviços" },
          contrato: { type: Type.STRING, description: "Número ou identificação do contrato" },
          indicadorPercentual: {
            type: Type.NUMBER,
            description: "Porcentagem de conformidade de 0 a 100",
          },
          statusGeral: {
            type: Type.STRING,
            description: "Status geral: EM_DIA, PENDENTE, CRITICO, BLOQUEADO",
          },
          resumoGeral: {
            type: Type.STRING,
            description: "Resumo explicativo sobre as pendências do funcionário",
          },
          pendencias: {
            type: Type.ARRAY,
            description: "Lista de documentos e pendências avaliadas",
            items: {
              type: Type.OBJECT,
              properties: {
                tipo: {
                  type: Type.STRING,
                  description:
                    "ORDEM_DE_SERVICO, ATESTADO_SAUDE_OCUPACIONAL, FICHA_EPI, TREINAMENTO_RADIOPROTECAO, OUTRO",
                },
                nomeDocumento: { type: Type.STRING },
                status: {
                  type: Type.STRING,
                  description: "EM_DIA, PENDENTE, VENCIDO, EM_ANALISE, NAO_APLICAVEL",
                },
                dataEmissao: { type: Type.STRING },
                dataVencimento: { type: Type.STRING },
                observacoes: { type: Type.STRING },
                obrigatorio: { type: Type.BOOLEAN },
              },
              required: ["tipo", "nomeDocumento", "status"],
            },
          },
        },
        required: ["nome", "statusGeral", "pendencias"],
      },
    },
  });

  const text = response.text || "{}";
  const parsed = JSON.parse(text) as ExtractedEmployeeData;
  return parsed;
}

export async function generateDemandMessage(params: {
  employeeName: string;
  matricula?: string;
  cargo?: string;
  contrato?: string;
  empresa?: string;
  pendencias: { nome: string; status: string; vencimento?: string; obs?: string }[];
  targetChannel: "whatsapp" | "email" | "chamado";
  recipientName?: string;
  prazoDias?: number;
}): Promise<{ messageText: string; subject?: string }> {
  const {
    employeeName,
    matricula,
    cargo,
    contrato,
    empresa,
    pendencias,
    targetChannel,
    recipientName = "Gestor / Encarregado",
    prazoDias = 3,
  } = params;

  const prompt = `Crie uma mensagem profissional, formal e clara em português para demandar a regularização urgente de pendências de SST de um colaborador.

Dados:
- Colaborador: ${employeeName}
- Matrícula: ${matricula || "N/A"}
- Cargo: ${cargo || "N/A"}
- Contrato: ${contrato || "Geral"}
- Empresa: ${empresa || "N/A"}
- Destinatário: ${recipientName}
- Prazo para regularização: ${prazoDias} dias úteis
- Canal de envio: ${targetChannel}
- Lista de Pendências:
${pendencias
  .map(
    (p, i) =>
      `  ${i + 1}. [${p.status}] ${p.nome}${p.vencimento ? ` (Vencimento: ${p.vencimento})` : ""}${
        p.obs ? ` - Obs: ${p.obs}` : ""
      }`
  )
  .join("\n")}

Diretrizes:
- Se for WhatsApp: use formatação com asteriscos para negrito, emojis corporativos adequados (⚠️, 📋, ⏳, ✅), quebras de linha limpas e link de suporte/resposta.
- Se for E-mail: inclua uma linha de Assunto claro com tag do contrato/colaborador, saudação formal, tabela/lista com marcadores, impacto de não regularização (risco de bloqueio de acesso à unidade e paralisação) e assinatura formal.
- Se for Chamado/Ticket: formato técnico estruturado com campos claros, prioridade e ações requeridas.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING, description: "Assunto do e-mail ou título do chamado" },
          messageText: { type: Type.STRING, description: "Texto completo pronto para envio" },
        },
        required: ["messageText"],
      },
    },
  });

  const text = response.text || "{}";
  return JSON.parse(text);
}
