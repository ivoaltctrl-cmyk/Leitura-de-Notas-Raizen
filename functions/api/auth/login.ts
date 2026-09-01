import { verifyPasswordAgainstEnv, getJwtSecret, signJwt, handleOptions } from '../_authHelper';

export const onRequestOptions = handleOptions;

export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const { password, role } = body || {};

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ sucesso: false, mensagem: 'Senha é obrigatória.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    const requestedRole = role === 'admin' ? 'admin' : 'operator';
    const isAdmin = await verifyPasswordAgainstEnv(password, 'admin', context.env);
    const isOperator = await verifyPasswordAgainstEnv(password, 'operator', context.env);

    let secret: string;
    try {
      secret = getJwtSecret(context.env);
    } catch (err: any) {
      return new Response(
        JSON.stringify({ sucesso: false, mensagem: `Erro de configuração do servidor: ${err.message}` }),
        { status: 500, headers: responseHeaders }
      );
    }

    if (requestedRole === 'admin') {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ sucesso: false, mensagem: 'Senha de administrador incorreta.' }),
          { status: 401, headers: responseHeaders }
        );
      }
      const token = await signJwt({ role: 'admin' }, secret);
      return new Response(
        JSON.stringify({
          sucesso: true,
          token,
          role: 'admin',
          mensagem: 'Autenticado como Administrador com sucesso.',
        }),
        { status: 200, headers: responseHeaders }
      );
    }

    // Operator login
    if (!isOperator && !isAdmin) {
      return new Response(
        JSON.stringify({ sucesso: false, mensagem: 'Senha de operador incorreta.' }),
        { status: 401, headers: responseHeaders }
      );
    }

    const effectiveRole = isAdmin ? 'admin' : 'operator';
    const token = await signJwt({ role: effectiveRole }, secret);
    return new Response(
      JSON.stringify({
        sucesso: true,
        token,
        role: effectiveRole,
        mensagem: 'Autenticado com sucesso na Operação.',
      }),
      { status: 200, headers: responseHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: `Erro interno no login: ${error.message}` }),
      { status: 500, headers: responseHeaders }
    );
  }
};
