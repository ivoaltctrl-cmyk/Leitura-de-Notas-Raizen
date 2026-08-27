import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  User,
  ShieldCheck,
  ArrowRight,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { BrandConfig } from '../types/index.ts';
import { getStoredAdminCredentials, setStoredAdminAuthenticated } from '../utils/storage.ts';
import { WfsLogo } from './WfsLogo.tsx';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  brand: BrandConfig;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  brand,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDefaultHint, setShowDefaultHint] = useState(true);

  if (!isOpen) return null;

  const primaryColor = brand?.primaryColor || '#006837';
  const accentColor = brand?.accentColor || '#f59e0b';
  const companyName = brand?.companyName || 'GPA';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const credentials = getStoredAdminCredentials();

    if (
      username.trim().toLowerCase() === credentials.username.toLowerCase() &&
      password.trim() === credentials.password
    ) {
      setStoredAdminAuthenticated(true);
      onLoginSuccess();
    } else {
      setErrorMsg('Usuário ou senha incorretos. Verifique suas credenciais e tente novamente.');
    }
  };

  const handleUseDefaultCredentials = () => {
    const creds = getStoredAdminCredentials();
    setUsername(creds.username);
    setPassword(creds.password);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Decorator */}
        <div
          style={{ backgroundColor: primaryColor }}
          className="p-6 text-white text-center relative overflow-hidden"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 mb-3 shadow-inner">
            <Lock className="w-7 h-7" style={{ color: accentColor }} />
          </div>

          <h2 className="text-xl font-black tracking-tight">Área Administrativa</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-xs mx-auto">
            Acesso restrito para gestão completa de contratos, auditoria, OCR e configurações {companyName}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Usuário Administrador</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: admin"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-medium transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Senha de Acesso</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-medium transition-all"
            />
          </div>

          {/* Default credentials fast filler tip */}
          {showDefaultHint && (
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] leading-tight">
                  Padrão do sistema: <strong>admin</strong> / <strong>gpa</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleUseDefaultCredentials}
                className="px-2.5 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-300/80 text-[11px] font-bold text-amber-900 transition-colors cursor-pointer shrink-0"
              >
                Preencher
              </button>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              style={{ backgroundColor: primaryColor }}
              className="w-full py-3 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-95 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Entrar no Painel Administrativo</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Voltar ao Portal do Demandado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
