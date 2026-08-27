import React from 'react';
import {
  FileScan,
  Users,
  Building,
  Building2,
  Send,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Sparkles,
  LayoutDashboard,
  Palette,
  Trash2,
  Lock,
  LogOut,
  ShieldCheck,
  FileCheck,
  FileText,
  KeyRound,
  Shield,
  Settings,
} from 'lucide-react';
import { WfsLogo } from './WfsLogo.tsx';
import { BrandConfig } from '../types/index.ts';

export type MainPortalMode = 'demandados' | 'admin' | 'settings';

export type AdminTabType =
  | 'dashboard'
  | 'employees'
  | 'trabalhista'
  | 'areas'
  | 'contracts'
  | 'demands'
  | 'reports';

interface NavbarProps {
  portalMode: MainPortalMode;
  setPortalMode: (mode: MainPortalMode) => void;
  isAdminLoggedIn: boolean;
  onAdminLogout: () => void;
  onOpenAdminLogin: () => void;
  onOpenChangePassword: () => void;
  onOpenGoogleSheetsSync?: () => void;
  activeTab: AdminTabType;
  setActiveTab: (tab: AdminTabType) => void;
  onOpenOcrScanner: () => void;
  onOpenNewEmployee: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onOpenAuditReport: () => void;
  onResetData: () => void;
  onOpenProductionReset: () => void;
  onOpenBrandSettings: () => void;
  brand: BrandConfig;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  totalEmployees: number;
  totalPending: number;
  totalAVencer: number;
  blinkingAlerts?: boolean;
  onToggleBlinkingAlerts?: () => void;
  syncStatus?: {
    status: 'idle' | 'syncing' | 'synced' | 'error';
    lastSynced?: string;
    message?: string;
  };
  onRefreshSheets?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  portalMode,
  setPortalMode,
  isAdminLoggedIn,
  onAdminLogout,
  onOpenAdminLogin,
  onOpenChangePassword,
  onOpenGoogleSheetsSync,
  activeTab,
  setActiveTab,
  onOpenOcrScanner,
  onOpenNewEmployee,
  onExportExcel,
  onExportCsv,
  onOpenAuditReport,
  onResetData,
  onOpenProductionReset,
  onOpenBrandSettings,
  brand,
  searchTerm,
  setSearchTerm,
  totalEmployees,
  totalPending,
  totalAVencer,
  blinkingAlerts = true,
  onToggleBlinkingAlerts,
  syncStatus,
  onRefreshSheets,
}) => {
  const primaryColor = brand?.primaryColor || '#E21B23';
  const accentColor = brand?.accentColor || '#1E293B';
  const companyName = brand?.companyName || 'GPA';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Tier: Logo & Primary Portals */}
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5 sm:space-x-4">
            <div className="flex items-center">
              <WfsLogo
                brand={brand}
                className="h-9 sm:h-10 w-auto object-contain transition-transform hover:scale-105"
              />
            </div>
            <div className="hidden sm:block border-l border-slate-200 pl-3.5">
              <div className="flex items-center gap-1.5">
                <span
                  style={{
                    backgroundColor: primaryColor,
                    color: '#ffffff',
                  }}
                  className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded shadow-2xs"
                >
                  {companyName}
                </span>
                <span className="text-[11px] font-black text-slate-800 tracking-tight">
                  GESTÃO & AUDITORIA DE TERCEIROS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Controle Integrado de SST, Trabalhista & Contratos
              </p>
            </div>
          </div>

          {/* Center Mode Switcher (Portal Demandado vs Painel ADM vs Configuração) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-inner">
            <button
              onClick={() => setPortalMode('demandados')}
              style={
                portalMode === 'demandados'
                  ? { backgroundColor: '#ffffff', color: primaryColor }
                  : {}
              }
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                portalMode === 'demandados'
                  ? 'shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Portal Demandado</span>
              {totalPending > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    blinkingAlerts ? 'animate-pulse' : ''
                  } ${
                    portalMode === 'demandados'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {totalPending}
                </span>
              )}
            </button>

            {/* Painel ADM (Acesso Aberto para Gestão & Auditoria) */}
            <button
              onClick={() => setPortalMode('admin')}
              style={
                portalMode === 'admin'
                  ? { backgroundColor: '#0f172a', color: '#ffffff' }
                  : {}
              }
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                portalMode === 'admin'
                  ? 'shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Painel ADM</span>
            </button>

            {/* Configuração (Exige Senha do Administrador) */}
            <button
              onClick={() => {
                if (isAdminLoggedIn) {
                  setPortalMode('settings');
                } else {
                  onOpenAdminLogin();
                }
              }}
              style={
                portalMode === 'settings'
                  ? { backgroundColor: '#ffffff', color: '#0f172a' }
                  : {}
              }
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                portalMode === 'settings'
                  ? 'shadow-xs text-slate-900 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {isAdminLoggedIn ? (
                <Settings className="w-4 h-4 text-slate-700" />
              ) : (
                <Lock className="w-4 h-4 text-amber-500" />
              )}
              <span>Configuração</span>
              {!isAdminLoggedIn && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 uppercase font-black tracking-wider hidden sm:inline">
                  Senha
                </span>
              )}
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {portalMode === 'admin' ? (
              <>
                {/* Status da Nuvem no ADM */}
                {syncStatus?.lastSynced && (
                  <div
                    title="Status da sincronização Google Sheets Nuvem"
                    className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-bold"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Sincronizado {syncStatus.lastSynced}</span>
                  </div>
                )}

                {/* Relatório de Auditoria Button */}
                <button
                  onClick={onOpenAuditReport}
                  title="Visualizar Relatório de Auditoria"
                  className="px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Relatório de Auditoria</span>
                </button>

                {isAdminLoggedIn && (
                  <button
                    onClick={onAdminLogout}
                    title="Sair do Modo Administrador"
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                )}
              </>
            ) : (
              /* Portal Demandado Header Action */
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAuditReport}
                  title="Visualizar Relatório de Auditoria"
                  className="px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Relatório de Auditoria</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Second Tier: Admin Sub-Navigation Tabs (Visible only in ADM mode) */}
        {portalMode === 'admin' && (
          <div className="py-2 border-t border-slate-100 flex items-center justify-between overflow-x-auto gap-2">
            <nav className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                style={activeTab === 'dashboard' ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Painel</span>
              </button>

              <button
                onClick={() => setActiveTab('employees')}
                style={activeTab === 'employees' ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'employees'
                    ? 'shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Colaboradores SST</span>
                {totalEmployees > 0 && (
                  <span className="text-[10px] opacity-80">({totalEmployees})</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('trabalhista')}
                style={activeTab === 'trabalhista' ? { backgroundColor: '#1d4ed8', color: '#ffffff' } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'trabalhista'
                    ? 'shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Trabalhista Mensal</span>
              </button>

              <button
                onClick={() => setActiveTab('areas')}
                style={activeTab === 'areas' ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'areas'
                    ? 'shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Áreas & Gestores</span>
              </button>

              <button
                onClick={() => setActiveTab('contracts')}
                style={activeTab === 'contracts' ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'contracts'
                    ? 'shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Contratos</span>
              </button>

              <button
                onClick={() => setActiveTab('demands')}
                style={activeTab === 'demands' ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'demands'
                    ? 'shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Demandas</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                style={activeTab === 'reports' ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'reports'
                    ? 'shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Auditoria & Disparos</span>
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={onExportExcel}
                title="Exportar Base Completa para Excel (.xlsx)"
                className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenAuditReport}
                title="Imprimir / Salvar Relatório Executivo PDF"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
