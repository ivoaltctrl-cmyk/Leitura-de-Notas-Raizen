/**
 * Authentication service for WFS Raízen application.
 * Manages JWT tokens, session verification, and secure API authorization headers.
 */

const TOKEN_STORAGE_KEY = 'wfs_raizen_auth_jwt';
const ROLE_STORAGE_KEY = 'wfs_raizen_auth_role';

export interface LoginResponse {
  sucesso: boolean;
  token?: string;
  role?: 'operator' | 'admin';
  mensagem?: string;
}

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getUserRole(): 'operator' | 'admin' | null {
  try {
    const role = sessionStorage.getItem(ROLE_STORAGE_KEY) || localStorage.getItem(ROLE_STORAGE_KEY);
    if (role === 'admin' || role === 'operator') return role;
  } catch {}
  return null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {};
}

export async function loginWithPassword(
  password: string,
  role: 'operator' | 'admin' = 'operator',
  rememberMe: boolean = false
): Promise<LoginResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: password.trim(), role }),
    });

    const data: LoginResponse = await res.json();
    if (res.ok && data.sucesso && data.token) {
      // Save session
      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      sessionStorage.setItem(ROLE_STORAGE_KEY, data.role || role);
      if (rememberMe) {
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        localStorage.setItem(ROLE_STORAGE_KEY, data.role || role);
      }
      return data;
    }

    return {
      sucesso: false,
      mensagem: data.mensagem || 'Senha incorreta. Tente novamente.',
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Erro ao conectar com o servidor: ${err.message || 'Falha de rede'}`,
    };
  }
}

export function logout(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
  } catch {}
}

export async function checkServerSession(): Promise<{ valid: boolean; role?: 'operator' | 'admin' }> {
  const token = getAuthToken();
  if (!token) return { valid: false };

  try {
    const res = await fetch('/api/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.valid) {
        return { valid: true, role: data.role };
      }
    }
  } catch {}

  logout();
  return { valid: false };
}

export async function changeServerPassword(
  targetRole: 'operator' | 'admin',
  newPassword: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ targetRole, newPassword: newPassword.trim() }),
    });

    const data = await res.json();
    return {
      sucesso: !!(res.ok && data.sucesso),
      mensagem: data.mensagem || (res.ok ? 'Senha alterada com sucesso!' : 'Falha ao alterar senha.'),
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Erro ao alterar senha: ${err.message}`,
    };
  }
}
