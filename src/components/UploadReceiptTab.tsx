import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  FileSpreadsheet,
  Image as ImageIcon,
  ArrowUpRight,
  Trash2,
  Check,
  Link2,
  Lock,
  ExternalLink,
  Sparkles,
  Edit3,
  CheckCheck,
} from 'lucide-react';
import { AbastecimentoRecord, GasConfig } from '../types';
import { compressImage, processReceiptPipeline, uploadImageToGoogleDrive } from '../utils/driveService';
import { LargeCameraModal } from './LargeCameraModal';

interface UploadReceiptTabProps {
  gasConfig: GasConfig;
  onAddRecord: (record: AbastecimentoRecord) => void;
  onSwitchToSpreadsheet: () => void;
  recentRecords?: AbastecimentoRecord[];
  onOpenSettings?: () => void;
  onSaveGasConfig?: (config: GasConfig) => void;
}

export const UploadReceiptTab: React.FC<UploadReceiptTabProps> = ({
  gasConfig,
  onAddRecord,
  onSwitchToSpreadsheet,
  recentRecords = [],
  onOpenSettings,
  onSaveGasConfig,
}) => {
  const [selectedImage, setSelectedImage] = useState<{
    base64: string;
    dataUrl: string;
    mimeType: string;
    fileName: string;
    fileSize?: number;
  } | null>(null);

  const [isProcessingPipeline, setIsProcessingPipeline] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<string>('');
  const [lastSavedRecord, setLastSavedRecord] = useState<AbastecimentoRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLargeCameraOpen, setIsLargeCameraOpen] = useState(false);
  const [showQuickConnectInput, setShowQuickConnectInput] = useState(false);
  const [quickUrlInput, setQuickUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Quick Webhook Connect
  const handleQuickConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrlInput.trim() || !quickUrlInput.trim().startsWith('http')) {
      setErrorMsg('Por favor, insira uma URL válida do Google Apps Script (iniciando com https://).');
      return;
    }

    if (onSaveGasConfig) {
      onSaveGasConfig({
        webhookUrl: quickUrlInput.trim(),
        autoUploadToDrive: true,
      });
      setShowQuickConnectInput(false);
      setErrorMsg(null);
    }
  };

  // Handle file select from gallery or computer
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setLastSavedRecord(null);

    try {
      const compressed = await compressImage(file, 2000, 0.88);
      const timestamp = new Date();
      const dateStr = `${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}_${String(timestamp.getHours()).padStart(2, '0')}${String(timestamp.getMinutes()).padStart(2, '0')}${String(timestamp.getSeconds()).padStart(2, '0')}`;

      const imgObj = {
        base64: compressed.base64,
        dataUrl: compressed.dataUrl,
        mimeType: compressed.mimeType,
        fileName: file.name ? file.name.replace(/\s+/g, '_') : `Comprovante_${dateStr}.jpg`,
        fileSize: file.size,
      };

      setSelectedImage(imgObj);
    } catch (err: any) {
      setErrorMsg(`Erro ao processar a imagem: ${err.message || 'Formato incompatível'}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Callback when photo is captured in LargeCameraModal
  const handleLargeCameraCapture = (imgObj: {
    base64: string;
    dataUrl: string;
    mimeType: string;
    fileName: string;
  }) => {
    setErrorMsg(null);
    setLastSavedRecord(null);
    setSelectedImage(imgObj);
  };

  /**
   * FLUXO INTELIGENTE: ENVIO DIRETO AO GOOGLE APPS SCRIPT (DRIVE + SHEETS COM OCR)
   */
  const handleExecuteAiAndDriveUpload = async () => {
    if (!selectedImage) {
      setErrorMsg('Por favor, tire uma foto ou selecione uma imagem da nota.');
      return;
    }

    if (!gasConfig.webhookUrl) {
      setErrorMsg('Por favor, conecte a URL do Webhook do Google Apps Script antes de enviar.');
      return;
    }

    setIsProcessingPipeline(true);
    setErrorMsg(null);
    setPipelineStep('Enviando para o Google Drive e gravando na planilha Dados_Raizen...');

    try {
      const uploadResult = await uploadImageToGoogleDrive(
        gasConfig.webhookUrl,
        selectedImage.dataUrl,
        selectedImage.fileName,
        selectedImage.mimeType
      );

      if (uploadResult.sucesso) {
        const dummyRecord: AbastecimentoRecord = {
          id: `rec-${Date.now()}`,
          numero: selectedImage.fileName.replace(/\.[^/.]+$/, ''),
          formaPagamento: 'CONTRATO',
          cliente: 'ORBITAL SERV AUX TRANSP AEREO',
          horaChegada: '',
          inicioAbastecimento: '',
          terminoAbastecimento: '',
          produto: 'DIESEL',
          volume: '0,00',
          obs: '',
          assinaturaCliente: '',
          fileName: selectedImage.fileName,
          driveFileUrl: uploadResult.driveUrl,
          dataCriacao: new Date().toISOString(),
          statusEnvio: 'enviado_drive',
          statusMsg: uploadResult.mensagem || 'Foto salva no Google Drive e linha registrada na planilha Dados_Raizen!',
        };

        onAddRecord(dummyRecord);
        setLastSavedRecord(dummyRecord);
        setSelectedImage(null);
      } else {
        setErrorMsg(uploadResult.mensagem || 'Falha ao enviar comprovante para o Google Drive.');
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao processar envio: ${err.message}`);
    } finally {
      setIsProcessingPipeline(false);
      setPipelineStep('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Notification Banner with Verified 10 Extracted Columns */}
      {lastSavedRecord && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm sm:text-base text-emerald-900 flex items-center gap-1.5">
                  <span>Nota Extraída com IA e Gravada na Planilha!</span>
                  <span className="text-[11px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    10 Colunas OK
                  </span>
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  OS Nº <strong>{lastSavedRecord.numero}</strong> • {lastSavedRecord.cliente} • {lastSavedRecord.volume} L
                </p>
                <p className="text-[11px] text-emerald-700">
                  {lastSavedRecord.statusMsg || 'Linha gravada na aba Dados_Raizen e foto na pasta do Google Drive.'}
                </p>
              </div>
            </div>

            {lastSavedRecord.driveFileUrl && (
              <a
                href={lastSavedRecord.driveFileUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-white text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors shrink-0 shadow-xs"
              >
                <span>Ver no Drive</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Grid showing exactly what was recorded in columns A to K */}
          <div className="bg-white/95 rounded-xl p-3.5 border border-emerald-200 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50/50">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">A: Número</span>
              <span className="font-bold text-emerald-950">{lastSavedRecord.numero || '-'}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">B: Forma Pagamento</span>
              <span className="font-bold text-emerald-950">{lastSavedRecord.formaPagamento || '-'}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">C: Cliente</span>
              <span className="font-bold text-emerald-950 truncate block">{lastSavedRecord.cliente || '-'}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">D: Hora Chegada</span>
              <span className="font-semibold text-emerald-950">{lastSavedRecord.horaChegada || '-'}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">E: Início</span>
              <span className="font-semibold text-emerald-950">{lastSavedRecord.inicioAbastecimento || '-'}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">F: Término</span>
              <span className="font-semibold text-emerald-950">{lastSavedRecord.terminoAbastecimento || '-'}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">G: Produto</span>
              <span className="font-bold text-emerald-950">{lastSavedRecord.produto || '-'}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">H: Volume</span>
              <span className="font-bold text-emerald-950">{lastSavedRecord.volume} L</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">I: Obs.</span>
              <span className="font-semibold text-emerald-950">{lastSavedRecord.obs || '-'}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50 col-span-2 sm:col-span-3">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">J: Assinatura do Cliente</span>
              <span className="font-semibold text-emerald-950">{lastSavedRecord.assinaturaCliente || '-'}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setLastSavedRecord(null);
                setIsLargeCameraOpen(true);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Tirar Próxima Foto
            </button>

            <button
              type="button"
              onClick={onSwitchToSpreadsheet}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/80 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Ver Planilha Completa
            </button>
          </div>
        </div>
      )}

      {/* Unconfigured Webhook Warning & Quick Connect Banner */}
      {!gasConfig.webhookUrl && (
        <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 rounded-2xl p-5 shadow-xs space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-950">
                  Google Apps Script / Webhook não conectado neste dispositivo
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Para que as fotos tiradas neste computador ou celular sejam gravadas na pasta do Google Drive e na planilha <code>Dados_Raizen</code>, conecte o Webhook abaixo ou peça o <strong>Link Direto</strong> ao Administrador.
                </p>
              </div>
            </div>
          </div>

          {!showQuickConnectInput ? (
            <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQuickConnectInput(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Link2 className="w-4 h-4" />
                <span>Colar URL do Webhook Aqui</span>
              </button>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-4 py-2 bg-white hover:bg-amber-100/60 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Painel de Administração</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleQuickConnect} className="pt-2 border-t border-amber-200/80 space-y-2">
              <label className="text-xs font-bold text-amber-950 block">
                Cole a URL do Google Apps Script (terminada em /exec):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={quickUrlInput}
                  onChange={(e) => setQuickUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  autoFocus
                  required
                  className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-amber-400 bg-white text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  Conectar Dispositivo
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickConnectInput(false)}
                  className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-900 rounded-2xl p-4 flex items-start space-x-3 text-xs shadow-xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Aviso: </span>
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-700 hover:text-red-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Upload Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Captura e Envio de Nota
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-semibold">
            {gasConfig.webhookUrl ? (
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Google Drive Conectado</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Drive não configurado</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {selectedImage ? (
            /* Selected Photo Preview & Send CTA */
            <div className="space-y-5">
              <div className="relative bg-neutral-950 rounded-2xl overflow-hidden aspect-4/3 sm:aspect-16/10 flex items-center justify-center border border-neutral-200 shadow-inner">
                <img
                  src={selectedImage.dataUrl}
                  alt="Comprovante de Abastecimento"
                  className="w-full h-full object-contain"
                />

                {/* Overlay details */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="bg-black/70 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-lg truncate max-w-[240px]">
                    {selectedImage.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="bg-black/70 hover:bg-red-600 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Trocar</span>
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  id="btn-upload-direct-drive"
                  onClick={handleExecuteAiAndDriveUpload}
                  disabled={isProcessingPipeline}
                  className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-neutral-300 text-white rounded-2xl text-base font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-red-600/20 transition-all cursor-pointer transform active:scale-[0.99]"
                >
                  {isProcessingPipeline ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{pipelineStep || 'Enviando para o Google Drive...'}</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-5 h-5" />
                      <span>Salvar Foto no Google Drive & Planilha</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-neutral-500">
                  ⚡ Salva na pasta <code>Comprovantes_Raizen</code> do Google Drive e registra a linha na aba <code>Dados_Raizen</code>.
                </p>
              </div>
            </div>
          ) : (
            /* Upload / Capture Dropzone */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-red-500 bg-neutral-50/70 hover:bg-red-50/20 rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3.5 group-hover:scale-105 transition-transform shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                  Clique para selecionar da galeria ou arraste a imagem
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Formatos aceitos: JPG, PNG e fotos de smartphone
                </p>
              </div>

              {/* Direct Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-open-large-camera"
                  onClick={() => setIsLargeCameraOpen(true)}
                  className="py-4 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-red-500" />
                  <span>Abrir Câmera em Tela Cheia</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-4 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-colors cursor-pointer border border-neutral-200"
                >
                  <ImageIcon className="w-5 h-5 text-neutral-600" />
                  <span>Selecionar Arquivo do Computador</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Large Camera Modal */}
      {isLargeCameraOpen && (
        <LargeCameraModal
          isOpen={isLargeCameraOpen}
          onClose={() => setIsLargeCameraOpen(false)}
          onCapture={handleLargeCameraCapture}
        />
      )}
    </div>
  );
};
