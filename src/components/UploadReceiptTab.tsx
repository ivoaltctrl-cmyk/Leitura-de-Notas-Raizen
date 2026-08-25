import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Clock,
  User,
  Fuel,
  CreditCard,
  Building,
  Image as ImageIcon,
  Check,
  Zap,
} from 'lucide-react';
import { AbastecimentoRecord, GasConfig, ExtractedReceiptData } from '../types';
import { compressImage, uploadImageToGoogleDrive } from '../utils/driveService';
import { extractReceiptData } from '../utils/receiptExtractor';

interface UploadReceiptTabProps {
  gasConfig: GasConfig;
  onAddRecord: (record: AbastecimentoRecord) => void;
  onOpenSettings: () => void;
  onSwitchToSpreadsheet: () => void;
}

export const UploadReceiptTab: React.FC<UploadReceiptTabProps> = ({
  gasConfig,
  onAddRecord,
  onOpenSettings,
  onSwitchToSpreadsheet,
}) => {
  const [selectedImage, setSelectedImage] = useState<{
    base64: string;
    dataUrl: string;
    mimeType: string;
    fileName: string;
    fileSize?: number;
  } | null>(null);

  const [formData, setFormData] = useState<ExtractedReceiptData>({
    numero: '',
    formaPagamento: 'CONTRATO',
    cliente: '',
    horaChegada: '',
    inicioAbastecimento: '',
    produto: 'DIESEL',
    volume: '',
    obs: '',
    assinaturaCliente: '',
    confidenceNotes: '',
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [lastSavedRecord, setLastSavedRecord] = useState<AbastecimentoRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to load sample test receipt
  const loadSampleReceipt = (type: 'orbital' | 'swissport') => {
    setErrorMsg(null);
    setLastSavedRecord(null);

    // Create a realistic sample receipt image using HTML Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background paper
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 600, 800);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 580, 780);

    // Header banner
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(20, 20, 560, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORDEM DE ABASTECIMENTO - AEROPORTO', 300, 55);

    // Details grid
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';

    if (type === 'orbital') {
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Nº DA NOTA / O.S.: 2293305', 40, 120);
      ctx.font = '14px monospace';
      ctx.fillText('FORMA DE PAGTO: CONTRATO', 40, 160);
      ctx.fillText('CLIENTE: ORBITAL SERV AUX TRANSP AEREO', 40, 200);
      ctx.fillText('HORA CHEGADA: 07:13   |  INÍCIO: 07:14', 40, 240);
      ctx.fillText('PRODUTO: DIESEL S10', 40, 280);
      ctx.fillText('VOLUME TOTAL: 224,00 LITROS', 40, 320);
      ctx.fillText('OBS / EQUIPAMENTO: GE135 (GRU AIRPORT)', 40, 360);
      ctx.fillText('RESPONSÁVEL / ASSINATURA: joanilson 304371', 40, 420);

      // Stamp
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 470, 260, 90);
      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('CONFERIDO & LIBERADO', 60, 505);
      ctx.font = '11px sans-serif';
      ctx.fillText('MATRÍCULA: 304371 - JOANILSON', 60, 535);
    } else {
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Nº DA NOTA / O.S.: 2293315', 40, 120);
      ctx.font = '14px monospace';
      ctx.fillText('FORMA DE PAGTO: FATURADO', 40, 160);
      ctx.fillText('CLIENTE: SWISSPORT BRASIL LTDA', 40, 200);
      ctx.fillText('HORA CHEGADA: 09:20   |  INÍCIO: 09:25', 40, 240);
      ctx.fillText('PRODUTO: JET A-1', 40, 280);
      ctx.fillText('VOLUME TOTAL: 1.850,00 LITROS', 40, 320);
      ctx.fillText('OBS / PREFIXO: TRATOR T-08 (PATIO 2)', 40, 360);
      ctx.fillText('RESPONSÁVEL / ASSINATURA: claudio 552109', 40, 420);

      // Stamp
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 470, 260, 90);
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('ABASTECIMENTO CONCLUIDO', 60, 505);
      ctx.font = '11px sans-serif';
      ctx.fillText('MATRÍCULA: 552109 - CLAUDIO', 60, 535);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

    const imgObj = {
      base64,
      dataUrl,
      mimeType: 'image/jpeg',
      fileName: `OS_${type === 'orbital' ? '2293305' : '2293315'}.jpg`,
      fileSize: 45000,
    };

    setSelectedImage(imgObj);

    // Auto trigger extraction
    handleExtractReceipt(imgObj);
  };

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setLastSavedRecord(null);

    try {
      const compressed = await compressImage(file, 2000, 0.88);
      const imgObj = {
        base64: compressed.base64,
        dataUrl: compressed.dataUrl,
        mimeType: compressed.mimeType,
        fileName: file.name || `OS_${Date.now()}.jpg`,
        fileSize: file.size,
      };

      setSelectedImage(imgObj);
      handleExtractReceipt(imgObj);
    } catch (err: any) {
      setErrorMsg(`Erro ao processar imagem: ${err.message}`);
    }
  };

  // Trigger Gemini AI OCR extraction
  const handleExtractReceipt = async (imageObj = selectedImage) => {
    if (!imageObj) return;

    setIsExtracting(true);
    setErrorMsg(null);
    setExtractSuccess(false);

    try {
      const result = await extractReceiptData(imageObj.base64, imageObj.mimeType, gasConfig.geminiApiKey);

      if (result.sucesso && result.dados) {
        const d = result.dados;
        setFormData({
          numero: d.numero || '',
          formaPagamento: d.formaPagamento || 'CONTRATO',
          cliente: d.cliente || '',
          horaChegada: d.horaChegada || '',
          inicioAbastecimento: d.inicioAbastecimento || '',
          produto: d.produto || 'DIESEL',
          volume: d.volume || '',
          obs: d.obs || '',
          assinaturaCliente: d.assinaturaCliente || '',
          confidenceNotes: d.confidenceNotes || '',
        });
        setExtractSuccess(true);
      } else {
        setErrorMsg(result.error || 'Não foi possível extrair dados automaticamente. Você pode preencher manualmente.');
      }
    } catch (err: any) {
      setErrorMsg(`Erro na extração inteligente: ${err.message || 'Falha ao processar nota.'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle webcam capture
  const startCamera = async () => {
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setErrorMsg(`Não foi possível acessar a câmera: ${err.message}`);
      setUseCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

      // Stop camera stream
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach((t) => t.stop());
      setUseCamera(false);

      const imgObj = {
        base64,
        dataUrl,
        mimeType: 'image/jpeg',
        fileName: `FOTO_NOTA_${Date.now()}.jpg`,
      };

      setSelectedImage(imgObj);
      handleExtractReceipt(imgObj);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
    setUseCamera(false);
  };

  // Submit and Save (to Drive + Spreadsheet)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage && !formData.numero) {
      setErrorMsg('Por favor, selecione ou tire uma foto da nota.');
      return;
    }

    setIsUploadingToDrive(true);
    setErrorMsg(null);

    const recordId = `rec-${Date.now()}`;
    let driveFileId: string | undefined;
    let driveFileUrl: string | undefined;
    let statusEnvio: 'enviado_drive' | 'pendente' | 'erro' = 'pendente';
    let statusMsg = 'Salvo na planilha local';

    // If Google Apps Script Webhook is configured, upload to Drive!
    if (gasConfig.webhookUrl && selectedImage) {
      const uploadRes = await uploadImageToGoogleDrive(
        gasConfig.webhookUrl,
        selectedImage.dataUrl,
        selectedImage.fileName || `OS_${formData.numero || Date.now()}.jpg`,
        selectedImage.mimeType,
        formData
      );

      if (uploadRes.sucesso) {
        driveFileId = uploadRes.fileId;
        driveFileUrl = uploadRes.driveUrl;
        statusEnvio = 'enviado_drive';
        statusMsg = 'Arquivo salvo com sucesso no Google Drive!';
      } else {
        statusEnvio = 'erro';
        statusMsg = uploadRes.mensagem;
      }
    }

    const newRecord: AbastecimentoRecord = {
      id: recordId,
      numero: formData.numero || `OS-${Math.floor(100000 + Math.random() * 900000)}`,
      formaPagamento: formData.formaPagamento || 'CONTRATO',
      cliente: formData.cliente || 'CLIENTE NÃO IDENTIFICADO',
      horaChegada: formData.horaChegada || '',
      inicioAbastecimento: formData.inicioAbastecimento || '',
      produto: formData.produto || 'DIESEL',
      volume: formData.volume || '0,00',
      obs: formData.obs || '',
      assinaturaCliente: formData.assinaturaCliente || '',
      fotoBase64: selectedImage?.dataUrl,
      fotoMimeType: selectedImage?.mimeType,
      fileName: selectedImage?.fileName,
      driveFileId: driveFileId,
      driveFileUrl: driveFileUrl,
      dataCriacao: new Date().toISOString(),
      statusEnvio: statusEnvio,
      statusMsg: statusMsg,
    };

    onAddRecord(newRecord);
    setLastSavedRecord(newRecord);
    setIsUploadingToDrive(false);

    // Reset current form for next scan
    setFormData({
      numero: '',
      formaPagamento: 'CONTRATO',
      cliente: '',
      horaChegada: '',
      inicioAbastecimento: '',
      produto: 'DIESEL',
      volume: '',
      obs: '',
      assinaturaCliente: '',
      confidenceNotes: '',
    });
    setSelectedImage(null);
    setExtractSuccess(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Feedback banner if last saved */}
      {lastSavedRecord && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-emerald-900">
                  Nota #{lastSavedRecord.numero} registrada com sucesso!
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-900">
                  {lastSavedRecord.volume} L • {lastSavedRecord.produto}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                {lastSavedRecord.statusEnvio === 'enviado_drive' ? (
                  <>
                    ✅ Arquivo salvo diretamente na pasta do Google Drive!{' '}
                    {lastSavedRecord.driveFileId && (
                      <span className="font-mono font-medium">(ID: {lastSavedRecord.driveFileId})</span>
                    )}
                  </>
                ) : (
                  <>
                    ℹ️ Adicionado à planilha local. (Configure o Drive para envio na nuvem)
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {lastSavedRecord.driveFileUrl && (
              <a
                href={lastSavedRecord.driveFileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none text-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-xs"
              >
                Abrir no Drive
              </a>
            )}
            <button
              onClick={onSwitchToSpreadsheet}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Ver na Planilha
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Upload side & Data Form side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Upload & Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-red-600" />
                Foto da Nota de Abastecimento
              </h2>
              {selectedImage && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setExtractSuccess(false);
                  }}
                  className="text-xs text-neutral-500 hover:text-red-600 cursor-pointer"
                >
                  Trocar foto
                </button>
              )}
            </div>

            {/* Camera View Mode */}
            {useCamera ? (
              <div className="space-y-3">
                <div className="relative bg-black rounded-xl overflow-hidden aspect-4/3 flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Tirar Foto Agora
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 bg-neutral-200 text-neutral-700 hover:bg-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : selectedImage ? (
              /* Image Selected Preview */
              <div className="space-y-3">
                <div className="relative bg-neutral-900 rounded-xl overflow-hidden aspect-4/3 flex items-center justify-center group border border-neutral-200">
                  <img
                    src={selectedImage.dataUrl}
                    alt="Nota de Abastecimento"
                    className="w-full h-full object-contain"
                  />
                  {isExtracting && (
                    <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                      <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <span className="font-bold text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Lendo dados com Inteligência Artificial...
                      </span>
                      <p className="text-xs text-neutral-300 mt-1">
                        Extraindo número, cliente, horários, volume e assinatura
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span className="truncate max-w-[200px]">{selectedImage.fileName}</span>
                  <button
                    type="button"
                    onClick={() => handleExtractReceipt()}
                    disabled={isExtracting}
                    className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
                    Reprocessar OCR
                  </button>
                </div>
              </div>
            ) : (
              /* Empty Upload Dropzone */
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 hover:border-red-500 bg-neutral-50/70 hover:bg-red-50/30 rounded-xl p-6 text-center cursor-pointer transition-colors group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-bold text-neutral-800">
                    Clique para enviar ou arraste a foto aqui
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Suporta fotos de celular, notas fiscais, comprovantes em JPG/PNG
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="btn-open-camera"
                    onClick={startCamera}
                    className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-red-400" />
                    Abrir Câmera
                  </button>
                  <button
                    type="button"
                    id="btn-sample-orbital"
                    onClick={() => loadSampleReceipt('orbital')}
                    className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    Testar com Exemplo
                  </button>
                </div>
              </div>
            )}

            {/* Quick Sample Selector */}
            <div className="pt-2 border-t border-neutral-100">
              <span className="text-[11px] font-semibold text-neutral-500 block mb-2">
                Ou teste com exemplos prontos:
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadSampleReceipt('orbital')}
                  className="text-left text-xs p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg flex-1 cursor-pointer transition-colors"
                >
                  <div className="font-bold text-neutral-800">OS 2293305 (Orbital)</div>
                  <div className="text-[10px] text-neutral-500">Diesel • 224,00 L • GE135</div>
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleReceipt('swissport')}
                  className="text-left text-xs p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg flex-1 cursor-pointer transition-colors"
                >
                  <div className="font-bold text-neutral-800">OS 2293315 (Swissport)</div>
                  <div className="text-[10px] text-neutral-500">Jet A-1 • 1.850 L • Trator</div>
                </button>
              </div>
            </div>
          </div>

          {/* Drive destination helper */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <HardDrive className={`w-5 h-5 ${gasConfig.webhookUrl ? 'text-emerald-600' : 'text-amber-500'}`} />
              <div>
                <div className="font-bold text-neutral-900">Destino: Google Drive</div>
                <div className="text-[11px] text-neutral-500">
                  {gasConfig.webhookUrl ? 'Pronto para salvar na pasta' : 'URL do script não configurada'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-xs text-red-600 hover:text-red-700 font-semibold underline cursor-pointer"
            >
              {gasConfig.webhookUrl ? 'Alterar' : 'Configurar'}
            </button>
          </div>
        </div>

        {/* Right Column: Extracted Spreadsheet Data Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-red-600" />
                  Dados Extraídos da Nota
                </h2>
                <p className="text-xs text-neutral-500">
                  Estes campos serão inseridos diretamente na planilha e salvos no registro
                </p>
              </div>

              {extractSuccess && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-fadeIn">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  IA Extraiu com Sucesso
                </span>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Field Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Número (Coluna A) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  Coluna A: Número da Nota / O.S.
                </label>
                <input
                  id="input-numero"
                  type="text"
                  required
                  placeholder="Ex: 2293305"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 font-mono font-bold text-neutral-900"
                />
              </div>

              {/* Forma de Pagamento (Coluna B) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-600" />
                  Coluna B: Forma de Pagamento
                </label>
                <select
                  id="select-forma-pagamento"
                  value={formData.formaPagamento}
                  onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-900 font-semibold bg-white"
                >
                  <option value="CONTRATO">CONTRATO</option>
                  <option value="FATURADO">FATURADO</option>
                  <option value="A VISTA">A VISTA</option>
                  <option value="CARTAO">CARTAO</option>
                  <option value="BOLETO">BOLETO</option>
                  <option value="CONVENIO">CONVENIO</option>
                  <option value="OUTRO">OUTRO</option>
                </select>
              </div>

              {/* Cliente (Coluna C) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-neutral-600" />
                  Coluna C: Cliente / Empresa
                </label>
                <input
                  id="input-cliente"
                  type="text"
                  required
                  placeholder="Ex: ORBITAL SERV AUX TRANSP AEREO"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-900 font-medium"
                />
              </div>

              {/* Hora da Chegada (Coluna D) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-600" />
                  Coluna D: Hora da Chegada
                </label>
                <input
                  id="input-hora-chegada"
                  type="text"
                  placeholder="07:13"
                  value={formData.horaChegada}
                  onChange={(e) => setFormData({ ...formData, horaChegada: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-900 font-mono"
                />
              </div>

              {/* Início do Abastecimento (Coluna E) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-600" />
                  Coluna E: Início do Abastecimento
                </label>
                <input
                  id="input-inicio-abastecimento"
                  type="text"
                  placeholder="07:14"
                  value={formData.inicioAbastecimento}
                  onChange={(e) => setFormData({ ...formData, inicioAbastecimento: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-900 font-mono"
                />
              </div>

              {/* Produto (Coluna F) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-red-600" />
                  Coluna F: Produto
                </label>
                <input
                  id="input-produto"
                  type="text"
                  placeholder="DIESEL / JET A-1"
                  value={formData.produto}
                  onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-900 font-bold"
                />
              </div>

              {/* Volume (Coluna G) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <span className="text-red-600 font-bold">L</span>
                  Coluna G: Volume (Litros)
                </label>
                <input
                  id="input-volume"
                  type="text"
                  required
                  placeholder="Ex: 224,00"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-900 font-mono font-bold text-red-600"
                />
              </div>

              {/* Obs.: (Coluna H) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Coluna H: Obs.: (Equipamento / Prefixo)
                </label>
                <input
                  id="input-obs"
                  type="text"
                  placeholder="Ex: GE135"
                  value={formData.obs}
                  onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-900"
                />
              </div>

              {/* Assinatura do Cliente (Coluna I) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-neutral-600" />
                  Coluna I: Assinatura / Matrícula
                </label>
                <input
                  id="input-assinatura"
                  type="text"
                  placeholder="Ex: joanilson 304371"
                  value={formData.assinaturaCliente}
                  onChange={(e) => setFormData({ ...formData, assinaturaCliente: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-900"
                />
              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-neutral-500 flex items-center gap-1">
                <HardDrive className="w-4 h-4 text-neutral-400" />
                {gasConfig.webhookUrl ? (
                  <span className="text-emerald-700 font-medium">Drive pronto para upload</span>
                ) : (
                  <span className="text-amber-700 font-medium">Será salvo localmente</span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  id="btn-save-record"
                  disabled={isUploadingToDrive || isExtracting}
                  className="flex-1 sm:flex-none px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUploadingToDrive ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Enviando ao Google Drive...
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-4 h-4" />
                      Salvar na Planilha e Enviar ao Drive
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
