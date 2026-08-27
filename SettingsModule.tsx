import React, { useState } from 'react';
import {
  Settings,
  Lock,
  KeyRound,
  User,
  ShieldCheck,
  FileSpreadsheet,
  FileScan,
  Bell,
  Trash2,
  Palette,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Database,
  ArrowRight,
  RefreshCw,
  Sliders,
  Flame,
  Activity,
  Layers,
  FileCheck,
  Check,
  HelpCircle,
  Building2,
  Building,
} from 'lucide-react';
import { BrandConfig, Employee, Contract, TrabalhistaEnvio, AreaResponsavel } from '../types/index.ts';
import { getStoredAdminCredentials, saveStoredAdminCredentials } from '../utils/storage.ts';

interface SettingsModuleProps {
  onOpenSheetsSync: () => void;
  onOpenOcrScanner: () => void;
  onOpenProductionReset: () => void;
  onOpenBrandSettings: () => void;
  blinkingAlerts: boolean;
  onToggleBlinkingAlerts: () => void;
  brand: BrandConfig;
  employees: Employee[];
  contracts: Contract[];
  trabalhistas: TrabalhistaEnvio[];
  areas: AreaResponsavel[];
  syncStatus?: {
    status: 'idle' | 'syncing' | 'synced' | 'error';
    lastSynced?: string;
    message?: string;
  };
  onRefreshSheets?: () => void;
  onGoToDemandado?: () => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  onOpenSheetsSync,
  onOpenOcrScanner,
  onOpenProductionReset,
  onOpenBrandSettings,
  blinkingAlerts,
  onToggleBlinkingAlerts,
  brand,
  employees,
  contracts,
  trabalhistas,
  areas,
  syncStatus,
  onRefreshSheets,
  onGoToDemandado,
}) => {
  const currentCreds = getStoredAdminCredentials();
  const [username, setUsername] = useState(currentCreds.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const primaryColor = brand?.primaryColor || '#E21B23';
  const companyName = brand?.companyName || 'GPA';

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (currentPassword !== currentCreds.password) {
      setPasswordError('A senha atual informada está incorreta.');
      return;
    }

    if (!newPassword || newPassword.length < 3) {
      setPasswordError('A nova senha deve possuir pelo menos 3 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da nova senha não confere.');
      return;
    }

    saveStoredAdminCredentials(username, newPassword);
    setPasswordSuccess('Credenciais de Administrador salvas com sucesso!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(''), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner - Vies de Gestao & Parametros Globais */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            style={{ backgroundColor: primaryColor }}
            className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-xs"
          >
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                Gestão & Parâmetros do Sistema
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Base Operacional Ativa
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Guia de Configurações do Sistema
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Painel de governança, integrações, inteligência artificial OCR, alertas visuais e parâmetros de infraestrutura.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncStatus?.lastSynced && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>Última Sincronização: <strong>{syncStatus.lastSynced}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Direct Banner: Orientation for Data Input & Regularization */}
      <div className="bg-linear-to-r from-rose-50 via-white to-amber-50 border border-rose-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                Lançamento de Dados & Regularização de Pendências
              </h3>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                Portal do Demandado
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Para efetuar input de colaboradores, dar baixa em exames vencidos, anexar comprovantes ou sanar pendências documentais, utilize o <strong>Portal do Demandado</strong>.
            </p>
          </div>
        </div>

        {onGoToDemandado && (
          <button
            onClick={onGoToDemandado}
            style={{ backgroundColor: primaryColor }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <FileCheck className="w-4 h-4" />
            <span>Ir para o Portal Demandado</span>
          </button>
        )}
      </div>

      {/* Grid of Main Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Gestao de Parametros & Visao Operacional */}
        <div className="lg:col-span-5 space-y-6">
          {/* Status do Banco de Dados & Infraestrutura */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                <Activity className="w-4 h-4 text-slate-700" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Métricas & Inventário do Sistema</h3>
                <p className="text-[11px] text-slate-500">Volume de registros carregados em memória e servidor</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <span className="text-[11px] text-slate-500 block font-medium">Colaboradores SST</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{employees.length}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <span className="text-[11px] text-slate-500 block font-medium">Contratos Cadastrados</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{contracts.length}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <span className="text-[11px] text-slate-500 block font-medium">Áreas & Setores</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{areas.length}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <span className="text-[11px] text-slate-500 block font-medium">Envios Trabalhistas</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{trabalhistas.length}</span>
              </div>
            </div>
          </div>

          {/* Gestão de Credenciais do Administrador */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                <Lock className="w-4 h-4 text-slate-700" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Segurança & Troca de Senha do ADM</h3>
                <p className="text-[11px] text-slate-500">Defina o usuário e senha para o Painel ADM</p>
              </div>
            </div>

            <form onSubmit={handleUpdateCredentials} className="space-y-3.5 text-xs">
              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Usuário Administrador</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800 text-xs font-semibold bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Senha Atual</span>
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 3 dígitos"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800 text-xs font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{ backgroundColor: primaryColor }}
                className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Salvar Novas Credenciais</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Actions, Integrations & Global System Tools */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Sincronização GPA (Sheets) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-emerald-300 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Sincronização GPA (Sheets)</h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Planilha GPA_BD
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conecte com a planilha Google Sheets oficial para importar registros ou exportar em Excel/CSV.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {onRefreshSheets && (
                <button
                  onClick={onRefreshSheets}
                  title="Atualizar dados agora da nuvem"
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus?.status === 'syncing' ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              )}
              <button
                onClick={onOpenSheetsSync}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Abrir Central GPA_BD</span>
              </button>
            </div>
          </div>

          {/* 2. Lançar Print (OCR com IA) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-300 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                <FileScan className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Lançar Print (OCR com Inteligência Artificial)</h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Gemini Vision
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Faça upload de prints de telas ou comprovantes e extraia colaboradores e pendências automaticamente.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenOcrScanner}
              style={{ backgroundColor: primaryColor }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <FileScan className="w-4 h-4" />
              <span>Abrir Leitor OCR</span>
            </button>
          </div>

          {/* 3. Alertas Piscantes ON/OFF */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                  blinkingAlerts
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Alertas Visuais Piscantes</h3>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      blinkingAlerts ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Status: {blinkingAlerts ? 'ATIVADO (ON)' : 'DESATIVADO (OFF)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Destaca documentos vencidos e a vencer com animações pulsantes para ação preventiva rápida.
                </p>
              </div>
            </div>

            <button
              onClick={onToggleBlinkingAlerts}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs shrink-0 ${
                blinkingAlerts
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {blinkingAlerts && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    blinkingAlerts ? 'bg-white' : 'bg-slate-500'
                  }`}
                />
              </span>
              <span>Alternar: <strong>{blinkingAlerts ? 'Desativar' : 'Ativar'}</strong></span>
            </button>
          </div>

          {/* 4. Personalização Visual & Marca */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Identidade Visual & Cores</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ajuste o nome da empresa, logotipo e as cores primárias do sistema {companyName}.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenBrandSettings}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Palette className="w-4 h-4 text-purple-600" />
              <span>Personalizar Marca</span>
            </button>
          </div>

          {/* 5. Zerar Planilha / Iniciar Produção */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-rose-950">Zerar Planilha / Limpar Dados</h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-200/80 text-rose-900">
                    Ação de Governança
                  </span>
                </div>
                <p className="text-xs text-rose-700/80 mt-0.5">
                  Remove colaboradores e contratos para que você possa iniciar com a base de produção limpa.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenProductionReset}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Zerar Dados</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
