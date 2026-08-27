import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  Download,
  CheckCircle2,
  X,
  FileSpreadsheet,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Employee, Contract } from '../types/index.ts';

interface ProductionResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: (options: {
    wipeEmployees: boolean;
    wipeContracts: boolean;
    wipeDemandLogs: boolean;
  }) => void;
  onExportExcel: () => void;
  totalEmployees: number;
  totalContracts: number;
}

export const ProductionResetModal: React.FC<ProductionResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  onExportExcel,
  totalEmployees,
  totalContracts,
}) => {
  const [wipeEmployees, setWipeEmployees] = useState(true);
  const [wipeDemandLogs, setWipeDemandLogs] = useState(true);
  const [wipeContracts, setWipeContracts] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [downloadedBackup, setDownloadedBackup] = useState(false);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    onExportExcel();
    setDownloadedBackup(true);
  };

  const handleExecute = () => {
    onConfirmReset({
      wipeEmployees,
      wipeContracts,
      wipeDemandLogs,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col">
        {/* Header Alert */}
        <div className="flex items-center justify-between px-6 py-4 bg-rose-50 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-950 leading-tight">
                Zerar Lançamentos para Produção
              </h3>
              <p className="text-xs text-rose-700">
                Limpeza completa de dados simulados de teste para início de operação real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-sm">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Atenção: A base de dados será zerada</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Esta ação prepara o sistema para uso oficial em produção, removendo os colaboradores fictícios de demonstração. Você poderá cadastrar seus funcionários reais manualmente, importar sua planilha oficial via Excel/CSV ou ler novos prints via OCR.
            </p>
          </div>

          {/* Backup Action */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Fazer backup dos dados atuais em Excel:
              </span>
              <span className="text-[11px] text-slate-500">
                Garante que nenhuma informação seja perdida
              </span>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{downloadedBackup ? 'Baixado com Sucesso ✓' : 'Baixar Excel'}</span>
            </button>
          </div>

          {/* Options Checklist */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              O que você deseja zerar:
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={wipeEmployees}
                onChange={(e) => setWipeEmployees(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Zerar todos os colaboradores ({totalEmployees} funcionários simulados)
                </span>
                <span className="text-[11px] text-slate-500">
                  Deixa a lista de funcionários vazia (0 registros) pronta para receber sua equipe real.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={wipeDemandLogs}
                onChange={(e) => setWipeDemandLogs(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Zerar histórico de notificações & demandas enviadas
                </span>
                <span className="text-[11px] text-slate-500">
                  Limpa mensagens de teste no WhatsApp e chamados anteriores.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={wipeContracts}
                onChange={(e) => setWipeContracts(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Zerar também a lista de Contratos ({totalContracts} contratos)
                </span>
                <span className="text-[11px] text-slate-500">
                  Se desmarcado, mantém os contratos cadastrados para você apenas vincular seus colaboradores.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={!wipeEmployees && !wipeDemandLogs && !wipeContracts}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>Confirmar e Zerar Base para Produção</span>
          </button>
        </div>
      </div>
    </div>
  );
};
