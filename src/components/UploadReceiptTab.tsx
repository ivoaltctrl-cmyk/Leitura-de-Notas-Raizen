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
  Sparkles,
  Zap,
  Check,
  Eye,
} from 'lucide-react';
import { AbastecimentoRecord, GasConfig } from '../types';
import { compressImage, uploadImageToGoogleDrive } from '../utils/driveService';

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

  const [isUploading, setIsUploading] = useState(false);
  const [lastSavedRecord, setLastSavedRecord] = useState<AbastecimentoRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

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
    setCameraActive(false);
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
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('Erro ao acessar a câmera:', err);
      setErrorMsg('Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou selecione uma foto da galeria.');
      setUseCamera(false);
      setCameraActive(false);
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

  // Sample receipt generator for quick preview/test
  const loadSampleReceipt = (label: string) => {
    setErrorMsg(null);
    setLastSavedRecord(null);

    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background paper
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 700, 900);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 670, 870);

    // Header banner
    ctx.fillStyle = '#E31B23';
    ctx.fillRect(30, 30, 640, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WFS • ORDEM DE ABASTECIMENTO', 350, 75);

    // Details grid
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`Nº ORDEM: 22933${Math.floor(10 + Math.random() * 90)}`, 50, 150);
    ctx.font = '16px monospace';
    ctx.fillText('FORMA PAGTO: CONTRATO', 50, 200);
    ctx.fillText(`CLIENTE: ${label.toUpperCase()}`, 50, 250);
    ctx.fillText('HORA CHEGADA: 07:13   |   INÍCIO: 07:14', 50, 300);
    ctx.fillText('PRODUTO: DIESEL S10 AEROPORTO', 50, 350);
    ctx.fillText('VOLUME TOTAL: 224,00 LITROS', 50, 400);
    ctx.fillText('OBS / EQUIPAMENTO: GRU-PATIO-135', 50, 450);
    ctx.fillText('RESPONSÁVEL: OPERADOR WFS 304371', 50, 520);

    // Stamp
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 580, 320, 100);
    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ABASTECIMENTO CONFERIDO', 70, 620);
    ctx.font = '13px sans-serif';
    ctx.fillText('MATRÍCULA: 304371 - GRU', 70, 655);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

    const imgObj = {
      base64,
      dataUrl,
      mimeType: 'image/jpeg',
      fileName: `Nota_${label.toLowerCase()}_${Date.now()}.jpg`,
      fileSize: 52000,
    };

    setSelectedImage(imgObj);
  };

  // Submit and Upload directly to Google Drive
  const handleUploadToDrive = async () => {
    if (!selectedImage) {
      setErrorMsg('Por favor, tire uma foto ou selecione uma imagem da nota.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    const recordId = `rec-${Date.now()}`;
    let driveFileId: string | undefined;
    let driveFileUrl: string | undefined;
    let statusEnvio: 'enviado_drive' | 'pendente' | 'erro' = 'enviado_drive';
    let statusMsg = 'Foto enviada para o Google Drive com sucesso!';

    try {
      const uploadRes = await uploadImageToGoogleDrive(
        gasConfig.webhookUrl,
        selectedImage.dataUrl,
        selectedImage.fileName,
        selectedImage.mimeType
      );

      if (uploadRes.sucesso) {
        driveFileId = uploadRes.fileId;
        driveFileUrl = uploadRes.driveUrl;
        statusEnvio = 'enviado_drive';
        statusMsg = uploadRes.mensagem || 'Foto enviada com sucesso para a pasta do Google Drive!';
      } else {
        statusEnvio = 'erro';
        statusMsg = uploadRes.mensagem;
        setErrorMsg(uploadRes.mensagem);
      }
    } catch (err: any) {
      statusEnvio = 'erro';
      statusMsg = `Erro no envio: ${err.message || 'Falha de conexão'}`;
      setErrorMsg(statusMsg);
    } finally {
      const newRecord: AbastecimentoRecord = {
        id: recordId,
        fileName: selectedImage.fileName,
        fotoBase64: selectedImage.dataUrl,
        fotoMimeType: selectedImage.mimeType,
        driveFileId: driveFileId,
        driveFileUrl: driveFileUrl,
        dataCriacao: new Date().toISOString(),
        statusEnvio: statusEnvio,
        statusMsg: statusMsg,
      };

      onAddRecord(newRecord);
      setLastSavedRecord(newRecord);
      setIsUploading(false);
      setSelectedImage(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner / Info */}
      <div className="text-center space-y-1.5 pb-2">
        <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          Envio de Comprovante de Abastecimento
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
          Tire ou selecione a foto da nota. A imagem será salva diretamente na pasta designada do Google Drive para processamento.
        </p>
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
                  Foto enviada com sucesso!
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  {lastSavedRecord.fileName} • {new Date(lastSavedRecord.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-[11px] text-emerald-700">
                  {lastSavedRecord.statusMsg || 'Arquivo registrado e disponível no Google Drive.'}
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
              Ver Histórico de Envios
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-900 rounded-2xl p-4 flex items-start space-x-3 text-xs shadow-xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Aviso no envio: </span>
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
              Captura do Comprovante
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-neutral-500">
            <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
            <span>Destino: Google Drive</span>
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
                    Enquadre a nota de abastecimento aqui
                  </span>
                  <div className="flex justify-between items-end text-white/50 text-[10px]">
                    <span>WFS</span>
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

              {/* Big Primary Action: Send to Google Drive */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="btn-send-to-drive"
                  onClick={handleUploadToDrive}
                  disabled={isUploading}
                  className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-neutral-300 text-white rounded-2xl text-base font-black flex items-center justify-center gap-2.5 shadow-lg shadow-red-600/20 transition-all cursor-pointer transform active:scale-[0.99]"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Enviando para o Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-5 h-5" />
                      <span>Enviar Comprovante para o Google Drive</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-neutral-500 font-medium">
                  Ao clicar, a foto é compactada e transferida com segurança para a nuvem.
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
                  Formatos aceitos: JPG, PNG, fotos de smartphone e documentos
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
                    onClick={() => loadSampleReceipt('Orbital Serv')}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    Exemplo 1 (Orbital)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleReceipt('Swissport')}
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
              Últimos Comprovantes Enviados ({recentRecords.length})
            </h3>
            <button
              type="button"
              onClick={onSwitchToSpreadsheet}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
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
                      {rec.fileName || `Comprovante #${rec.id.slice(-5)}`}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {new Date(rec.dataCriacao).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(rec.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="w-3 h-3" />
                    Enviado
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
