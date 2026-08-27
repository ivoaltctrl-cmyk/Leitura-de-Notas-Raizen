import React, { useState } from 'react';
import {
  KeyRound,
  User,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { BrandConfig } from '../types/index.ts';
import { getStoredAdminCredentials, saveStoredAdminCredentials } from '../utils/storage.ts';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: BrandConfig;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  brand,
}) => {
  const currentCreds = getStoredAdminCredentials();
  const [username, setUsername] = useState(currentCreds.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const primaryColor = brand?.primaryColor || '#006837';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (currentPassword !== currentCreds.password) {
      setErrorMsg('A senha atual informada está incorreta.');
      return;
    }

    if (!newPassword || newPassword.length < 3) {
      setErrorMsg('A nova senha deve possuir pelo menos 3 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('A confirmação da nova senha não confere.');
      return;
    }

    saveStoredAdminCredentials(username, newPassword);
    setSuccessMsg('Credenciais de Administrador atualizadas com sucesso!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: primaryColor }}
              className="p-2.5 rounded-2xl text-white shadow-xs"
            >
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Alterar Senha do Administrador
              </h2>
              <p className="text-xs text-slate-500">
                Configure os dados de acesso seguro ao Painel ADM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Usuário Administrador:</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Senha Atual *:</label>
            <input
              type="password"
              required
              placeholder="Digite a senha atual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-700 mb-1">Nova Senha *:</label>
            <input
              type="password"
              required
              placeholder="Nova senha segura"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Confirmar Nova Senha *:</label>
            <input
              type="password"
              required
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ backgroundColor: primaryColor }}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Novas Credenciais</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
