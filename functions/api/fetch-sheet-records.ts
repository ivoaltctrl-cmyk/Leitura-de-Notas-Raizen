export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const targetUrl =
      body?.webhookUrl?.trim() ||
      context.env?.GOOGLE_APPS_SCRIPT_URL ||
      '';

    if (!targetUrl) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'URL do Webhook do Google Apps Script não configurada.',
          records: [],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 1. Tenta GET primeiro
    try {
      const getUrl = targetUrl.includes('?') ? `${targetUrl}&action=get_sheet_data` : `${targetUrl}?action=get_sheet_data`;
      const gasResponse = await fetch(getUrl, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain' },
        redirect: 'follow',
      });

      const gasText = await gasResponse.text();
      try {
        const gasJson = JSON.parse(gasText);
        const recordsList = gasJson.records || gasJson.dados || gasJson.data || (Array.isArray(gasJson) ? gasJson : null);
        if (recordsList && Array.isArray(recordsList)) {
          return new Response(
            JSON.stringify({
              sucesso: true,
              mensagem: gasJson.mensagem || `Planilha sincronizada (${recordsList.length} registros)`,
              records: recordsList,
            }),
            {
              headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
            }
          );
        }
      } catch (e) {
        // Fallback para POST
      }
    } catch (e) {
      // Fallback para POST
    }

    // 2. Fallback POST com action get_sheet_data
    const postResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'get_sheet_data' }),
      redirect: 'follow',
    });

    const postText = await postResponse.text();
    const postJson = JSON.parse(postText);
    const recordsList = postJson.records || postJson.dados || postJson.data || (Array.isArray(postJson) ? postJson : []);

    return new Response(
      JSON.stringify({
        sucesso: postJson.sucesso !== false,
        mensagem: postJson.mensagem || `Planilha sincronizada (${recordsList.length} registros)`,
        records: recordsList,
      }),
      {
        headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: `Erro ao sincronizar com o Google Sheets: ${err.message}`,
        records: [],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
};
