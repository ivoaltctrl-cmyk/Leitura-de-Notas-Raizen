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
          mensagem: 'URL do Webhook do Google Apps Script não fornecida.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Ping test
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'ping_test' }),
      redirect: 'follow',
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return new Response(
        JSON.stringify({
          sucesso: json.sucesso !== false,
          mensagem: json.mensagem || 'Conexão confirmada com sucesso!',
        }),
        {
          headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
        }
      );
    } catch {
      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: 'Conexão estabelecida com sucesso com o Google Apps Script!',
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
        mensagem: `Erro na conexão: ${err.message}`,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
};
