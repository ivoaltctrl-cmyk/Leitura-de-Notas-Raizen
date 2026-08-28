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
} from 'lucide-react';
import { AbastecimentoRecord, GasConfig } from '../types';
import { compressImage, uploadImageToGoogleDrive } from '../utils/driveService';
import { LargeCameraModal } from './LargeCameraModal';
import { OperatorAuthModal } from './OperatorAuthModal';

interface UploadReceiptTabProps {
  gasConfig: GasConfig;
  onAddRecord: (record: AbastecimentoRecord) => void;
  onSwitchToSpreadsheet: () => void;
  recentRecords?: AbastecimentoRecord[];
}

export const UploadReceiptTab: React.FC<UploadReceiptTabProps> = ({
  gasConfig,
  onAddRecord,
  onSwitchToSpreadsheet,
  recentRecords = [],
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Checks if current browser session has already been authenticated
  const checkIsAuthenticated = () => {
    try {
      return (
        sessionStorage.getItem('operator_session_auth') === 'true' ||
        sessionStorage.getItem('admin_session_auth') === 'true'
      );
    } catch {
      return false;
    }
  };

  // Wrapper that asks for password on button click if unauthenticated
  const executeWithAuth = (action: () => void) => {
    if (checkIsAuthenticated()) {
      action();
    } else {
      pendingActionRef.current = action;
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action();
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
   * Envio Direto: Front ➔ Google Drive
   */
  const handleExecuteDirectDriveUpload = async () => {
    if (!selectedImage) {
      setErrorMsg('Por favor, tire uma foto ou selecione uma imagem da nota.');
      return;
    }

    if (!gasConfig.webhookUrl) {
      setErrorMsg('O Webhook do Google Apps Script precisa ser configurado na aba de Configurações pelo Administrador.');
      return;
    }

    setIsProcessingPipeline(true);
    setErrorMsg(null);
    setPipelineStep('Enviando foto para a pasta do Google Drive...');

    try {
      const result = await uploadImageToGoogleDrive(
        gasConfig.webhookUrl,
        selectedImage.dataUrl,
        selectedImage.fileName,
        selectedImage.mimeType,
        gasConfig.secretToken
      );

      if (result.sucesso) {
        const record: AbastecimentoRecord = {
          id: `REC_${Date.now()}`,
          numero: selectedImage.fileName.replace(/\.[^/.]+$/, ''),
          fileName: selectedImage.fileName,
          fotoBase64: selectedImage.dataUrl,
          fotoMimeType: selectedImage.mimeType,
          fileSize: selectedImage.fileSize,
          formaPagamento: 'CONTRATO',
          cliente: 'WFS / RAÍZEN',
          horaChegada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          inicioAbastecimento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          terminoAbastecimento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          produto: 'DIESEL',
          volume: 'Salvo no Drive',
          obs: 'Enviado diretamente ao Google Drive',
          assinaturaCliente: 'OK',
          driveFileId: result.fileId || '',
          driveFileUrl: result.driveUrl || '',
          statusEnvio: 'enviado_drive',
          statusMsg: 'Foto salva com sucesso na pasta do Google Drive!',
          dataCriacao: new Date().toISOString(),
        };

        onAddRecord(record);
        setLastSavedRecord(record);
        setSelectedImage(null);
      } else {
        setErrorMsg(result.mensagem || 'Falha ao salvar no Google Drive.');
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao enviar para o Google Drive: ${err.message}`);
    } finally {
      setIsProcessingPipeline(false);
      setPipelineStep('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Notification Banner */}
      {lastSavedRecord && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl p-5 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm sm:text-base text-emerald-900 flex items-center gap-1.5">
                  Foto Salva no Google Drive com Sucesso!
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  Arquivo: {lastSavedRecord.fileName || 'Comprovante'} • {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-[11px] text-emerald-700">
                  {lastSavedRecord.statusMsg || 'Gravado com sucesso na pasta do Google Drive.'}
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

          <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                executeWithAuth(() => {
                  setLastSavedRecord(null);
                  setIsLargeCameraOpen(true);
                });
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
              Ver Histórico de Registros
            </button>
          </div>
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
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-neutral-500">
            <HardDrive className="w-3.5 h-3.5 text-neutral-600" />
            <span>Google Drive</span>
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
                  onClick={() => executeWithAuth(handleExecuteDirectDriveUpload)}
                  disabled={isProcessingPipeline}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-neutral-300 text-white rounded-2xl text-base font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer transform active:scale-[0.99]"
                >
                  {isProcessingPipeline ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{pipelineStep || 'Enviando foto para a pasta do Drive...'}</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-5 h-5" />
                      <span>Salvar Foto no Google Drive</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Upload / Capture Dropzone */
            <div className="space-y-4">
              <div
                onClick={() => executeWithAuth(() => fileInputRef.current?.click())}
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
                  onClick={() => executeWithAuth(() => setIsLargeCameraOpen(true))}
                  className="py-4 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-red-500" />
                  <span>Abrir Câmera em Tela Cheia</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeWithAuth(() => fileInputRef.current?.click())}
                  className="py-4 px-4 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-5 h-5 text-neutral-600" />
                  <span>Escolher da Galeria</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Uploads Section */}
      {recentRecords && recentRecords.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Últimos Comprovantes Enviados ({recentRecords.length})
            </h3>
            <button
              type="button"
              onClick={onSwitchToSpreadsheet}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Tabela Completa</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-neutral-100">
            {recentRecords.slice(0, 4).map((rec) => (
              <div key={rec.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 overflow-hidden text-neutral-500">
                    {rec.fotoBase64 ? (
                      <img src={rec.fotoBase64} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-neutral-800 truncate">
                      {rec.fileName || rec.numero || 'Comprovante'}
                    </div>
                    <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                      <span>
                        {new Date(rec.dataCriacao).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(rec.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="w-3 h-3" />
                    Salvo no Drive
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Large Viewport Camera Modal */}
      <LargeCameraModal
        isOpen={isLargeCameraOpen}
        onClose={() => setIsLargeCameraOpen(false)}
        onCapture={handleLargeCameraCapture}
      />

      {/* Operator Authentication Modal */}
      <OperatorAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          pendingActionRef.current = null;
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};
