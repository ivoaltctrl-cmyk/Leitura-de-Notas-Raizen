import React, { useState, useRef, useEffect } from 'react';
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
  Zap,
  Check,
  Cpu,
  Clock,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { AbastecimentoRecord, GasConfig } from '../types';
import { compressImage, processReceiptPipeline, uploadImageToGoogleDrive } from '../utils/driveService';

interface UploadReceiptTabProps {
  gasConfig: GasConfig;
  onAddRecord: (record: AbastecimentoRecord) => void;
  onSwitchToSpreadsheet: () => void;
  onOpenSettingsModal: () => void;
  recentRecords?: AbastecimentoRecord[];
}

export const UploadReceiptTab: React.FC<UploadReceiptTabProps> = ({
  gasConfig,
  onAddRecord,
  onSwitchToSpreadsheet,
  onOpenSettingsModal,
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
  const [useCamera, setUseCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
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

  // Start live webcam / mobile back camera
  const startCamera = async () => {
    setErrorMsg(null);
    setLastSavedRecord(null);
    setUseCamera(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Erro ao acessar a câmera:', err);
      setErrorMsg('Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou selecione uma foto da galeria.');
      setUseCamera(false);
    }
  };

  // Capture frame from active camera
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

      stopCameraStream();

      const timestamp = new Date();
      const dateStr = `${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}_${String(timestamp.getHours()).padStart(2, '0')}${String(timestamp.getMinutes()).padStart(2, '0')}${String(timestamp.getSeconds()).padStart(2, '0')}`;

      const imgObj = {
        base64,
        dataUrl,
        mimeType: 'image/jpeg',
        fileName: `Nota_Abastecimento_${dateStr}.jpg`,
      };

      setSelectedImage(imgObj);
    }
  };

  // Sample receipt generator for testing with Termino do Abastecimento
  const loadSampleReceipt = (label: string, terminoTime: string = '07:22') => {
    setErrorMsg(null);
    setLastSavedRecord(null);

    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 950;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background paper
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 750, 950);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 720, 920);

    // Header banner
    ctx.fillStyle = '#E52421';
    ctx.fillRect(30, 30, 690, 75);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WFS • ORDEM DE ABASTECIMENTO (RAÍZEN)', 375, 76);

    // Details grid
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px monospace';
    const osNum = `22933${Math.floor(10 + Math.random() * 90)}`;
    ctx.fillText(`Nº NOTA / OS: ${osNum}`, 50, 160);
    ctx.font = '16px monospace';
    ctx.fillText('FORMA PAGTO: CONTRATO', 50, 210);
    ctx.fillText(`CLIENTE: ${label.toUpperCase()}`, 50, 260);
    ctx.fillText('HORA CHEGADA: 07:13', 50, 310);
    ctx.fillText('INÍCIO ABASTECIMENTO: 07:14', 50, 360);
    ctx.fillText(`TÉRMINO ABASTECIMENTO: ${terminoTime}`, 50, 410);
    ctx.fillText('PRODUTO: DIESEL S10 AEROPORTO', 50, 460);
    ctx.fillText('VOLUME TOTAL: 224,00 LITROS', 50, 510);
    ctx.fillText('OBS / EQUIPAMENTO: GE135 - PÁTIO T2', 50, 560);
    ctx.fillText('ASSINATURA CLIENTE: joanilson 304371', 50, 620);

    // Stamp
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 680, 360, 110);
    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ABASTECIMENTO CONFERIDO & REGISTRADO', 65, 720);
    ctx.font = '13px sans-serif';
    ctx.fillText('MATRÍCULA: 304371 - GRU AIRPORT', 65, 755);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

    const imgObj = {
      base64,
      dataUrl,
      mimeType: 'image/jpeg',
      fileName: `Nota_${label.toLowerCase()}_${Date.now()}.jpg`,
      fileSize: 56000,
    };

    setSelectedImage(imgObj);
  };

  /**
   * Envio Direto: Front ➔ Google Drive (Sem passar por leitura intermediária)
   */
  const handleExecuteDirectDriveUpload = async () => {
    if (!selectedImage) {
      setErrorMsg('Por favor, tire uma foto ou selecione uma imagem da nota.');
      return;
    }

    if (!gasConfig.webhookUrl) {
      setErrorMsg('Configure a URL do Webhook do Google Apps Script em "Configurar Drive" antes de enviar.');
      return;
    }

    setIsProcessingPipeline(true);
    setErrorMsg(null);
    setPipelineStep('Enviando foto diretamente para a pasta do Google Drive...');

    try {
      const result = await uploadImageToGoogleDrive(
        gasConfig.webhookUrl,
        selectedImage.dataUrl,
        selectedImage.fileName,
        selectedImage.mimeType
      );

      if (result.sucesso) {
        const fakeRecord: AbastecimentoRecord = {
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

        onAddRecord(fakeRecord);
        setLastSavedRecord(fakeRecord);
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

  /**
   * Complete Pipeline Execution:
   * Front ➔ Driver (Google Drive) ➔ Back (IA Gemini) ➔ Sheets (Dados_Raizen) ➔ Front (Espelho)
   */
  const handleExecuteFullPipeline = async () => {
    if (!selectedImage) {
      setErrorMsg('Por favor, tire uma foto ou selecione uma imagem da nota.');
      return;
    }

    setIsProcessingPipeline(true);
    setErrorMsg(null);
    setPipelineStep('Enviando foto para o Google Drive e processando...');

    try {
      // If user configured webhook, use direct upload or flow
      const result = await processReceiptPipeline(
        selectedImage.dataUrl,
        selectedImage.fileName,
        selectedImage.mimeType,
        gasConfig.webhookUrl
      );

      if (result.sucesso && result.record) {
        onAddRecord(result.record);
        setLastSavedRecord(result.record);
        setSelectedImage(null);
      } else {
        setErrorMsg(result.mensagem || 'Falha ao processar o comprovante.');
      }
    } catch (err: any) {
      setErrorMsg(`Erro no envio: ${err.message || 'Falha de comunicação'}`);
    } finally {
      setIsProcessingPipeline(false);
      setPipelineStep('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner / Info & Google Integration Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-neutral-900 tracking-tight">
              Fluxo Automático Integrado
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 flex-wrap">
              <span className="font-semibold text-neutral-700">Front</span>
              <span>➔</span>
              <span className="font-semibold text-emerald-700">Google Drive</span>
              <span>➔</span>
              <span className="font-semibold text-blue-700">Back (IA)</span>
              <span>➔</span>
              <span className="font-semibold text-red-700">Sheets (Dados_Raizen)</span>
              <span>➔</span>
              <span className="font-semibold text-neutral-700">Front</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettingsModal}
          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configurar Drive & Sheets</span>
          {gasConfig.webhookUrl ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          )}
        </button>
      </div>

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
                  Comprovante Processado e Espelhado!
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  OS #{lastSavedRecord.numero || 'Sem Nº'} • {lastSavedRecord.cliente || 'WFS'} • Término: {lastSavedRecord.terminoAbastecimento || '-'} • {lastSavedRecord.volume || '0'} L
                </p>
                <p className="text-[11px] text-emerald-700">
                  {lastSavedRecord.statusMsg || 'Gravado com sucesso no Google Drive e refletido na planilha.'}
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
                setLastSavedRecord(null);
                startCamera();
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
              Ver Planilha Espelhada (Colunas A a K)
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-900 rounded-2xl p-4 flex items-start space-x-3 text-xs shadow-xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Aviso no processamento: </span>
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
              Captura e Envio do Comprovante
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-neutral-500">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Drive + Google Sheets</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Active Camera View */}
          {useCamera ? (
            <div className="space-y-4">
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-4/3 sm:aspect-16/10 flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Target Frame overlay */}
                <div className="absolute inset-4 sm:inset-8 border-2 border-white/60 border-dashed rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md self-center backdrop-blur-xs">
                    Enquadre a nota de abastecimento Raízen aqui
                  </span>
                  <div className="flex justify-between items-end text-white/50 text-[10px]">
                    <span>WFS RAÍZEN</span>
                    <span>HD 1080p</span>
                  </div>
                </div>
              </div>

              {/* Camera Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-capture-now"
                  onClick={capturePhoto}
                  className="py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  Fotografar Nota
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : selectedImage ? (
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

              {/* Primary Actions: Direct Drive Upload and Full Pipeline */}
              <div className="space-y-3">
                <button
                  type="button"
                  id="btn-upload-direct-drive"
                  onClick={handleExecuteDirectDriveUpload}
                  disabled={isProcessingPipeline}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-neutral-300 text-white rounded-2xl text-base font-black flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer transform active:scale-[0.99]"
                >
                  {isProcessingPipeline ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{pipelineStep || 'Enviando foto para a pasta do Drive...'}</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-5 h-5" />
                      <span>Salvar Foto Diretamente no Google Drive</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-neutral-500 font-medium">
                  Cria o arquivo JPG na pasta <code>Comprovantes_Raizen</code> do Google Drive.
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
                  Clique para selecionar da galeria ou arraste aqui
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Formatos aceitos: JPG, PNG, fotos de smartphone e documentos escaneados
                </p>
              </div>

              {/* Direct Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-open-camera-main"
                  onClick={startCamera}
                  className="py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-red-500" />
                  <span>Abrir Câmera do Celular</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3.5 px-4 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-5 h-5 text-neutral-600" />
                  <span>Escolher da Galeria</span>
                </button>
              </div>

              {/* Quick sample receipts buttons for testing */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Testar com exemplo rápido:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => loadSampleReceipt('Orbital Serv', '07:22')}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    Exemplo 1 (Orbital)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleReceipt('Swissport', '10:35')}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    Exemplo 2 (Swissport)
                  </button>
                </div>
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
              Últimos Comprovantes no Fluxo ({recentRecords.length})
            </h3>
            <button
              type="button"
              onClick={onSwitchToSpreadsheet}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Planilha Base</span>
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
                      {rec.cliente || 'WFS'} • OS #{rec.numero || rec.id.slice(-4)} ({rec.volume ? `${rec.volume} L` : '-'})
                    </div>
                    <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                      <span>Término: {rec.terminoAbastecimento || '-'}</span>
                      <span>•</span>
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
                    Espelhado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
