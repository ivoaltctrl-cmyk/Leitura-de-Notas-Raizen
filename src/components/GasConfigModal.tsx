import React, { useState } from 'react';
import { X, HardDrive, Check, Copy, ExternalLink, AlertCircle, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { GasConfig } from '../types';

interface GasConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GasConfig;
  onSaveConfig: (config: GasConfig) => void;
}

export const GasConfigModal: React.FC<GasConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');
  const [autoUpload, setAutoUpload] = useState(config.autoUploadToDrive ?? true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ sucesso: boolean; mensagem: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'current' | 'enhanced'>('current');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      webhookUrl: webhookUrl.trim(),
      autoUploadToDrive: autoUpload,
    });
    onClose();
  };

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({
        sucesso: false,
        mensagem: 'Por favor, insira a URL do Web App do Google Apps Script antes de testar.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // 1x1 transparent pixel in base64 to test saving
      const tinyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const response = await fetch('/api/upload-drive-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          payload: {
            base64: tinyBase64,
            mimeType: 'image/png',
            fileName: `TESTE_CONEXAO_${Date.now()}.png`,
            numero: 'TESTE-01',
            cliente: 'TESTE DE CONEXAO DO DRIVE',
          },
        }),
      });

      const res = await response.json();
      if (res.sucesso || res.fileId) {
        setTestResult({
          sucesso: true,
          mensagem: `Conexão bem sucedida! Arquivo de teste criado no Drive (ID: ${res.fileId || 'ok'}).`,
        });
      } else {
        setTestResult({
          sucesso: false,
          mensagem: res.mensagem || 'O script respondeu, mas retornou erro. Verifique as permissões de acesso.',
        });
      }
    } catch (err: any) {
      setTestResult({
        sucesso: false,
        mensagem: `Erro ao testar: ${err.message}. Verifique se a URL foi implantada como "Qualquer pessoa" (Anyone).`,
      });
    } finally {
      setTesting(false);
    }
  };

  const currentScriptCode = `/**
 * Endpoint HTTP POST para receber imagens enviadas por aplicações externas.
 * Código original fornecido por você:
 */
function doPost(e) {
  var output;
  
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (!data.base64 || !data.mimeType) {
      throw new Error("Dados de imagem ausentes ou inválidos.");
    }

    var scriptProperties = PropertiesService.getScriptProperties();
    var folderId = scriptProperties.getProperty('DRIVE_FOLDER_ID_ABASTECIMENTO') || 
                   scriptProperties.getProperty('DRIVE_FOLDER_ID');
    
    if (!folderId) {
      throw new Error("ID da pasta não configurado nas Script Properties.");
    }
    
    var folder = DriveApp.getFolderById(folderId);
    
    // Converte o Base64 de volta para Blob
    var base64Data = data.base64.replace(/^data:image\\/\\w+;base64,/, "");
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), data.mimeType, data.fileName || ("OS_" + Date.now() + ".jpg"));
    
    var file = folder.createFile(blob);
    
    output = {
      sucesso: true,
      mensagem: "Arquivo salvo com sucesso no Drive!",
      fileId: file.getId()
    };
  } catch (err) {
    output = {
      sucesso: false,
      mensagem: "Erro no servidor: " + err.message
    };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const enhancedScriptCode = `/**
 * VERSÃO RECOMENDADA (Salva a Foto no Drive E adiciona a linha na Planilha automaticamente)
 */
