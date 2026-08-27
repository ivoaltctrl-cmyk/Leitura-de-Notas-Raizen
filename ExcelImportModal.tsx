import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Users,
  Check,
  Building,
  Sparkles,
} from 'lucide-react';
import { Employee, Contract, AreaResponsavel, BrandConfig } from '../types/index.ts';
import { downloadExcelTemplate, parseEmployeesFromExcelFile } from '../utils/storage.ts';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEmployees: (employees: Employee[]) => void;
  areas: AreaResponsavel[];
  contracts: Contract[];
  brand: BrandConfig;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportEmployees,
  areas,
  contracts,
  brand,
}) => {
  const [parsedEmployees, setParsedEmployees] = useState<Employee[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const primaryColor = brand?.primaryColor || '#006837';
  const accentColor = brand?.accentColor || '#f59e0b';

  const handleDownloadTemplate = () => {
    downloadExcelTemplate(areas, contracts);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessCount(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseEmployeesFromExcelFile(buffer, areas, contracts);

      if (result.employees.length === 0) {
        setErrorMsg(
          'Nenhum colaborador foi identificado na planilha. Verifique se o arquivo segue o modelo oficial com as colunas corretas.'
        );
        setParsedEmployees([]);
      } else {
        setParsedEmployees(result.employees);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao ler planilha: ${err.message || 'Formato de arquivo inválido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedEmployees.length === 0) return;
    onImportEmployees(parsedEmployees);
    setSuccessCount(parsedEmployees.length);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: primaryColor }}
              className="p-2.5 rounded-xl text-white shadow-xs"
            >
              <FileSpreadsheet className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Importação em Massa via Planilha Excel / CSV
              </h3>
              <p className="text-xs text-slate-500">
                Baixe o modelo pré-formatado, preencha os dados e suba o arquivo para imputar tudo de uma só vez
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Step 1: Download Template */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider block">
                Etapa 1: Baixar Modelo Oficial de Planilha
              </span>
              <p className="text-xs text-slate-500">
                Planilha com colunas prontas, regras de validação e lista das suas Áreas e Contratos ativos
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" style={{ color: accentColor }} />
              <span>Baixar Modelo (.xlsx)</span>
            </button>
          </div>

          {/* Step 2: Upload Filled Template */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Etapa 2: Selecionar Planilha Preenchida (.xlsx ou .csv)
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/70 p-6 rounded-2xl text-center cursor-pointer transition-colors"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">
                Clique aqui para selecionar o arquivo preenchido do seu computador
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou CSV (.csv)
              </p>

              {fileName && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 3: Preview Data */}
          {parsedEmployees.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {parsedEmployees.length} colaboradores identificados para importação
                  </span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Pronto para adicionar à base
                </span>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-100 sticky top-0 text-slate-700 font-bold">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Matrícula</th>
                      <th className="px-3 py-2 text-left">Área / Setor</th>
                      <th className="px-3 py-2 text-left">Contrato</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedEmployees.slice(0, 10).map((emp, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-bold text-slate-900 truncate max-w-[140px]">
                          {emp.nome}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">{emp.matricula}</td>
                        <td className="px-3 py-1.5 text-slate-600">{emp.areaNome || emp.setor}</td>
                        <td className="px-3 py-1.5 text-slate-600 truncate max-w-[140px]">
                          {emp.contratoNome || '-'}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                              emp.statusGeral === 'EM_DIA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : emp.statusGeral === 'CRITICO'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {emp.statusGeral} ({emp.indicadorPercentual}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedEmployees.length > 10 && (
                <p className="text-[11px] text-slate-500 text-center">
                  + {parsedEmployees.length - 10} outros registros serão importados...
                </p>
              )}
            </div>
          )}

          {successCount !== null && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{successCount} Colaboradores Importados com Sucesso! Fechando...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={parsedEmployees.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            style={{ backgroundColor: primaryColor }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar e Importar ({parsedEmployees.length}) Registros</span>
          </button>
        </div>
      </div>
    </div>
  );
};
