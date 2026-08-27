import React, { useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Send,
  Building,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Download,
  Calendar,
  Sparkles,
  Check,
  Clock,
  UserCheck,
} from 'lucide-react';
import {
  Employee,
  Contract,
  AreaResponsavel,
  SystemStats,
  DemandLog,
  BrandConfig,
} from '../types/index.ts';
import { calculateAreaMetrics, calculateContractMetrics } from '../utils/storage.ts';
import { WfsLogo } from './WfsLogo.tsx';

interface AuditDispatchesTabProps {
  employees: Employee[];
  contracts: Contract[];
  areas: AreaResponsavel[];
  stats: SystemStats;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onOpenAuditReportModal: () => void;
  onMassDispatch: (logs: DemandLog[]) => void;
  brand: BrandConfig;
}

export const AuditDispatchesTab: React.FC<AuditDispatchesTabProps> = ({
  employees,
  contracts,
  areas,
  stats,
  onExportExcel,
  onExportCsv,
  onOpenAuditReportModal,
  onMassDispatch,
  brand,
}) => {
  const [selectedScope, setSelectedScope] = useState<'areas' | 'contracts' | 'individuals'>('areas');
  const [filterSeverity, setFilterSeverity] = useState<'all_pending' | 'vencidos_only' | 'a_vencer_30'>('all_pending');
  const [dispatchedSuccess, setDispatchedSuccess] = useState<string | null>(null);
  const [previewModalTarget, setPreviewModalTarget] = useState<{
    title: string;
    recipientName: string;
    recipientContact: string;
    channel: 'whatsapp' | 'email';
    itemsCount: number;
    messageText: string;
    employeesList: Employee[];
  } | null>(null);

  const primaryColor = brand?.primaryColor || '#006837';
  const accentColor = brand?.accentColor || '#f59e0b';
  const companyName = brand?.companyName || 'GPA';

  // Group pending employees by Area
  const pendingByArea = areas.map((area) => {
    const areaEmployees = employees.filter((e) => e.areaId === area.id);
    const irregularEmployees = areaEmployees.filter((e) => {
      if (filterSeverity === 'vencidos_only') {
        return (e.pendencias || []).some((p) => p.status === 'VENCIDO');
      }
      if (filterSeverity === 'a_vencer_30') {
        return (e.pendencias || []).some((p) => p.status === 'A_VENCER');
      }
      return e.statusGeral !== 'EM_DIA';
    });

    return {
      area,
      totalIrregular: irregularEmployees.length,
      employees: irregularEmployees,
    };
  });

  // Group pending employees by Contract
  const pendingByContract = contracts.map((contract) => {
    const contractEmployees = employees.filter((e) => e.contratoId === contract.id);
    const irregularEmployees = contractEmployees.filter((e) => {
      if (filterSeverity === 'vencidos_only') {
        return (e.pendencias || []).some((p) => p.status === 'VENCIDO');
      }
      if (filterSeverity === 'a_vencer_30') {
        return (e.pendencias || []).some((p) => p.status === 'A_VENCER');
      }
      return e.statusGeral !== 'EM_DIA';
    });

    return {
      contract,
      totalIrregular: irregularEmployees.length,
      employees: irregularEmployees,
    };
  });

  const totalIrregularGeneral = employees.filter((e) => {
    if (filterSeverity === 'vencidos_only') {
      return (e.pendencias || []).some((p) => p.status === 'VENCIDO');
    }
    if (filterSeverity === 'a_vencer_30') {
      return (e.pendencias || []).some((p) => p.status === 'A_VENCER');
    }
    return e.statusGeral !== 'EM_DIA';
  }).length;

  const generateAreaMessage = (area: AreaResponsavel, irregularList: Employee[]) => {
    const listSummary = irregularList
      .slice(0, 10)
      .map((e, idx) => {
        const issues = (e.pendencias || [])
          .filter((p) => p.status === 'VENCIDO' || p.status === 'PENDENTE' || p.status === 'A_VENCER')
          .map((p) => `${p.nomeDocumento} (${p.status === 'A_VENCER' ? `Vence em ${p.diasRestantes}d` : p.status})`)
          .join(', ');
        return `${idx + 1}. *${e.nome}* (${e.cargo}): ${issues}`;
      })
      .join('\n');

    const moreText = irregularList.length > 10 ? `\n... e mais ${irregularList.length - 10} colaboradores.` : '';

    return `*NOTIFICAÇÃO DE AUDITORIA & REGULARIZAÇÃO - ${companyName.toUpperCase()}*\n\n` +
      `Prezado(a) Gestor(a) *${area.responsavelNome}* (${area.nome}),\n` +
      `Identificamos pendências de conformidade documental em *${irregularList.length} colaboradores* sob sua responsabilidade:\n\n` +
      `${listSummary}${moreText}\n\n` +
      `⚠️ *Atenção:* Documentos vencidos ou a vencer em menos de 30 dias podem acarretar bloqueio de acesso nas portarias e unidades operacionais.\n` +
      `Favor providenciar a regularização imediata com os prestadores.\n\n` +
      `_Sistema de Gestão de Contratos e Conformidade ${companyName}_`;
  };

  const generateContractMessage = (contract: Contract, irregularList: Employee[]) => {
    const listSummary = irregularList
      .slice(0, 10)
      .map((e, idx) => {
        const issues = (e.pendencias || [])
          .filter((p) => p.status === 'VENCIDO' || p.status === 'PENDENTE' || p.status === 'A_VENCER')
          .map((p) => `${p.nomeDocumento} (${p.status})`)
          .join(', ');
        return `${idx + 1}. *${e.nome}*: ${issues}`;
      })
      .join('\n');

    return `*ALERTA DE CONTRATO - ${companyName.toUpperCase()}*\n\n` +
      `Contrato: *${contract.numero} - ${contract.titulo}*\n` +
      `Gestor: *${contract.gestorResponsavel}*\n\n` +
      `Constam *${irregularList.length} colaboradores* com pendências documentais que impactam o índice de conformidade deste contrato.\n\n` +
      `${listSummary}\n\n` +
      `Solicitamos a regularização das pendências para evitar suspensão de faturamento ou bloqueio em portarias.`;
  };

  const handleDispatchAllAreas = () => {
    const createdLogs: DemandLog[] = [];
    const todayStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const deadlineStr = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    pendingByArea.forEach(({ area, totalIrregular, employees }) => {
      if (totalIrregular === 0) return;

      const msg = generateAreaMessage(area, employees);
      createdLogs.push({
        id: `disp-area-${Date.now()}-${area.id}`,
        funcionarioId: `area-${area.id}`,
        funcionarioNome: `Lote da Área: ${area.nome}`,
        areaId: area.id,
        areaNome: area.nome,
        responsavelArea: area.responsavelNome,
        canal: 'whatsapp',
        destinatario: area.responsavelTelefone || area.responsavelEmail || 'Gestor de Área',
        dataEnvio: todayStr,
        prazoResolucao: deadlineStr,
        status: 'ENVIADO',
        pendenciasCobradas: [`${totalIrregular} colaboradores com pendências na área`],
        mensagemTexto: msg,
        assunto: `[AUDITORIA GPA] Regularização de ${totalIrregular} Colaboradores - ${area.nome}`,
      });

      // If they have phone, send via WhatsApp Web if preferred
      if (area.responsavelTelefone) {
        const cleanPhone = area.responsavelTelefone.replace(/\D/g, '');
        const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
        // Pre-open for first one or in background
      }
    });

    onMassDispatch(createdLogs);
    setDispatchedSuccess(`Disparo executado com sucesso para ${createdLogs.length} responsáveis de área!`);
    setTimeout(() => setDispatchedSuccess(null), 4000);
  };

  const handleDispatchSingleArea = (area: AreaResponsavel, irregularEmployees: Employee[]) => {
    const msg = generateAreaMessage(area, irregularEmployees);
    const cleanPhone = area.responsavelTelefone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;

    const todayStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const deadlineStr = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const log: DemandLog = {
      id: `disp-single-${Date.now()}`,
      funcionarioId: `area-${area.id}`,
      funcionarioNome: `Lote da Área: ${area.nome}`,
      areaId: area.id,
      areaNome: area.nome,
      responsavelArea: area.responsavelNome,
      canal: 'whatsapp',
      destinatario: area.responsavelTelefone || area.responsavelEmail,
      dataEnvio: todayStr,
      prazoResolucao: deadlineStr,
      status: 'ENVIADO',
      pendenciasCobradas: [`${irregularEmployees.length} colaboradores com pendências na área`],
      mensagemTexto: msg,
      assunto: `[AUDITORIA GPA] Regularização - ${area.nome}`,
    };

    onMassDispatch([log]);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              style={{ backgroundColor: primaryColor }}
              className="p-3 rounded-2xl text-white shadow-xs shrink-0"
            >
              <Printer className="w-6 h-6" style={{ color: accentColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Auditoria de Conformidade & Disparos para Envolvidos
                </h2>
                <span
                  style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}
                  className="px-2 py-0.5 rounded text-xs font-black uppercase"
                >
                  Central de Cobranças
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Emita relatórios formais de auditoria e realize disparos em massa automáticos via WhatsApp e E-mail para os responsáveis de cada área e gestores de contrato com pendências ou itens a vencer em menos de 30 dias.
              </p>
            </div>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAuditReportModal}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" style={{ color: accentColor }} />
              <span>Imprimir / PDF Executivo</span>
            </button>

            <button
              onClick={onExportExcel}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Auditor KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Total de Colaboradores
            </span>
            <span className="text-xl font-black text-slate-900">
              {stats.totalFuncionarios}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
              100% Em Dia
            </span>
            <span className="text-xl font-black text-emerald-700">
              {stats.totalEmDia}
            </span>
          </div>

          {/* 30-Day Alert Card with Blinking Beacon */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600 animate-pulse" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                A Vencer (≤ 30 dias)
              </span>
            </div>
            <span className="text-xl font-black text-amber-700">
              {stats.totalAVencer30Dias}
            </span>
          </div>

          {/* Critical & Blocked with Blinking Beacon */}
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 animate-pulse" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                Vencidos / Críticos
              </span>
            </div>
            <span className="text-xl font-black text-rose-700">
              {stats.totalCriticos + stats.totalBloqueados}
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {dispatchedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{dispatchedSuccess}</span>
        </div>
      )}

      {/* Central de Disparos em Massa */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              <span>Disparos Diretos para Envolvidos</span>
            </h3>
            <p className="text-xs text-slate-500">
              Selecione o agrupamento e o nível de urgência para disparo das cobranças
            </p>
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterSeverity('all_pending')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterSeverity === 'all_pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas as Pendências
            </button>
            <button
              onClick={() => setFilterSeverity('a_vencer_30')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterSeverity === 'a_vencer_30'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-amber-800 hover:bg-amber-100'
              }`}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-600 animate-pulse" />
              </span>
              <span>A Vencer (≤ 30d)</span>
            </button>
            <button
              onClick={() => setFilterSeverity('vencidos_only')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterSeverity === 'vencidos_only'
                  ? 'bg-rose-600 text-white font-black shadow-xs'
                  : 'text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600 animate-pulse" />
              </span>
              <span>Apenas Vencidos</span>
            </button>
          </div>
        </div>

        {/* Scope Tabs: Por Área vs Por Contrato */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedScope('areas')}
              style={selectedScope === 'areas' ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedScope === 'areas'
                  ? 'shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building className="w-3.5 h-3.5 inline mr-1.5" />
              <span>Por Responsável de Área ({areas.length})</span>
            </button>

            <button
              onClick={() => setSelectedScope('contracts')}
              style={selectedScope === 'contracts' ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedScope === 'contracts'
                  ? 'shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 inline mr-1.5" />
              <span>Por Gestor de Contrato ({contracts.length})</span>
            </button>
          </div>

          {selectedScope === 'areas' && (
            <button
              onClick={handleDispatchAllAreas}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>Disparar para Todos os Responsáveis de Área</span>
            </button>
          )}
        </div>

        {/* Scope 1: Por Área */}
        {selectedScope === 'areas' && (
          <div className="space-y-4">
            {pendingByArea.map(({ area, totalIrregular, employees: irregularList }) => {
              const hasItems = totalIrregular > 0;

              return (
                <div
                  key={area.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    hasItems
                      ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                      : 'bg-slate-50/70 border-slate-200/60 opacity-80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {area.nome}
                      </h4>
                      {hasItems ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                          {totalIrregular} com pendências
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          100% Em Dia
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <strong className="text-slate-800">{area.responsavelNome}</strong>
                        <span className="text-slate-400">({area.responsavelCargo})</span>
                      </span>
                      {area.responsavelTelefone && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3 h-3" />
                          <span>{area.responsavelTelefone}</span>
                        </span>
                      )}
                      {area.responsavelEmail && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3" />
                          <span>{area.responsavelEmail}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions for this area */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={!hasItems}
                      onClick={() =>
                        setPreviewModalTarget({
                          title: `Cobrança de Área: ${area.nome}`,
                          recipientName: area.responsavelNome,
                          recipientContact: area.responsavelTelefone || area.responsavelEmail,
                          channel: 'whatsapp',
                          itemsCount: totalIrregular,
                          messageText: generateAreaMessage(area, irregularList),
                          employeesList: irregularList,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Pré-visualizar Mensagem
                    </button>

                    <button
                      disabled={!hasItems}
                      onClick={() => handleDispatchSingleArea(area, irregularList)}
                      style={{ backgroundColor: primaryColor }}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      <span>Disparar WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Scope 2: Por Contrato */}
        {selectedScope === 'contracts' && (
          <div className="space-y-4">
            {pendingByContract.map(({ contract, totalIrregular, employees: irregularList }) => {
              const hasItems = totalIrregular > 0;

              return (
                <div
                  key={contract.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    hasItems
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/60 opacity-80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {contract.numero} - {contract.titulo}
                      </h4>
                      {hasItems ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-200">
                          {totalIrregular} com pendências
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          100% Em Dia
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        Gestor: <strong className="text-slate-800">{contract.gestorResponsavel}</strong>
                      </span>
                      {contract.telefoneContato && (
                        <span>Telefone: {contract.telefoneContato}</span>
                      )}
                      {contract.emailContato && (
                        <span>E-mail: {contract.emailContato}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={!hasItems}
                      onClick={() =>
                        setPreviewModalTarget({
                          title: `Cobrança de Contrato: ${contract.numero}`,
                          recipientName: contract.gestorResponsavel,
                          recipientContact: contract.telefoneContato || contract.emailContato || '',
                          channel: 'whatsapp',
                          itemsCount: totalIrregular,
                          messageText: generateContractMessage(contract, irregularList),
                          employeesList: irregularList,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Pré-visualizar
                    </button>

                    <button
                      disabled={!hasItems}
                      onClick={() => {
                        const msg = generateContractMessage(contract, irregularList);
                        const cleanPhone = (contract.telefoneContato || '').replace(/\D/g, '');
                        const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                        window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      style={{ backgroundColor: primaryColor }}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      <span>Disparar Gestor</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Preview Modal */}
      {previewModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {previewModalTarget.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Destinatário: {previewModalTarget.recipientName} ({previewModalTarget.recipientContact})
                </p>
              </div>
              <button
                onClick={() => setPreviewModalTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <label className="block font-bold uppercase tracking-wider text-slate-600">
                Texto Formatado para Envio (WhatsApp / E-mail):
              </label>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {previewModalTarget.messageText}
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                Este disparo abrange <strong>{previewModalTarget.itemsCount} colaboradores</strong> irregulares com alerta de prazo e normas regulamentadoras.
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setPreviewModalTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Fechar
              </button>

              <button
                onClick={() => {
                  const cleanPhone = previewModalTarget.recipientContact.replace(/\D/g, '');
                  const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                  window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(previewModalTarget.messageText)}`, '_blank');
                  setPreviewModalTarget(null);
                }}
                style={{ backgroundColor: primaryColor }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Confirmar Envio WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
