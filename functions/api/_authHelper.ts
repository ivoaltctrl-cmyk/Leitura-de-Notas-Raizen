import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface AuthPayload {
  role: 'operator' | 'admin';
  iat?: number;
  exp?: number;
}

const DEFAULT_ADMIN_PASS = 'admin123';
const DEFAULT_OP_PASS = 'operador123';
export const JWT_EXPIRES_IN = '12h';

export function getJwtSecret(env: Record<string, any>): string {
  const secret = env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : '');
  if (!secret || !secret.trim()) {
    throw new Error('JWT_SECRET não configurado');
  }
  return secret.trim();
}

export function verifyPasswordAgainstEnv(
  inputPassword: string,
  role: 'operator' | 'admin',
  env: Record<string, any>
): boolean {
  if (!inputPassword || typeof inputPassword !== 'string') return false;
  const trimmed = inputPassword.trim();
  if (!trimmed) return false;

  const adminHash = env?.ADMIN_PASSWORD_HASH;
  const adminPlain = env?.ADMIN_PASSWORD;
  const opHash = env?.OPERATOR_PASSWORD_HASH;
  const opPlain = env?.OPERATOR_PASSWORD;

  if (role === 'admin') {
    if (adminHash && bcrypt.compareSync(trimmed, adminHash)) return true;
    if (adminPlain && trimmed === adminPlain) return true;
    if (!adminHash && !adminPlain && (trimmed === DEFAULT_ADMIN_PASS || trimmed === 'admin')) return true;
    return false;
  }

  if (role === 'operator') {
    // Admin password also unlocks operator role
    if (verifyPasswordAgainstEnv(trimmed, 'admin', env)) return true;
    if (opHash && bcrypt.compareSync(trimmed, opHash)) return true;
    if (opPlain && trimmed === opPlain) return true;
    if (!opHash && !opPlain && trimmed === DEFAULT_OP_PASS) return true;
    return false;
  }

  return false;
}

export function authenticateRequest(
  request: Request,
  env: Record<string, any>,
  requiredRole?: 'operator' | 'admin'
): { authorized: boolean; role?: 'operator' | 'admin'; errorResponse?: Response } {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      errorResponse: new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Acesso não autorizado: Token de autenticação ausente ou inválido.',
          necessitaLogin: true,
        }),
        { status: 401, headers: responseHeaders }
      ),
    };
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = getJwtSecret(env);
    const decoded = jwt.verify(token, secret) as AuthPayload;

    if (requiredRole === 'admin' && decoded.role !== 'admin') {
      return {
        authorized: false,
        errorResponse: new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'Acesso restrito: Requer privilégios de Administrador.',
          }),
          { status: 403, headers: responseHeaders }
        ),
      };
    }

    return { authorized: true, role: decoded.role };
  } catch {
    return {
      authorized: false,
      errorResponse: new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Sessão expirada ou token de acesso inválido. Por favor, autentique-se novamente.',
          necessitaLogin: true,
        }),
        { status: 401, headers: responseHeaders }
      ),
    };
  }
}

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
