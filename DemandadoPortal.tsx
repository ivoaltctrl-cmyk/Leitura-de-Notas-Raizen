import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  Building2,
  FileText,
  HeartPulse,
  HardHat,
  Radio,
  User,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  CheckSquare,
  Square,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { Employee, Contract, AreaResponsavel, DocType, DocStatus, BrandConfig, PendingDoc, TrabalhistaEnvio } from '../types/index.ts';
import { updateEmployeeCalculatedFields } from '../utils/storage.ts';
import { TrabalhistaModule } from './TrabalhistaModule.tsx';
import { ContractsModule } from './ContractsModule.tsx';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';

interface DemandadoPortalProps {
  employees: Employee[];
  contracts: Contract[];
  areas: AreaResponsavel[];
  brand: BrandConfig;
  onSaveEmployee: (employee: Employee) => void;
  onSaveContract?: (contract: Contract) => void;
  onDeleteContract?: (contractId: string) => void;
  onOpenAdminLogin: () => void;
  isAdminLoggedIn: boolean;
  onSwitchToAdminTab: () => void;
  onResetData?: () => void;
  blinkingAlerts?: boolean;
  trabalhistaEnvios?: TrabalhistaEnvio[];
  onSaveTrabalhistaEnvios?: (envios: TrabalhistaEnvio[]) => void;
  onOpenGoogleSheetsSync?: () => void;
}

type SortField = 'matricula' | 'cpf' | 'nome' | 'cargo' | 'setor' | 'os' | 'aso' | 'epi' | 'radio' | 'statusGeral';
type SortOrder = 'asc' | 'desc';

