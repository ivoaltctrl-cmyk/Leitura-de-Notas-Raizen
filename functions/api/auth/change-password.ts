import { authenticateRequest, sha256Hex, handleOptions } from '../_authHelper';

export const onRequestOptions = handleOptions;

export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  const auth = await authenticateRequest(context.request, context.env, 'admin');
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const { targetRole, newPassword } = body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 2) {
      return new Response(
        JSON.stringify({ sucesso: false, mensagem: 'A nova senha deve ter pelo menos 2 caracteres.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    const hash = await sha256Hex(newPassword.trim());
    const envKey = targetRole === 'admin' ? 'ADMIN_PASSWORD_HASH' : 'OPERATOR_PASSWORD_HASH';

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: `Para persistir no Cloudflare Pages, configure a variável de ambiente ${envKey} com o hash SHA-256 gerado no painel da Cloudflare.`,
        hashGerado: hash,
      }),
      { status: 200, headers: responseHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: `Erro ao processar alteração de senha: ${err.message}` }),
      { status: 500, headers: responseHeaders }
    );
  }
};
