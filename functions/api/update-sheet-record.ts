import { authenticateRequest, handleOptions } from './_authHelper';

export const onRequestOptions = handleOptions;

export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  const auth = await authenticateRequest(context.request, context.env);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const { webhookUrl, secretToken, record, oldNumero } = body || {};
    const targetUrl =
      webhookUrl?.trim() ||
      context.env?.GOOGLE_APPS_SCRIPT_URL ||
      '';

    if (!targetUrl) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'URL do Google Apps Script não informada.',
        }),
        { status: 400, headers: responseHeaders }
      );
    }

    if (!record) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Dados do lançamento para atualização não informados.',
        }),
        { status: 400, headers: responseHeaders }
      );
    }

    const effectiveToken = (secretToken || context.env?.GOOGLE_APPS_SCRIPT_TOKEN || '').trim();
    const payload: any = {
      action: 'update_row',
      oldNumero: oldNumero || record.numeroOriginal || record.numero,
      ...record,
      timestamp: new Date().toISOString(),
    };

    if (effectiveToken) {
      payload.token = effectiveToken;
    }

    const separator = targetUrl.includes('?') ? '&' : '?';
    const targetUrlWithToken = effectiveToken ? `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}` : targetUrl;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const gasResponse = await fetch(targetUrlWithToken, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await gasResponse.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const isSuccess = gasResponse.ok && responseData?.sucesso !== false;

    return new Response(
      JSON.stringify({
        sucesso: isSuccess,
        mensagem: responseData?.mensagem || (isSuccess ? 'Lançamento atualizado na planilha com sucesso!' : 'Falha ao atualizar lançamento.'),
        data: responseData,
      }),
      { status: 200, headers: responseHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: `Erro ao atualizar lançamento: ${error.message || 'Falha de comunicação'}`,
      }),
      { status: 500, headers: responseHeaders }
    );
  }
};
