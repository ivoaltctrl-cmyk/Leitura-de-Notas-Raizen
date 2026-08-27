import React, { useState, useEffect, useMemo } from 'react';
import {
  Employee,
  Contract,
  AreaResponsavel,
  DemandLog,
  DocType,
  DocStatus,
  BrandConfig,
  TrabalhistaEnvio,
} from './types/index.ts';
import {
  getStoredEmployees,
  saveStoredEmployees,
  getStoredContracts,
  saveStoredContracts,
  getStoredAreas,
  saveStoredAreas,
  getStoredDemandLogs,
  saveStoredDemandLogs,
  getStoredBrandConfig,
  saveStoredBrandConfig,
  getStoredTrabalhistaEnvios,
  saveStoredTrabalhistaEnvios,
  isStoredAdminAuthenticated,
  setStoredAdminAuthenticated,
  getStoredBlinkingAlerts,
  saveStoredBlinkingAlerts,
  calculateSystemStats,
  updateEmployeeCalculatedFields,
  exportEmployeesToExcel,
  exportEmployeesToCsv,
} from './utils/storage.ts';
import { Navbar, MainPortalMode, AdminTabType } from './components/Navbar.tsx';
import { DashboardStats } from './components/DashboardStats.tsx';
import { EmployeeTable } from './components/EmployeeTable.tsx';
import { DemandadoPortal } from './components/DemandadoPortal.tsx';
import { TrabalhistaModule } from './components/TrabalhistaModule.tsx';
import { AreasModule } from './components/AreasModule.tsx';
import { AuditDispatchesTab } from './components/AuditDispatchesTab.tsx';
import { SettingsModule } from './components/SettingsModule.tsx';
import { OcrScannerModal } from './components/OcrScannerModal.tsx';
import { ExcelImportModal } from './components/ExcelImportModal.tsx';
import { EmployeeDetailModal } from './components/EmployeeDetailModal.tsx';
import { DemandCenterModal } from './components/DemandCenterModal.tsx';
import { ContractsModule } from './components/ContractsModule.tsx';
import { DemandHistory } from './components/DemandHistoryModal.tsx';
import { AuditReportModal } from './components/AuditReportModal.tsx';
import { ManualEmployeeModal } from './components/ManualEmployeeModal.tsx';
import { ProductionResetModal } from './components/ProductionResetModal.tsx';
import { BrandSettingsModal } from './components/BrandSettingsModal.tsx';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import { AdminPasswordModal } from './components/AdminPasswordModal.tsx';
import {
  pullAllFromSheets,
  smartMergeData,
  getStoredSpreadsheetId,
  getStoredWebhookUrl,
} from './services/googleSheetsService.ts';
import {
  fetchAllDataFromServer,
  syncCollectionToBackend,
} from './services/backendSyncService.ts';
import confetti from 'canvas-confetti';
import {
  FileScan,
  ShieldCheck,
  Building2,
  Building,
  Sparkles,
  Users,
  Send,
  Printer,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  Lock,
} from 'lucide-react';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [areas, setAreas] = useState<AreaResponsavel[]>([]);
  const [demandLogs, setDemandLogs] = useState<DemandLog[]>([]);
  const [trabalhistaEnvios, setTrabalhistaEnvios] = useState<TrabalhistaEnvio[]>([]);
  const [brand, setBrand] = useState<BrandConfig>(getStoredBrandConfig());

  // Master Portal Mode: 'demandados' or 'admin'
  const [portalMode, setPortalMode] = useState<MainPortalMode>('demandados');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [blinkingAlerts, setBlinkingAlerts] = useState<boolean>(getStoredBlinkingAlerts());

  const handleToggleBlinkingAlerts = () => {
    setBlinkingAlerts((prev) => {
      const next = !prev;
      saveStoredBlinkingAlerts(next);
      return next;
    });
  };

  // Admin Sub Navigation & Filtering
  const [activeTab, setActiveTab] = useState<AdminTabType>('dashboard');
  const [activeFilter, setActiveFilter] = useState<string>('TODOS');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isManualEmployeeOpen, setIsManualEmployeeOpen] = useState(false);
  const [isProductionResetOpen, setIsProductionResetOpen] = useState(false);
  const [isBrandSettingsOpen, setIsBrandSettingsOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [demandEmployee, setDemandEmployee] = useState<Employee | null>(null);
  const [demandContract, setDemandContract] = useState<Contract | null>(null);
  const [isAuditReportOpen, setIsAuditReportOpen] = useState(false);
  const [isSheetsSyncOpen, setIsSheetsSyncOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    status: 'idle' | 'syncing' | 'synced' | 'error';
    lastSynced?: string;
    message?: string;
  }>({ status: 'idle' });

  // Function to pull and smart-merge from GPA_BD Sheets
  const refreshFromGoogleSheets = async (silent = false) => {
    try {
      setSyncStatus((prev) => ({ ...prev, status: 'syncing' }));
      const spreadsheetId = getStoredSpreadsheetId();
      const webhookUrl = getStoredWebhookUrl();
      const imported = await pullAllFromSheets(spreadsheetId, undefined, webhookUrl);

      if (imported && (imported.employees.length > 0 || imported.contracts.length > 0 || imported.trabalhistas.length > 0)) {
        const currentEmployees = getStoredEmployees();
        const currentContracts = getStoredContracts();
        const currentTrabalhistas = getStoredTrabalhistaEnvios();

        const merged = smartMergeData(
          {
            employees: currentEmployees,
            contracts: currentContracts,
            trabalhistas: currentTrabalhistas,
          },
          {
            employees: imported.employees,
            contracts: imported.contracts,
            trabalhistas: imported.trabalhistas,
          }
        );

        updateEmployees(merged.employees);
        updateContracts(merged.contracts);
        updateTrabalhistaEnvios(merged.trabalhistas);
      }

      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setSyncStatus({
        status: 'synced',
        lastSynced: nowTime,
        message: `Planilha GPA_BD sincronizada (${imported.employees.length} SST, ${imported.contracts.length} Contratos)`,
      });
    } catch (err: any) {
      console.info('Auto-sync background status:', err);
      setSyncStatus({
        status: 'idle',
        lastSynced: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        message: 'Planilha GPA_BD local pronta',
      });
    }
  };

  // Initialize data from server or localStorage on mount and auto-sync with Google Sheets
  useEffect(() => {
    async function initData() {
      // First load from local storage
      let loadedEmployees = getStoredEmployees();
      let loadedContracts = getStoredContracts();
      let loadedAreas = getStoredAreas();
      let loadedLogs = getStoredDemandLogs();
      let loadedTrabalhista = getStoredTrabalhistaEnvios();
      let loadedBrand = getStoredBrandConfig();
      const isAuth = isStoredAdminAuthenticated();

      // Check if backend server has centralized data stored
      const serverData = await fetchAllDataFromServer();
      if (serverData) {
        if (serverData.employees && serverData.employees.length > 0) {
          loadedEmployees = serverData.employees;
          saveStoredEmployees(loadedEmployees);
        }
        if (serverData.contracts && serverData.contracts.length > 0) {
          loadedContracts = serverData.contracts;
          saveStoredContracts(loadedContracts);
        }
        if (serverData.areas && serverData.areas.length > 0) {
          loadedAreas = serverData.areas;
          saveStoredAreas(loadedAreas);
        }
        if (serverData.trabalhistas && serverData.trabalhistas.length > 0) {
          loadedTrabalhista = serverData.trabalhistas;
          saveStoredTrabalhistaEnvios(loadedTrabalhista);
        }
        if (serverData.demandLogs && serverData.demandLogs.length > 0) {
          loadedLogs = serverData.demandLogs;
          saveStoredDemandLogs(loadedLogs);
        }
        if (serverData.brandConfig) {
          loadedBrand = serverData.brandConfig;
          saveStoredBrandConfig(loadedBrand);
        }
      }

      setEmployees(loadedEmployees);
      setContracts(loadedContracts);
      setAreas(loadedAreas);
      setDemandLogs(loadedLogs);
      setTrabalhistaEnvios(loadedTrabalhista);
      setBrand(loadedBrand);
      setIsAdminLoggedIn(isAuth);

      // Auto-fetch from Google Sheets in background
      refreshFromGoogleSheets(true);
    }

    initData();
  }, []);

  // Sync helpers with automatic backend server reflection
  const updateEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    saveStoredEmployees(newEmployees);
    syncCollectionToBackend('employees', newEmployees);
  };

  const updateTrabalhistaEnvios = (newEnvios: TrabalhistaEnvio[]) => {
    setTrabalhistaEnvios(newEnvios);
    saveStoredTrabalhistaEnvios(newEnvios);
    syncCollectionToBackend('trabalhistas', newEnvios);
  };

  const updateContracts = (newContracts: Contract[]) => {
    setContracts(newContracts);
    saveStoredContracts(newContracts);
    syncCollectionToBackend('contracts', newContracts);
  };

  const updateAreas = (newAreas: AreaResponsavel[]) => {
    setAreas(newAreas);
    saveStoredAreas(newAreas);
    syncCollectionToBackend('areas', newAreas);
  };

  const updateDemandLogs = (newLogs: DemandLog[]) => {
    setDemandLogs(newLogs);
    saveStoredDemandLogs(newLogs);
    syncCollectionToBackend('demandLogs', newLogs);
  };

  const updateBrand = (newBrand: BrandConfig) => {
    setBrand(newBrand);
    saveStoredBrandConfig(newBrand);
    syncCollectionToBackend('brandConfig', newBrand);
  };

  // Admin Auth Handlers
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setStoredAdminAuthenticated(true);
    setIsAdminLoginOpen(false);
    setPortalMode('settings');
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setStoredAdminAuthenticated(false);
    setPortalMode('demandados');
  };

  // Handlers for Employees
  const handleSaveEmployee = (savedEmp: Employee) => {
    const calculated = updateEmployeeCalculatedFields(savedEmp);
    const existsIndex = employees.findIndex(
      (e) =>
        e.id === calculated.id ||
        (e.matricula &&
          calculated.matricula &&
          e.matricula.trim().toLowerCase() === calculated.matricula.trim().toLowerCase())
    );

    let nextList: Employee[];
    if (existsIndex >= 0) {
      nextList = [...employees];
      nextList[existsIndex] = calculated;
    } else {
      nextList = [calculated, ...employees];
    }

    updateEmployees(nextList);

    if (detailEmployee && detailEmployee.id === calculated.id) {
      setDetailEmployee(calculated);
    }
  };

  const handleBulkImportEmployees = (importedEmployees: Employee[]) => {
    const existingMap = new Map(employees.map((e) => [e.matricula.toLowerCase().trim(), e]));

    const mergedList = [...employees];

    importedEmployees.forEach((emp) => {
      const calculated = updateEmployeeCalculatedFields(emp);
      const key = (calculated.matricula || '').toLowerCase().trim();

      if (key && existingMap.has(key)) {
        const idx = mergedList.findIndex((e) => e.matricula.toLowerCase().trim() === key);
        if (idx >= 0) mergedList[idx] = calculated;
      } else {
        mergedList.unshift(calculated);
      }
    });

    updateEmployees(mergedList);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  const handleDeleteEmployee = (employeeId: string) => {
    const nextList = employees.filter((e) => e.id !== employeeId);
    updateEmployees(nextList);
    if (detailEmployee && detailEmployee.id === employeeId) {
      setDetailEmployee(null);
    }
  };

  const handleQuickToggleDoc = (employeeId: string, docType: DocType, newStatus: DocStatus) => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target) return;

    const updatedDocs = target.pendencias.map((d) =>
      d.tipo === docType
        ? {
            ...d,
            status: newStatus,
            ultimaAtualizacao: new Date().toISOString().split('T')[0],
          }
        : d
    );

    const updatedEmp = updateEmployeeCalculatedFields({
      ...target,
      pendencias: updatedDocs,
    });

    handleSaveEmployee(updatedEmp);

    if (newStatus === 'EM_DIA' && updatedEmp.statusGeral === 'EM_DIA') {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (e) {}
    }
  };

  // Handlers for Areas
  const handleSaveArea = (savedArea: AreaResponsavel) => {
    const existsIndex = areas.findIndex((a) => a.id === savedArea.id);
    let nextAreas: AreaResponsavel[];
    if (existsIndex >= 0) {
      nextAreas = [...areas];
      nextAreas[existsIndex] = savedArea;
    } else {
      nextAreas = [savedArea, ...areas];
    }
    updateAreas(nextAreas);

    // Update employees assigned to this area
    const updatedEmployees = employees.map((emp) => {
      if (emp.areaId === savedArea.id) {
        return {
          ...emp,
          areaNome: savedArea.nome,
          areaResponsavelNome: savedArea.responsavelNome,
          areaResponsavelEmail: savedArea.responsavelEmail,
          areaResponsavelTelefone: savedArea.responsavelTelefone,
        };
      }
      return emp;
    });
    updateEmployees(updatedEmployees);
  };

  const handleDeleteArea = (areaId: string) => {
    const nextAreas = areas.filter((a) => a.id !== areaId);
    updateAreas(nextAreas);
  };

  // Handlers for Contracts
  const handleSaveContract = (savedContract: Contract) => {
    const existsIndex = contracts.findIndex((c) => c.id === savedContract.id);
    let nextContracts: Contract[];
    if (existsIndex >= 0) {
      nextContracts = [...contracts];
      nextContracts[existsIndex] = savedContract;
    } else {
      nextContracts = [savedContract, ...contracts];
    }
    updateContracts(nextContracts);
  };

  const handleDeleteContract = (contractId: string) => {
    const nextContracts = contracts.filter((c) => c.id !== contractId);
    updateContracts(nextContracts);
  };

  // Handlers for Demand Logs
  const handleSaveDemandLog = (newLog: DemandLog) => {
    const nextLogs = [newLog, ...demandLogs];
    updateDemandLogs(nextLogs);
  };

  const handleUpdateLogStatus = (logId: string, newStatus: any) => {
    const nextLogs = demandLogs.map((l) => (l.id === logId ? { ...l, status: newStatus } : l));
    updateDemandLogs(nextLogs);
  };

  const handleDeleteLog = (logId: string) => {
    const nextLogs = demandLogs.filter((l) => l.id !== logId);
    updateDemandLogs(nextLogs);
  };

  const handleMassDispatch = (newLogs: DemandLog[]) => {
    const nextLogs = [...newLogs, ...demandLogs];
    updateDemandLogs(nextLogs);
  };

  // Reset entire database to blank state for production
  const handleExecuteProductionReset = () => {
    updateEmployees([]);
    updateContracts([]);
    updateAreas([]);
    updateTrabalhistaEnvios([]);
    updateDemandLogs([]);
    setIsProductionResetOpen(false);
  };

  // Reset to initial rich mock dataset
  const handleResetData = () => {
    if (window.confirm('Deseja recarregar os dados de exemplo padrão do sistema?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateSystemStats(employees);
  }, [employees]);

  const primaryColor = brand?.primaryColor || '#E21B23';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-rose-100 selection:text-rose-900">
      {/* NAVBAR WITH PORTAL MODE SWITCHER & SECURE ROUTING */}
      <Navbar
        portalMode={portalMode}
        setPortalMode={(mode) => {
          if (mode === 'settings' && !isAdminLoggedIn) {
            setIsAdminLoginOpen(true);
          } else {
            setPortalMode(mode);
          }
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminLogout={handleAdminLogout}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onOpenGoogleSheetsSync={() => setIsSheetsSyncOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenOcrScanner={() => setIsOcrOpen(true)}
        onOpenNewEmployee={() => {
          setEditingEmployee(null);
          setIsManualEmployeeOpen(true);
        }}
        onExportExcel={() => exportEmployeesToExcel(employees, contracts, areas)}
        onExportCsv={() => exportEmployeesToCsv(employees)}
        onOpenAuditReport={() => setIsAuditReportOpen(true)}
        onResetData={handleResetData}
        onOpenProductionReset={() => setIsProductionResetOpen(true)}
        onOpenBrandSettings={() => setIsBrandSettingsOpen(true)}
        brand={brand}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        totalEmployees={employees.length}
        totalPending={stats.totalComPendencia}
        totalAVencer={stats.totalAVencer30Dias}
        blinkingAlerts={blinkingAlerts}
        onToggleBlinkingAlerts={handleToggleBlinkingAlerts}
        syncStatus={syncStatus}
        onRefreshSheets={() => refreshFromGoogleSheets(false)}
      />

      {/* MAIN BODY: PORTAL DEMANDADO VS PAINEL ADM */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ========================================================================= */}
        {/* MODE 1: PORTAL DO DEMANDADO (Visão Externa Limpa & Focada em Regularização) */}
        {/* ========================================================================= */}
        {portalMode === 'demandados' && (
          <DemandadoPortal
            employees={employees}
            contracts={contracts}
            areas={areas}
            brand={brand}
            onSaveEmployee={handleSaveEmployee}
            onSaveContract={handleSaveContract}
            onDeleteContract={handleDeleteContract}
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
            isAdminLoggedIn={isAdminLoggedIn}
            onSwitchToAdminTab={() => setPortalMode('admin')}
            blinkingAlerts={blinkingAlerts}
            trabalhistaEnvios={trabalhistaEnvios}
            onSaveTrabalhistaEnvios={updateTrabalhistaEnvios}
            onOpenGoogleSheetsSync={() => setIsSheetsSyncOpen(true)}
          />
        )}

        {/* ========================================================================= */}
        {/* MODE 2: PAINEL ADMINISTRADOR (Gestão & Auditoria Aberta - Lista Read-Only) */}
        {/* ========================================================================= */}
        {portalMode === 'admin' && (
          <>
            {/* Tab 1: Dashboard Analytics */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Painel Executivo de Conformidade
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Auditoria de terceiros, controle de vencimentos e matriz de risco SST
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPortalMode('demandados')}
                      style={{ backgroundColor: primaryColor }}
                      className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Ir para Portal Demandado</span>
                    </button>
                  </div>
                </div>

                <DashboardStats
                  stats={stats}
                  totalContracts={contracts.length}
                  totalAreas={areas.length}
                  onFilterClick={(filter) => {
                    setActiveFilter(filter);
                    setActiveTab('employees');
                  }}
                  currentFilter={activeFilter}
                  brand={brand}
                />
              </div>
            )}

            {/* Tab 2: Full Employees Module (Read-Only com Auditoria) */}
            {activeTab === 'employees' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Base de Colaboradores & Status Documental
                    </h2>
                    <p className="text-xs text-slate-500">
                      Visualização executiva do quadro de terceiros, vínculos de áreas e acompanhamento de prazos
                    </p>
                  </div>
                </div>

                <EmployeeTable
                  employees={employees}
                  contracts={contracts}
                  areas={areas}
                  onOpenDetail={(emp) => setDetailEmployee(emp)}
                  onOpenDemand={(emp) => setDemandEmployee(emp)}
                  onEditEmployee={(emp) => {
                    setEditingEmployee(emp);
                    setIsManualEmployeeOpen(true);
                  }}
                  onDeleteEmployee={handleDeleteEmployee}
                  onQuickToggleDoc={handleQuickToggleDoc}
                  onOpenNewEmployee={() => {
                    setEditingEmployee(null);
                    setIsManualEmployeeOpen(true);
                  }}
                  onOpenExcelImport={() => setIsExcelImportOpen(true)}
                  activeFilter={activeFilter}
                  setActiveFilter={setActiveFilter}
                  selectedContractId={selectedContractId}
                  setSelectedContractId={setSelectedContractId}
                  selectedAreaId={selectedAreaId}
                  setSelectedAreaId={setSelectedAreaId}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  brand={brand}
                  readOnly={true}
                  onGoToDemandado={() => setPortalMode('demandados')}
                />
              </div>
            )}

            {/* Tab: Documentação Trabalhista Mensal */}
            {activeTab === 'trabalhista' && (
              <TrabalhistaModule
                envios={trabalhistaEnvios}
                onSaveEnvios={updateTrabalhistaEnvios}
                brand={brand}
                isAdmin={isAdminLoggedIn}
                blinkingAlerts={blinkingAlerts}
              />
            )}

            {/* Tab 3: Areas & Managers Module */}
            {activeTab === 'areas' && (
              <AreasModule
                areas={areas}
                employees={employees}
                onSaveArea={handleSaveArea}
                onDeleteArea={handleDeleteArea}
                onSelectAreaForDispatch={(area) => {
                  setActiveTab('reports');
                }}
                brand={brand}
              />
            )}

            {/* Tab 4: Contracts Module */}
            {activeTab === 'contracts' && (
              <ContractsModule
                contracts={contracts}
                employees={employees}
                onSaveContract={handleSaveContract}
                onDeleteContract={handleDeleteContract}
                onDemandContract={(contract) => {
                  setDemandContract(contract);
                }}
                onFilterByContract={(contractId) => {
                  setSelectedContractId(contractId);
                  setActiveTab('employees');
                }}
              />
            )}

            {/* Tab 5: Demands & Notification History */}
            {activeTab === 'demands' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <DemandHistory
                  logs={demandLogs}
                  onUpdateLogStatus={handleUpdateLogStatus}
                  onDeleteLog={handleDeleteLog}
                  onOpenNewDemand={() => {
                    if (employees.length > 0) {
                      setDemandEmployee(employees[0]);
                    }
                  }}
                />
              </div>
            )}

            {/* Tab 6: Audit & Mass Dispatches */}
            {activeTab === 'reports' && (
              <AuditDispatchesTab
                employees={employees}
                contracts={contracts}
                areas={areas}
                stats={stats}
                onExportExcel={() => exportEmployeesToExcel(employees, contracts, areas)}
                onExportCsv={() => exportEmployeesToCsv(employees)}
                onOpenAuditReportModal={() => setIsAuditReportOpen(true)}
                onMassDispatch={handleMassDispatch}
                brand={brand}
              />
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: GUIA DE CONFIGURAÇÃO (Acesso Direto, Gestão & Governança) */}
        {/* ========================================================================= */}
        {portalMode === 'settings' && (
          <SettingsModule
            onOpenSheetsSync={() => setIsSheetsSyncOpen(true)}
            onOpenOcrScanner={() => setIsOcrOpen(true)}
            onOpenProductionReset={() => setIsProductionResetOpen(true)}
            onOpenBrandSettings={() => setIsBrandSettingsOpen(true)}
            blinkingAlerts={blinkingAlerts}
            onToggleBlinkingAlerts={handleToggleBlinkingAlerts}
            brand={brand}
            employees={employees}
            contracts={contracts}
            trabalhistas={trabalhistaEnvios}
            areas={areas}
            syncStatus={syncStatus}
            onRefreshSheets={() => refreshFromGoogleSheets(false)}
            onGoToDemandado={() => setPortalMode('demandados')}
          />
        )}
      </main>

      {/* MODALS */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
        brand={brand}
      />

      <AdminPasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        brand={brand}
      />

      <OcrScannerModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onSaveEmployee={handleSaveEmployee}
        contracts={contracts}
        employees={employees}
        areas={areas}
        brand={brand}
      />

      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        onImportEmployees={handleBulkImportEmployees}
        areas={areas}
        contracts={contracts}
        brand={brand}
      />

      <ManualEmployeeModal
        isOpen={isManualEmployeeOpen}
        onClose={() => {
          setIsManualEmployeeOpen(false);
          setEditingEmployee(null);
        }}
        onSaveEmployee={handleSaveEmployee}
        editingEmployee={editingEmployee}
        contracts={contracts}
        areas={areas}
        brand={brand}
      />

      <DemandCenterModal
        isOpen={!!demandEmployee}
        onClose={() => setDemandEmployee(null)}
        employee={demandEmployee}
        brand={brand}
        onSaveDemandLog={handleSaveDemandLog}
      />

      <EmployeeDetailModal
        isOpen={!!detailEmployee}
        onClose={() => setDetailEmployee(null)}
        employee={detailEmployee}
        onQuickToggleDoc={handleQuickToggleDoc}
        onEdit={(emp) => {
          setEditingEmployee(emp);
          setIsManualEmployeeOpen(true);
        }}
        onDemand={(emp) => setDemandEmployee(emp)}
        brand={brand}
      />

      <AuditReportModal
        isOpen={isAuditReportOpen}
        onClose={() => setIsAuditReportOpen(false)}
        stats={stats}
        employees={employees}
        contracts={contracts}
        areas={areas}
        brand={brand}
      />

      <ProductionResetModal
        isOpen={isProductionResetOpen}
        onClose={() => setIsProductionResetOpen(false)}
        onConfirmReset={handleExecuteProductionReset}
        brand={brand}
      />

      <BrandSettingsModal
        isOpen={isBrandSettingsOpen}
        onClose={() => setIsBrandSettingsOpen(false)}
        brand={brand}
        onSaveBrand={updateBrand}
      />

      <GoogleSheetsSyncModal
        isOpen={isSheetsSyncOpen}
        onClose={() => setIsSheetsSyncOpen(false)}
        employees={employees}
        contracts={contracts}
        trabalhistas={trabalhistaEnvios}
        onImportEmployees={handleBulkImportEmployees}
        onImportContracts={(cts) => updateContracts(cts)}
        onImportTrabalhistas={(tbs) => updateTrabalhistaEnvios(tbs)}
        brand={brand}
        onSyncDone={(msg) => {
          setSyncStatus({
            status: 'synced',
            lastSynced: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            message: msg,
          });
        }}
      />
    </div>
  );
}
