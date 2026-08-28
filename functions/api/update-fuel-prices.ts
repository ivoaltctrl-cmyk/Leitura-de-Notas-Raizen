export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const { webhookUrl, secretToken, dataInicio, dataFim, produto, valorLitro } = body || {};

    const targetUrl =
      webhookUrl?.trim() ||
      context.env?.GOOGLE_APPS_SCRIPT_URL ||
      context.env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbxjvAIKgEW0fVFRNL3x60Uyb7IVOnZ9Hxlik3BYrMu7IiE2lhykrDyKD0DYfkxwEW014w/exec';

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ sucesso: false, mensagem: 'URL do Google Apps Script não informada.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    const valorLitroNum =
      typeof valorLitro === 'number' ? valorLitro : parseFloat(String(valorLitro || 0).replace(',', '.'));

    if (isNaN(valorLitroNum) || valorLitroNum < 0) {
      return new Response(
        JSON.stringify({ sucesso: false, mensagem: 'Valor do litro inválido.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    const effectiveToken = (secretToken || '').trim();
    const payload: any = {
      action: 'update_fuel_prices',
      dataInicio: dataInicio || '',
      dataFim: dataFim || dataInicio || '',
      produto: produto || 'TODOS',
      valorLitro: valorLitroNum,
      timestamp: new Date().toISOString(),
    };
    if (effectiveToken) {
      payload.token = effectiveToken;
    }

    const separator = targetUrl.includes('?') ? '&' : '?';
    const targetUrlWithToken = effectiveToken
      ? `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}`
      : targetUrl;

    const gasResponse = await fetch(targetUrlWithToken, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

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
        mensagem:
          responseData?.mensagem ||
          (isSuccess ? 'Valores atualizados na planilha com sucesso!' : 'Falha ao atualizar valores na planilha.'),
        totalAtualizados: responseData?.totalAtualizados,
        totalVolume: responseData?.totalVolume,
        totalFinanceiro: responseData?.totalFinanceiro,
      }),
      { headers: responseHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: `Erro ao atualizar valores: ${err.message || 'Falha de comunicação'}` }),
      { status: 500, headers: responseHeaders }
    );
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
