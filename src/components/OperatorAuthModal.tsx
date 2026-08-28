import React, { useState } from 'react';
import { Lock, Key, AlertCircle, X, Eye, EyeOff } from 'lucide-react';

interface OperatorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

const STORAGE_KEY_ADMIN_PASS = 'abastecimento_admin_password_v1';
const STORAGE_KEY_OPERATOR_PASS = 'abastecimento_operator_password';

export const OperatorAuthModal: React.FC<OperatorAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Acesso à Operação',
  subtitle = 'Digite a senha de operador para autorizar a ação no sistema.',
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMsg('Por favor, informe a senha.');
      return;
    }

    const savedAdminPass = localStorage.getItem(STORAGE_KEY_ADMIN_PASS) || 'Admin1234';
    const savedOpPass = localStorage.getItem(STORAGE_KEY_OPERATOR_PASS) || '1234';

    // Accepted passwords: saved operator pass, saved admin pass, or standard defaults
    const validPasswords = [
      savedOpPass.toLowerCase(),
      savedAdminPass.toLowerCase(),
      '1234',
      'wfs123',
      'admin1234',
      'raizen123',
    ];

    if (
      trimmed === savedOpPass ||
      trimmed === savedAdminPass ||
      validPasswords.includes(trimmed.toLowerCase())
    ) {
      try {
        sessionStorage.setItem('operator_session_auth', 'true');
      } catch {}
      setPassword('');
      setErrorMsg(null);
      onSuccess();
    } else {
      setErrorMsg('Senha incorreta. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 relative animate-scaleUp">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            setPassword('');
            setErrorMsg(null);
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3 shadow-xs border border-red-100">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            {subtitle}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                id="operator-password-input"
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Digite a senha..."
                className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setErrorMsg(null);
                onClose();
              }}
              className="w-1/2 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirm-operator-auth"
              className="w-1/2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Liberar Acesso</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
