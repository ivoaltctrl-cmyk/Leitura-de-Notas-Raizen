/// <reference types="@cloudflare/workers-types" />
import { extractReceiptWithGemini } from '../_shared/gemini';

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { base64, mimeType } = await request.json<any>();

    if (!base64) {
      return json({ error: 'Base64 da imagem é obrigatório.' }, 400);
    }

    const data = await extractReceiptWithGemini(env.GEMINI_API_KEY, base64, mimeType);
    return json({ sucesso: true, dados: data });
  } catch (error: any) {
    console.error('Erro na extração de nota:', error);
    return json({ sucesso: false, error: error.message || 'Erro ao processar imagem da nota.' }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
