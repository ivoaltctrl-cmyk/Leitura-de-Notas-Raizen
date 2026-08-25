/// <reference types="@cloudflare/workers-types" />
interface Env {
  GOOGLE_APPS_SCRIPT_URL?: string;
  VITE_GOOGLE_APPS_SCRIPT_URL?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { webhookUrl } = await request.json<any>();
    const targetUrl = webhookUrl?.trim() || env.GOOGLE_APPS_SCRIPT_URL || env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return json({ sucesso: false, mensagem: 'URL do Webhook do Google Apps Script não configurada.' }, 400);
    }

    const testPayload = { action: 'ping_test', timestamp: new Date().toISOString() };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(testPayload),
      redirect: 'follow',
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = response.ok
        ? { sucesso: true, mensagem: 'Conexão confirmada com sucesso com o Web App do Google Apps Script!' }
        : { sucesso: false, mensagem: `Google retornou status ${response.status}: ${responseText.slice(0, 150)}` };
    }

    const isSuccess = response.ok && responseData?.sucesso !== false;

    return json({
      sucesso: isSuccess,
      mensagem: responseData?.mensagem || (isSuccess ? 'Conexão confirmada com o Google Drive e Sheets!' : 'Falha na resposta do Google Apps Script.'),
      raw: responseData,
    });
  } catch (error: any) {
    console.error('Erro ao testar integração Google:', error);
    return json({ sucesso: false, mensagem: `Erro ao conectar com Google Apps Script: ${error.message || 'Verifique a URL informada'}` });
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
