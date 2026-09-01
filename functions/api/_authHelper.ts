export interface AuthPayload {
  role: 'operator' | 'admin';
  iat?: number;
  exp?: number;
}

export const JWT_EXPIRES_IN_HOURS = 12;

export function getJwtSecret(env: Record<string, any>): string {
  const secret = env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : '');
  if (!secret || !secret.trim()) {
    throw new Error('JWT_SECRET não configurado');
  }
  return secret.trim();
}

// Base64URL encoding/decoding using standard Web APIs
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Sign JWT HS256 with native Web Crypto API (supported natively in Cloudflare Workers and Node 18+)
export async function signJwt(payload: AuthPayload, secretStr: string, expiresInHours = JWT_EXPIRES_IN_HOURS): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 3600,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));
  const encodedSignature = bufferToBase64Url(signature);

  return `${dataToSign}.${encodedSignature}`;
}

// Verify JWT HS256 with native Web Crypto API
export async function verifyJwt(token: string, secretStr: string): Promise<AuthPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token JWT com formato inválido');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const dataToVerify = `${encodedHeader}.${encodedPayload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  let base64 = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binarySignature = atob(base64);
  const sigBytes = new Uint8Array(binarySignature.length);
  for (let i = 0; i < binarySignature.length; i++) {
    sigBytes[i] = binarySignature.charCodeAt(i);
  }

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    enc.encode(dataToVerify)
  );

  if (!isValid) {
    throw new Error('Assinatura JWT inválida');
  }

  const decodedPayloadStr = base64UrlDecode(encodedPayload);
  const payload = JSON.parse(decodedPayloadStr) as AuthPayload;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expirado');
  }

  return payload;
}

export async function sha256Hex(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPasswordAgainstEnv(
  inputPassword: string,
  role: 'operator' | 'admin',
  env: Record<string, any>
): Promise<boolean> {
  if (!inputPassword || typeof inputPassword !== 'string') return false;
  const trimmed = inputPassword.trim();
  if (!trimmed) return false;

  const adminHash = env?.ADMIN_PASSWORD_HASH;
  const adminPlain = env?.ADMIN_PASSWORD;
  const opHash = env?.OPERATOR_PASSWORD_HASH;
  const opPlain = env?.OPERATOR_PASSWORD;

  const inputHash = await sha256Hex(trimmed);

  if (role === 'admin') {
    if (adminPlain && trimmed === adminPlain) return true;
    if (adminHash && (trimmed === adminHash || inputHash === String(adminHash).toLowerCase())) return true;
    return false;
  }

  if (role === 'operator') {
    // Admin password also unlocks operator role
    if (await verifyPasswordAgainstEnv(trimmed, 'admin', env)) return true;
    if (opPlain && trimmed === opPlain) return true;
    if (opHash && (trimmed === opHash || inputHash === String(opHash).toLowerCase())) return true;
    return false;
  }

  return false;
}

export async function authenticateRequest(
  request: Request,
  env: Record<string, any>,
  requiredRole?: 'operator' | 'admin'
): Promise<{ authorized: boolean; role?: 'operator' | 'admin'; errorResponse?: Response }> {
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
    const decoded = await verifyJwt(token, secret);

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
