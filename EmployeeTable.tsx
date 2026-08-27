import React, { useState } from 'react';
import {
  Search,
  Filter,
  Users,
  Send,
  Eye,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Building,
  Radio,
  FileText,
  HeartPulse,
  HardHat,
  ChevronDown,
  UserPlus,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  Layers,
} from 'lucide-react';
import { Employee, Contract, AreaResponsavel, DocType, DocStatus, BrandConfig } from '../types/index.ts';

interface EmployeeTableProps {
  employees: Employee[];
  contracts: Contract[];
  areas: AreaResponsavel[];
  onOpenDetail: (employee: Employee) => void;
  onOpenDemand: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onQuickToggleDoc: (employeeId: string, docType: DocType, newStatus: DocStatus) => void;
  onOpenNewEmployee: () => void;
  onOpenExcelImport: () => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  selectedContractId: string;
  setSelectedContractId: (contractId: string) => void;
  selectedAreaId: string;
  setSelectedAreaId: (areaId: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  brand: BrandConfig;
  readOnly?: boolean;
  onGoToDemandado?: () => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  contracts,
  areas,
  onOpenDetail,
  onOpenDemand,
  onEditEmployee,
  onDeleteEmployee,
  onQuickToggleDoc,
  onOpenNewEmployee,
  onOpenExcelImport,
  activeFilter,
  setActiveFilter,
  selectedContractId,
  setSelectedContractId,
  selectedAreaId,
  setSelectedAreaId,
  searchTerm,
  setSearchTerm,
  brand,
  readOnly = false,
  onGoToDemandado,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'SST' | 'TRABALHISTA' | 'DEMAIS'>('SST');
  const primaryColor = brand?.primaryColor || '#006837';
  const accentColor = brand?.accentColor || '#f59e0b';

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    // Search match
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      emp.nome.toLowerCase().includes(query) ||
      emp.matricula.toLowerCase().includes(query) ||
      (emp.cpf && emp.cpf.toLowerCase().includes(query)) ||
      emp.cargo.toLowerCase().includes(query) ||
      emp.setor.toLowerCase().includes(query) ||
      (emp.areaNome && emp.areaNome.toLowerCase().includes(query)) ||
      emp.empresa.toLowerCase().includes(query) ||
      (emp.contratoNome && emp.contratoNome.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // Contract filter
    if (selectedContractId && emp.contratoId !== selectedContractId) {
      return false;
    }

    // Area filter
    if (selectedAreaId && emp.areaId !== selectedAreaId) {
      return false;
    }

    // Specific Status Filters
    if (activeFilter === 'EM_DIA') {
      return emp.statusGeral === 'EM_DIA';
    }
    if (activeFilter === 'A_VENCER_30') {
      return (emp.pendencias || []).some((p) => p.status === 'A_VENCER');
    }
    if (activeFilter === 'COM_PENDENCIA') {
      return emp.statusGeral !== 'EM_DIA';
    }
    if (activeFilter === 'CRITICO') {
      return emp.statusGeral === 'CRITICO' || emp.statusGeral === 'BLOQUEADO';
    }
    if (activeFilter === 'BLOQUEADO') {
      return emp.statusGeral === 'BLOQUEADO';
    }

    // Specific Document filters
    if (activeFilter === 'FILTRO_OS') {
      const doc = emp.pendencias.find((p) => p.tipo === 'ORDEM_DE_SERVICO');
      return doc && (doc.status === 'PENDENTE' || doc.status === 'VENCIDO' || doc.status === 'A_VENCER');
    }
    if (activeFilter === 'FILTRO_ASO') {
      const doc = emp.pendencias.find((p) => p.tipo === 'ATESTADO_SAUDE_OCUPACIONAL');
      return doc && (doc.status === 'PENDENTE' || doc.status === 'VENCIDO' || doc.status === 'A_VENCER');
    }
    if (activeFilter === 'FILTRO_EPI') {
      const doc = emp.pendencias.find((p) => p.tipo === 'FICHA_EPI');
      return doc && (doc.status === 'PENDENTE' || doc.status === 'VENCIDO' || doc.status === 'A_VENCER');
    }
    if (activeFilter === 'FILTRO_RADIO') {
      const doc = emp.pendencias.find((p) => p.tipo === 'TREINAMENTO_RADIOPROTECAO');
      return doc && (doc.status === 'PENDENTE' || doc.status === 'VENCIDO' || doc.status === 'A_VENCER');
    }

    return true;
  });

