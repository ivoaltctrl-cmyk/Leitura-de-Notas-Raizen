export const onRequestGet = async (context: { request: Request; env: Record<string, any> }) => {
  const webhookUrl = context.env?.GOOGLE_APPS_SCRIPT_URL || '';
  return new Response(
    JSON.stringify({
      sucesso: true,
      config: {
        webhookUrl: webhookUrl,
        autoUploadToDrive: true,
        sheetUrl: '',
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    }
  );
};

export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  const body = (await context.request.json().catch(() => ({}))) as any;
  return new Response(
    JSON.stringify({
      sucesso: true,
      mensagem: 'Configuração recebida com sucesso.',
      config: body,
    }),
    {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    }
  );
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
