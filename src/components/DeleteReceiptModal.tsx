import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { AbastecimentoRecord } from '../types';

interface DeleteReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AbastecimentoRecord | null;
  onConfirm: (record: AbastecimentoRecord) => Promise<void>;
  isDeleting: boolean;
}

export const DeleteReceiptModal: React.FC<DeleteReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 relative animate-scaleUp">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3 shadow-xs border border-red-100">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">
            Excluir Lançamento da Planilha
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Esta ação excluirá permanentemente a linha correspondente da aba <strong className="text-neutral-700">Dados_Raizen</strong> no Google Sheets.
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 space-y-2 mb-5 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-neutral-200/50">
            <span className="text-neutral-500 font-medium">Número da Nota / OS:</span>
            <span className="font-bold text-neutral-900 font-mono">{record.numero || 'S/N'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-200/50">
            <span className="text-neutral-500 font-medium">Data:</span>
            <span className="font-semibold text-neutral-800">{record.dataAbastecimento || '-'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-200/50">
            <span className="text-neutral-500 font-medium">Cliente:</span>
            <span className="font-semibold text-neutral-800 uppercase">{record.cliente || '-'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-200/50">
            <span className="text-neutral-500 font-medium">Produto / Volume:</span>
            <span className="font-bold text-red-600">
              {record.produto || 'DIESEL'} • {record.volume || '0,00'} L
            </span>
          </div>
          {record.obs && (
            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-500 font-medium">Obs. / Equipamento:</span>
              <span className="font-semibold text-neutral-800">{record.obs}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(record)}
            disabled={isDeleting}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Excluindo da Planilha...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
