import React, { useState } from 'react';
import {
  X,
  HardDrive,
  FileSpreadsheet,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Zap,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { GasConfig } from '../types';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/gasScriptTemplate';
import { testGoogleIntegration } from '../utils/driveService';

interface GoogleIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasConfig: GasConfig;
  onSaveConfig: (config: GasConfig) => void;
}

export const GoogleIntegrationModal: React.FC<GoogleIntegrationModalProps> = ({
  isOpen,
  onClose,
  gasConfig,
  onSaveConfig,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(gasConfig.webhookUrl || '');
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ sucesso: boolean; mensagem: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'tutorial' | 'code'>('config');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({
        sucesso: false,
        mensagem: 'Cole a URL do seu Webhook do Google Apps Script antes de testar.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGoogleIntegration(webhookUrl.trim());
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSave = () => {
    onSaveConfig({
      ...gasConfig,
      webhookUrl: webhookUrl.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-neutral-200 animate-fadeIn">
        {/* Header */}
        <div className="bg-neutral-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Fluxo Automatizado: Front ➔ Drive ➔ Back ➔ Sheets ➔ Front
              </h2>
              <p className="text-xs text-neutral-400">
                Configuração da integração oficial do Google Drive e Google Sheets (Aba Dados_Raizen)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Architecture Visual Bar */}
        <div className="bg-neutral-100 p-3 sm:p-4 border-b border-neutral-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[580px] text-xs font-semibold text-neutral-700">
            {/* Step 1: Front */}
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-neutral-300 shadow-2xs">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-[10px]">1</span>
              <span>Front (Foto)</span>
            </div>

            <span className="text-red-500 font-bold">➔</span>

            {/* Step 2: Driver */}
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-neutral-300 shadow-2xs">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Drive (Salva Foto)</span>
            </div>

            <span className="text-red-500 font-bold">➔</span>

            {/* Step 3: Back */}
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-neutral-300 shadow-2xs">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Back (IA Gemini 3.7)</span>
            </div>

            <span className="text-red-500 font-bold">➔</span>

            {/* Step 4: Sheets */}
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-neutral-300 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Sheets (Dados_Raizen)</span>
            </div>

            <span className="text-red-500 font-bold">➔</span>

            {/* Step 5: Front */}
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-neutral-300 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-red-600" />
              <span>Front (Espelho)</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 px-6 pt-3 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'config'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Conectar Webhook do Apps Script
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tutorial')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'tutorial'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Passo a Passo (3 minutos)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Código do Script (.gs)
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {activeTab === 'config' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-900">
                  URL do Web App do Google Apps Script (Webhook)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-4 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 font-mono text-neutral-800 bg-neutral-50"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !webhookUrl.trim()}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    )}
                    <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Ao salvar, todas as fotos enviadas no Front serão transferidas automaticamente para o Google Drive e gravadas na planilha "Leituras Raizen" na aba "Dados_Raizen".
                </p>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                    testResult.sucesso
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border-red-300 text-red-900'
                  }`}
                >
                  {testResult.sucesso ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold">
                      {testResult.sucesso ? 'Conexão Bem-Sucedida! ' : 'Falha na Conexão: '}
                    </span>
                    <span>{testResult.mensagem}</span>
                  </div>
                </div>
              )}

              {/* Status summary */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>O que acontece a cada comprovante enviado:</span>
                </div>
                <ul className="text-xs text-neutral-600 space-y-1.5 pl-5 list-disc">
                  <li><strong>Foto salva no Google Drive:</strong> Cria o arquivo JPG dentro da pasta <code>Comprovantes_Raizen</code>.</li>
                  <li><strong>Extração pelo Back:</strong> IA Gemini 3.7 lê os 11 campos da nota (inclusive <em>Término do Abastecimento</em>).</li>
                  <li><strong>Gravação no Google Sheets:</strong> Adiciona a nova linha nas colunas de <strong>A a K</strong> na aba <code>Dados_Raizen</code>.</li>
                  <li><strong>Espelho no Front:</strong> A linha aparece instantaneamente na guia de planilha da ferramenta.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'tutorial' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-950 font-medium">
                Siga estes 4 passos simples na sua planilha <strong>"Leituras Raizen"</strong> para ativar o fluxo automático:
              </div>

              <ol className="space-y-3 pl-4 list-decimal text-neutral-800">
                <li className="space-y-1">
                  <strong>Abra sua Planilha Google:</strong> Abra a planilha <em>Leituras Raizen</em>. No menu superior, clique em <code>Extensões</code> ➔ <code>Apps Script</code>.
                </li>
                <li className="space-y-1">
                  <strong>Cole o Código:</strong> Apague o que estiver lá e cole o código disponível na aba <em>"Código do Script"</em>. Clique no ícone de <strong>Salvar (Disquete)</strong>.
                </li>
                <li className="space-y-1">
                  <strong>Implantar como Web App:</strong> No canto superior direito, clique no botão azul <code>Implantar</code> ➔ <code>Nova implantação</code>.
                  <ul className="list-disc pl-5 mt-1 space-y-0.5 text-neutral-600">
                    <li>Tipo: Selecione o ícone de engrenagem ➔ <strong>App da Web</strong></li>
                    <li>Executar como: <strong>Eu (seu email)</strong></li>
                    <li>Quem tem acesso: <strong>Qualquer pessoa</strong> (necessário para receber uploads)</li>
                  </ul>
                </li>
                <li className="space-y-1">
                  <strong>Copie a URL:</strong> Copie a URL do App da Web gerada (termina com <code>/exec</code>) e cole aqui na aba <em>"Conectar Webhook"</em>.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700">
                  Código completo para Extensões ➔ Apps Script:
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Código Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-80 select-all leading-relaxed">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
