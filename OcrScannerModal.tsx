import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileScan,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Check,
  Save,
  Building2,
  Building,
  Trash2,
  RefreshCw,
  Zap,
  Users,
  UserCheck,
  Calendar,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Employee,
  Contract,
  AreaResponsavel,
  PendingDoc,
  DocType,
  DocStatus,
  BrandConfig,
} from '../types/index.ts';
import { SAMPLE_OCR_IMAGES, SAMPLE_OCR_RESULTS } from '../data/mockData.ts';
import { recalculateEmployeeStatus, updateEmployeeCalculatedFields } from '../utils/storage.ts';

interface OcrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEmployee: (employee: Employee) => void;
  contracts: Contract[];
  employees: Employee[];
  areas: AreaResponsavel[];
  brand: BrandConfig;
}

export const OcrScannerModal: React.FC<OcrScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveEmployee,
  contracts,
  employees,
  areas,
  brand,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<Employee> | null>(null);
  const [matchedExistingEmployee, setMatchedExistingEmployee] = useState<Employee | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [successSaved, setSuccessSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const primaryColor = brand?.primaryColor || '#006837';
  const accentColor = brand?.accentColor || '#f59e0b';
  const companyName = brand?.companyName || 'GPA';

  // Set default contract and area when modal opens
  useEffect(() => {
    if (isOpen) {
      if (contracts.length > 0 && !selectedContractId) {
        setSelectedContractId(contracts[0].id);
      }
      if (areas.length > 0 && !selectedAreaId) {
        setSelectedAreaId(areas[0].id);
      }
    }
    if (!isOpen) {
      setSelectedImage(null);
      setImageFile(null);
      setExtractedData(null);
      setMatchedExistingEmployee(null);
      setErrorMsg(null);
      setIsProcessing(false);
      setSuccessSaved(false);
    }
  }, [isOpen, contracts, areas]);

  // Handle global paste event (Ctrl+V) when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleFileSelect(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    setErrorMsg(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      processOcrImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sampleKey: keyof typeof SAMPLE_OCR_IMAGES) => {
    const imgData = SAMPLE_OCR_IMAGES[sampleKey];
    setSelectedImage(imgData);
    processOcrImage(imgData, sampleKey);
  };

  /**
   * Search for existing registered employee matching parsed name or matricula
   */
  const findMatchingEmployee = (nome: string, matricula?: string): Employee | null => {
    if (!nome && !matricula) return null;

    const clean = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const targetName = clean(nome);
    const targetMat = matricula ? clean(matricula) : '';

    return (
      employees.find((emp) => {
        const empName = clean(emp.nome);
        const empMat = clean(emp.matricula);

        if (targetMat && (empMat === targetMat || empMat.includes(targetMat))) {
          return true;
        }
        if (targetName && (empName === targetName || empName.includes(targetName) || targetName.includes(empName))) {
          return true;
        }
        return false;
      }) || null
    );
  };

  const processOcrImage = async (
    imageBase64: string,
    sampleKey?: keyof typeof SAMPLE_OCR_IMAGES
  ) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessSaved(false);
    setMatchedExistingEmployee(null);

    try {
      // Call Gemini Vision API server route
      const response = await fetch('/api/parse-sst-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          sampleKey: sampleKey || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao processar imagem via OCR Gemini.');
      }

      // Map parsed data
      const parsedData = result.data;
      const extractedName = parsedData.nome || 'Colaborador Identificado';
      const extractedMatricula = parsedData.matricula || '';

      // Check if employee already exists in database
      const existingMatch = findMatchingEmployee(extractedName, extractedMatricula);
      setMatchedExistingEmployee(existingMatch);

      const matchedContract =
        contracts.find((c) => c.id === (existingMatch?.contratoId || selectedContractId)) ||
        contracts[0];

      const matchedArea =
        areas.find((a) => a.id === (existingMatch?.areaId || selectedAreaId)) ||
        areas[0];

      const newEmployeeDraft: Partial<Employee> = {
        id: existingMatch?.id || `emp-${Date.now()}`,
        nome: existingMatch?.nome || extractedName,
        matricula: existingMatch?.matricula || extractedMatricula || `GPA-${Math.floor(10000 + Math.random() * 90000)}`,
        cpf: existingMatch?.cpf || parsedData.cpf || '',
        cargo: existingMatch?.cargo || parsedData.cargo || 'Operador Especializado',
        setor: existingMatch?.setor || matchedArea?.nome || 'Operações',
        areaId: existingMatch?.areaId || matchedArea?.id,
        areaNome: existingMatch?.areaNome || matchedArea?.nome,
        areaResponsavelNome: existingMatch?.areaResponsavelNome || matchedArea?.responsavelNome,
        areaResponsavelEmail: existingMatch?.areaResponsavelEmail || matchedArea?.responsavelEmail,
        areaResponsavelTelefone: existingMatch?.areaResponsavelTelefone || matchedArea?.responsavelTelefone,
        empresa: existingMatch?.empresa || parsedData.empresa || 'GPA Prestadora',
        contratoId: matchedContract?.id,
        contratoNome: matchedContract ? `${matchedContract.numero} - ${matchedContract.titulo}` : '',
        resumoGeral: parsedData.resumoGeral || '',
        imagemOrigemUrl: imageBase64.length < 500000 ? imageBase64 : undefined,
        dataCadastro: existingMatch?.dataCadastro || new Date().toISOString().split('T')[0],
        dataUltimaLeitura: new Date().toISOString().split('T')[0],
        pendencias: (parsedData.pendencias || []).map((p: any, idx: number) => ({
          id: `p_ocr_${Date.now()}_${idx}`,
          tipo: p.tipo as DocType,
          nomeDocumento: p.nomeDocumento || p.tipo,
          status: (p.status as DocStatus) || 'PENDENTE',
          dataEmissao: p.dataEmissao,
          dataVencimento: p.dataVencimento,
          obrigatorio: p.obrigatorio !== false,
          observacoes: p.observacoes,
          ultimaAtualizacao: new Date().toISOString().split('T')[0],
        })),
      };

      const recalc = recalculateEmployeeStatus(newEmployeeDraft);
      newEmployeeDraft.indicadorPercentual = recalc.indicadorPercentual;
      newEmployeeDraft.statusGeral = recalc.statusGeral;

      setExtractedData(newEmployeeDraft);
    } catch (err: any) {
      console.error(err);
      // Fallback to sample data if network or API key fails
      if (sampleKey && SAMPLE_OCR_RESULTS[sampleKey]) {
        const mockParsed = SAMPLE_OCR_RESULTS[sampleKey];
        const existingMatch = findMatchingEmployee(mockParsed.nome || '', mockParsed.matricula);
        setMatchedExistingEmployee(existingMatch);

        const matchedContract = contracts[0];
        const matchedArea = areas[0];

        const draft: Partial<Employee> = {
          id: existingMatch?.id || `emp-${Date.now()}`,
          nome: existingMatch?.nome || mockParsed.nome || 'Colaborador',
          matricula: existingMatch?.matricula || mockParsed.matricula || 'GPA-10001',
          cargo: existingMatch?.cargo || mockParsed.cargo || 'Operador',
          setor: existingMatch?.setor || matchedArea?.nome || 'Operações',
          areaId: existingMatch?.areaId || matchedArea?.id,
          areaNome: existingMatch?.areaNome || matchedArea?.nome,
          areaResponsavelNome: existingMatch?.areaResponsavelNome || matchedArea?.responsavelNome,
          empresa: existingMatch?.empresa || mockParsed.empresa || 'GPA Prestadora',
          contratoId: matchedContract?.id,
          contratoNome: matchedContract ? `${matchedContract.numero} - ${matchedContract.titulo}` : '',
          statusGeral: mockParsed.statusGeral || 'PENDENTE',
          indicadorPercentual: mockParsed.indicadorPercentual || 75,
          resumoGeral: mockParsed.resumoGeral || '',
          dataCadastro: existingMatch?.dataCadastro || new Date().toISOString().split('T')[0],
          dataUltimaLeitura: new Date().toISOString().split('T')[0],
          pendencias: mockParsed.pendencias || [],
        };
        setExtractedData(draft);
      } else {
        setErrorMsg(`Falha na extração de texto via IA: ${err.message || 'Verifique o print'}.`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocStatusChange = (docId: string, newStatus: DocStatus) => {
    if (!extractedData || !extractedData.pendencias) return;

    const updatedDocs = extractedData.pendencias.map((doc) =>
      doc.id === docId ? { ...doc, status: newStatus } : doc
    );

    const recalc = recalculateEmployeeStatus({
      ...extractedData,
      pendencias: updatedDocs,
    });

    setExtractedData({
      ...extractedData,
      pendencias: updatedDocs,
      indicadorPercentual: recalc.indicadorPercentual,
      statusGeral: recalc.statusGeral,
    });
  };

  const handleSave = () => {
    if (!extractedData || !extractedData.nome) return;

    const targetContract = contracts.find((c) => c.id === selectedContractId);
    const targetArea = areas.find((a) => a.id === selectedAreaId);

    const completeEmployee: Employee = {
      id: matchedExistingEmployee ? matchedExistingEmployee.id : extractedData.id || `emp-${Date.now()}`,
      nome: extractedData.nome,
      matricula: extractedData.matricula || `GPA-${Math.floor(10000 + Math.random() * 90000)}`,
      cpf: extractedData.cpf || matchedExistingEmployee?.cpf,
      cargo: extractedData.cargo || 'Operador',
      setor: targetArea?.nome || extractedData.setor || 'Operações',
      areaId: targetArea?.id || matchedExistingEmployee?.areaId,
      areaNome: targetArea?.nome || matchedExistingEmployee?.areaNome,
      areaResponsavelNome: targetArea?.responsavelNome || matchedExistingEmployee?.areaResponsavelNome,
      areaResponsavelEmail: targetArea?.responsavelEmail || matchedExistingEmployee?.areaResponsavelEmail,
      areaResponsavelTelefone: targetArea?.responsavelTelefone || matchedExistingEmployee?.areaResponsavelTelefone,
      empresa: extractedData.empresa || 'GPA Prestadora',
      contratoId: targetContract?.id || matchedExistingEmployee?.contratoId,
      contratoNome: targetContract
        ? `${targetContract.numero} - ${targetContract.titulo}`
        : matchedExistingEmployee?.contratoNome,
      statusGeral: extractedData.statusGeral || 'PENDENTE',
      indicadorPercentual: extractedData.indicadorPercentual ?? 75,
      resumoGeral: extractedData.resumoGeral,
      dataCadastro: matchedExistingEmployee?.dataCadastro || extractedData.dataCadastro || new Date().toISOString().split('T')[0],
      dataUltimaLeitura: new Date().toISOString().split('T')[0],
      imagemOrigemUrl: extractedData.imagemOrigemUrl,
      pendencias: extractedData.pendencias || [],
    };

    const finalEmployee = updateEmployeeCalculatedFields(completeEmployee);
    onSaveEmployee(finalEmployee);
    setSuccessSaved(true);

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: primaryColor }}
              className="p-2.5 rounded-2xl text-white shadow-xs"
            >
              <FileScan className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Leitor Inteligente de Imagem (OCR & IA)
                </h2>
                <span
                  style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}
                  className="px-2 py-0.5 rounded text-[10px] font-black uppercase"
                >
                  Busca & Sincronização
                </span>
              </div>
              <p className="text-xs text-slate-500">
                A IA lê o print, localiza o colaborador na base cadastrada e atualiza apenas as pendências
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/40">
          {/* Left Column: Image Upload / Paste / Sample Selector (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                1. Carregar ou Colar Print (Ctrl + V)
              </label>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : selectedImage
                    ? 'border-slate-300 bg-white'
                    : 'border-slate-300 hover:border-slate-400 bg-white'
                }`}
              >
                {selectedImage ? (
                  <div className="relative w-full h-full flex flex-col items-center">
                    <img
                      src={selectedImage}
                      alt="Print Carregado"
                      className="max-h-48 object-contain rounded-lg border border-slate-200 shadow-xs"
                    />
                    <span className="mt-2 text-[11px] font-bold text-slate-500 hover:text-slate-900">
                      Clique para trocar imagem
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700">
                      Arraste ou clique para selecionar o print
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ou simplesmente aperte <strong>Ctrl + V</strong> em qualquer lugar da tela
                    </p>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {/* Quick Test Samples */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">
                Ou teste com prints de exemplo GPA:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectSample('print1')}
                  className="p-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-xs text-left cursor-pointer"
                >
                  <span className="text-[10px] text-amber-600 block">Carlos E.</span>
                  <span className="truncate block">Print Logística</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('print2')}
                  className="p-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-xs text-left cursor-pointer"
                >
                  <span className="text-[10px] text-emerald-600 block">Juliana M.</span>
                  <span className="truncate block">100% Em Dia</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('print3')}
                  className="p-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-xs text-left cursor-pointer"
                >
                  <span className="text-[10px] text-rose-600 block">Rodrigo L.</span>
                  <span className="truncate block">Bloqueado</span>
                </button>
              </div>
            </div>

            {/* Contract & Area Selector */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Área / Setor Responsável:
                </label>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-slate-900"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} (Resp: {a.responsavelNome})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vincular ao Contrato GPA:
                </label>
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-slate-900"
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numero} - {c.titulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: AI Extraction Results & Match Status (7 cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    2. Dados Extraídos & Sincronização
                  </h3>
                </div>

                {isProcessing && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600 font-bold animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Lendo imagem via IA...</span>
                  </span>
                )}
              </div>

              {/* Matching Employee Notification Banner */}
              {matchedExistingEmployee && extractedData && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Colaborador Encontrado na Base de Dados!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Localizamos <strong>{matchedExistingEmployee.nome}</strong> (Matrícula: {matchedExistingEmployee.matricula}, Área: {matchedExistingEmployee.areaNome || matchedExistingEmployee.setor}).
                    Os dados cadastrais serão mantidos e <strong>apenas as 4 pendências documentais serão atualizadas</strong>.
                  </p>
                </div>
              )}

              {/* Extraction Preview */}
              {extractedData ? (
                <div className="space-y-3">
                  {/* Candidate Profile Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Nome
                      </span>
                      <input
                        type="text"
                        value={extractedData.nome || ''}
                        onChange={(e) =>
                          setExtractedData({ ...extractedData, nome: e.target.value })
                        }
                        className="w-full font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-slate-400 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Matrícula
                      </span>
                      <input
                        type="text"
                        value={extractedData.matricula || ''}
                        onChange={(e) =>
                          setExtractedData({ ...extractedData, matricula: e.target.value })
                        }
                        className="w-full font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-slate-400 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Cargo
                      </span>
                      <input
                        type="text"
                        value={extractedData.cargo || ''}
                        onChange={(e) =>
                          setExtractedData({ ...extractedData, cargo: e.target.value })
                        }
                        className="w-full text-slate-700 bg-transparent border-b border-transparent focus:border-slate-400 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Status Geral
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                          extractedData.statusGeral === 'EM_DIA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : extractedData.statusGeral === 'CRITICO'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {extractedData.statusGeral} ({extractedData.indicadorPercentual}%)
                      </span>
                    </div>
                  </div>

                  {/* Documents Checklist extracted */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Situação dos Documentos Identificados no Print:
                    </label>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {(extractedData.pendencias || []).map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-0.5 max-w-[240px] sm:max-w-xs">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {doc.nomeDocumento}
                            </span>
                            {doc.dataVencimento && (
                              <span className="text-[10px] text-slate-500 block">
                                Vencimento: {doc.dataVencimento}
                              </span>
                            )}
                          </div>

                          <select
                            value={doc.status}
                            onChange={(e) =>
                              handleDocStatusChange(doc.id, e.target.value as DocStatus)
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                              doc.status === 'EM_DIA'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : doc.status === 'VENCIDO'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : doc.status === 'A_VENCER'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : doc.status === 'PENDENTE'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <option value="EM_DIA">EM DIA</option>
                            <option value="A_VENCER">A VENCER (≤ 30d)</option>
                            <option value="PENDENTE">PENDENTE</option>
                            <option value="VENCIDO">VENCIDO</option>
                            <option value="NAO_APLICAVEL">NÃO SE APLICA</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">
                    Faça o upload do print ou selecione um exemplo acima para iniciar a leitura.
                  </p>
                </div>
              )}
            </div>

            {/* Error or Success notification */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successSaved && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Colaborador e pendências sincronizados com sucesso!</span>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!extractedData || isProcessing}
                onClick={handleSave}
                style={{ backgroundColor: primaryColor }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>
                  {matchedExistingEmployee
                    ? 'Sincronizar Pendências do Colaborador'
                    : 'Salvar na Base de Contratos'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