  // Helper to render doc status with pulsing animations
  const renderDocBadge = (emp: Employee, tipo: DocType, label: string) => {
    const doc = emp.pendencias.find((p) => p.tipo === tipo);

    if (!doc || doc.status === 'NAO_APLICAVEL') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
          N/A
        </span>
      );
    }

    if (doc.status === 'VENCIDO') {
      return (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-800 border border-rose-300 shadow-xs">
          {/* Pulsing red beacon indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 animate-pulse" />
          </span>
          <span>VENCIDO</span>
        </div>
      );
    }

    if (doc.status === 'A_VENCER') {
      return (
        <div
          title={doc.diasRestantes ? `Vence em ${doc.diasRestantes} dias` : 'Vence em menos de 30 dias'}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-900 border border-amber-300 shadow-xs"
        >
          {/* Pulsing amber beacon indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse" />
          </span>
          <span>
            {doc.diasRestantes ? `${doc.diasRestantes}d` : 'A VENCER'}
          </span>
        </div>
      );
    }

    if (doc.status === 'PENDENTE' || doc.status === 'EM_ANALISE') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          PENDENTE
        </span>
      );
    }

    // EM_DIA
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>EM DIA</span>
      </span>
    );
  };

  const countTotalAVencer = employees.filter((e) =>
    (e.pendencias || []).some((p) => p.status === 'A_VENCER')
  ).length;

  return (
    <div className="space-y-4">
      {/* Search, Filter Bar and Add / Import Buttons */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por colaborador, matrícula, CPF, área, cargo ou contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-slate-50/50 transition-all"
            />
          </div>

          {/* Area & Contract Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Area Filter */}
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="">Todas as Áreas ({areas.length})</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  Área: {a.nome}
                </option>
              ))}
            </select>

            {/* Contract Filter */}
            <select
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="">Todos os Contratos ({contracts.length})</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} - {c.titulo.slice(0, 24)}...
                </option>
              ))}
            </select>

            {/* Import from Excel Button */}
            {!readOnly ? (
              <>
                <button
                  onClick={onOpenExcelImport}
                  title="Importar planilha de colaboradores oficial"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Importar Planilha</span>
                </button>

                {/* Add Employee Button */}
                <button
                  onClick={onOpenNewEmployee}
                  style={{ backgroundColor: primaryColor }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Novo Colaborador</span>
                </button>
              </>
            ) : onGoToDemandado ? (
              <button
                onClick={onGoToDemandado}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Editar no Portal Demandado</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Banner Informativo quando em Modo Auditoria Read-Only */}
        {readOnly && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Modo Auditoria & Visualização:</strong> A edição de cadastros e regularização de pendências é feita no <strong>Portal do Demandado</strong>.
              </span>
            </div>
            {onGoToDemandado && (
              <button
                onClick={onGoToDemandado}
                className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 font-bold text-[11px] text-amber-950 transition-colors cursor-pointer shrink-0"
              >
                Ir para o Portal Demandado
              </button>
            )}
          </div>
        )}

        {/* Categories Bar (SST, Trabalhista, Demais - 3 Categorias) */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-wrap items-center gap-1">
          <button
            onClick={() => setSelectedCategory('SST')}
            className={`flex-1 min-w-[170px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              selectedCategory === 'SST'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-transparent text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Pendências Documentações de SST</span>
          </button>
          <button
            onClick={() => setSelectedCategory('TRABALHISTA')}
            className={`flex-1 min-w-[170px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              selectedCategory === 'TRABALHISTA'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-transparent text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pendências Documentações Trabalhistas</span>
          </button>
          <button
            onClick={() => setSelectedCategory('DEMAIS')}
            className={`flex-1 min-w-[170px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              selectedCategory === 'DEMAIS'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-transparent text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pendências Demais Documentações</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveFilter('TODOS')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeFilter === 'TODOS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({employees.length})
          </button>

          {/* 30-Day Alert Filter with blinking beacon */}
          <button
            onClick={() => setActiveFilter('A_VENCER_30')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeFilter === 'A_VENCER_30'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600 animate-pulse" />
            </span>
            <span>A Vencer (≤ 30 dias)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-950 font-extrabold">
              {countTotalAVencer}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('COM_PENDENCIA')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeFilter === 'COM_PENDENCIA'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Com Pendência ({employees.filter((e) => e.statusGeral !== 'EM_DIA').length})
          </button>

          <button
            onClick={() => setActiveFilter('CRITICO')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeFilter === 'CRITICO'
                ? 'bg-rose-600 text-white font-black'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 animate-pulse" />
            </span>
            <span>Vencidos / Bloqueados</span>
          </button>

          <button
            onClick={() => setActiveFilter('EM_DIA')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeFilter === 'EM_DIA'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            100% Em Dia ({employees.filter((e) => e.statusGeral === 'EM_DIA').length})
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <button
            onClick={() => setActiveFilter('FILTRO_OS')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              activeFilter === 'FILTRO_OS'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ordem de Serviço
          </button>
          <button
            onClick={() => setActiveFilter('FILTRO_ASO')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              activeFilter === 'FILTRO_ASO'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ASO
          </button>
          <button
            onClick={() => setActiveFilter('FILTRO_EPI')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              activeFilter === 'FILTRO_EPI'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ficha EPI
          </button>
          <button
            onClick={() => setActiveFilter('FILTRO_RADIO')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              activeFilter === 'FILTRO_RADIO'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Certificação
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Nenhum colaborador encontrado
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Ajuste os filtros de pesquisa ou utilize a opção "Importar Planilha" para cadastrar seus colaboradores em lote.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={onOpenExcelImport}
                className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
              >
                Importar Planilha Oficial
              </button>
              <button
                onClick={onOpenNewEmployee}
                style={{ backgroundColor: primaryColor }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
              >
                Cadastrar Manualmente
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                  <th className="py-3.5 px-4">Colaborador & Matrícula</th>
                  <th className="py-3.5 px-3">Área / Setor & Gestor</th>
                  <th className="py-3.5 px-3">Contrato Vinculado</th>
                  <th className="py-3.5 px-3 text-center">Ordem Serviço</th>
                  <th className="py-3.5 px-3 text-center">ASO (NR-07)</th>
                  <th className="py-3.5 px-3 text-center">Ficha EPI</th>
                  <th className="py-3.5 px-3 text-center">Certificação</th>
                  <th className="py-3.5 px-3 text-center">Conformidade</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredEmployees.map((emp) => {
                  const hasAVencer = (emp.pendencias || []).some((p) => p.status === 'A_VENCER');
                  const hasVencido = (emp.pendencias || []).some((p) => p.status === 'VENCIDO');

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        hasVencido
                          ? 'bg-rose-50/30'
                          : hasAVencer
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Employee Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-black text-xs shrink-0 border border-slate-200 mt-0.5">
                            {emp.nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 group-hover:text-slate-950">
                                {emp.nome}
                              </span>
                              {/* Pulsing beacon on critical or a vencer */}
                              {hasVencido && (
                                <span className="relative flex h-2 w-2" title="Possui item vencido!">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 animate-pulse" />
                                </span>
                              )}
                              {hasAVencer && !hasVencido && (
                                <span className="relative flex h-2 w-2" title="Possui item a vencer em ≤ 30 dias!">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-700">{emp.matricula}</span>
                              {emp.cpf && <span>• CPF: {emp.cpf}</span>}
                              <span>• {emp.cargo}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Area & Manager */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block text-xs truncate max-w-[170px]">
                            {emp.areaNome || emp.setor || 'Geral'}
                          </span>
                          {emp.areaResponsavelNome ? (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-[170px]">
                              <span>Resp:</span>
                              <strong className="text-slate-700">{emp.areaResponsavelNome}</strong>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Sem resp. direto</span>
                          )}
                        </div>
                      </td>

                      {/* Contract */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block text-xs truncate max-w-[170px]">
                            {emp.contratoNome || 'Sem Contrato'}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[170px] block">
                            {emp.empresa}
                          </span>
                        </div>
                      </td>

                      {/* Document 1: OS */}
                      <td className="py-3 px-3 text-center">
                        {renderDocBadge(emp, 'ORDEM_DE_SERVICO', 'OS')}
                      </td>

                      {/* Document 2: ASO */}
                      <td className="py-3 px-3 text-center">
                        {renderDocBadge(emp, 'ATESTADO_SAUDE_OCUPACIONAL', 'ASO')}
                      </td>

                      {/* Document 3: EPI */}
                      <td className="py-3 px-3 text-center">
                        {renderDocBadge(emp, 'FICHA_EPI', 'EPI')}
                      </td>

                      {/* Document 4: Treinamento / Radioproteção */}
                      <td className="py-3 px-3 text-center">
                        {renderDocBadge(emp, 'TREINAMENTO_RADIOPROTECAO', 'Cert')}
                      </td>

                      {/* Compliance Progress Bar & Status Badge */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              emp.statusGeral === 'EM_DIA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : emp.statusGeral === 'BLOQUEADO'
                                ? 'bg-rose-600 text-white animate-pulse'
                                : emp.statusGeral === 'CRITICO'
                                ? 'bg-rose-100 text-rose-800 font-extrabold'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {emp.indicadorPercentual}%
                          </span>

                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${emp.indicadorPercentual}%`,
                                backgroundColor:
                                  emp.indicadorPercentual === 100
                                    ? '#059669'
                                    : emp.indicadorPercentual >= 75
                                    ? '#f59e0b'
                                    : '#e11d48',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Quick Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Demand Button */}
                          <button
                            onClick={() => onOpenDemand(emp)}
                            title="Cobrar / Notificar Regularização"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Detail Button */}
                          <button
                            onClick={() => onOpenDetail(emp)}
                            title="Ver Ficha Completa e Documentos"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!readOnly && (
                            <>
                              {/* Edit Button */}
                              <button
                                onClick={() => onEditEmployee(emp)}
                                title="Editar Colaborador e Pendências"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja excluir o colaborador ${emp.nome}?`)) {
                                    onDeleteEmployee(emp.id);
                                  }
                                }}
                                title="Excluir Colaborador"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
