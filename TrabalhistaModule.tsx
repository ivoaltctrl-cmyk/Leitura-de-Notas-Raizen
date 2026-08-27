import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCw,
  Menu,
  ChevronDown,
  ChevronUp,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  FileText,
  ShieldCheck,
  Building2,
  User,
  Trash2,
  Edit3,
  X,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TrabalhistaEnvio, BrandConfig } from '../types/index.ts';
import { getTrabalhistaMesesConsolidados } from '../utils/storage.ts';

interface TrabalhistaModuleProps {
  envios: TrabalhistaEnvio[];
  onSaveEnvios: (envios: TrabalhistaEnvio[]) => void;
  brand?: BrandConfig;
  isAdmin?: boolean;
  blinkingAlerts?: boolean;
}

export const TrabalhistaModule: React.FC<TrabalhistaModuleProps> = ({
  envios,
  onSaveEnvios,
  brand,
  isAdmin = false,
  blinkingAlerts = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMesFilter, setSelectedMesFilter] = useState<string>('TODOS');
  const [selectedAnoFilter, setSelectedAnoFilter] = useState<string>('TODOS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TODOS');
  const [pageSize, setPageSize] = useState<number | 'TODOS'>('TODOS');
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const [sortField, setSortField] = useState<'mes' | 'ano' | 'dataEnvio' | 'status'>('dataEnvio');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedEnvioModal, setSelectedEnvioModal] = useState<TrabalhistaEnvio | null>(null);
  const [isNewEnvioModalOpen, setIsNewEnvioModalOpen] = useState(false);

  // New Envio Form State
  const [newMes, setNewMes] = useState('07');
  const [newAno, setNewAno] = useState(2026);
  const [newStatus, setNewStatus] = useState<'Validado' | 'Reprovado' | 'Em Análise'>('Validado');
  const [newContratoNome, setNewContratoNome] = useState('CTR-GPA-2026/01 - Operação Logística');
  const [newEmpresa, setNewEmpresa] = useState('WFS Serviços Aeroportuários e Logística');
  const [newMotivo, setNewMotivo] = useState('');
  const [newObservacoes, setNewObservacoes] = useState('');
  const [newDocs, setNewDocs] = useState('Folha de Pagamento, Guia FGTS + Comprovante, GPS, CNDT');

  const primaryColor = brand?.primaryColor || '#E21B23';

  // Consolidado por mês (Regra do balizador)
  const mesesConsolidados = useMemo(() => {
    return getTrabalhistaMesesConsolidados(envios);
  }, [envios]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalEnvios = envios.length;
    const totalValidados = envios.filter((e) => e.status === 'Validado').length;
    const totalReprovados = envios.filter((e) => e.status === 'Reprovado').length;
    const totalEmAnalise = envios.filter((e) => e.status === 'Em Análise').length;
    const totalMesesValidados = mesesConsolidados.filter((m) => m.isValidado).length;
    const totalMesesPendentes = mesesConsolidados.filter((m) => !m.isValidado).length;
    const taxaConformidade =
      mesesConsolidados.length > 0
        ? Math.round((totalMesesValidados / mesesConsolidados.length) * 100)
        : 0;

    return {
      totalEnvios,
      totalValidados,
      totalReprovados,
      totalEmAnalise,
      totalMeses: mesesConsolidados.length,
      totalMesesValidados,
      totalMesesPendentes,
      taxaConformidade,
    };
  }, [envios, mesesConsolidados]);

  // Filtragem
  const filteredEnvios = useMemo(() => {
    return envios.filter((env) => {
      // Search
      const matchSearch =
        searchTerm === '' ||
        env.mes.includes(searchTerm) ||
        (env.mesNome && env.mesNome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        env.ano.toString().includes(searchTerm) ||
        env.dataEnvio.includes(searchTerm) ||
        env.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (env.motivoReprovacao && env.motivoReprovacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (env.observacoes && env.observacoes.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      // Filter Mês
      if (selectedMesFilter !== 'TODOS' && env.mes !== selectedMesFilter) {
        return false;
      }

      // Filter Ano
      if (selectedAnoFilter !== 'TODOS' && env.ano.toString() !== selectedAnoFilter) {
        return false;
      }

      // Filter Status
      if (selectedStatusFilter !== 'TODOS' && env.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [envios, searchTerm, selectedMesFilter, selectedAnoFilter, selectedStatusFilter]);

  // Ordenação
  const sortedEnvios = useMemo(() => {
    return [...filteredEnvios].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'mes') {
        comparison = parseInt(a.mes, 10) - parseInt(b.mes, 10);
      } else if (sortField === 'ano') {
        comparison = a.ano - b.ano;
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortField === 'dataEnvio') {
        // Converte DD/MM/AAAA HH:MM:SS para timestamp comparável
        const parseDate = (d: string) => {
          const parts = d.split(' ');
          const dateParts = parts[0]?.split('/') || [];
          const timeParts = parts[1]?.split(':') || ['00', '00', '00'];
          return new Date(
            parseInt(dateParts[2] || '2026', 10),
            parseInt(dateParts[1] || '1', 10) - 1,
            parseInt(dateParts[0] || '1', 10),
            parseInt(timeParts[0] || '0', 10),
            parseInt(timeParts[1] || '0', 10),
            parseInt(timeParts[2] || '0', 10)
          ).getTime();
        };
        comparison = parseDate(a.dataEnvio) - parseDate(b.dataEnvio);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredEnvios, sortField, sortOrder]);

  // Paginação
  const paginatedEnvios = useMemo(() => {
    if (pageSize === 'TODOS') return sortedEnvios;
    const start = (currentPage - 1) * pageSize;
    return sortedEnvios.slice(start, start + pageSize);
  }, [sortedEnvios, pageSize, currentPage]);

  const totalPages = pageSize === 'TODOS' ? 1 : Math.ceil(sortedEnvios.length / pageSize);

  const handleSort = (field: 'mes' | 'ano' | 'dataEnvio' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'dataEnvio' ? 'desc' : 'asc');
    }
  };

  // Exportar Excel
  const handleExportExcel = () => {
    const data = sortedEnvios.map((env) => ({
      Mês: env.mes,
      Ano: env.ano,
      'Data de Envio': env.dataEnvio,
      Status: env.status,
      Contrato: env.contratoNome || 'CTR-GPA-2026/01',
      Empresa: env.empresa || 'WFS Serviços Aeroportuários e Logística',
      'Motivo da Reprovação': env.motivoReprovacao || '',
      Documentos: (env.documentosAnexados || []).join(', '),
      Observações: env.observacoes || '',
      'Validado Por': env.validadoPor || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trabalhista Mensal');
    XLSX.writeFile(workbook, `Documentacao_Trabalhista_Mensal_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Salvar novo envio
  const handleCreateEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formattedNow = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newEntry: TrabalhistaEnvio = {
      id: `trab-env-${Date.now()}`,
      mes: newMes.padStart(2, '0'),
      mesNome: MES_LABELS[newMes] || `Mês ${newMes}`,
      ano: Number(newAno),
      dataEnvio: formattedNow,
      status: newStatus,
      contratoNome: newContratoNome,
      empresa: newEmpresa,
      motivoReprovacao: newStatus === 'Reprovado' ? newMotivo : undefined,
      observacoes: newObservacoes,
      documentosAnexados: newDocs.split(',').map((d) => d.trim()).filter(Boolean),
      validadoPor: newStatus === 'Validado' ? 'Auditoria Trabalhista GPA' : undefined,
      dataValidacao: newStatus === 'Validado' ? formattedNow : undefined,
    };

    const updated = [newEntry, ...envios];
    onSaveEnvios(updated);
    setIsNewEnvioModalOpen(false);
    setNewMotivo('');
    setNewObservacoes('');
  };

  // Atualizar envio existente no modal
  const handleUpdateEnvioStatus = (
    envioId: string,
    newStatusVal: 'Validado' | 'Reprovado' | 'Em Análise',
    motivo?: string
  ) => {
    const updated = envios.map((env) => {
      if (env.id === envioId) {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedNow = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
          now.getHours()
        )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        return {
          ...env,
          status: newStatusVal,
          motivoReprovacao: newStatusVal === 'Reprovado' ? motivo || env.motivoReprovacao || 'Documentação não conforme.' : undefined,
          validadoPor: newStatusVal === 'Validado' ? 'Auditoria Trabalhista GPA' : undefined,
          dataValidacao: newStatusVal === 'Validado' ? formattedNow : undefined,
        };
      }
      return env;
    });

    onSaveEnvios(updated);
    if (selectedEnvioModal && selectedEnvioModal.id === envioId) {
      setSelectedEnvioModal({
        ...selectedEnvioModal,
        status: newStatusVal,
        motivoReprovacao: newStatusVal === 'Reprovado' ? motivo : undefined,
      });
    }
  };

  // Deletar envio
  const handleDeleteEnvio = (envioId: string) => {
    if (confirm('Tem certeza que deseja remover este registro de envio?')) {
      const updated = envios.filter((e) => e.id !== envioId);
      onSaveEnvios(updated);
      setSelectedEnvioModal(null);
    }
  };

  const MES_LABELS: Record<string, string> = {
    '01': '01 - Janeiro',
    '02': '02 - Fevereiro',
    '03': '03 - Março',
    '04': '04 - Abril',
    '05': '05 - Maio',
    '06': '06 - Junho',
    '07': '07 - Julho',
    '08': '08 - Agosto',
    '09': '09 - Setembro',
    '10': '10 - Outubro',
    '11': '11 - Novembro',
    '12': '12 - Dezembro',
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header do Módulo Trabalhista */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200 border-l-4 border-l-blue-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md text-[11px] font-black bg-blue-50 text-blue-800 uppercase tracking-wider border border-blue-200">
            <Building2 className="w-3.5 h-3.5" />
            <span>MÓDULO DE REGULARIDADE TRABALHISTA • GPA / WFS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Documentação Trabalhista Mensal</span>
          </h2>
          <p className="text-xs text-slate-600 font-medium max-w-3xl">
            <strong>Regra do Balizador por Mês:</strong> O controle de conformidade trabalhista é apurado por mês de competência. Havendo{' '}
            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ao menos 1 envio validado no mês
            </span>
            , a competência é considerada integralmente regular e em dia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsNewEnvioModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Envio Mensal</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 shadow-2xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Indicadores da Seção de Pendências Trabalhistas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Base */}
        <div
          onClick={() => {
            setSelectedStatusFilter('TODOS');
            setSelectedMesFilter('TODOS');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl bg-white border cursor-pointer transition-all shadow-2xs ${
            selectedStatusFilter === 'TODOS'
              ? 'border-blue-600 ring-2 ring-blue-600/15'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Registrado</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900">{stats.totalEnvios}</div>
          <span className="text-[10px] text-slate-500 font-medium">
            {stats.totalMeses} competências monitoradas
          </span>
        </div>

        {/* Card 2: 100% Em Dia (Validadas) */}
        <div
          onClick={() => {
            setSelectedStatusFilter('Validado');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl bg-white border cursor-pointer transition-all shadow-2xs ${
            selectedStatusFilter === 'Validado'
              ? 'border-emerald-600 ring-2 ring-emerald-600/15 bg-emerald-50/20'
              : 'border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">100% Em Dia</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">
            {stats.totalMesesValidados} <span className="text-xs font-bold text-emerald-600">/ {stats.totalMeses} meses</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">
            {stats.taxaConformidade}% de conformidade ({stats.totalValidados} envios)
          </span>
        </div>

        {/* Card 3: Em Análise / A Vencer */}
        <div
          onClick={() => {
            setSelectedStatusFilter('Em Análise');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl bg-white border cursor-pointer transition-all shadow-2xs ${
            selectedStatusFilter === 'Em Análise'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
              : 'border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {blinkingAlerts && stats.totalEmAnalise > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Em Análise</span>
            </div>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-800">{stats.totalEmAnalise}</div>
          <span className="text-[10px] text-amber-700 font-medium">Aguardando parecer de auditoria</span>
        </div>

        {/* Card 4: Pendentes / Reprovados com Alerta Piscante */}
        <div
          onClick={() => {
            setSelectedStatusFilter('Reprovado');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl bg-white border cursor-pointer transition-all shadow-2xs ${
            selectedStatusFilter === 'Reprovado'
              ? 'border-rose-600 ring-2 ring-rose-600/20 bg-rose-50/20'
              : 'border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {blinkingAlerts && (stats.totalReprovados > 0 || stats.totalMesesPendentes > 0) && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 animate-pulse" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Pendências / Reprovados</span>
            </div>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700">
            {stats.totalReprovados} <span className="text-xs font-bold text-rose-600">reprovados</span>
          </div>
          <span className="text-[10px] text-rose-600 font-medium">
            {stats.totalMesesPendentes} competências sem validação
          </span>
        </div>
      </div>

      {/* Balizador por Mês - Visão de Competências Validadas */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-700" />
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">
              Balizador de Competências Mensais (Conformidade Consolidada)
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {stats.totalMesesValidados} de {stats.totalMeses} Meses em Dia ({stats.totalMeses > 0 ? Math.round((stats.totalMesesValidados / stats.totalMeses) * 100) : 0}%)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {mesesConsolidados.map((mes) => {
            const isSelected = selectedMesFilter === mes.mes && (selectedAnoFilter === 'TODOS' || selectedAnoFilter === mes.ano.toString());
            return (
              <div
                key={`${mes.ano}-${mes.mes}`}
                onClick={() => {
                  if (selectedMesFilter === mes.mes) {
                    setSelectedMesFilter('TODOS');
                  } else {
                    setSelectedMesFilter(mes.mes);
                  }
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'ring-2 ring-blue-600 bg-blue-50/50'
                    : 'hover:border-slate-300 bg-slate-50/70'
                } ${
                  mes.isValidado
                    ? 'border-emerald-200 hover:bg-emerald-50/40'
                    : 'border-rose-200 hover:bg-rose-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="font-mono font-black text-sm text-slate-800">
                    Mês {mes.mes}/{mes.ano}
                  </span>
                  {mes.isValidado ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-black bg-[#5cb85c] text-white shadow-2xs">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Validado</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-black bg-[#d9534f] text-white shadow-2xs">
                      <XCircle className="w-3 h-3" />
                      <span>Reprovado</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 font-medium truncate">
                  {mes.mesNome}
                </p>

                <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{mes.totalEnvios} {mes.totalEnvios === 1 ? 'envio' : 'envios'}</span>
                  {mes.totalReprovados > 0 && mes.isValidado && (
                    <span className="text-amber-700 font-bold text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Teve reprovações anteriores mas possui envio validado, portanto está regular">
                      {mes.totalReprovados} rep. sanadas
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card da Tabela Principal (Fiel ao Print) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Barra de Título Superior da Tabela (Estilo Print) */}
        <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Menu className="w-4 h-4 text-slate-600" />
            <span>Documentação Trabalhista Mensal</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSelectedMesFilter('TODOS');
                setSelectedAnoFilter('TODOS');
                setSelectedStatusFilter('TODOS');
                setSearchTerm('');
              }}
              title="Recarregar e limpar filtros"
              className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              title="Minimizar / Expandir"
              className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Busca (Estilo Print) */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Seletor de Registros por Página */}
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'TODOS' ? 'TODOS' : parseInt(e.target.value, 10);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="TODOS">Todos</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="font-medium text-slate-600">registros por página</span>
          </div>

          {/* Filtros Rápidos de Status & Busca */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="TODOS">Status: Todos</option>
              <option value="Validado">Apenas Validados</option>
              <option value="Reprovado">Apenas Reprovados</option>
            </select>

            {/* Input de Busca */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder=""
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TABELA DE ENVIOS (Exatamente conforme layout do print) */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 font-bold text-xs bg-slate-50/80 select-none">
                <th className="py-2.5 px-4 w-20 text-left font-bold">
                  <span>Ações</span>
                </th>
                <th
                  onClick={() => handleSort('mes')}
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-28"
                >
                  <div className="flex items-center gap-1">
                    <span>Mês</span>
                    {sortField === 'mes' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('ano')}
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-28"
                >
                  <div className="flex items-center gap-1">
                    <span>Ano</span>
                    {sortField === 'ano' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('dataEnvio')}
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Envio</span>
                    {sortField === 'dataEnvio' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-32 text-left"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedEnvios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">Nenhum envio trabalhista encontrado</p>
                    <p className="text-xs text-slate-400 mt-0.5">Verifique os filtros de busca aplicados.</p>
                  </td>
                </tr>
              ) : (
                paginatedEnvios.map((env) => {
                  return (
                    <tr
                      key={env.id}
                      className="hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      {/* Ações (Ícone de Lupa como no Print) */}
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => setSelectedEnvioModal(env)}
                          title="Visualizar detalhes do envio e histórico"
                          className="p-1 rounded text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Mês */}
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                        {env.mes}
                      </td>

                      {/* Ano */}
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {env.ano}
                      </td>

                      {/* Envio (Data e Hora) */}
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {env.dataEnvio}
                      </td>

                      {/* Status (Badges fiéis ao print) */}
                      <td className="py-2.5 px-4">
                        {env.status === 'Validado' ? (
                          <span
                            style={{ backgroundColor: '#5cb85c' }}
                            className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold text-white shadow-2xs select-none"
                          >
                            Validado
                          </span>
                        ) : (
                          <span
                            style={{ backgroundColor: '#d9534f' }}
                            className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold text-white shadow-2xs select-none"
                          >
                            Reprovado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela com Resumo de Registros */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Exibindo <strong>{paginatedEnvios.length}</strong> de <strong>{filteredEnvios.length}</strong> envios registrados
          </span>
          {pageSize !== 'TODOS' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white cursor-pointer"
              >
                Anterior
              </button>
              <span className="px-2 font-bold text-slate-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white cursor-pointer"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes da Ação (Lupa) */}
      {selectedEnvioModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header Modal */}
            <div
              className={`p-5 text-white flex items-center justify-between ${
                selectedEnvioModal.status === 'Validado' ? 'bg-emerald-700' : 'bg-rose-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {selectedEnvioModal.status === 'Validado' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <div>
                  <h3 className="font-black text-base">
                    Envio Trabalhista • Mês {selectedEnvioModal.mes}/{selectedEnvioModal.ano}
                  </h3>
                  <p className="text-xs text-white/90 font-medium">
                    Data do Envio: {selectedEnvioModal.dataEnvio}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEnvioModal(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  selectedEnvioModal.status === 'Validado'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">Status do Envio</span>
                  <span className="text-base font-black">{selectedEnvioModal.status}</span>
                </div>

                <div className="text-right text-xs">
                  {selectedEnvioModal.validadoPor && (
                    <p className="font-medium">
                      Por: <strong>{selectedEnvioModal.validadoPor}</strong>
                    </p>
                  )}
                  {selectedEnvioModal.dataValidacao && (
                    <p className="text-slate-500">{selectedEnvioModal.dataValidacao}</p>
                  )}
                </div>
              </div>

              {/* Motivo da Reprovação (se houver) */}
              {selectedEnvioModal.status === 'Reprovado' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Motivo da Reprovação pela Auditoria:</span>
                  </div>
                  <p className="text-xs font-medium pl-5">
                    {selectedEnvioModal.motivoReprovacao || 'Documentação com pendências ou ilegível.'}
                  </p>
                </div>
              )}

              {/* Dados do Contrato & Empresa */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block mb-0.5">Contrato</span>
                  <span className="font-bold text-slate-800">
                    {selectedEnvioModal.contratoNome || 'CTR-GPA-2026/01 - Operação Logística'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block mb-0.5">Prestador / Empresa</span>
                  <span className="font-bold text-slate-800">
                    {selectedEnvioModal.empresa || 'WFS Serviços Aeroportuários e Logística'}
                  </span>
                </div>
              </div>

              {/* Lista de Documentos Anexados */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  <span>Documentos Anexados neste Lote</span>
                </h4>
                <div className="space-y-1.5">
                  {(selectedEnvioModal.documentosAnexados || [
                    'Folha de Pagamento Sintética',
                    'Guia e Comprovante de Pagamento FGTS',
                    'Comprovantes Bancários de Salário',
                    'Certidão CNDT',
                  ]).map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-800 font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>{doc}</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Anexado
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações do Auditor / Gestor */}
              {isAdmin && (
                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Alterar Status da Auditoria:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleUpdateEnvioStatus(selectedEnvioModal.id, 'Validado')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprovar / Validar</span>
                    </button>

                    <button
                      onClick={() => {
                        const mot = prompt('Informe o motivo da reprovação:', selectedEnvioModal.motivoReprovacao || '');
                        if (mot !== null) {
                          handleUpdateEnvioStatus(selectedEnvioModal.id, 'Reprovado', mot);
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reprovar Envio</span>
                    </button>

                    <button
                      onClick={() => handleDeleteEnvio(selectedEnvioModal.id)}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                      title="Excluir envio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedEnvioModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Lançar Novo Envio Mensal */}
      {isNewEnvioModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <h3 className="font-black text-base">Lançar Envio Trabalhista Mensal</h3>
              </div>
              <button
                onClick={() => setIsNewEnvioModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEnvio} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mês de Competência</label>
                  <select
                    value={newMes}
                    onChange={(e) => setNewMes(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                  >
                    {Object.entries(MES_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ano</label>
                  <input
                    type="number"
                    value={newAno}
                    onChange={(e) => setNewAno(parseInt(e.target.value, 10))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status do Envio</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                >
                  <option value="Validado">Validado (Aprovado pela Auditoria)</option>
                  <option value="Reprovado">Reprovado (Com Apontamento)</option>
                </select>
              </div>

              {newStatus === 'Reprovado' && (
                <div>
                  <label className="text-xs font-bold text-rose-700 block mb-1">Motivo da Reprovação</label>
                  <input
                    type="text"
                    required
                    value={newMotivo}
                    onChange={(e) => setNewMotivo(e.target.value)}
                    placeholder="Ex: Falta do comprovante bancário da GFIP..."
                    className="w-full p-2 border border-rose-300 rounded-lg text-xs bg-rose-50/50"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Documentos Anexados (separados por vírgula)</label>
                <input
                  type="text"
                  value={newDocs}
                  onChange={(e) => setNewDocs(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  value={newObservacoes}
                  onChange={(e) => setNewObservacoes(e.target.value)}
                  placeholder="Anotações sobre a conferência dos arquivos..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewEnvioModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
                >
                  Salvar Registro de Envio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
