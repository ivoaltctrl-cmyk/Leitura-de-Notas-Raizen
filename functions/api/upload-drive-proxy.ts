import { authenticateRequest, handleOptions } from './_authHelper';

export const onRequestOptions = handleOptions;

export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  const auth = authenticateRequest(context.request, context.env);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const { webhookUrl, payload, secretToken } = body || {};
    const targetUrl =
      webhookUrl?.trim() ||
      context.env?.GOOGLE_APPS_SCRIPT_URL ||
      '';

    if (!targetUrl) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'URL do Google Apps Script não fornecida.',
        }),
        { status: 400, headers: responseHeaders }
      );
    }

    if (!payload || !payload.base64) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Payload com imagem base64 é obrigatório.',
        }),
        { status: 400, headers: responseHeaders }
      );
    }

    const effectiveToken = (payload.token || secretToken || context.env?.GOOGLE_APPS_SCRIPT_TOKEN || '').trim();
    if (effectiveToken) {
      payload.token = effectiveToken;
    }

    const separator = targetUrl.includes('?') ? '&' : '?';
    const uploadUrlWithToken = effectiveToken ? `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}` : targetUrl;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const gasResponse = await fetch(uploadUrlWithToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await gasResponse.text();
    let responseData: any;
    try {
      responseData = JSON.parse(text);
    } catch {
      if (text.includes('Acesso não autorizado') || text.includes('Token')) {
        responseData = {
          sucesso: false,
          mensagem: 'Acesso não autorizado pelo Google Apps Script. Verifique se o Token de Segurança está idêntico em Configurações e no script.',
        };
      } else {
        responseData = {
          sucesso: gasResponse.ok,
          mensagem: gasResponse.ok ? 'Foto enviada para a pasta do Google Drive com sucesso!' : text,
        };
      }
    }

    return new Response(JSON.stringify(responseData), {
      status: responseData?.sucesso === false ? 400 : 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: isTimeout
          ? 'O envio demorou mais que o esperado (tempo limite). Verifique a conexão com o Google Apps Script.'
          : `Erro ao comunicar com Google Apps Script: ${err.message}`,
      }),
      { status: 500, headers: responseHeaders }
    );
  }
};
