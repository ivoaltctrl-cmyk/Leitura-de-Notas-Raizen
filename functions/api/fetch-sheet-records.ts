/// <reference types="@cloudflare/workers-types" />
interface Env {
  GOOGLE_APPS_SCRIPT_URL?: string;
  VITE_GOOGLE_APPS_SCRIPT_URL?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { webhookUrl } = await request.json<any>();
    const targetUrl = (webhookUrl?.trim()) || env.GOOGLE_APPS_SCRIPT_URL || env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return json({
        sucesso: false,
        mensagem: 'URL do Google Apps Script não configurada nas Configurações.',
        records: [],
      }, 400);
    }

    // 1. Tenta GET (doGet padrão do Apps Script)
    try {
      const gasResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'follow',
      });

      const gasText = await gasResponse.text();
      try {
        const gasJson = JSON.parse(gasText);
        if (gasJson.records && Array.isArray(gasJson.records)) {
          return json({
            sucesso: true,
            mensagem: gasJson.mensagem || `Planilha sincronizada (${gasJson.records.length} registros)`,
            records: gasJson.records,
          });
        }
        // Aceita também um array puro no topo do JSON, sem wrapper "records"
        if (Array.isArray(gasJson)) {
          return json({
            sucesso: true,
            mensagem: `Planilha sincronizada (${gasJson.length} registros)`,
            records: gasJson,
          });
        }
      } catch {
        // Segue para o fallback POST
      }
    } catch (getErr) {
      console.warn('GET request to Apps Script failed, falling back to POST:', getErr);
    }

    // 2. Fallback POST com action: 'get_sheet_data'
    const postResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'get_sheet_data' }),
      redirect: 'follow',
    });

    const postText = await postResponse.text();
    const postJson = JSON.parse(postText);

    return json({
      sucesso: postJson.sucesso !== false,
      mensagem: postJson.mensagem || 'Planilha sincronizada!',
      records: postJson.records || (Array.isArray(postJson) ? postJson : []),
    });
  } catch (err: any) {
    console.error('Erro ao buscar dados da planilha:', err);
    return json({
      sucesso: false,
      mensagem: `Erro ao sincronizar com o Google Sheets: ${err.message}`,
      records: [],
    }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