export const DemandadoPortal: React.FC<DemandadoPortalProps> = ({
  employees,
  contracts,
  areas,
  brand,
  onSaveEmployee,
  onSaveContract,
  onDeleteContract,
  onOpenAdminLogin,
  isAdminLoggedIn,
  onSwitchToAdminTab,
  onResetData,
  blinkingAlerts = true,
  trabalhistaEnvios = [],
  onSaveTrabalhistaEnvios,
  onOpenGoogleSheetsSync,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'SST' | 'TRABALHISTA' | 'DEMAIS'>('SST');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'PENDENTES' | 'A_VENCER' | 'EM_DIA'>('TODOS');
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const primaryColor = brand?.primaryColor || '#E21B23'; // WFS Red
  const companyName = brand?.companyName || 'WFS';
  const companySubtitle = brand?.companySubtitle || 'A SATS COMPANY';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to extract doc by type
  const getEmpDoc = (emp: Employee, tipo: DocType): PendingDoc | undefined => {
    return emp.pendencias.find((p) => p.tipo === tipo);
  };

  // 1-Click Toggle for a specific doc
  const handleToggleDoc = (emp: Employee, docType: DocType, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const doc = getEmpDoc(emp, docType);
    if (!doc) return;

    const isCurrentlyEmDia = doc.status === 'EM_DIA';
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const updatedDocs: PendingDoc[] = emp.pendencias.map((d) => {
      if (d.tipo === docType) {
        if (isCurrentlyEmDia) {
          // Reopen pendency
          return {
            ...d,
            status: 'PENDENTE' as DocStatus,
            diasRestantes: undefined,
            observacoes: `Reaberto em ${new Date().toLocaleDateString('pt-BR')}`,
            ultimaAtualizacao: todayStr,
          };
        } else {
          // Mark as checked / sanado
          return {
            ...d,
            status: 'EM_DIA' as DocStatus,
            dataEmissao: todayStr,
            dataVencimento: nextYearStr,
            diasRestantes: 365,
            observacoes: `Sanado via Lista WFS em ${new Date().toLocaleDateString('pt-BR')}`,
            ultimaAtualizacao: todayStr,
          };
        }
      }
      return d;
    });

    const updatedEmp = updateEmployeeCalculatedFields({
      ...emp,
      pendencias: updatedDocs,
      dataUltimaLeitura: todayStr,
    });

    onSaveEmployee(updatedEmp);

    if (!isCurrentlyEmDia) {
      showToast(`✓ Documento de ${emp.nome.split(' ')[0]} atualizado para EM DIA!`);
      if (updatedEmp.statusGeral === 'EM_DIA') {
        try {
          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.7 },
          });
        } catch {}
      }
    } else {
      showToast(`Pendência reaberta para ${emp.nome.split(' ')[0]}.`);
    }
  };

  // 1-Click Sanar All Documents for an employee
  const handleSanarEmployeeAll = (emp: Employee, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const updatedDocs: PendingDoc[] = emp.pendencias.map((d) => {
      if (d.status === 'NAO_APLICAVEL') return d;
      return {
        ...d,
        status: 'EM_DIA' as DocStatus,
        dataEmissao: todayStr,
        dataVencimento: nextYearStr,
        diasRestantes: 365,
        observacoes: `100% Sanado via WFS em ${new Date().toLocaleDateString('pt-BR')}`,
        ultimaAtualizacao: todayStr,
      };
    });

    const updatedEmp = updateEmployeeCalculatedFields({
      ...emp,
      pendencias: updatedDocs,
      dataUltimaLeitura: todayStr,
    });

    onSaveEmployee(updatedEmp);
    showToast(`✓ Todas as pendências de ${emp.nome} foram sanadas!`);
  };

  // Bulk sanar selected
  const handleBulkSanarSelected = () => {
    if (selectedIds.length === 0) return;
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    let count = 0;
    employees.forEach((emp) => {
      if (selectedIds.includes(emp.id)) {
        const updatedDocs: PendingDoc[] = emp.pendencias.map((d) => {
          if (d.status === 'NAO_APLICAVEL') return d;
          return {
            ...d,
            status: 'EM_DIA' as DocStatus,
            dataEmissao: todayStr,
            dataVencimento: nextYearStr,
            diasRestantes: 365,
            observacoes: `Sanado em lote WFS em ${new Date().toLocaleDateString('pt-BR')}`,
            ultimaAtualizacao: todayStr,
          };
        });

        const updatedEmp = updateEmployeeCalculatedFields({
          ...emp,
          pendencias: updatedDocs,
          dataUltimaLeitura: todayStr,
        });

        onSaveEmployee(updatedEmp);
        count++;
      }
    });

    setSelectedIds([]);
    showToast(`✓ ${count} colaboradores foram 100% regularizados com sucesso!`);
    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch {}
  };

  // Export spreadsheet matching the exact image structure
  const handleExportExcel = () => {
    const dataToExport = filteredEmployees.map((emp) => {
      const os = getEmpDoc(emp, 'ORDEM_DE_SERVICO');
      const aso = getEmpDoc(emp, 'ATESTADO_SAUDE_OCUPACIONAL');
      const epi = getEmpDoc(emp, 'FICHA_EPI');
      const radio = getEmpDoc(emp, 'TREINAMENTO_RADIOPROTECAO');

      const formatDocExcel = (doc?: PendingDoc) => {
        if (!doc) return 'NÃO APLICÁVEL';
        if (doc.status === 'EM_DIA') return 'EM DIA';
        if (doc.status === 'A_VENCER') return `VENCENDO EM ${doc.diasRestantes ?? 30} DIAS`;
        if (doc.status === 'VENCIDO') return 'VENCIDO';
        if (doc.status === 'NAO_APLICAVEL') return 'NÃO APLICÁVEL';
        return 'PENDENTE';
      };

      return {
        'Matrícula': emp.matricula,
        'CPF': emp.cpf || '',
        'Nome': emp.nome,
        'Função': emp.cargo,
        'Setor': emp.setor || emp.areaNome || '',
        'OS': formatDocExcel(os),
        'ASO': formatDocExcel(aso),
        'FICHA DE EPI': formatDocExcel(epi),
        'RADIOPROTEÇÃO': formatDocExcel(radio),
        'Status Geral': emp.statusGeral,
        'Conformidade %': `${emp.indicadorPercentual}%`,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Controle SST WFS');
    XLSX.writeFile(workbook, `WFS_Controle_SST_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Planilha Excel baixada com sucesso!');
  };

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search match across all fields
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchName = emp.nome.toLowerCase().includes(term);
        const matchMatricula = emp.matricula.toLowerCase().includes(term);
        const matchCpf = emp.cpf ? emp.cpf.toLowerCase().includes(term) : false;
        const matchCargo = emp.cargo.toLowerCase().includes(term);
        const matchSetor = (emp.setor || '').toLowerCase().includes(term);
        const matchArea = (emp.areaNome || '').toLowerCase().includes(term);
        const matchEmpresa = (emp.empresa || '').toLowerCase().includes(term);

        if (!matchName && !matchMatricula && !matchCpf && !matchCargo && !matchSetor && !matchArea && !matchEmpresa) {
          return false;
        }
      }

      // Contract filter
      if (selectedContractId && emp.contratoId !== selectedContractId) {
        return false;
      }

      // Area filter
      if (selectedAreaId && emp.areaId !== selectedAreaId) {
        return false;
      }

      // Status filter
      if (filterStatus === 'PENDENTES') {
        const hasPendingOrExpired = emp.pendencias.some(
          (p) => p.status === 'PENDENTE' || p.status === 'VENCIDO'
        );
        if (!hasPendingOrExpired && emp.statusGeral === 'EM_DIA') return false;
      } else if (filterStatus === 'A_VENCER') {
        const hasAVencer = emp.pendencias.some((p) => p.status === 'A_VENCER');
        if (!hasAVencer) return false;
      } else if (filterStatus === 'EM_DIA') {
        if (emp.statusGeral !== 'EM_DIA') return false;
      }

      return true;
    });
  }, [employees, searchTerm, selectedContractId, selectedAreaId, filterStatus]);

  // Sort employees
  const sortedEmployees = useMemo(() => {
    const list = [...filteredEmployees];
    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'matricula':
          valA = a.matricula.toLowerCase();
          valB = b.matricula.toLowerCase();
          break;
        case 'cpf':
          valA = (a.cpf || '').toLowerCase();
          valB = (b.cpf || '').toLowerCase();
          break;
        case 'nome':
          valA = a.nome.toLowerCase();
          valB = b.nome.toLowerCase();
          break;
        case 'cargo':
          valA = a.cargo.toLowerCase();
          valB = b.cargo.toLowerCase();
          break;
        case 'setor':
          valA = (a.setor || a.areaNome || '').toLowerCase();
          valB = (b.setor || b.areaNome || '').toLowerCase();
          break;
        case 'os':
          valA = getEmpDoc(a, 'ORDEM_DE_SERVICO')?.status || '';
          valB = getEmpDoc(b, 'ORDEM_DE_SERVICO')?.status || '';
          break;
        case 'aso':
          valA = getEmpDoc(a, 'ATESTADO_SAUDE_OCUPACIONAL')?.status || '';
          valB = getEmpDoc(b, 'ATESTADO_SAUDE_OCUPACIONAL')?.status || '';
          break;
        case 'epi':
          valA = getEmpDoc(a, 'FICHA_EPI')?.status || '';
          valB = getEmpDoc(b, 'FICHA_EPI')?.status || '';
          break;
        case 'radio':
          valA = getEmpDoc(a, 'TREINAMENTO_RADIOPROTECAO')?.status || '';
          valB = getEmpDoc(b, 'TREINAMENTO_RADIOPROTECAO')?.status || '';
          break;
        case 'statusGeral':
          valA = a.indicadorPercentual;
          valB = b.indicadorPercentual;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredEmployees, sortField, sortOrder]);

  // Paginate
  const totalItems = sortedEmployees.length;
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(totalItems / effectivePageSize) : 1;
  const paginatedEmployees = useMemo(() => {
    if (pageSize === 0) return sortedEmployees;
    const start = (currentPage - 1) * pageSize;
    return sortedEmployees.slice(start, start + pageSize);
  }, [sortedEmployees, currentPage, pageSize]);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // KPI calculations
  const totalDemandados = employees.length;
  const totalEmDia = employees.filter((e) => e.statusGeral === 'EM_DIA').length;
  const totalCriticos = employees.filter(
    (e) => e.statusGeral === 'CRITICO' || e.statusGeral === 'BLOQUEADO' || e.pendencias.some((p) => p.status === 'PENDENTE' || p.status === 'VENCIDO')
  ).length;
  const totalAVencer = employees.filter((e) => e.pendencias.some((p) => p.status === 'A_VENCER')).length;

  // Toggle select all on page
  const handleToggleSelectAll = () => {
    const pageIds = paginatedEmployees.map((e) => e.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  /**
   * Helper component to render an interactive document cell optimized for single-page view (no scrollbar)
   */
  const renderDocCell = (emp: Employee, docType: DocType) => {
    const doc = getEmpDoc(emp, docType);
    if (!doc || doc.status === 'NAO_APLICAVEL') {
      return (
        <div className="text-center">
          <span className="text-slate-300 text-[11px] font-normal" title="Não aplicável para esta função">
            —
          </span>
        </div>
      );
    }

    if (doc.status === 'EM_DIA') {
      return (
        <button
          onClick={(e) => handleToggleDoc(emp, docType, e)}
          title="Status: EM DIA. Clique se desejar reabrir a pendência."
          className="w-full inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 font-bold text-[10.5px] cursor-pointer transition-all hover:scale-102"
        >
          <Check className="w-3 h-3 stroke-[3] text-emerald-600 shrink-0" />
          <span className="truncate">EM DIA</span>
        </button>
      );
    }

    if (doc.status === 'A_VENCER') {
      const dias = doc.diasRestantes ?? 22;
      return (
        <button
          onClick={(e) => handleToggleDoc(emp, docType, e)}
          title={`Vencendo em ${dias} dias. Clique para registrar renovação (Dar Check)!`}
          className={`w-full inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-amber-50 text-amber-900 hover:bg-amber-100 border font-bold text-[10.5px] cursor-pointer transition-all hover:scale-102 ${
            blinkingAlerts ? 'border-amber-400 ring-1 ring-amber-300' : 'border-amber-300'
          }`}
        >
          {/* Pulsing Amber Beacon Indicator */}
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {blinkingAlerts && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500 animate-pulse" />
          </span>
          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="truncate">{dias}d (Renovar)</span>
        </button>
      );
    }

    // VENCIDO or PENDENTE -> Render interactive single-click status with pulsing alert
    return (
      <button
        onClick={(e) => handleToggleDoc(emp, docType, e)}
        title="Status: VENCIDO. Clique aqui para informar que a pendência foi sanada (Dar Check)!"
        className={`w-full inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded text-rose-700 hover:text-rose-900 border font-bold text-[10.5px] cursor-pointer transition-all hover:shadow-xs group ${
          blinkingAlerts
            ? 'bg-rose-50/90 hover:bg-rose-100 border-rose-400 ring-1 ring-rose-300 animate-pulse'
            : 'bg-rose-50 hover:bg-rose-100 border-rose-300'
        }`}
      >
        {/* Pulsing Red Radar Beacon */}
        <span className="relative flex h-2 w-2 shrink-0">
          {blinkingAlerts && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          )}
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E21B23]" />
        </span>
        <span className="font-black text-rose-800 shrink-0">VENCIDO</span>
        <span className="text-[10px] text-rose-600 group-hover:text-rose-800 underline truncate">
          (Sanar)
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-1 rounded-full bg-[#E21B23] text-white">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Discreto - Portal de Pendências dos Contratos GPA */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200 border-l-4 border-l-[#E21B23] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md text-[11px] font-black bg-[#E21B23]/10 text-[#E21B23] uppercase tracking-wider border border-[#E21B23]/20">
            <span className="w-2 h-2 rounded-full bg-[#E21B23]" />
            <span>PORTAL DE PENDÊNCIAS DOS CONTRATOS GPA • WFS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Controle Pendências Documentais
          </h2>
          <p className="text-xs text-slate-600 font-medium max-w-2xl">
            Visualize a lista geral de colaboradores e clique diretamente no texto da pendência para saná-la com 1 clique.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenGoogleSheetsSync && (
            <button
              onClick={onOpenGoogleSheetsSync}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
              title="Sincronizar dados bidirecionalmente com o Google Sheets GPA_BD"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Sincronizar GPA_BD (Sheets)</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 shadow-2xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Seletor de Categorias de Controle Documental GPA (3 Categorias) */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-1.5 shadow-inner">
        <button
          onClick={() => {
            setSelectedCategory('SST');
            setCurrentPage(1);
          }}
          className={`flex-1 min-w-[180px] px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            selectedCategory === 'SST'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-transparent text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Pendências Documentações de SST</span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory('TRABALHISTA');
            setCurrentPage(1);
          }}
          className={`flex-1 min-w-[180px] px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            selectedCategory === 'TRABALHISTA'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-transparent text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Pendências Documentações Trabalhistas</span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory('DEMAIS');
            setCurrentPage(1);
          }}
          className={`flex-1 min-w-[180px] px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            selectedCategory === 'DEMAIS'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-transparent text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Pendências Demais Documentações</span>
        </button>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL POR CATEGORIA */}
      {selectedCategory === 'TRABALHISTA' ? (
        <TrabalhistaModule
          envios={trabalhistaEnvios}
          onSaveEnvios={onSaveTrabalhistaEnvios || (() => {})}
          brand={brand}
          isAdmin={isAdminLoggedIn}
          blinkingAlerts={blinkingAlerts}
        />
      ) : selectedCategory === 'DEMAIS' ? (
        <div className="space-y-4">
          <ContractsModule
            contracts={contracts}
            employees={employees}
            onSelectContractToFilter={() => setSelectedCategory('SST')}
            onSaveContract={onSaveContract || (() => {})}
            onDeleteContract={onDeleteContract || (() => {})}
            onDemandContract={() => {}}
            brand={brand}
            isAdmin={isAdminLoggedIn}
          />
        </div>
      ) : (
        <>
      {/* KPI Cards Rápidos Compactos com Alertas Piscantes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => {
            setFilterStatus('TODOS');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl bg-white border cursor-pointer transition-all shadow-2xs ${
            filterStatus === 'TODOS' ? 'border-[#E21B23] ring-2 ring-[#E21B23]/15' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Base</span>
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900">{totalDemandados.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-slate-500">Colaboradores no sistema</span>
        </div>

        <div
          onClick={() => {
            setFilterStatus('EM_DIA');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl bg-white border cursor-pointer transition-all shadow-2xs ${
            filterStatus === 'EM_DIA' ? 'border-emerald-600 ring-2 ring-emerald-600/15' : 'border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">100% Em Dia</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">{totalEmDia.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-emerald-600">Acesso liberado</span>
        </div>

        {/* Card A Vencer com Alerta Piscante */}
        <div
          onClick={() => {
            setFilterStatus('A_VENCER');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl bg-white border cursor-pointer transition-all shadow-2xs ${
            filterStatus === 'A_VENCER' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {blinkingAlerts && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider">A Vencer (≤ 30d)</span>
            </div>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-800">{totalAVencer.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-amber-700">Renovação preventiva</span>
        </div>

        {/* Card Pendentes/Vencidos com Alerta Vermelho Piscante */}
        <div
          onClick={() => {
            setFilterStatus('PENDENTES');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl bg-white border cursor-pointer transition-all shadow-2xs ${
            filterStatus === 'PENDENTES' ? 'border-[#E21B23] ring-2 ring-[#E21B23]/20 bg-rose-50/20' : 'border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-[#E21B23] mb-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {blinkingAlerts && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E21B23] animate-pulse" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Pendentes / Vencidos</span>
            </div>
            <AlertTriangle className="w-4 h-4 text-[#E21B23] animate-pulse" />
          </div>
          <div className="text-xl font-black text-[#E21B23]">{totalCriticos.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-rose-600">Requer saneamento</span>
        </div>
      </div>

      {/* Barra de Filtros, Busca & Paginação */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Campo de Busca Rápida */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Matrícula, CPF, Nome, Função ou Setor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
            />
          </div>

          {/* Filtros Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-1 min-w-[170px]">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedContractId}
                onChange={(e) => {
                  setSelectedContractId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Todos os Contratos/Bases</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero} - {c.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 min-w-[170px]">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedAreaId}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Todos os Setores/Áreas</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || selectedContractId || selectedAreaId || filterStatus !== 'TODOS') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedContractId('');
                  setSelectedAreaId('');
                  setFilterStatus('TODOS');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Linha de Filtros Rápidos + Ações em Lote */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Filtro:</span>
            <button
              onClick={() => {
                setFilterStatus('TODOS');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'TODOS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos ({employees.length})
            </button>
            <button
              onClick={() => {
                setFilterStatus('PENDENTES');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'PENDENTES'
                  ? 'bg-[#E21B23] text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {blinkingAlerts && totalCriticos > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    filterStatus === 'PENDENTES' ? 'bg-white' : 'bg-[#E21B23]'
                  }`}
                />
              </span>
              <span>Vencidos / Pendentes ({totalCriticos})</span>
            </button>
            <button
              onClick={() => {
                setFilterStatus('A_VENCER');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'A_VENCER'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {blinkingAlerts && totalAVencer > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    filterStatus === 'A_VENCER' ? 'bg-white' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span>A Vencer ({totalAVencer})</span>
            </button>
            <button
              onClick={() => {
                setFilterStatus('EM_DIA');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'EM_DIA'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Em Dia ({totalEmDia})
            </button>
          </div>

          {/* Bulk Action Button */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                {selectedIds.length} selecionado(s)
              </span>
              <button
                onClick={handleBulkSanarSelected}
                className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Sanar Selecionados (100% Em Dia)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TABELA PLANILHA COMPACTA EM PÁGINA ÚNICA (SEM BARRA DE ROLAGEM HORIZONTAL) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="w-full">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <colgroup>
              <col className="w-7 sm:w-8" />
              <col className="w-[78px] sm:w-[84px]" />
              <col className="w-[100px] sm:w-[108px]" />
              <col className="w-[17%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[74px] sm:w-[80px]" />
            </colgroup>

            {/* Header da Planilha */}
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-black uppercase text-[10.5px] border-b border-slate-300 select-none">
                <th className="py-2.5 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedEmployees.length > 0 && paginatedEmployees.every((e) => selectedIds.includes(e.id))}
                    onChange={handleToggleSelectAll}
                    className="rounded text-[#E21B23] focus:ring-[#E21B23] cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort('matricula')}
                  className="py-2.5 px-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-0.5">
                    <span className="truncate">MATRÍCULA</span>
                    {sortField === 'matricula' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#E21B23] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#E21B23] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cpf')}
                  className="py-2.5 px-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-0.5">
                    <span className="truncate">CPF</span>
                    {sortField === 'cpf' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#E21B23] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#E21B23] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nome')}
                  className="py-2.5 px-2 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-0.5">
                    <span className="truncate">NOME</span>
                    {sortField === 'nome' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#E21B23] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#E21B23] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cargo')}
                  className="py-2.5 px-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-0.5">
                    <span className="truncate">FUNÇÃO</span>
                    {sortField === 'cargo' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#E21B23] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#E21B23] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('setor')}
                  className="py-2.5 px-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-0.5">
                    <span className="truncate">SETOR</span>
                    {sortField === 'setor' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#E21B23] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#E21B23] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('os')}
                  className="py-2.5 px-1 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">OS</span>
                    {sortField === 'os' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#E21B23] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#E21B23] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('aso')}
                  className="py-2.5 px-1 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">ASO</span>
                    {sortField === 'aso' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#E21B23] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#E21B23] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('epi')}
                  className="py-2.5 px-1 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">FICHA EPI</span>
                    {sortField === 'epi' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#E21B23] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#E21B23] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('radio')}
                  className="py-2.5 px-1 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">RADIOPROTEÇÃO</span>
                    {sortField === 'radio' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#E21B23] shrink-0" /> : <ArrowDown className="w-3 h-3 text-[#E21B23] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30 shrink-0" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-2 text-center">
                  <span className="truncate">AÇÕES</span>
                </th>
              </tr>
            </thead>

            {/* Linhas da Tabela */}
            <tbody className="divide-y divide-slate-200">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 px-4 text-center text-slate-500">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-base text-slate-800">Nenhum colaborador encontrado</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {employees.length === 0
                        ? 'A base de dados está vazia. Você pode carregar a base de dados de demonstração da WFS com mais de 1.450 colaboradores cadastrados.'
                        : 'Não encontramos nenhum registro correspondente aos filtros e termos de busca aplicados.'}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      {employees.length === 0 && onResetData ? (
                        <button
                          onClick={onResetData}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-[#E21B23] text-white hover:bg-red-700 shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Carregar Base Demonstrativa WFS (+1.450 Colaboradores)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedContractId('');
                            setSelectedAreaId('');
                            setFilterStatus('TODOS');
                            setCurrentPage(1);
                          }}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-all"
                        >
                          Limpar Todos os Filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, index) => {
                  const isSelected = selectedIds.includes(emp.id);
                  const isAllEmDia = emp.statusGeral === 'EM_DIA';

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-red-50/30' : index % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(emp.id)}
                          className="rounded text-[#E21B23] focus:ring-[#E21B23] cursor-pointer"
                        />
                      </td>

                      {/* Matrícula */}
                      <td className="py-2 px-1.5 font-mono font-bold text-slate-800 truncate" title={emp.matricula}>
                        {emp.matricula}
                      </td>

                      {/* CPF */}
                      <td className="py-2 px-1.5 font-mono text-slate-600 truncate text-[11px]" title={emp.cpf || '—'}>
                        {emp.cpf || '—'}
                      </td>

                      {/* Nome */}
                      <td className="py-2 px-2 font-bold text-slate-900 truncate" title={emp.nome}>
                        {emp.nome}
                      </td>

                      {/* Função */}
                      <td className="py-2 px-1.5 text-slate-700 truncate" title={emp.cargo}>
                        {emp.cargo}
                      </td>

                      {/* Setor */}
                      <td className="py-2 px-1.5 text-slate-700 truncate" title={emp.setor || emp.areaNome || 'Operações'}>
                        {emp.setor || emp.areaNome || 'Operações'}
                      </td>

                      {/* OS */}
                      <td className="py-2 px-1">
                        {renderDocCell(emp, 'ORDEM_DE_SERVICO')}
                      </td>

                      {/* ASO */}
                      <td className="py-2 px-1">
                        {renderDocCell(emp, 'ATESTADO_SAUDE_OCUPACIONAL')}
                      </td>

                      {/* FICHA DE EPI */}
                      <td className="py-2 px-1">
                        {renderDocCell(emp, 'FICHA_EPI')}
                      </td>

                      {/* RADIOPROTEÇÃO */}
                      <td className="py-2 px-1">
                        {renderDocCell(emp, 'TREINAMENTO_RADIOPROTECAO')}
                      </td>

                      {/* Ações Rápidas */}
                      <td className="py-2 px-1.5 text-center">
                        {!isAllEmDia ? (
                          <button
                            onClick={(e) => handleSanarEmployeeAll(emp, e)}
                            title="Regularizar todas as pendências deste colaborador com 1 clique"
                            className="w-full px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] cursor-pointer transition-all shadow-2xs truncate"
                          >
                            Sanar Tudo
                          </button>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">Regular</span>
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

        {/* Rodapé de Paginação e Contadores (Ideal para 1.000+ Linhas) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Linhas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-slate-900"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={0}>Todos ({totalItems})</option>
            </select>

            <span className="text-slate-500 ml-2">
              Mostrando{' '}
              <strong className="text-slate-800">
                {totalItems === 0 ? 0 : (currentPage - 1) * (pageSize || totalItems) + 1}
              </strong>{' '}
              a{' '}
              <strong className="text-slate-800">
                {pageSize === 0 ? totalItems : Math.min(currentPage * pageSize, totalItems)}
              </strong>{' '}
              de <strong className="text-slate-800">{totalItems.toLocaleString('pt-BR')}</strong> colaboradores
            </span>
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                title="Primeira página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-bold text-slate-800">
                Pág. {currentPage} de {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
