import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  FlipHorizontal,
  Zap,
  Sparkles,
  Maximize2,
  Check,
} from 'lucide-react';

interface LargeCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageObj: {
    base64: string;
    dataUrl: string;
    mimeType: string;
    fileName: string;
  }) => void;
}

export const LargeCameraModal: React.FC<LargeCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (isOpen) {
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCameraStream = async (mode: 'environment' | 'user') => {
    stopCameraStream();
    setIsInitializing(true);
    setErrorMsg(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Erro ao iniciar câmera grande:', err);
      setErrorMsg(
        'Não foi possível acessar a câmera em alta resolução. Verifique as permissões do navegador.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    let width = video.videoWidth || 1600;
    let height = video.videoHeight || 1200;
    const maxDim = 1600;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

      onCapture({
        base64,
        dataUrl,
        mimeType: 'image/jpeg',
        fileName: `Nota_Abastecimento_${dateStr}.jpg`,
      });

      stopCameraStream();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-2 text-white">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-sm font-bold tracking-wide">CÂMERA DE CAPTURA - WFS RAÍZEN</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleCameraFacing}
            title="Alternar Câmera"
            className="p-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-full text-white transition-all cursor-pointer"
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-3 bg-white/20 hover:bg-red-600/80 active:bg-red-700 backdrop-blur-md rounded-full text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Large Viewport Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {isInitializing && (
          <div className="absolute z-10 flex flex-col items-center gap-2 text-white/80">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
            <span className="text-xs font-semibold">Iniciando câmera de alta resolução...</span>
          </div>
        )}

        {errorMsg ? (
          <div className="p-6 bg-red-950/80 border border-red-500 text-white rounded-2xl max-w-md text-center space-y-3 z-10 m-4">
            <p className="text-sm">{errorMsg}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-neutral-900 rounded-xl text-xs font-bold"
            >
              Fechar Câmera
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover sm:object-contain bg-black"
          />
        )}

        {/* Framing Guides for fuel receipt */}
        <div className="absolute inset-4 sm:inset-12 pointer-events-none flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 border-t-3 border-l-3 border-red-500 rounded-tl-xl shadow-sm"></div>
            <div className="w-10 h-10 border-t-3 border-r-3 border-red-500 rounded-tr-xl shadow-sm"></div>
          </div>

          {/* Central receipt reticle badge */}
          <div className="self-center bg-black/60 backdrop-blur-md text-white text-xs font-medium px-4 py-1.5 rounded-full border border-white/20 shadow-lg">
            Posicione a Nota de Abastecimento inteira dentro do quadro
          </div>

          <div className="flex justify-between items-end">
            <div className="w-10 h-10 border-b-3 border-l-3 border-red-500 rounded-bl-xl shadow-sm"></div>
            <div className="w-10 h-10 border-b-3 border-r-3 border-red-500 rounded-br-xl shadow-sm"></div>
          </div>
        </div>
      </div>

      {/* Bottom Shutter Action Bar */}
      <div className="p-6 sm:p-8 flex items-center justify-center z-20 bg-gradient-to-t from-black/90 to-transparent">
        <button
          type="button"
          onClick={handleCapture}
          className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-95 cursor-pointer shadow-2xl hover:border-red-400 group"
        >
          <div className="w-full h-full bg-red-600 group-hover:bg-red-500 rounded-full flex items-center justify-center shadow-inner">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
};
