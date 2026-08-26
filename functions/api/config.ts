export const onRequestGet = async (context: { request: Request; env: Record<string, any> }) => {
  const webhookUrl =
    context.env?.GOOGLE_APPS_SCRIPT_URL ||
    context.env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbxjvAIKgEW0fVFRNL3x60Uyb7IVOnZ9Hxlik3BYrMu7IiE2lhykrDyKD0DYfkxwEW014w/exec';
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
