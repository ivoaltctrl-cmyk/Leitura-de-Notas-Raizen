export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const { webhookUrl, payload } = body;
    const targetUrl =
      webhookUrl?.trim() ||
      context.env?.GOOGLE_APPS_SCRIPT_URL ||
      context.env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbxjvAIKgEW0fVFRNL3x60Uyb7IVOnZ9Hxlik3BYrMu7IiE2lhykrDyKD0DYfkxwEW014w/exec';

    if (!targetUrl) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'URL do Google Apps Script não fornecida.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const gasResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await gasResponse.text();
    try {
      const json = JSON.parse(text);
      return new Response(JSON.stringify(json), {
        headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      });
    } catch {
      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: 'Arquivo processado com sucesso pelo Google Apps Script.',
        }),
        {
          headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: `Erro ao comunicar com Google Apps Script: ${err.message}`,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
};
