import React, { useState } from 'react';
import {
  X,
  User,
  Building2,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Send,
  FileText,
  HeartPulse,
  HardHat,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Edit2,
  Save,
} from 'lucide-react';
import { Employee, PendingDoc, DocType, DocStatus } from '../types/index.ts';
import { recalculateEmployeeStatus } from '../utils/storage.ts';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSaveEmployee: (employee: Employee) => void;
  onOpenDemand: (employee: Employee) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSaveEmployee,
  onOpenDemand,
}) => {
  const [activeTab, setActiveTab] = useState<'pendencias' | 'print' | 'historico'>('pendencias');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocData, setEditingDocData] = useState<Partial<PendingDoc>>({});

  if (!isOpen || !employee) return null;

  const isEmDia = employee.statusGeral === 'EM_DIA';
  const isBloqueado = employee.statusGeral === 'BLOQUEADO';

  const handleUpdateDocStatus = (docId: string, newStatus: DocStatus) => {
    const updatedDocs = employee.pendencias.map((doc) =>
      doc.id === docId
        ? {
            ...doc,
            status: newStatus,
            ultimaAtualizacao: new Date().toISOString().split('T')[0],
          }
        : doc
    );

    const recalculated = recalculateEmployeeStatus({
      ...employee,
      pendencias: updatedDocs,
    });

    const updatedEmployee: Employee = {
      ...employee,
      pendencias: updatedDocs,
      indicadorPercentual: recalculated.indicadorPercentual,
      statusGeral: recalculated.statusGeral,
    };

    onSaveEmployee(updatedEmployee);
  };

  const handleSaveDocDetails = (docId: string) => {
    const updatedDocs = employee.pendencias.map((doc) =>
      doc.id === docId
        ? {
            ...doc,
            ...editingDocData,
            ultimaAtualizacao: new Date().toISOString().split('T')[0],
          }
        : doc
    );

    const recalculated = recalculateEmployeeStatus({
      ...employee,
      pendencias: updatedDocs,
    });

    const updatedEmployee: Employee = {
      ...employee,
      pendencias: updatedDocs,
      indicadorPercentual: recalculated.indicadorPercentual,
      statusGeral: recalculated.statusGeral,
    };

    onSaveEmployee(updatedEmployee);
    setEditingDocId(null);
  };

  const getDocIcon = (tipo: DocType) => {
    switch (tipo) {
      case 'ORDEM_DE_SERVICO':
        return <FileText className="w-5 h-5 text-sky-600" />;
      case 'ATESTADO_SAUDE_OCUPACIONAL':
        return <HeartPulse className="w-5 h-5 text-purple-600" />;
      case 'FICHA_EPI':
        return <HardHat className="w-5 h-5 text-indigo-600" />;
      case 'TREINAMENTO_RADIOPROTECAO':
        return <Radio className="w-5 h-5 text-amber-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs ${
                isEmDia
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                  : isBloqueado
                  ? 'bg-rose-100 border border-rose-300 text-rose-800'
                  : 'bg-amber-100 border border-amber-300 text-amber-800'
              }`}
            >
              {employee.nome.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{employee.nome}</h2>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                    isEmDia
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : isBloqueado
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {isEmDia ? '100% EM DIA' : isBloqueado ? 'BLOQUEADO' : 'COM PENDÊNCIAS'} (
                  {employee.indicadorPercentual}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Matrícula: <strong className="text-slate-700">{employee.matricula}</strong> • Cargo: {employee.cargo} • {employee.empresa}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-slate-50 text-xs font-bold gap-6">
          <button
            onClick={() => setActiveTab('pendencias')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'pendencias'
                ? 'border-[#002D62] text-[#002D62]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ficha de Pendências ({employee.pendencias.length})
          </button>
          <button
            onClick={() => setActiveTab('print')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'print'
                ? 'border-[#002D62] text-[#002D62]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Print Original / OCR
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'pendencias' && (
            <div className="space-y-4">
              {/* Contract Information Pill */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#002D62]" />
                  <span className="text-slate-700">
                    Contrato Vinculado: <strong className="text-slate-900">{employee.contratoNome || 'Não vinculado'}</strong>
                  </span>
                </div>
                <span className="text-slate-500">Setor: {employee.setor}</span>
              </div>

              {/* Document List */}
              <div className="space-y-3">
                {employee.pendencias.map((doc) => {
                  const isOk = doc.status === 'EM_DIA';
                  const isVencido = doc.status === 'VENCIDO';
                  const isEditing = editingDocId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`p-4 rounded-xl border transition-all bg-white ${
                        isOk
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : isVencido
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-amber-200 bg-amber-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                            {getDocIcon(doc.tipo)}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                {doc.nomeDocumento}
                              </h4>
                            </div>

                            {/* Details: Vencimento & Emissão */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              {doc.dataEmissao && (
                                <span>Emissão: <strong className="text-slate-700">{doc.dataEmissao}</strong></span>
                              )}
                              {doc.dataVencimento && (
                                <span className={isVencido ? 'text-rose-600 font-bold' : ''}>
                                  Vencimento: <strong className={isVencido ? 'text-rose-600' : 'text-slate-700'}>{doc.dataVencimento}</strong>
                                </span>
                              )}
                              {doc.observacoes && (
                                <span className="text-slate-600 italic">Obs: "{doc.observacoes}"</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Switcher */}
                        <div className="flex items-center gap-2">
                          <select
                            value={doc.status}
                            onChange={(e) =>
                              handleUpdateDocStatus(doc.id, e.target.value as DocStatus)
                            }
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${
                              isOk
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isVencido
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            <option value="EM_DIA">EM DIA</option>
                            <option value="PENDENTE">PENDENTE</option>
                            <option value="VENCIDO">VENCIDO</option>
                            <option value="NAO_APLICAVEL">N/A</option>
                          </select>

                          <button
                            onClick={() => {
                              if (isEditing) {
                                handleSaveDocDetails(doc.id);
                              } else {
                                setEditingDocId(doc.id);
                                setEditingDocData({
                                  dataEmissao: doc.dataEmissao,
                                  dataVencimento: doc.dataVencimento,
                                  observacoes: doc.observacoes,
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title={isEditing ? 'Salvar Detalhes' : 'Editar Vencimento / Obs'}
                          >
                            {isEditing ? <Save className="w-4 h-4 text-emerald-600" /> : <Edit2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Editing fields */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="block text-slate-500 font-semibold mb-0.5">Data Emissão</label>
                            <input
                              type="date"
                              value={editingDocData.dataEmissao || ''}
                              onChange={(e) =>
                                setEditingDocData({
                                  ...editingDocData,
                                  dataEmissao: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 font-semibold mb-0.5">Data Vencimento</label>
                            <input
                              type="date"
                              value={editingDocData.dataVencimento || ''}
                              onChange={(e) =>
                                setEditingDocData({
                                  ...editingDocData,
                                  dataVencimento: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 font-semibold mb-0.5">Observações</label>
                            <input
                              type="text"
                              value={editingDocData.observacoes || ''}
                              onChange={(e) =>
                                setEditingDocData({
                                  ...editingDocData,
                                  observacoes: e.target.value,
                                })
                              }
                              placeholder="Ex: Em processo de renovação"
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-900"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'print' && (
            <div className="space-y-3">
              {employee.imagemOrigemUrl ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-2 flex items-center justify-center">
                  <img
                    src={employee.imagemOrigemUrl}
                    alt={`Print de ${employee.nome}`}
                    className="max-h-[400px] w-auto object-contain rounded-lg shadow-sm"
                  />
                </div>
              ) : (
                <div className="p-12 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                  <p>Colaborador cadastrado manualmente ou imagem não preservada.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => onOpenDemand(employee)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Demandar Regularização ao Gestor</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
