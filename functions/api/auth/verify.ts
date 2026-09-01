import { authenticateRequest, handleOptions } from '../_authHelper';

export const onRequestOptions = handleOptions;

export const onRequestGet = async (context: { request: Request; env: Record<string, any> }) => {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  const auth = await authenticateRequest(context.request, context.env);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({ sucesso: false, valid: false }),
      { status: 200, headers: responseHeaders }
    );
  }

  return new Response(
    JSON.stringify({ sucesso: true, valid: true, role: auth.role }),
    { status: 200, headers: responseHeaders }
  );
};
