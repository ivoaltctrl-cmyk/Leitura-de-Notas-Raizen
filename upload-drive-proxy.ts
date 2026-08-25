/// <reference types="@cloudflare/workers-types" />
interface Env {
  GOOGLE_APPS_SCRIPT_URL?: string;
  VITE_GOOGLE_APPS_SCRIPT_URL?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { webhookUrl, payload } = await request.json<any>();
    const targetUrl = webhookUrl?.trim() || env.GOOGLE_APPS_SCRIPT_URL || env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return json({ sucesso: false, mensagem: 'URL do Webhook do Google Apps Script não informada.' }, 400);
    }
    if (!payload || !payload.base64) {
      return json({ sucesso: false, mensagem: 'Payload com imagem base64 é obrigatório.' }, 400);
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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

    return json(responseData);
  } catch (error: any) {
    console.error('Erro no proxy para o Google Apps Script:', error);
    return json({ sucesso: false, mensagem: `Erro ao conectar com Google Apps Script: ${error.message}` }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
