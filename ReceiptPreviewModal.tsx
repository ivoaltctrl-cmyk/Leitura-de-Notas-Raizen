import React from 'react';
import { X, ExternalLink, HardDrive, Calendar, User, FileText, CheckCircle2, Clock } from 'lucide-react';
import { AbastecimentoRecord } from '../types';

interface ReceiptPreviewModalProps {
  record: AbastecimentoRecord | null;
  onClose: () => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Comprovante / Nota de Abastecimento #{record.numero || 'Sem Número'}
              </h3>
              <p className="text-xs text-neutral-500">{record.cliente || 'Cliente não identificado'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Image Display */}
          <div className="bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center min-h-64 max-h-96 relative group">
            {record.fotoBase64 ? (
              <img
                src={
                  record.fotoBase64.startsWith('data:')
                    ? record.fotoBase64
                    : `data:${record.fotoMimeType || 'image/jpeg'};base64,${record.fotoBase64}`
                }
                alt={`Nota ${record.numero}`}
                className="max-h-96 w-auto object-contain"
              />
            ) : (
              <div className="text-center p-8 text-neutral-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Foto arquivada no Google Drive</p>
                {record.driveFileId && (
                  <p className="text-[11px] font-mono text-neutral-500 mt-1">ID: {record.driveFileId}</p>
                )}
              </div>
            )}
          </div>

          {/* Quick summary pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-neutral-500 block text-[11px]">Produto (Col G)</span>
              <span className="font-bold text-neutral-900">{record.produto || '-'}</span>
            </div>
            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-neutral-500 block text-[11px]">Volume (Col H)</span>
              <span className="font-bold text-red-600">{record.volume ? `${record.volume} L` : '-'}</span>
            </div>
            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-neutral-500 block text-[11px]">Forma Pgto (Col B)</span>
              <span className="font-semibold text-neutral-800">{record.formaPagamento || '-'}</span>
            </div>
            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-neutral-500 block text-[11px]">Término (Col F)</span>
              <span className="font-bold text-neutral-900 font-mono">{record.terminoAbastecimento || '-'}</span>
            </div>
          </div>

          {/* Horários Grid */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
            <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-red-600" />
              <span>Cronologia do Abastecimento (Colunas D, E, F)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-neutral-200">
                <span className="text-[10px] text-neutral-500 block">Hora Chegada (D)</span>
                <span className="font-mono font-bold text-neutral-800">{record.horaChegada || '-'}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-neutral-200">
                <span className="text-[10px] text-neutral-500 block">Início Abast. (E)</span>
                <span className="font-mono font-bold text-neutral-800">{record.inicioAbastecimento || '-'}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-neutral-200">
                <span className="text-[10px] text-neutral-500 block">Término Abast. (F)</span>
                <span className="font-mono font-bold text-red-700">{record.terminoAbastecimento || '-'}</span>
              </div>
            </div>
          </div>

          {/* Additional details */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Assinatura do Cliente (Col J):
              </span>
              <span className="font-medium text-neutral-900">{record.assinaturaCliente || 'Não informada'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Observação / Equipamento (Col I):</span>
              <span className="font-medium text-neutral-900">{record.obs || 'Nenhuma'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Registrado em:
              </span>
              <span className="text-neutral-700">{new Date(record.dataCriacao).toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* Drive Status */}
          {record.driveFileId ? (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">Salvo no Google Drive</div>
                  <div className="text-[11px] font-mono text-emerald-700">ID: {record.driveFileId}</div>
                </div>
              </div>
              <a
                href={record.driveFileUrl || `https://drive.google.com/file/d/${record.driveFileId}/view`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir no Drive
              </a>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-amber-600" />
                <span>Salvo apenas localmente (Aguardando sincronização com Drive)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
