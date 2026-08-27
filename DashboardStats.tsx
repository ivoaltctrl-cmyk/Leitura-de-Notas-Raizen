import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Building2,
  TrendingUp,
  FileText,
  Radio,
  HardHat,
  HeartPulse,
  Calendar,
  Building,
} from 'lucide-react';
import { SystemStats, BrandConfig } from '../types/index.ts';

interface DashboardStatsProps {
  stats: SystemStats;
  totalContracts: number;
  totalAreas: number;
  onFilterClick: (filterType: string) => void;
  currentFilter: string;
  brand: BrandConfig;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  totalContracts,
  totalAreas,
  onFilterClick,
  currentFilter,
  brand,
}) => {
  const primaryColor = brand?.primaryColor || '#006837';
  const accentColor = brand?.accentColor || '#f59e0b';

  return (
    <div className="space-y-4">
      {/* Top 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Compliance Rate */}
        <div
          onClick={() => onFilterClick('TODOS')}
          className={`relative overflow-hidden rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md bg-white ${
            currentFilter === 'TODOS'
              ? 'ring-2 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          style={
            currentFilter === 'TODOS'
              ? { borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}20` }
              : {}
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Taxa Geral de Conformidade
            </span>
            <div
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              className="p-2 rounded-xl border border-black/5"
            >
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              style={{ color: primaryColor }}
              className="text-3xl font-black tracking-tight"
            >
              {stats.taxaConformidadeGeral}%
            </span>
            <span className="text-xs font-semibold text-slate-500">índice consolidado</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(stats.taxaConformidadeGeral, 100)}%`,
                backgroundColor:
                  stats.taxaConformidadeGeral >= 80
                    ? '#059669'
                    : stats.taxaConformidadeGeral >= 60
                    ? '#f59e0b'
                    : '#e11d48',
              }}
            />
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500 flex items-center justify-between font-medium">
            <span>
              Base: <strong>{stats.totalFuncionarios}</strong> colaboradores
            </span>
            <span className="text-emerald-700 font-bold">
              {stats.totalEmDia} em dia
            </span>
          </p>
        </div>

        {/* Card 2: 100% Em Dia */}
        <div
          onClick={() => onFilterClick('EM_DIA')}
          className={`relative overflow-hidden rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md bg-white ${
            currentFilter === 'EM_DIA'
              ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              100% Em Dia (Regulares)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">
              {stats.totalEmDia}
            </span>
            <span className="text-xs font-bold text-slate-500">
              ({stats.totalFuncionarios > 0 ? Math.round((stats.totalEmDia / stats.totalFuncionarios) * 100) : 0}%)
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Documentos, NRs e exames com validade regular.
          </p>
          <div className="mt-2 text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Acesso liberado nas portarias e lojas</span>
          </div>
        </div>

        {/* Card 3: A Vencer em ≤ 30 Dias (Amarelo Piscante) */}
        <div
          onClick={() => onFilterClick('A_VENCER_30')}
          className={`relative overflow-hidden rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md bg-white ${
            currentFilter === 'A_VENCER_30'
              ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-sm bg-amber-50/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {/* Pulsing Beacon */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 animate-pulse" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                A Vencer (≤ 30 Dias)
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 tracking-tight">
              {stats.totalAVencer30Dias}
            </span>
            <span className="text-xs font-bold text-amber-800">
              alerta preventivo
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Itens que vencem nos próximos 30 dias para agendamento prévio.
          </p>
          <div className="mt-2 text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Clique para filtrar a vencer</span>
          </div>
        </div>

        {/* Card 4: Vencidos / Bloqueados (Vermelho Piscante) */}
        <div
          onClick={() => onFilterClick('CRITICO')}
          className={`relative overflow-hidden rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md bg-white ${
            currentFilter === 'CRITICO' || currentFilter === 'BLOQUEADO'
              ? 'border-rose-600 ring-2 ring-rose-500/30 shadow-sm bg-rose-50/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {/* Pulsing Beacon */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 animate-pulse" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                Vencidos / Bloqueados
              </span>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600 tracking-tight">
              {stats.totalCriticos + stats.totalBloqueados}
            </span>
            <span className="text-xs text-rose-700 font-extrabold">
              ({stats.totalBloqueados} bloqueios imediatos)
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Documentação obrigatória vencida ou pendência crítica.
          </p>
          <div className="mt-2 text-[11px] font-bold text-rose-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            <span>Risco de autuação e retenção em portaria</span>
          </div>
        </div>
      </div>

      {/* Breakdown by the 4 Core SST Pillars */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Conformidade por Pilar Documental (NR-01, NR-07, NR-06 & Certificação)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Monitoramento de 30 dias ativo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* OS */}
          <div
            onClick={() => onFilterClick('FILTRO_OS')}
            className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 transition-colors cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Ordem de Serviço (NR-01)</span>
              <span
                className={`text-xs font-black ${
                  stats.ordemServico.taxa >= 80 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {stats.ordemServico.taxa}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${stats.ordemServico.taxa}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{stats.ordemServico.emDia} em dia</span>
              <span className="text-amber-700 font-semibold">{stats.ordemServico.aVencer} a vencer</span>
              <span className="text-rose-600 font-semibold">{stats.ordemServico.vencido} vencidos</span>
            </div>
          </div>

          {/* ASO */}
          <div
            onClick={() => onFilterClick('FILTRO_ASO')}
            className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 transition-colors cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">ASO Ocupacional (NR-07)</span>
              <span
                className={`text-xs font-black ${
                  stats.aso.taxa >= 80 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {stats.aso.taxa}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${stats.aso.taxa}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{stats.aso.emDia} em dia</span>
              <span className="text-amber-700 font-semibold">{stats.aso.aVencer} a vencer</span>
              <span className="text-rose-600 font-semibold">{stats.aso.vencido} vencidos</span>
            </div>
          </div>

          {/* Ficha EPI */}
          <div
            onClick={() => onFilterClick('FILTRO_EPI')}
            className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 transition-colors cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Ficha de EPI (NR-06)</span>
              <span
                className={`text-xs font-black ${
                  stats.fichaEpi.taxa >= 80 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {stats.fichaEpi.taxa}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${stats.fichaEpi.taxa}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{stats.fichaEpi.emDia} em dia</span>
              <span className="text-amber-700 font-semibold">{stats.fichaEpi.pendente} pendentes</span>
              <span className="text-rose-600 font-semibold">{stats.fichaEpi.vencido} vencidos</span>
            </div>
          </div>

          {/* Certificação Técnica */}
          <div
            onClick={() => onFilterClick('FILTRO_RADIO')}
            className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 transition-colors cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Certificação / Treinamento</span>
              <span
                className={`text-xs font-black ${
                  stats.radioprotecao.taxa >= 80 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {stats.radioprotecao.taxa}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${stats.radioprotecao.taxa}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{stats.radioprotecao.emDia} em dia</span>
              <span className="text-amber-700 font-semibold">{stats.radioprotecao.aVencer} a vencer</span>
              <span className="text-rose-600 font-semibold">{stats.radioprotecao.vencido} vencidos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
