import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Unlock,
  LogOut,
  Code,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  Users,
  Globe,
  Share2,
  Link2,
  Send,
  ExternalLink,
} from 'lucide-react';
import { GasConfig, AbastecimentoRecord } from '../types';
import { testGoogleIntegration, fetchRecordsFromSheet } from '../utils/driveService';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/gasScriptTemplate';

interface SettingsTabProps {
  gasConfig: GasConfig;
  onSaveConfig: (config: GasConfig) => void;
  onClearAllRecords: () => void;
  recordsCount: number;
}

const STORAGE_KEY_ADMIN_PASS = 'abastecimento_admin_password_v1';
const DEFAULT_PASSWORD = 'admin';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  gasConfig,
  onSaveConfig,
  onClearAllRecords,
  recordsCount,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_session_auth') === 'true';
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Settings form state
  const [webhookUrl, setWebhookUrl] = useState(gasConfig.webhookUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ sucesso: boolean; mensagem: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Sheet test state
  const [isTestingSheetRead, setIsTestingSheetRead] = useState(false);
  const [sheetReadResult, setSheetReadResult] = useState<{ sucesso: boolean; mensagem: string; count?: number } | null>(null);

  // Change password state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clear confirmation dialog
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState(false);

  useEffect(() => {
    setWebhookUrl(gasConfig.webhookUrl || '');
  }, [gasConfig]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const savedPass = localStorage.getItem(STORAGE_KEY_ADMIN_PASS) || DEFAULT_PASSWORD;

    if (passwordInput.trim() === savedPass) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_session_auth', 'true');
      setPasswordInput('');
    } else {
      setAuthError('Senha de administrador incorreta.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_session_auth');
    setPasswordInput('');
  };

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({
        sucesso: false,
        mensagem: 'Por favor, insira a URL do Webhook do Google Apps Script.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testGoogleIntegration(webhookUrl.trim());
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        sucesso: false,
        mensagem: `Erro ao testar: ${err.message || 'Falha na conexão'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestSheetRead = async () => {
    if (!webhookUrl.trim()) {
      setSheetReadResult({
        sucesso: false,
        mensagem: 'Insira a URL do Webhook do Google Apps Script antes de testar.',
      });
      return;
    }

    setIsTestingSheetRead(true);
    setSheetReadResult(null);

    try {
      const result = await fetchRecordsFromSheet(webhookUrl.trim());
      if (result.sucesso) {
        setSheetReadResult({
          sucesso: true,
          mensagem: `Leitura da aba "Dados_Raizen" confirmada! Encontradas ${result.records.length} linha(s).`,
          count: result.records.length,
        });
      } else {
        setSheetReadResult({
          sucesso: false,
          mensagem: result.mensagem || 'Não foi possível ler as linhas da planilha.',
        });
      }
    } catch (err: any) {
      setSheetReadResult({
        sucesso: false,
        mensagem: `Erro ao consultar: ${err.message}`,
      });
    } finally {
      setIsTestingSheetRead(false);
    }
  };

  const handleSaveSettings = () => {
    onSaveConfig({
      ...gasConfig,
      webhookUrl: webhookUrl.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar código:', err);
    }
  };

  const getOperatorShareLink = () => {
    if (!webhookUrl.trim()) return '';
    try {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      return `${origin}${pathname}?w=${encodeURIComponent(webhookUrl.trim())}`;
    } catch {
      return '';
    }
  };

  const handleCopyShareLink = async () => {
    const link = getOperatorShareLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 3000);
    } catch (err) {
      console.error('Falha ao copiar link de compartilhamento:', err);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMsg(null);

    if (!newPassword || newPassword.length < 3) {
      setPasswordChangeMsg({ type: 'error', text: 'A senha deve ter pelo menos 3 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeMsg({ type: 'error', text: 'As senhas digitadas não coincidem.' });
      return;
    }

    localStorage.setItem(STORAGE_KEY_ADMIN_PASS, newPassword);
    setPasswordChangeMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      setShowPasswordChange(false);
      setPasswordChangeMsg(null);
    }, 2000);
  };

  const handleConfirmClearAll = () => {
    onClearAllRecords();
    setShowClearConfirm(false);
    setClearSuccessMsg(true);
    setTimeout(() => setClearSuccessMsg(false), 4000);
  };

  // 1. Password Protection Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-red-100">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900">Acesso Restrito - Administrador</h2>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Digite a senha de administrador para acessar as configurações de integração, sincronização multi-PC e parâmetros do sistema.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Senha de Administrador</label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite a senha..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-sm outline-hidden transition-all"
                />
                <Key className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-red-600/20 transition-all cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Desbloquear Configurações</span>
            </button>
          </form>

          <div className="text-center pt-2 border-t border-neutral-100">
            <p className="text-[11px] text-neutral-400">
              Senha padrão inicial: <code className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-md font-mono font-bold">admin</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unlocked Settings Dashboard
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Top Header with Multi-PC Status & Logout */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-neutral-200 shadow-xs p-4 sm:p-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span>Painel de Administração</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Sessão Ativa
              </span>
            </h2>
            <p className="text-xs text-neutral-500">Configurações globais com replicação instantânea para todos os operadores.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trocar Senha</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 bg-neutral-100 hover:bg-red-50 text-neutral-700 hover:text-red-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Multi-PC Sync Explanatory Card */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
            <Globe className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">Sincronização Multi-Computadores Ativa</h3>
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed">
          Para que todos os outros operadores acessem o mesmo Google Drive e a planilha em tempo real sem precisar digitar senhas ou URLs, envie o <strong>Link Direto Pré-Configurado</strong> abaixo:
        </p>
      </div>

      {/* Direct Operator Link Generator Card */}
      {webhookUrl && (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>Link de Acesso Automático para Operadores</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    Recomendado
                  </span>
                </h3>
                <p className="text-xs text-emerald-800">
                  Qualquer computador ou celular que abrir este link ficará <strong>100% conectado na hora</strong>, sem pedir senha.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              {copiedShareLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copiedShareLink ? 'Link Copiado!' : 'Copiar Link dos Operadores'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white/90 border border-emerald-200 rounded-xl p-2.5">
            <Link2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <input
              type="text"
              readOnly
              value={getOperatorShareLink()}
              className="flex-1 text-xs font-mono text-emerald-950 bg-transparent outline-hidden select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer shrink-0"
            >
              Copiar
            </button>
          </div>

          <p className="text-[11px] text-emerald-800 leading-normal">
            💡 <strong>Como usar:</strong> Copie este link e envie no <em>WhatsApp, Teams ou E-mail</em> da equipe. Ao clicarem nele no navegador de seus computadores ou celulares, o Webhook é configurado automaticamente na memória do navegador deles.
          </p>
        </div>
      )}

      {/* Password Change Form Modal/Box */}
      {showPasswordChange && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-red-600" />
            Alterar Senha do Administrador
          </h3>

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 block">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 3 caracteres"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 block">Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-hidden"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasswordChange(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Salvar Nova Senha
              </button>
            </div>
          </form>

          {passwordChangeMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                passwordChangeMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {passwordChangeMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{passwordChangeMsg.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Google Integration Settings */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Integração Google Drive e Google Sheets</h3>
              <p className="text-xs text-neutral-500">
                URL do Web App do Google Apps Script responsável pelo salvamento de fotos e sincronização com a aba Dados_Raizen.
              </p>
            </div>
          </div>
        </div>

        {/* Webhook Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-800 block">
            URL do Web App (Google Apps Script)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl border border-neutral-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-hidden bg-neutral-50/50"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestSheetRead}
              disabled={isTestingSheetRead}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Testa a leitura da aba Dados_Raizen"
            >
              <FileSpreadsheet className={`w-4 h-4 ${isTestingSheetRead ? 'animate-spin' : ''}`} />
              <span>{isTestingSheetRead ? 'Lendo Sheets...' : 'Testar Leitura Sheets'}</span>
            </button>
          </div>
          <p className="text-[11px] text-neutral-500">
            Esta URL salva as fotos na pasta <strong>Comprovantes_Raizen</strong> e sincroniza as linhas na aba <strong>Dados_Raizen</strong> para todos os PCs.
          </p>
        </div>

        {/* Test Connection Status Banner */}
        {testResult && (
          <div
            className={`p-4 rounded-xl text-xs flex items-start space-x-2.5 ${
              testResult.sucesso
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-red-50 border border-red-200 text-red-900'
            }`}
          >
            {testResult.sucesso ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-bold">
                {testResult.sucesso ? 'Conexão confirmada: ' : 'Falha na conexão: '}
              </span>
              <span>{testResult.mensagem}</span>
            </div>
          </div>
        )}

        {/* Sheet Read Test Status */}
        {sheetReadResult && (
          <div
            className={`p-4 rounded-xl text-xs flex items-start space-x-2.5 ${
              sheetReadResult.sucesso
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-red-50 border border-red-200 text-red-900'
            }`}
          >
            {sheetReadResult.sucesso ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-bold">
                {sheetReadResult.sucesso ? 'Leitura bem-sucedida: ' : 'Falha na leitura: '}
              </span>
              <span>{sheetReadResult.mensagem}</span>
            </div>
          </div>
        )}

        {/* Save Action */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" />
                Configuração gravada no servidor para todos os PCs!
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            Salvar Alterações
          </button>
        </div>
      </div>

      {/* Danger Zone: Data Management (ADM Only) */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-red-100">
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Gerenciamento de Dados (Área do Administrador)</h3>
            <p className="text-xs text-neutral-500">
              Controle protegido contra exclusões acidentais por operadores.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-50/50 rounded-xl border border-red-100">
          <div className="space-y-1">
            <div className="text-xs font-bold text-neutral-800">
              Limpar Todos os Registros do Aplicativo
            </div>
            <p className="text-[11px] text-neutral-600 max-w-lg">
              Atualmente existem <strong>{recordsCount} registro(s)</strong> no cache do aplicativo. Esta ação limpa os dados da visualização local e do servidor. (Os dados já enviados ao Google Sheets permanecem salvos na sua planilha online).
            </p>
          </div>

          <button
            type="button"
            id="btn-limpar-tudo-adm"
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Todos os Registros</span>
          </button>
        </div>

        {clearSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Todos os registros locais foram limpos com sucesso!</span>
          </div>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-neutral-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Confirmar Limpeza Total</h3>
              <p className="text-xs text-neutral-600">
                Tem certeza que deseja apagar todos os <strong>{recordsCount} registro(s)</strong> da memória do aplicativo?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Source Code & Installation Guide */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Código do Google Apps Script</h3>
              <p className="text-xs text-neutral-500">Salva comprovantes no Drive e lê/grava em Dados_Raizen com sincronização multi-PC.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copiado!' : 'Copiar Código (.gs)'}</span>
          </button>
        </div>

        <div className="relative">
          <pre className="bg-neutral-900 text-neutral-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed">
            {GOOGLE_APPS_SCRIPT_CODE}
          </pre>
        </div>

        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
          <h4 className="text-xs font-bold text-neutral-900">Instruções Cruciais para Multi-Dispositivos:</h4>
          <ol className="text-xs text-neutral-600 space-y-1.5 pl-4 list-decimal">
            <li>Abra sua planilha do Google Sheets onde está a aba <strong>Dados_Raizen</strong>.</li>
            <li>No menu superior, clique em <strong>Extensões ➔ Apps Script</strong>.</li>
            <li>Substitua o código pelo script acima e clique em <strong>Salvar</strong> (disquete).</li>
            <li>
              Clique no botão azul <strong>Implantar ➔ Gerenciar implantações</strong> (ou <em>Nova implantação</em>):
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-neutral-700">
                <li>Clique no ícone de lápis (Editar).</li>
                <li>Em <em>Versão</em>, selecione <strong>Nova versão</strong>.</li>
                <li>
                  <strong className="text-red-600">CRÍTICO:</strong> Em <em>Quem tem acesso</em>, selecione <strong>"Qualquer pessoa"</strong> (para que qualquer PC envie fotos sem bloqueio de login).
                </li>
              </ul>
            </li>
            <li>Clique em <strong>Implantar</strong> e copie a URL gerada (terminada em <code>/exec</code>).</li>
            <li>Cole a URL no campo acima e clique em <strong>Salvar Alterações</strong>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
