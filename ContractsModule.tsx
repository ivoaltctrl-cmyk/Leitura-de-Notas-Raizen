import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  Eye,
  Edit3,
  Trash2,
  Users,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  RotateCcw,
  Check,
  Send,
  Building,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Contract, Employee, ContractDocumentItem, BrandConfig } from '../types/index.ts';
import { calculateContractMetrics } from '../utils/storage.ts';

interface ContractsModuleProps {
  contracts: Contract[];
  employees: Employee[];
  onSelectContractToFilter?: (contractId: string) => void;
  onFilterByContract?: (contractId: string) => void;
  onSaveContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
  onDemandContract?: (contract: Contract) => void;
  brand?: BrandConfig;
  isAdmin?: boolean;
}

export const ContractsModule: React.FC<ContractsModuleProps> = ({
  contracts,
  employees,
  onSelectContractToFilter,
  onFilterByContract,
  onSaveContract,
  onDeleteContract,
  onDemandContract = () => {},
  brand,
  isAdmin = true,
}) => {
  const handleSelectFilter = onSelectContractToFilter || onFilterByContract || (() => {});
  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [vigenciaFilter, setVigenciaFilter] = useState<'TODOS' | 'Vigente' | 'Vencido'>('TODOS');
  const [docFilter, setDocFilter] = useState<'TODOS' | 'Validado' | 'Em Análise' | 'Reprovado'>('TODOS');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('TODAS');

  // Modals
  const [selectedContractForDetail, setSelectedContractForDetail] = useState<Contract | null>(null);
  const [selectedContractForDocs, setSelectedContractForDocs] = useState<Contract | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // New/Edit Form State
  const [formData, setFormData] = useState<Partial<Contract>>({
    numero: '',
    titulo: '',
    objeto: '',
    cnpjPrestador: '05.007.113/0001-32',
    empresaPrestador: 'ORBITAL SERV. AUX. DE TRANSP. AÉREO',
    categoria: 'ESATA',
    cliente: 'GRU Airport - Concessionária',
    unidade: 'Terminal Operacional',
    gestorResponsavel: 'Gestão de Contratos',
    emailContato: '',
    telefoneContato: '',
    dataInicio: '01/01/2026',
    dataTermino: '31/12/2027',
    vigenciaInicio: '2026-01-01',
    vigenciaFim: '2027-12-31',
    statusVigencia: 'Vigente',
    statusDocumentos: 'Validado',
    status: 'ATIVO',
    limiteBloqueioConformidade: 85,
    observacoes: '',
  });

  // Extract unique categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach((c) => {
      if (c.categoria && c.categoria.trim() !== '') {
        set.add(c.categoria.trim());
      }
    });
    return Array.from(set);
  }, [contracts]);

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const numMatch = (c.numero || '').toLowerCase().includes(q);
      const objMatch = (c.objeto || c.titulo || '').toLowerCase().includes(q);
      const catMatch = (c.categoria || '').toLowerCase().includes(q);
      const cliMatch = (c.cliente || '').toLowerCase().includes(q);
      const gestorMatch = (c.gestorResponsavel || '').toLowerCase().includes(q);

      const matchesSearch = !q || numMatch || objMatch || catMatch || cliMatch || gestorMatch;

      const matchesVigencia =
        vigenciaFilter === 'TODOS' ||
        (c.statusVigencia ? c.statusVigencia === vigenciaFilter : vigenciaFilter === 'Vigente' ? c.status === 'ATIVO' : c.status === 'ENCERRADO');

      const matchesDoc =
        docFilter === 'TODOS' ||
        (c.statusDocumentos ? c.statusDocumentos === docFilter : docFilter === 'Validado');

      const matchesCat =
        categoriaFilter === 'TODAS' ||
        (c.categoria || '') === categoriaFilter;

      return matchesSearch && matchesVigencia && matchesDoc && matchesCat;
    });
  }, [contracts, searchTerm, vigenciaFilter, docFilter, categoriaFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = contracts.length;
    const vigentes = contracts.filter((c) => (c.statusVigencia === 'Vigente' || c.status === 'ATIVO')).length;
    const vencidos = contracts.filter((c) => (c.statusVigencia === 'Vencido' || c.status === 'ENCERRADO')).length;
    const validados = contracts.filter((c) => (c.statusDocumentos === 'Validado' || (!c.statusDocumentos && c.status === 'ATIVO'))).length;
    const emAnalise = contracts.filter((c) => c.statusDocumentos === 'Em Análise').length;
    const reprovados = contracts.filter((c) => c.statusDocumentos === 'Reprovado').length;

    return { total, vigentes, vencidos, validados, emAnalise, reprovados };
  }, [contracts]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredContracts.map((c) => ({
      'CNPJ Prestador': c.cnpjPrestador || '05.007.113/0001-32',
      'Empresa Prestadora': c.empresaPrestador || 'ORBITAL SERV. AUX. DE TRANSP. AÉREO',
      'Contrato': c.numero,
      'Objeto do Contrato': c.objeto || c.titulo,
      'Categoria': c.categoria || 'N/A',
      'Início': c.dataInicio || c.vigenciaInicio || '',
      'Término': c.dataTermino || c.vigenciaFim || '',
      'Status Vigência': c.statusVigencia || (c.status === 'ATIVO' ? 'Vigente' : 'Vencido'),
      'Status Documentos': c.statusDocumentos || 'Validado',
      'Cliente / Concessionária': c.cliente,
      'Unidade': c.unidade,
      'Gestor Responsável': c.gestorResponsavel,
      'Observações': c.observacoes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contratos');
    XLSX.writeFile(
      workbook,
      `Contratos_Orbital_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleOpenNew = () => {
    setEditingContract(null);
    setFormData({
      numero: `GRU${Math.floor(100000000000 + Math.random() * 899999999999)}`,
      titulo: '',
      objeto: '',
      cnpjPrestador: '05.007.113/0001-32',
      empresaPrestador: 'ORBITAL SERV. AUX. DE TRANSP. AÉREO',
      categoria: 'ESATA',
      cliente: 'GRU Airport - Concessionária',
      unidade: 'Terminal 2',
      gestorResponsavel: 'Coordenação Operacional',
      emailContato: '',
      telefoneContato: '',
      dataInicio: new Date().toLocaleDateString('pt-BR'),
      dataTermino: new Date(Date.now() + 365 * 86400000 * 2).toLocaleDateString('pt-BR'),
      vigenciaInicio: new Date().toISOString().split('T')[0],
      vigenciaFim: new Date(Date.now() + 365 * 86400000 * 2).toISOString().split('T')[0],
      statusVigencia: 'Vigente',
      statusDocumentos: 'Validado',
      status: 'ATIVO',
      limiteBloqueioConformidade: 85,
      observacoes: '',
      documentosContrato: [
        { id: `d_${Date.now()}_1`, nome: 'Contrato Social e Procuração', tipo: 'Jurídico', status: 'Validado' },
        { id: `d_${Date.now()}_2`, nome: 'Apólice de Seguro de Responsabilidade Civil', tipo: 'Seguros', status: 'Validado' },
        { id: `d_${Date.now()}_3`, nome: 'PGR e PCMSO Específico', tipo: 'SST', status: 'Validado' },
      ],
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: Contract) => {
    setEditingContract(c);
    setFormData({
      ...c,
      objeto: c.objeto || c.titulo,
      cnpjPrestador: c.cnpjPrestador || '05.007.113/0001-32',
      empresaPrestador: c.empresaPrestador || 'ORBITAL SERV. AUX. DE TRANSP. AÉREO',
      statusVigencia: c.statusVigencia || (c.status === 'ATIVO' ? 'Vigente' : 'Vencido'),
      statusDocumentos: c.statusDocumentos || 'Validado',
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numero || (!formData.objeto && !formData.titulo)) {
      alert('Preencha o Número e o Objeto do Contrato.');
      return;
    }

    const saved: Contract = {
      id: editingContract ? editingContract.id : `ctr_${Date.now()}`,
      numero: formData.numero || '',
      titulo: formData.objeto || formData.titulo || '',
      objeto: formData.objeto || formData.titulo || '',
      cnpjPrestador: formData.cnpjPrestador || '05.007.113/0001-32',
      empresaPrestador: formData.empresaPrestador || 'ORBITAL SERV. AUX. DE TRANSP. AÉREO',
      categoria: formData.categoria || '',
      cliente: formData.cliente || 'GRU Airport',
      unidade: formData.unidade || '',
      gestorResponsavel: formData.gestorResponsavel || 'Gestor Responsável',
      emailContato: formData.emailContato || '',
      telefoneContato: formData.telefoneContato || '',
      dataInicio: formData.dataInicio || '',
      dataTermino: formData.dataTermino || '',
      vigenciaInicio: formData.vigenciaInicio || '',
      vigenciaFim: formData.vigenciaFim || '',
      statusVigencia: formData.statusVigencia || 'Vigente',
      statusDocumentos: formData.statusDocumentos || 'Validado',
      status: formData.statusVigencia === 'Vigente' ? 'ATIVO' : 'ENCERRADO',
      limiteBloqueioConformidade: formData.limiteBloqueioConformidade || 85,
      observacoes: formData.observacoes || '',
      documentosContrato: formData.documentosContrato || editingContract?.documentosContrato || [
        { id: `doc_${Date.now()}_1`, nome: 'Contrato Social / Procuração', tipo: 'Jurídico', status: 'Validado' },
        { id: `doc_${Date.now()}_2`, nome: 'Apólice de Seguro de Responsabilidade Civil', tipo: 'Seguros', status: 'Validado' },
      ],
    };

    onSaveContract(saved);
    setIsFormOpen(false);
  };

  // Toggle document status inside contract detail modal
  const handleUpdateDocStatus = (
    contractId: string,
    docId: string,
    newStatus: 'Validado' | 'Reprovado' | 'Em Análise',
    motivo?: string
  ) => {
    const target = contracts.find((c) => c.id === contractId);
    if (!target) return;

    const updatedDocs = (target.documentosContrato || []).map((doc) => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: newStatus,
          motivoReprovacao: newStatus === 'Reprovado' ? motivo || 'Documentação não conforme com as cláusulas contratuais.' : undefined,
        };
      }
      return doc;
    });

    // Recalculate contract overall doc status
    let overallDocStatus: 'Validado' | 'Reprovado' | 'Em Análise' = 'Validado';
    if (updatedDocs.some((d) => d.status === 'Reprovado')) {
      overallDocStatus = 'Reprovado';
    } else if (updatedDocs.some((d) => d.status === 'Em Análise')) {
      overallDocStatus = 'Em Análise';
    }

    const updatedContract: Contract = {
      ...target,
      documentosContrato: updatedDocs,
      statusDocumentos: overallDocStatus,
    };

    onSaveContract(updatedContract);

    if (selectedContractForDocs && selectedContractForDocs.id === contractId) {
      setSelectedContractForDocs(updatedContract);
    }
    if (selectedContractForDetail && selectedContractForDetail.id === contractId) {
      setSelectedContractForDetail(updatedContract);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 animate-fadeIn">
      {/* 1. Header Fiel ao Print: Cnpj & Razão Social */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Cnpj: <strong className="text-slate-900 font-mono text-sm">05.007.113/0001-32</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
            ORBITAL SERV. AUX. DE TRANSP. AÉREO
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão, Auditoria e Controle Documental de Contratos de Concessão e Prestação de Serviços
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tabela Oficial
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cards & Indicadores
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Exportar Planilha Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleOpenNew}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Contrato</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div
          onClick={() => {
            setVigenciaFilter('TODOS');
            setDocFilter('TODOS');
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            vigenciaFilter === 'TODOS' && docFilter === 'TODOS'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase block opacity-75">Total Contratos</span>
          <div className="text-2xl font-black mt-0.5">{stats.total}</div>
        </div>

        <div
          onClick={() => setVigenciaFilter('Vigente')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            vigenciaFilter === 'Vigente'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase block">Vigentes</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-0.5">{stats.vigentes}</div>
        </div>

        <div
          onClick={() => setVigenciaFilter('Vencido')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            vigenciaFilter === 'Vencido'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase block">Vencidos</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-black mt-0.5">{stats.vencidos}</div>
        </div>

        <div
          onClick={() => setDocFilter('Validado')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            docFilter === 'Validado'
              ? 'bg-green-600 text-white border-green-600 shadow-xs'
              : 'bg-green-50 text-green-900 border-green-200 hover:bg-green-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase block">Docs Validados</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div className="text-2xl font-black mt-0.5">{stats.validados}</div>
        </div>

        <div
          onClick={() => setDocFilter('Em Análise')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            docFilter === 'Em Análise'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase block">Em Análise</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black mt-0.5">{stats.emAnalise}</div>
        </div>

        <div
          onClick={() => setDocFilter('Reprovado')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            docFilter === 'Reprovado'
              ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
              : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase block">Reprovados / Pend</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black mt-0.5">{stats.reprovados}</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por número do contrato, objeto, categoria ou gestor..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Vigencia filter */}
            <select
              value={vigenciaFilter}
              onChange={(e) => setVigenciaFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="TODOS">Vigência: Todas</option>
              <option value="Vigente">Vigentes</option>
              <option value="Vencido">Vencidos</option>
            </select>

            {/* Documentos filter */}
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="TODOS">Documentos: Todos</option>
              <option value="Validado">Validados</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Reprovado">Reprovados (+)</option>
            </select>

            {/* Categoria filter */}
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="TODAS">Categorias: Todas</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {(searchTerm || vigenciaFilter !== 'TODOS' || docFilter !== 'TODOS' || categoriaFilter !== 'TODAS') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setVigenciaFilter('TODOS');
                  setDocFilter('TODOS');
                  setCategoriaFilter('TODAS');
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Exibindo <strong>{filteredContracts.length}</strong> de <strong>{contracts.length}</strong> contratos
          </span>
          <span className="text-slate-400">
            Dica: Clique na <strong>Lupa (Ações)</strong> para auditar o contrato ou no botão <strong>(+)</strong> para ver pendências documentais.
          </span>
        </div>
      </div>

      {/* 4. Official Table Layout - Exact from Print */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold select-none">
                  <th className="py-3 px-3 text-center w-14 font-semibold text-slate-900">Ações</th>
                  <th className="py-3 px-3.5 font-semibold text-slate-900 w-36">Contrato</th>
                  <th className="py-3 px-3.5 font-semibold text-slate-900 min-w-[280px]">Objeto do Contrato</th>
                  <th className="py-3 px-3 font-semibold text-slate-900 w-28">Categoria</th>
                  <th className="py-3 px-3 font-semibold text-slate-900 w-24 text-center">Início</th>
                  <th className="py-3 px-3 font-semibold text-slate-900 w-24 text-center">Término</th>
                  <th className="py-3 px-3 font-semibold text-slate-900 w-24 text-center">Status</th>
                  <th className="py-3 px-3.5 font-semibold text-slate-900 w-36 text-center">Documentos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="text-sm font-bold text-slate-700">Nenhum contrato encontrado</p>
                        <p className="text-xs text-slate-400">Ajuste os filtros de pesquisa ou limpe a busca.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => {
                    const isVencido =
                      contract.statusVigencia === 'Vencido' || contract.status === 'ENCERRADO';
                    const docStatus = contract.statusDocumentos || 'Validado';
                    const hasReproved = docStatus === 'Reprovado';
                    const hasAnalise = docStatus === 'Em Análise';

                    return (
                      <tr
                        key={contract.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        {/* Ações (Lupa) */}
                        <td className="py-3 px-3 text-center align-middle">
                          <button
                            onClick={() => setSelectedContractForDetail(contract)}
                            title="Inspecionar e Auditar Contrato"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                        </td>

                        {/* Contrato */}
                        <td className="py-3 px-3.5 align-middle">
                          <span className="font-mono font-bold text-slate-900 text-xs block">
                            {contract.numero}
                          </span>
                        </td>

                        {/* Objeto do Contrato */}
                        <td className="py-3 px-3.5 align-middle">
                          <div className="text-slate-800 text-xs leading-relaxed max-w-xl font-normal">
                            {contract.objeto || contract.titulo}
                          </div>
                        </td>

                        {/* Categoria */}
                        <td className="py-3 px-3 align-middle">
                          {contract.categoria ? (
                            <span className="text-xs font-semibold text-slate-700">
                              {contract.categoria}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Início */}
                        <td className="py-3 px-3 text-center align-middle text-slate-700 text-xs whitespace-nowrap">
                          {contract.dataInicio || contract.vigenciaInicio || '-'}
                        </td>

                        {/* Término */}
                        <td className="py-3 px-3 text-center align-middle text-slate-700 text-xs whitespace-nowrap">
                          {contract.dataTermino || contract.vigenciaFim || '-'}
                        </td>

                        {/* Status (Vencido / Vigente) */}
                        <td className="py-3 px-3 text-center align-middle">
                          {isVencido ? (
                            <span
                              style={{ backgroundColor: '#d9534f' }}
                              className="px-2.5 py-1 rounded text-[11px] font-bold text-white shadow-2xs inline-block"
                            >
                              Vencido
                            </span>
                          ) : (
                            <span
                              style={{ backgroundColor: '#5cb85c' }}
                              className="px-2.5 py-1 rounded text-[11px] font-bold text-white shadow-2xs inline-block"
                            >
                              Vigente
                            </span>
                          )}
                        </td>

                        {/* Documentos (Validado / Em Análise / Reprovado +) */}
                        <td className="py-3 px-3.5 text-center align-middle">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {docStatus === 'Validado' && (
                              <span
                                style={{ backgroundColor: '#5cb85c' }}
                                className="px-2.5 py-1 rounded text-[11px] font-bold text-white shadow-2xs inline-block"
                              >
                                Validado
                              </span>
                            )}

                            {docStatus === 'Em Análise' && (
                              <span
                                style={{ backgroundColor: '#337ab7' }}
                                className="px-2.5 py-1 rounded text-[11px] font-bold text-white shadow-2xs inline-block"
                              >
                                Em Análise
                              </span>
                            )}

                            {docStatus === 'Reprovado' && (
                              <>
                                <span
                                  style={{ backgroundColor: '#d9534f' }}
                                  className="px-2.5 py-1 rounded text-[11px] font-bold text-white shadow-2xs inline-block"
                                >
                                  Reprovado
                                </span>
                                <button
                                  onClick={() => setSelectedContractForDocs(contract)}
                                  title="Ver Documentos e Pendências do Contrato"
                                  className="w-5 h-5 flex items-center justify-center rounded text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                                >
                                  +
                                </button>
                              </>
                            )}

                            {!hasReproved && (
                              <button
                                onClick={() => setSelectedContractForDocs(contract)}
                                title="Ver Lista de Documentos"
                                className="w-5 h-5 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded text-xs font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContracts.map((contract) => {
            const metrics = calculateContractMetrics(contract.id, employees);
            const isVencido =
              contract.statusVigencia === 'Vencido' || contract.status === 'ENCERRADO';
            const docStatus = contract.statusDocumentos || 'Validado';

            return (
              <div
                key={contract.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {contract.numero}
                      </span>
                      {contract.categoria && (
                        <span className="ml-2 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {contract.categoria}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                          isVencido ? 'bg-[#d9534f]' : 'bg-[#5cb85c]'
                        }`}
                      >
                        {isVencido ? 'Vencido' : 'Vigente'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                          docStatus === 'Validado'
                            ? 'bg-[#5cb85c]'
                            : docStatus === 'Em Análise'
                            ? 'bg-[#337ab7]'
                            : 'bg-[#d9534f]'
                        }`}
                      >
                        {docStatus}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                    {contract.objeto || contract.titulo}
                  </h3>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Início</span>
                      <span className="font-bold text-slate-800">{contract.dataInicio || contract.vigenciaInicio}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Término</span>
                      <span className="font-bold text-slate-800">{contract.dataTermino || contract.vigenciaFim}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedContractForDetail(contract)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedContractForDocs(contract)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Documentos</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleOpenEdit(contract)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal: Inspeção & Auditoria do Contrato (Lupa) */}
      {selectedContractForDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-black text-xs">
                    {selectedContractForDetail.numero}
                  </span>
                  {selectedContractForDetail.categoria && (
                    <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                      {selectedContractForDetail.categoria}
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold text-white ${
                      selectedContractForDetail.statusVigencia === 'Vencido' || selectedContractForDetail.status === 'ENCERRADO'
                        ? 'bg-[#d9534f]'
                        : 'bg-[#5cb85c]'
                    }`}
                  >
                    {selectedContractForDetail.statusVigencia === 'Vencido' || selectedContractForDetail.status === 'ENCERRADO'
                      ? 'Vencido'
                      : 'Vigente'}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold text-white ${
                      selectedContractForDetail.statusDocumentos === 'Validado'
                        ? 'bg-[#5cb85c]'
                        : selectedContractForDetail.statusDocumentos === 'Em Análise'
                        ? 'bg-[#337ab7]'
                        : 'bg-[#d9534f]'
                    }`}
                  >
                    Documentos: {selectedContractForDetail.statusDocumentos || 'Validado'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2 leading-snug">
                  {selectedContractForDetail.objeto || selectedContractForDetail.titulo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedContractForDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid with info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                  Dados do Prestador & Concessão
                </h4>
                <p>
                  <strong className="text-slate-600">Empresa:</strong>{' '}
                  <span className="text-slate-900 font-semibold">
                    {selectedContractForDetail.empresaPrestador || 'ORBITAL SERV. AUX. DE TRANSP. AÉREO'}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-600">CNPJ:</strong>{' '}
                  <span className="font-mono text-slate-900">
                    {selectedContractForDetail.cnpjPrestador || '05.007.113/0001-32'}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-600">Cliente / Local:</strong>{' '}
                  <span className="text-slate-900">{selectedContractForDetail.cliente} ({selectedContractForDetail.unidade})</span>
                </p>
                <p>
                  <strong className="text-slate-600">Gestor Responsável:</strong>{' '}
                  <span className="text-slate-900">{selectedContractForDetail.gestorResponsavel}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                  Período de Vigência
                </h4>
                <p>
                  <strong className="text-slate-600">Data de Início:</strong>{' '}
                  <span className="font-bold text-slate-900">
                    {selectedContractForDetail.dataInicio || selectedContractForDetail.vigenciaInicio}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-600">Data de Término:</strong>{' '}
                  <span className="font-bold text-slate-900">
                    {selectedContractForDetail.dataTermino || selectedContractForDetail.vigenciaFim}
                  </span>
                </p>
                {selectedContractForDetail.observacoes && (
                  <p className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px]">
                    <strong>Nota:</strong> {selectedContractForDetail.observacoes}
                  </p>
                )}
              </div>
            </div>

            {/* Document Checklist for this Contract */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Documentação e Certidões Exigidas ({selectedContractForDetail.documentosContrato?.length || 0})</span>
                </h4>
                <button
                  onClick={() => {
                    const c = selectedContractForDetail;
                    setSelectedContractForDetail(null);
                    setSelectedContractForDocs(c);
                  }}
                  className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  Gerenciar Documentos &rarr;
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(selectedContractForDetail.documentosContrato && selectedContractForDetail.documentosContrato.length > 0) ? (
                  selectedContractForDetail.documentosContrato.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{doc.nome}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">{doc.tipo}</span>
                          {doc.dataUpload && <span>Envio: {doc.dataUpload}</span>}
                        </div>
                        {doc.motivoReprovacao && (
                          <p className="text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-200 text-[11px] mt-1.5">
                            <strong>Motivo da Reprovação:</strong> {doc.motivoReprovacao}
                          </p>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded text-[11px] font-bold text-white shrink-0 ${
                          doc.status === 'Validado'
                            ? 'bg-[#5cb85c]'
                            : doc.status === 'Em Análise'
                            ? 'bg-[#337ab7]'
                            : 'bg-[#d9534f]'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl text-center">
                    Documentos padrão validados conforme histórico da concessionária.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => handleSelectFilter(selectedContractForDetail.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Ver Colaboradores Deste Contrato</span>
              </button>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      const c = selectedContractForDetail;
                      setSelectedContractForDetail(null);
                      handleOpenEdit(c);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  >
                    Editar Contrato
                  </button>
                )}
                <button
                  onClick={() => setSelectedContractForDetail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Documentos do Contrato (+ ou Ver Documentos) */}
      {selectedContractForDocs && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Auditoria Documental do Contrato
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Contrato: <span className="font-mono text-blue-700">{selectedContractForDocs.numero}</span>
                </h3>
                <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                  {selectedContractForDocs.objeto || selectedContractForDocs.titulo}
                </p>
              </div>
              <button
                onClick={() => setSelectedContractForDocs(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of documents for this contract */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {(selectedContractForDocs.documentosContrato || []).map((doc) => (
                <div
                  key={doc.id}
                  className={`p-4 rounded-xl border transition-all ${
                    doc.status === 'Reprovado'
                      ? 'border-rose-300 bg-rose-50/50'
                      : doc.status === 'Em Análise'
                      ? 'border-blue-300 bg-blue-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">{doc.nome}</h5>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                        Tipo: {doc.tipo}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded text-[11px] font-bold text-white shrink-0 ${
                        doc.status === 'Validado'
                          ? 'bg-[#5cb85c]'
                          : doc.status === 'Em Análise'
                          ? 'bg-[#337ab7]'
                          : 'bg-[#d9534f]'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  {doc.motivoReprovacao && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-rose-100/70 border border-rose-200 text-xs text-rose-900">
                      <strong className="block font-bold">Apontamento da Auditoria:</strong>
                      <span>{doc.motivoReprovacao}</span>
                    </div>
                  )}

                  {/* Actions to rectify / validate */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <label className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Substituir / Enviar Retificação</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUpdateDocStatus(
                              selectedContractForDocs.id,
                              doc.id,
                              'Em Análise'
                            );
                            alert(`Documento "${e.target.files[0].name}" enviado para reanálise com sucesso!`);
                          }
                        }}
                      />
                    </label>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            handleUpdateDocStatus(selectedContractForDocs.id, doc.id, 'Validado')
                          }
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => {
                            const motivo = prompt('Informe o motivo da reprovação:');
                            if (motivo !== null) {
                              handleUpdateDocStatus(
                                selectedContractForDocs.id,
                                doc.id,
                                'Reprovado',
                                motivo
                              );
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors cursor-pointer"
                        >
                          Reprovar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedContractForDocs(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Cadastrar / Editar Contrato */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingContract ? 'Editar Contrato' : 'Cadastrar Novo Contrato'}
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha as informações do contrato de prestação / concessão
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Número do Contrato *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="Ex: 4600001229"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Categoria (ex: ESATA, ESCRITÓRIO)
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="ESATA"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 uppercase font-bold focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Status de Vigência
                  </label>
                  <select
                    value={formData.statusVigencia}
                    onChange={(e) => setFormData({ ...formData, statusVigencia: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:border-blue-600 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="Vigente">Vigente</option>
                    <option value="Vencido">Vencido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Objeto do Contrato *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.objeto || formData.titulo}
                  onChange={(e) => setFormData({ ...formData, objeto: e.target.value, titulo: e.target.value })}
                  placeholder="Descrição completa do objeto de prestação de serviços..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    CNPJ do Prestador
                  </label>
                  <input
                    type="text"
                    value={formData.cnpjPrestador}
                    onChange={(e) => setFormData({ ...formData, cnpjPrestador: e.target.value })}
                    placeholder="05.007.113/0001-32"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Razão Social da Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.empresaPrestador}
                    onChange={(e) => setFormData({ ...formData, empresaPrestador: e.target.value })}
                    placeholder="ORBITAL SERV. AUX. DE TRANSP. AÉREO"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Início (DD/MM/AAAA)
                  </label>
                  <input
                    type="text"
                    value={formData.dataInicio}
                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                    placeholder="01/10/2020"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Término (DD/MM/AAAA)
                  </label>
                  <input
                    type="text"
                    value={formData.dataTermino}
                    onChange={(e) => setFormData({ ...formData, dataTermino: e.target.value })}
                    placeholder="30/11/2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Status Documentos
                  </label>
                  <select
                    value={formData.statusDocumentos}
                    onChange={(e) => setFormData({ ...formData, statusDocumentos: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:border-blue-600 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="Validado">Validado</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Reprovado">Reprovado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Gestor
                  </label>
                  <input
                    type="text"
                    value={formData.gestorResponsavel}
                    onChange={(e) => setFormData({ ...formData, gestorResponsavel: e.target.value })}
                    placeholder="Nome do Gestor"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Observações de Auditoria
                </label>
                <textarea
                  rows={2}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre conformidade documental..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 cursor-pointer font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors cursor-pointer shadow-xs"
                >
                  Salvar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
