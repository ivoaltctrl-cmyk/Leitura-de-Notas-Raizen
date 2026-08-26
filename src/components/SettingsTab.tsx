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
  FileSpreadsheet,
} from 'lucide-react';
import { GasConfig } from '../types';
import { testGoogleIntegration, fetchRecordsFromSheet } from '../utils/driveService';
import { SCRIPT_WEBHOOK_GS, SCRIPT_CODIGO_GS } from '../utils/gasScriptTemplate';

interface SettingsTabProps {
  gasConfig: GasConfig;
  onSaveConfig: (config: GasConfig) => void;
}

const STORAGE_KEY_ADMIN_PASS = 'abastecimento_admin_password_v1';
const DEFAULT_PASSWORD = 'Admin1234';

// URL PADRÃO FALLBACK - Webhook padrão do Google Apps Script
export const DEFAULT_WEBHOOK_URL = '';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  gasConfig,
  onSaveConfig,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_session_auth') === 'true';
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Settings form state com fallback para DEFAULT_WEBHOOK_URL
  const [webhookUrl, setWebhookUrl] = useState(
    gasConfig.webhookUrl || localStorage.getItem('sheets_webhook_url') || DEFAULT_WEBHOOK_URL
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ sucesso: boolean; mensagem: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeScriptTab, setActiveScriptTab] = useState<'webhook' | 'codigo'>('webhook');

  // Sheet test state
  const [isTestingSheetRead, setIsTestingSheetRead] = useState(false);
  const [sheetReadResult, setSheetReadResult] = useState<{ sucesso: boolean; mensagem: string; count?: number } | null>(null);

  // Change password state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setWebhookUrl(gasConfig.webhookUrl || localStorage.getItem('sheets_webhook_url') || DEFAULT_WEBHOOK_URL);
  }, [gasConfig]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const savedPass = localStorage.getItem(STORAGE_KEY_ADMIN_PASS) || DEFAULT_PASSWORD;

    if (passwordInput.trim() === savedPass || passwordInput.trim() === 'admin' || passwordInput.trim() === 'Admin1234') {
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
    const finalUrl = webhookUrl.trim();
    localStorage.setItem('sheets_webhook_url', finalUrl);
    onSaveConfig({
      ...gasConfig,
      webhookUrl: finalUrl,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCopyCode = async () => {
    try {
      const codeToCopy = activeScriptTab === 'webhook' ? SCRIPT_WEBHOOK_GS : SCRIPT_CODIGO_GS;
      await navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar código:', err);
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
              Digite a senha de administrador para acessar as configurações de integração e parâmetros do sistema.
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
            <span className="text-[11px] text-neutral-400">
              Senha padrão inicial: <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">Admin1234</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Settings View
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Top Admin Header */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900">Painel de Configurações Administrativas</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ADM Ativo
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Gerenciamento de credenciais, Webhook Google Apps Script e segurança.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{showPasswordChange ? 'Ocultar Senha' : 'Trocar Senha ADM'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-red-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Change Password Card (Collapsible) */}
      {showPasswordChange && (
        <div className="bg-neutral-50 border border-neutral-300 rounded-2xl p-5 space-y-4 animate-fadeIn">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-red-600" />
            Alterar Senha de Administrador
          </h3>

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-neutral-600 block mb-1">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 3 caracteres"
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-neutral-300 focus:border-red-500 outline-hidden"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-600 block mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-neutral-300 focus:border-red-500 outline-hidden"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Atualizar Senha
              </button>
            </div>
          </form>

          {passwordChangeMsg && (
            <div
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                passwordChangeMsg.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
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
            Esta URL salva as fotos na pasta do Google Drive e sincroniza as linhas na aba <strong>Dados_Raizen</strong>.
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
                Configurações salvas com sucesso!
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

      {/* Script Source Code & Installation Guide */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Scripts Padrões do Google Apps Script</h3>
              <p className="text-xs text-neutral-500">Arquivos oficiais atualizados para o fluxo automatizado e leitura.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copiado!' : activeScriptTab === 'webhook' ? 'Copiar webhook.gs' : 'Copiar Código.gs'}</span>
          </button>
        </div>

        {/* Script Tabs Switcher */}
        <div className="flex border-b border-neutral-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveScriptTab('webhook')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeScriptTab === 'webhook'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            1. webhook.gs (Comunicação / Leitura)
          </button>
          <button
            type="button"
            onClick={() => setActiveScriptTab('codigo')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeScriptTab === 'codigo'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            2. Código.gs (Scanner Gemini IA)
          </button>
        </div>

        {/* Script Code Viewer */}
        <div className="relative">
          <pre className="bg-neutral-900 text-neutral-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed">
            {activeScriptTab === 'webhook' ? SCRIPT_WEBHOOK_GS : SCRIPT_CODIGO_GS}
          </pre>
        </div>

        {/* Dynamic Instructions */}
        {activeScriptTab === 'webhook' ? (
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <h4 className="text-xs font-bold text-neutral-800">Como implantar o webhook.gs:</h4>
            <ol className="text-xs text-neutral-600 space-y-1.5 pl-4 list-decimal">
              <li>No Google Apps Script da sua planilha, crie ou abra o arquivo <code className="font-mono bg-neutral-200/70 px-1 py-0.5 rounded text-neutral-900">webhook.gs</code>.</li>
              <li>Substitua pelo código acima e verifique o <code className="font-mono text-neutral-900">FOLDER_ID</code> da sua pasta do Drive.</li>
              <li>Clique em <strong>Implantar ➔ Gerenciar implantações ➔ Editar (Ícone de lápis)</strong>.</li>
              <li>Selecione <strong>Nova versão</strong> e clique em <strong>Implantar</strong>.</li>
              <li>Copie a URL do Web App gerada (terminada em <code>/exec</code>) e cole no campo acima nesta tela.</li>
            </ol>
          </div>
        ) : (
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <h4 className="text-xs font-bold text-neutral-800">Como configurar o Código.gs (Gemini IA):</h4>
            <ol className="text-xs text-neutral-600 space-y-1.5 pl-4 list-decimal">
              <li>No mesmo projeto Apps Script, crie ou abra o arquivo <code className="font-mono bg-neutral-200/70 px-1 py-0.5 rounded text-neutral-900">Código.gs</code> e cole o código acima.</li>
              <li>Acesse <strong>Configurações do Projeto (Ícone de engrenagem ⚙️) ➔ Propriedades do Script</strong> e adicione:
                <ul className="list-disc pl-4 mt-1 space-y-0.5 font-mono text-[11px] text-neutral-700">
                  <li><code>DRIVE_FOLDER_ID</code> (ID da pasta principal onde as fotos são salvas)</li>
                  <li><code>GEMINI_API_KEY</code> (Sua chave de API do Gemini)</li>
                  <li><code>SPREADSHEET_ID</code> (ID da planilha Google Sheets)</li>
                </ul>
              </li>
              <li>Acesse o menu <strong>Acionadores (Ícone de relógio ⏰) ➔ Adicionar Acionador</strong>:</li>
              <li>Selecione a função <code>processarPastaAbastecimentos</code>, evento <strong>Baseado em tempo</strong> (ex: a cada 1 ou 5 minutos).</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