function doPost(e) {
  var output;
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (!data.base64 || !data.mimeType) {
      throw new Error("Dados de imagem ausentes ou inválidos.");
    }

    var scriptProperties = PropertiesService.getScriptProperties();
    var folderId = scriptProperties.getProperty('DRIVE_FOLDER_ID_ABASTECIMENTO') || 
                   scriptProperties.getProperty('DRIVE_FOLDER_ID');
    
    if (!folderId) {
      throw new Error("ID da pasta (DRIVE_FOLDER_ID_ABASTECIMENTO) não configurado.");
    }
    
    var folder = DriveApp.getFolderById(folderId);
    var base64Data = data.base64.replace(/^data:image\\/\\w+;base64,/, "");
    var fileName = data.fileName || ("OS_" + (data.numero || Date.now()) + ".jpg");
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), data.mimeType, fileName);
    
    var file = folder.createFile(blob);
    file.setDescription("Nota de abastecimento " + (data.numero || "") + " - " + (data.cliente || ""));
    var fileUrl = file.getUrl();

    // Se estiver vinculado a uma Planilha Google, insere a linha automaticamente:
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet() ? SpreadsheetApp.getActiveSpreadsheet().getActiveSheet() : null;
      if (sheet) {
        sheet.appendRow([
          data.numero || "",
          data.formaPagamento || "",
          data.cliente || "",
          data.horaChegada || "",
          data.inicioAbastecimento || "",
          data.produto || "",
          data.volume || "",
          data.obs || "",
          data.assinaturaCliente || "",
          fileUrl
        ]);
      }
    } catch (sheetErr) {
      // Continua mesmo se não houver planilha vinculada diretamente
    }

    output = {
      sucesso: true,
      mensagem: "Arquivo salvo com sucesso no Drive!",
      fileId: file.getId(),
      fileUrl: fileUrl
    };
  } catch (err) {
    output = {
      sucesso: false,
      mensagem: "Erro no servidor: " + err.message
    };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const copyCode = () => {
    const code = activeCodeTab === 'current' ? currentScriptCode : enhancedScriptCode;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-neutral-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Configuração do Google Apps Script & Drive
              </h2>
              <p className="text-xs text-neutral-500">
                Conecte seu endpoint doPost para salvar as fotos direto na pasta do Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Webhook URL Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
              URL do Web App do Google Apps Script (Exec)
            </label>
            <div className="flex gap-2">
              <input
                id="input-webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-neutral-800"
              />
              <button
                id="btn-test-webhook"
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !webhookUrl.trim()}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {testing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Testando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Testar Conexão
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Insira a URL gerada ao clicar em <strong>Implantar &gt; Nova implantação &gt; Aplicativo da Web</strong> (com acesso liberado para "Qualquer pessoa").
            </p>
          </div>

          {/* Test feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                testResult.sucesso
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              {testResult.sucesso ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold">{testResult.sucesso ? 'Sucesso: ' : 'Atenção: '}</span>
                {testResult.mensagem}
              </div>
            </div>
          )}

          {/* Auto upload toggle */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <div className="text-sm font-semibold text-neutral-800">
                Enviar automaticamente ao Drive ao salvar nota
              </div>
              <div className="text-xs text-neutral-500">
                Faz o upload do arquivo para o Drive imediatamente após a extração e confirmação
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoUpload}
                onChange={(e) => setAutoUpload(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          {/* Step by step guide */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-red-600" />
              Passo a Passo de Configuração no Google Drive / Apps Script
            </h3>
            <ol className="text-xs text-neutral-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Crie uma pasta no seu <strong>Google Drive</strong> (ex: <code className="bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-800 font-mono">Notas_Abastecimento</code>) e copie o <strong>ID da pasta</strong> (está no link do navegador após <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">/folders/</code>).
              </li>
              <li>
                Acesse <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-red-600 underline font-semibold inline-flex items-center gap-0.5">Google Apps Script <ExternalLink className="w-3 h-3" /></a> e cole o código abaixo.
              </li>
              <li>
                No menu lateral do Apps Script, clique em <strong>⚙️ Configurações do Projeto &gt; Propriedades do Script</strong> e adicione a propriedade:
                <br />
                <span className="inline-block mt-1 bg-white border border-neutral-300 px-2 py-1 rounded font-mono text-[11px] text-neutral-800">
                  Propriedade: <strong>DRIVE_FOLDER_ID_ABASTECIMENTO</strong> | Valor: <em>[Seu_ID_da_Pasta]</em>
                </span>
              </li>
              <li>
                Clique no botão azul <strong>Implantar &gt; Nova implantação</strong>:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                  <li>Tipo: <strong>Aplicativo da Web</strong></li>
                  <li>Executar como: <strong>Eu (seu e-mail)</strong></li>
                  <li>Quem tem acesso: <strong>Qualquer pessoa (Anyone)</strong> <em>(essencial para receber requisições!)</em></li>
                </ul>
              </li>
              <li>Copie a <strong>URL do aplicativo da Web</strong> gerada e cole no campo acima!</li>
            </ol>
          </div>

          {/* Script Code Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab('current')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeCodeTab === 'current'
                      ? 'bg-red-600 text-white'
                      : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                  }`}
                >
                  Script Atual (Seu doPost)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab('enhanced')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeCodeTab === 'enhanced'
                      ? 'bg-red-600 text-white'
                      : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                  }`}
                >
                  Script Completo (Drive + Planilha Automática)
                </button>
              </div>

              <button
                type="button"
                onClick={copyCode}
                className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg border border-neutral-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Código
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 border border-neutral-800">
                <code>{activeCodeTab === 'current' ? currentScriptCode : enhancedScriptCode}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-200 bg-neutral-50 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-800 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            id="btn-save-gas-config"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
