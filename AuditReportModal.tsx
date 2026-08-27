import React from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  FileText,
  Download,
} from 'lucide-react';
import { Employee, Contract, SystemStats, BrandConfig } from '../types/index.ts';
import { WfsLogo } from './WfsLogo.tsx';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  contracts: Contract[];
  stats: SystemStats;
  brand?: BrandConfig;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  employees,
  contracts,
  stats,
  brand,
}) => {
  if (!isOpen) return null;

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const primaryColor = brand?.primaryColor || '#006837';
  const companyName = brand?.companyName || 'GPA';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header (hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: primaryColor }}
              className="p-2.5 rounded-xl text-white shadow-xs"
            >
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Relatório Executivo de Auditoria & Conformidade
              </h2>
              <p className="text-xs text-slate-500">
                Documento formal para emissão, assinatura e apresentação à diretoria e fiscalização.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-95 flex items-center gap-1.5 transition-opacity cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-800 print:text-black print:p-0 print:space-y-4 bg-white">
          {/* Report Document Header */}
          <div className="border-b-2 border-slate-200 pb-4 print:border-black flex items-start justify-between">
            <div>
              <div className="mb-2">
                <WfsLogo brand={brand} size="lg" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 print:text-black">
                RELATÓRIO DE CONFORMIDADE E AUDITORIA DE CONTRATOS - {companyName.toUpperCase()}
              </h1>
              <p className="text-xs text-slate-500 print:text-gray-600 mt-0.5">
                Monitoramento de Ordem de Serviço (NR-01), ASO (NR-07), Ficha de EPI (NR-06) e Certificações Obrigatórias (Alerta 30 dias)
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 print:text-gray-600">
              <p>
                Data de Emissão: <strong className="text-slate-800">{todayFormatted}</strong>
              </p>
              <p>Emissor: Gestão de Contratos e Terceiros {companyName}</p>
            </div>
          </div>

          {/* KPI Dashboard Summary */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-gray-100 print:border-gray-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-600 block">
                Total Funcionários
              </span>
              <span className="text-xl font-black text-slate-900 print:text-black">
                {stats.totalFuncionarios}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-gray-100 print:border-gray-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-600 block">
                100% Em Dia
              </span>
              <span className="text-xl font-black text-emerald-600 print:text-green-700">
                {stats.totalEmDia}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-gray-100 print:border-gray-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-600 block">
                A Vencer (≤ 30d)
              </span>
              <span className="text-xl font-black text-amber-600 print:text-amber-700">
                {stats.totalAVencer30Dias}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-gray-100 print:border-gray-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-600 block">
                Taxa Geral
              </span>
              <span
                style={{ color: primaryColor }}
                className="text-xl font-black print:text-black"
              >
                {stats.taxaConformidadeGeral}%
              </span>
            </div>
          </div>

          {/* Table of Employees */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 print:text-black">
              Relação Analítica de Colaboradores e Pendências
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-black">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase print:bg-gray-200 print:text-black">
                    <th className="py-2 px-3">Colaborador</th>
                    <th className="py-2 px-2">Matrícula</th>
                    <th className="py-2 px-2">Área / Setor</th>
                    <th className="py-2 px-2">Contrato</th>
                    <th className="py-2 px-2 text-center">OS</th>
                    <th className="py-2 px-2 text-center">ASO</th>
                    <th className="py-2 px-2 text-center">EPI</th>
                    <th className="py-2 px-2 text-center">Cert</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] print:divide-gray-300">
                  {employees.map((emp) => {
                    const os = emp.pendencias.find((p) => p.tipo === 'ORDEM_DE_SERVICO');
                    const aso = emp.pendencias.find((p) => p.tipo === 'ATESTADO_SAUDE_OCUPACIONAL');
                    const epi = emp.pendencias.find((p) => p.tipo === 'FICHA_EPI');
                    const radio = emp.pendencias.find((p) => p.tipo === 'TREINAMENTO_RADIOPROTECAO');

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                        <td className="py-2 px-3 font-semibold text-slate-900 print:text-black">
                          {emp.nome}
                        </td>
                        <td className="py-2 px-2 text-slate-600">{emp.matricula}</td>
                        <td className="py-2 px-2 text-slate-600">{emp.areaNome || emp.setor}</td>
                        <td className="py-2 px-2 text-slate-600 truncate max-w-[120px]">
                          {emp.contratoNome || '-'}
                        </td>
                        <td className="py-2 px-2 text-center font-bold">
                          <span
                            className={
                              os?.status === 'EM_DIA'
                                ? 'text-emerald-700'
                                : os?.status === 'A_VENCER'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }
                          >
                            {os?.status || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-bold">
                          <span
                            className={
                              aso?.status === 'EM_DIA'
                                ? 'text-emerald-700'
                                : aso?.status === 'A_VENCER'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }
                          >
                            {aso?.status || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-bold">
                          <span
                            className={
                              epi?.status === 'EM_DIA'
                                ? 'text-emerald-700'
                                : epi?.status === 'A_VENCER'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }
                          >
                            {epi?.status || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-bold">
                          <span
                            className={
                              radio?.status === 'EM_DIA'
                                ? 'text-emerald-700'
                                : radio?.status === 'A_VENCER'
                                ? 'text-amber-700'
                                : radio?.status === 'NAO_APLICAVEL'
                                ? 'text-slate-400'
                                : 'text-rose-700'
                            }
                          >
                            {radio?.status || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature fields for formal submission */}
          <div className="pt-10 grid grid-cols-2 gap-12 text-center print:pt-16">
            <div>
              <div className="border-t border-slate-400 pt-1">
                <p className="text-xs font-bold text-slate-800 print:text-black">
                  Responsável Técnico / Coordenação de Contratos
                </p>
                <p className="text-[10px] text-slate-500">{companyName} - Gestão de Terceiros</p>
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1">
                <p className="text-xs font-bold text-slate-800 print:text-black">
                  Gestão Operacional & Segurança do Trabalho
                </p>
                <p className="text-[10px] text-slate-500">Diretoria de Operações</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
