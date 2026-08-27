import * as XLSX from 'xlsx';
import {
  Contract,
  Employee,
  DemandLog,
  SystemStats,
  PendingDoc,
  BrandConfig,
  AreaResponsavel,
  DocStatus,
  TrabalhistaEnvio,
  TrabalhistaMesConsolidado,
} from '../types/index.ts';
import {
  INITIAL_CONTRACTS,
  INITIAL_EMPLOYEES,
  INITIAL_DEMAND_LOGS,
  INITIAL_AREAS,
  INITIAL_TRABALHISTA_ENVIOS,
} from '../data/mockData.ts';
import { DEFAULT_BRAND_CONFIG, applyBrandThemeToCss } from './themePresets.ts';

const EMPLOYEES_KEY = 'sst_pendencias_employees_v1';
const CONTRACTS_KEY = 'sst_pendencias_contracts_v1';
const AREAS_KEY = 'sst_pendencias_areas_v1';
const DEMAND_LOGS_KEY = 'sst_pendencias_demand_logs_v1';
const TRABALHISTA_ENVIOS_KEY = 'sst_pendencias_trabalhista_envios_v1';
const BRAND_CONFIG_KEY = 'sst_pendencias_brand_config_v1';
const IS_PRODUCTION_KEY = 'sst_pendencias_is_production_v1';
const ADMIN_AUTH_KEY = 'sst_gpa_admin_auth_status_v1';
const ADMIN_CREDENTIALS_KEY = 'sst_gpa_admin_credentials_v1';
const BLINKING_ALERTS_KEY = 'sst_gpa_blinking_alerts_v1';

export function getStoredBlinkingAlerts(): boolean {
  try {
    const raw = localStorage.getItem(BLINKING_ALERTS_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function saveStoredBlinkingAlerts(enabled: boolean) {
  try {
    localStorage.setItem(BLINKING_ALERTS_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Erro ao salvar configuração de alertas piscantes:', e);
  }
}

export interface AdminCredentials {
  username: string;
  passwordHash: string;
}

export function getStoredAdminCredentials(): { username: string; password: string } {
  try {
    const raw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
    if (!raw) {
      const def = { username: 'admin', password: 'gpa' };
      localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(def));
      return def;
    }
    const parsed = JSON.parse(raw);
    return {
      username: parsed.username || 'admin',
      password: parsed.password || 'gpa',
    };
  } catch {
    return { username: 'admin', password: 'gpa' };
  }
}

export function saveStoredAdminCredentials(username: string, password: string) {
  try {
    localStorage.setItem(
      ADMIN_CREDENTIALS_KEY,
      JSON.stringify({ username: username.trim(), password: password.trim() })
    );
  } catch (e) {
    console.error('Erro ao salvar credenciais do admin:', e);
  }
}

export function isStoredAdminAuthenticated(): boolean {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setStoredAdminAuthenticated(isAuth: boolean) {
  try {
    localStorage.setItem(ADMIN_AUTH_KEY, isAuth ? 'true' : 'false');
  } catch (e) {
    console.error('Erro ao salvar estado de autenticação:', e);
  }
}

export function isProductionMode(): boolean {
  try {
    return localStorage.getItem(IS_PRODUCTION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function getStoredBrandConfig(): BrandConfig {
  try {
    const raw = localStorage.getItem(BRAND_CONFIG_KEY);
    if (!raw) {
      localStorage.setItem(BRAND_CONFIG_KEY, JSON.stringify(DEFAULT_BRAND_CONFIG));
      applyBrandThemeToCss(DEFAULT_BRAND_CONFIG);
      return DEFAULT_BRAND_CONFIG;
    }
    const parsed = JSON.parse(raw);
    applyBrandThemeToCss(parsed);
    return parsed;
  } catch (e) {
    console.error('Erro ao ler configuração de marca:', e);
    applyBrandThemeToCss(DEFAULT_BRAND_CONFIG);
    return DEFAULT_BRAND_CONFIG;
  }
}

export function saveStoredBrandConfig(config: BrandConfig) {
  try {
    localStorage.setItem(BRAND_CONFIG_KEY, JSON.stringify(config));
    applyBrandThemeToCss(config);
  } catch (e) {
    console.error('Erro ao salvar configuração de marca:', e);
  }
}

export function getStoredAreas(): AreaResponsavel[] {
  try {
    const isProd = isProductionMode();
    const raw = localStorage.getItem(AREAS_KEY);
    if (raw === null) {
      if (isProd) {
        localStorage.setItem(AREAS_KEY, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(AREAS_KEY, JSON.stringify(INITIAL_AREAS));
      return INITIAL_AREAS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler áreas do localStorage:', e);
    return [];
  }
}

export function saveStoredAreas(areas: AreaResponsavel[]) {
  try {
    localStorage.setItem(AREAS_KEY, JSON.stringify(areas));
  } catch (e) {
    console.error('Erro ao salvar áreas:', e);
  }
}

export function getStoredEmployees(): Employee[] {
  try {
    const isProd = isProductionMode();
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    if (raw === null) {
      if (isProd) {
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES.map((emp) => updateEmployeeCalculatedFields(emp));
    }
    const parsed: Employee[] = JSON.parse(raw);
    if (parsed.length === 0 && !isProd) {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES.map((emp) => updateEmployeeCalculatedFields(emp));
    }
    // Refresh 30-day alerts and days left calculations
    return parsed.map((emp) => updateEmployeeCalculatedFields(emp));
  } catch (e) {
    console.error('Erro ao ler funcionários do localStorage:', e);
    return [];
  }
}

export function saveStoredEmployees(employees: Employee[]) {
  try {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  } catch (e) {
    console.error('Erro ao salvar funcionários:', e);
  }
}

export function getStoredContracts(): Contract[] {
  try {
    const isProd = isProductionMode();
    const raw = localStorage.getItem(CONTRACTS_KEY);
    if (raw === null) {
      if (isProd) {
        localStorage.setItem(CONTRACTS_KEY, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(CONTRACTS_KEY, JSON.stringify(INITIAL_CONTRACTS));
      return INITIAL_CONTRACTS;
    }
    const parsed: Contract[] = JSON.parse(raw);
    if (!isProd && (!parsed.length || !parsed.some(c => c.numero === '4600001229' || c.numero === 'GRU020320180103'))) {
      localStorage.setItem(CONTRACTS_KEY, JSON.stringify(INITIAL_CONTRACTS));
      return INITIAL_CONTRACTS;
    }
    return parsed;
  } catch (e) {
    console.error('Erro ao ler contratos:', e);
    return [];
  }
}

export function saveStoredContracts(contracts: Contract[]) {
  try {
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));
  } catch (e) {
    console.error('Erro ao salvar contratos:', e);
  }
}

export function getStoredDemandLogs(): DemandLog[] {
  try {
    const isProd = isProductionMode();
    const raw = localStorage.getItem(DEMAND_LOGS_KEY);
    if (raw === null) {
      if (isProd) {
        localStorage.setItem(DEMAND_LOGS_KEY, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(DEMAND_LOGS_KEY, JSON.stringify(INITIAL_DEMAND_LOGS));
      return INITIAL_DEMAND_LOGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler logs de demanda:', e);
    return [];
  }
}

export function saveStoredDemandLogs(logs: DemandLog[]) {
  try {
    localStorage.setItem(DEMAND_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Erro ao salvar logs de demanda:', e);
  }
}

export function getStoredTrabalhistaEnvios(): TrabalhistaEnvio[] {
  try {
    const isProd = isProductionMode();
    const raw = localStorage.getItem(TRABALHISTA_ENVIOS_KEY);
    if (raw === null) {
      if (isProd) {
        localStorage.setItem(TRABALHISTA_ENVIOS_KEY, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(TRABALHISTA_ENVIOS_KEY, JSON.stringify(INITIAL_TRABALHISTA_ENVIOS));
      return INITIAL_TRABALHISTA_ENVIOS;
    }
    const parsed = JSON.parse(raw);
    if (parsed.length === 0 && !isProd) {
      localStorage.setItem(TRABALHISTA_ENVIOS_KEY, JSON.stringify(INITIAL_TRABALHISTA_ENVIOS));
      return INITIAL_TRABALHISTA_ENVIOS;
    }
    return parsed;
  } catch (e) {
    console.error('Erro ao ler envios trabalhistas:', e);
    return [];
  }
}

export function saveStoredTrabalhistaEnvios(envios: TrabalhistaEnvio[]) {
  try {
    localStorage.setItem(TRABALHISTA_ENVIOS_KEY, JSON.stringify(envios));
  } catch (e) {
    console.error('Erro ao salvar envios trabalhistas:', e);
  }
}

const MESES_NOMES: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
};

/**
 * Regra do Balizador por Mês:
 * Tendo pelo menos 1 envio 'Validado' no mês, a competência é considerada VALIDADA / EM DIA!
 */
export function getTrabalhistaMesesConsolidados(envios: TrabalhistaEnvio[]): TrabalhistaMesConsolidado[] {
  const map = new Map<string, TrabalhistaEnvio[]>();

  // Agrupa por Chave Ano-Mês
  envios.forEach((env) => {
    const key = `${env.ano}-${env.mes.padStart(2, '0')}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(env);
  });

  const consolidados: TrabalhistaMesConsolidado[] = [];

  map.forEach((lista, key) => {
    const [anoStr, mesStr] = key.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = mesStr;
    const mesNome = MESES_NOMES[mes] || `Mês ${mes}`;

    const totalEnvios = lista.length;
    const totalValidados = lista.filter((e) => e.status === 'Validado').length;
    const totalReprovados = lista.filter((e) => e.status === 'Reprovado').length;

    // Regra do Usuário: Tendo um validado significa que tá válido
    const isValidado = totalValidados > 0;
    const statusConsolidado = isValidado
      ? 'VALIDADO'
      : totalReprovados > 0
      ? 'REPROVADO'
      : 'PENDENTE';

    // Ordenar pelo envio mais recente
    const sorted = [...lista].sort((a, b) => b.dataEnvio.localeCompare(a.dataEnvio));

    consolidados.push({
      mes,
      mesNome,
      ano,
      totalEnvios,
      totalValidados,
      totalReprovados,
      isValidado,
      statusConsolidado,
      ultimoEnvio: sorted[0],
    });
  });

  // Ordenar competências da mais recente para a mais antiga (ex: 06/2026, 05/2026, 04/2026...)
  return consolidados.sort((a, b) => {
    if (b.ano !== a.ano) return b.ano - a.ano;
    return parseInt(b.mes, 10) - parseInt(a.mes, 10);
  });
}


export function clearDatabaseForProduction(options: {
  wipeEmployees?: boolean;
  wipeContracts?: boolean;
  wipeAreas?: boolean;
  wipeDemandLogs?: boolean;
}) {
  localStorage.setItem(IS_PRODUCTION_KEY, 'true');

  if (options.wipeEmployees !== false) {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify([]));
  }
  if (options.wipeDemandLogs !== false) {
    localStorage.setItem(DEMAND_LOGS_KEY, JSON.stringify([]));
  }
  if (options.wipeContracts) {
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify([]));
  }
  if (options.wipeAreas) {
    localStorage.setItem(AREAS_KEY, JSON.stringify([]));
  }
}

export function resetToProductionEmpty(options: {
  keepContracts?: boolean;
  keepAreas?: boolean;
  clearEmployees?: boolean;
  clearLogs?: boolean;
}) {
  clearDatabaseForProduction({
    wipeEmployees: options.clearEmployees !== false,
    wipeDemandLogs: options.clearLogs !== false,
    wipeContracts: !options.keepContracts,
    wipeAreas: !options.keepAreas,
  });
}

export function resetDatabaseToDefaults() {
  localStorage.setItem(IS_PRODUCTION_KEY, 'false');
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(INITIAL_CONTRACTS));
  localStorage.setItem(AREAS_KEY, JSON.stringify(INITIAL_AREAS));
  localStorage.setItem(DEMAND_LOGS_KEY, JSON.stringify(INITIAL_DEMAND_LOGS));
}

/**
 * Calculates remaining days and sets status to A_VENCER when days <= 30
 */
export function calculateDaysAndDocStatus(
  doc: PendingDoc,
  targetDateStr?: string
): { diasRestantes?: number; status: DocStatus } {
  const dateToUse = targetDateStr || doc.dataVencimento;
  if (!dateToUse) {
    return { diasRestantes: doc.diasRestantes, status: doc.status };
  }

  const parts = dateToUse.split('-');
  if (parts.length !== 3) {
    return { diasRestantes: doc.diasRestantes, status: doc.status };
  }

  const expDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { diasRestantes: diffDays, status: 'VENCIDO' };
  }
  if (diffDays <= 30) {
    return { diasRestantes: diffDays, status: 'A_VENCER' };
  }
  return { diasRestantes: diffDays, status: doc.status === 'PENDENTE' ? 'PENDENTE' : 'EM_DIA' };
}

export function updateEmployeeCalculatedFields(emp: Employee): Employee {
  const updatedDocs = (emp.pendencias || []).map((doc) => {
    if (doc.dataVencimento && doc.status !== 'NAO_APLICAVEL' && doc.status !== 'PENDENTE') {
      const calc = calculateDaysAndDocStatus(doc);
      return {
        ...doc,
        diasRestantes: calc.diasRestantes,
        status: calc.status,
      };
    }
    return doc;
  });

  const recalculation = recalculateEmployeeStatus({ ...emp, pendencias: updatedDocs });

  return {
    ...emp,
    pendencias: updatedDocs,
    indicadorPercentual: recalculation.indicadorPercentual,
    statusGeral: recalculation.statusGeral,
  };
}

export function calculateSystemStats(employees: Employee[]): SystemStats {
  const total = employees.length;
  if (total === 0) {
    return {
      totalFuncionarios: 0,
      totalEmDia: 0,
      totalComPendencia: 0,
      totalAVencer30Dias: 0,
      totalCriticos: 0,
      totalBloqueados: 0,
      taxaConformidadeGeral: 0,
      ordemServico: { total: 0, emDia: 0, aVencer: 0, pendente: 0, vencido: 0, taxa: 0 },
      aso: { total: 0, emDia: 0, aVencer: 0, pendente: 0, vencido: 0, taxa: 0 },
      fichaEpi: { total: 0, emDia: 0, aVencer: 0, pendente: 0, vencido: 0, taxa: 0 },
      radioprotecao: { total: 0, emDia: 0, aVencer: 0, pendente: 0, vencido: 0, taxa: 0 },
    };
  }

  let totalEmDia = 0;
  let totalCriticos = 0;
  let totalBloqueados = 0;
  let totalComPendencia = 0;
  let totalAVencer30Dias = 0;
  let sumIndicators = 0;

  const osStats = { total: 0, emDia: 0, aVencer: 0, pendente: 0, vencido: 0 };
  const asoStats = { total: 0, emDia: 0, aVencer: 0, pendente: 0, vencido: 0 };
  const epiStats = { total: 0, emDia: 0, aVencer: 0, pendente: 0, vencido: 0 };
  const radioStats = { total: 0, emDia: 0, aVencer: 0, pendente: 0, vencido: 0 };

  for (const emp of employees) {
    sumIndicators += emp.indicadorPercentual || 0;

    if (emp.statusGeral === 'EM_DIA') totalEmDia++;
    else if (emp.statusGeral === 'CRITICO') totalCriticos++;
    else if (emp.statusGeral === 'BLOQUEADO') totalBloqueados++;

    if (emp.statusGeral !== 'EM_DIA') {
      totalComPendencia++;
    }

    let empHasAVencer = false;

    for (const p of emp.pendencias || []) {
      if (p.status === 'A_VENCER') {
        empHasAVencer = true;
      }

      if (p.tipo === 'ORDEM_DE_SERVICO') {
        osStats.total++;
        if (p.status === 'EM_DIA') osStats.emDia++;
        else if (p.status === 'A_VENCER') {
          osStats.aVencer++;
          osStats.emDia++;
        } else if (p.status === 'VENCIDO') osStats.vencido++;
        else if (p.status === 'PENDENTE' || p.status === 'EM_ANALISE') osStats.pendente++;
      } else if (p.tipo === 'ATESTADO_SAUDE_OCUPACIONAL') {
        asoStats.total++;
        if (p.status === 'EM_DIA') asoStats.emDia++;
        else if (p.status === 'A_VENCER') {
          asoStats.aVencer++;
          asoStats.emDia++;
        } else if (p.status === 'VENCIDO') asoStats.vencido++;
        else if (p.status === 'PENDENTE' || p.status === 'EM_ANALISE') asoStats.pendente++;
      } else if (p.tipo === 'FICHA_EPI') {
        epiStats.total++;
        if (p.status === 'EM_DIA') epiStats.emDia++;
        else if (p.status === 'A_VENCER') {
          epiStats.aVencer++;
          epiStats.emDia++;
        } else if (p.status === 'VENCIDO') epiStats.vencido++;
        else if (p.status === 'PENDENTE' || p.status === 'EM_ANALISE') epiStats.pendente++;
      } else if (p.tipo === 'TREINAMENTO_RADIOPROTECAO') {
        if (p.status !== 'NAO_APLICAVEL') {
          radioStats.total++;
          if (p.status === 'EM_DIA') radioStats.emDia++;
          else if (p.status === 'A_VENCER') {
            radioStats.aVencer++;
            radioStats.emDia++;
          } else if (p.status === 'VENCIDO') radioStats.vencido++;
          else if (p.status === 'PENDENTE' || p.status === 'EM_ANALISE') radioStats.pendente++;
        }
      }
    }

    if (empHasAVencer) {
      totalAVencer30Dias++;
    }
  }

  const taxaGeral = Math.round(sumIndicators / total);

  return {
    totalFuncionarios: total,
    totalEmDia,
    totalComPendencia,
    totalAVencer30Dias,
    totalCriticos,
    totalBloqueados,
    taxaConformidadeGeral: taxaGeral,
    ordemServico: {
      ...osStats,
      taxa: osStats.total > 0 ? Math.round((osStats.emDia / osStats.total) * 100) : 100,
    },
    aso: {
      ...asoStats,
      taxa: asoStats.total > 0 ? Math.round((asoStats.emDia / asoStats.total) * 100) : 100,
    },
    fichaEpi: {
      ...epiStats,
      taxa: epiStats.total > 0 ? Math.round((epiStats.emDia / epiStats.total) * 100) : 100,
    },
    radioprotecao: {
      ...radioStats,
      taxa: radioStats.total > 0 ? Math.round((radioStats.emDia / radioStats.total) * 100) : 100,
    },
  };
}

export function calculateContractMetrics(contractId: string, employees: Employee[]) {
  const contractEmployees = employees.filter((e) => e.contratoId === contractId);
  const total = contractEmployees.length;

  if (total === 0) {
    return {
      totalColaboradores: 0,
      emDia: 0,
      aVencer30Dias: 0,
      comPendencias: 0,
      criticos: 0,
      taxaConformidade: 100,
      temBloqueio: false,
    };
  }

  let emDia = 0;
  let criticos = 0;
  let aVencer30Dias = 0;
  let sumScore = 0;

  for (const emp of contractEmployees) {
    sumScore += emp.indicadorPercentual || 0;
    if (emp.statusGeral === 'EM_DIA') emDia++;
    if (emp.statusGeral === 'CRITICO' || emp.statusGeral === 'BLOQUEADO') criticos++;

    const hasAVencer = (emp.pendencias || []).some((p) => p.status === 'A_VENCER');
    if (hasAVencer) aVencer30Dias++;
  }

  const taxa = Math.round(sumScore / total);
  return {
    totalColaboradores: total,
    emDia,
    aVencer30Dias,
    comPendencias: total - emDia,
    criticos,
    taxaConformidade: taxa,
    temBloqueio: criticos > 0 || taxa < 80,
  };
}

export function calculateAreaMetrics(areaId: string, employees: Employee[]) {
  const areaEmployees = employees.filter((e) => e.areaId === areaId);
  const total = areaEmployees.length;

  if (total === 0) {
    return {
      totalColaboradores: 0,
      emDia: 0,
      aVencer30Dias: 0,
      comPendencias: 0,
      criticos: 0,
      taxaConformidade: 100,
    };
  }

  let emDia = 0;
  let criticos = 0;
  let aVencer30Dias = 0;
  let sumScore = 0;

  for (const emp of areaEmployees) {
    sumScore += emp.indicadorPercentual || 0;
    if (emp.statusGeral === 'EM_DIA') emDia++;
    if (emp.statusGeral === 'CRITICO' || emp.statusGeral === 'BLOQUEADO') criticos++;

    const hasAVencer = (emp.pendencias || []).some((p) => p.status === 'A_VENCER');
    if (hasAVencer) aVencer30Dias++;
  }

  return {
    totalColaboradores: total,
    emDia,
    aVencer30Dias,
    comPendencias: total - emDia,
    criticos,
    taxaConformidade: Math.round(sumScore / total),
  };
}

/**
 * Recalculates an employee's compliance score (0-100) and status general
 */
export function recalculateEmployeeStatus(emp: Partial<Employee>): {
  indicadorPercentual: number;
  statusGeral: 'EM_DIA' | 'PENDENTE' | 'CRITICO' | 'BLOQUEADO';
} {
  const docs = emp.pendencias || [];
  if (docs.length === 0) {
    return { indicadorPercentual: 100, statusGeral: 'EM_DIA' };
  }

  const applicableDocs = docs.filter((d) => d.status !== 'NAO_APLICAVEL');
  if (applicableDocs.length === 0) {
    return { indicadorPercentual: 100, statusGeral: 'EM_DIA' };
  }

  let okCount = 0;
  let hasVencido = false;
  let hasPendente = false;
  let hasAVencer = false;

  for (const d of applicableDocs) {
    if (d.status === 'EM_DIA' || d.status === 'A_VENCER') {
      okCount++;
      if (d.status === 'A_VENCER') hasAVencer = true;
    } else if (d.status === 'VENCIDO') {
      hasVencido = true;
    } else if (d.status === 'PENDENTE' || d.status === 'EM_ANALISE') {
      hasPendente = true;
    }
  }

  const score = Math.round((okCount / applicableDocs.length) * 100);

  let status: 'EM_DIA' | 'PENDENTE' | 'CRITICO' | 'BLOQUEADO' = 'EM_DIA';
  if (hasVencido && score < 50) {
    status = 'BLOQUEADO';
  } else if (hasVencido) {
    status = 'CRITICO';
  } else if (hasPendente || hasAVencer) {
    status = 'PENDENTE';
  } else if (score === 100) {
    status = 'EM_DIA';
  }

  return {
    indicadorPercentual: score,
    statusGeral: status,
  };
}

/**
 * Generates and downloads the official Spreadsheet Template for employees & contracts
 */
export function downloadExcelTemplate(areas: AreaResponsavel[], contracts: Contract[]) {
  const sampleRows = [
    {
      'Nome do Colaborador *': 'João da Silva Santos',
      'Matrícula *': 'GPA-90123',
      'CPF': '123.456.789-00',
      'Cargo / Função *': 'Operador de Logística',
      'Área / Setor *': areas[0]?.nome || 'Logística & Centros de Distribuição (CDs)',
      'Empresa Prestadora *': 'GPA Logística',
      'Contrato (Número ou Título)': contracts[0]?.numero || 'CTR-GPA-2026/01',
      'Ordem de Serviço (NR-01) [EM_DIA / PENDENTE / VENCIDO]': 'EM_DIA',
      'Validade OS (AAAA-MM-DD)': '2027-01-15',
      'ASO Ocupacional (NR-07) [EM_DIA / PENDENTE / VENCIDO]': 'EM_DIA',
      'Validade ASO (AAAA-MM-DD)': '2026-10-30',
      'Ficha de EPI (NR-06) [EM_DIA / PENDENTE / VENCIDO]': 'EM_DIA',
      'Validade Ficha EPI (AAAA-MM-DD)': '2027-01-15',
      'Treinamento / Certificação Técnica [EM_DIA / PENDENTE / VENCIDO / N_A]': 'EM_DIA',
      'Validade Certificado (AAAA-MM-DD)': '2026-12-31',
      'Observações': 'Exemplo preenchido. Alertas automáticos a partir de 30 dias para vencimento.',
    },
    {
      'Nome do Colaborador *': 'Maria Clara Oliveira',
      'Matrícula *': 'GPA-90124',
      'CPF': '987.654.321-11',
      'Cargo / Função *': 'Eletricista de Manutenção',
      'Área / Setor *': areas[1]?.nome || 'Manutenção Predial & Obras',
      'Empresa Prestadora *': 'ServTec Predial',
      'Contrato (Número ou Título)': contracts[1]?.numero || 'CTR-GPA-2026/04',
      'Ordem de Serviço (NR-01) [EM_DIA / PENDENTE / VENCIDO]': 'EM_DIA',
      'Validade OS (AAAA-MM-DD)': '2027-02-10',
      'ASO Ocupacional (NR-07) [EM_DIA / PENDENTE / VENCIDO]': 'EM_DIA',
      'Validade ASO (AAAA-MM-DD)': '2026-09-15', // a vencer em menos de 30 dias!
      'Ficha de EPI (NR-06) [EM_DIA / PENDENTE / VENCIDO]': 'PENDENTE',
      'Validade Ficha EPI (AAAA-MM-DD)': '',
      'Treinamento / Certificação Técnica [EM_DIA / PENDENTE / VENCIDO / N_A]': 'EM_DIA',
      'Validade Certificado (AAAA-MM-DD)': '2027-05-10',
      'Observações': 'ASO a vencer em setembro (alerta 30 dias) e EPI pendente de assinatura.',
    },
  ];

  const wb = XLSX.utils.book_new();

  const wsTemplate = XLSX.utils.json_to_sheet(sampleRows);
  // Auto-width columns
  const cols = Object.keys(sampleRows[0]).map(() => ({ wch: 26 }));
  wsTemplate['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Modelo_Cadastro_Colaboradores');

  // Sheet with list of active areas for reference
  const areasList = areas.map((a) => ({
    'Nome da Área / Setor': a.nome,
    'Responsável': a.responsavelNome,
    'Cargo': a.responsavelCargo,
    'E-mail': a.responsavelEmail,
    'WhatsApp / Telefone': a.responsavelTelefone,
    'Unidade / Loja': a.unidadeOuLoja || '',
  }));
  const wsAreas = XLSX.utils.json_to_sheet(areasList);
  XLSX.utils.book_append_sheet(wb, wsAreas, 'Áreas_Cadastradas_Referência');

  // Sheet with list of active contracts
  const contractsList = contracts.map((c) => ({
    'Código do Contrato': c.numero,
    'Título / Objeto': c.titulo,
    'Gestor': c.gestorResponsavel,
    'Área Vinculada': c.areaNome || '',
  }));
  const wsContracts = XLSX.utils.json_to_sheet(contractsList);
  XLSX.utils.book_append_sheet(wb, wsContracts, 'Contratos_Referência');

  XLSX.writeFile(wb, `Modelo_Planilha_Cadastro_Contratos_GPA.xlsx`);
}

/**
 * Parses an uploaded Excel or CSV file into Employee records
 */
export function parseEmployeesFromExcelFile(
  fileData: ArrayBuffer,
  areas: AreaResponsavel[],
  contracts: Contract[]
): { employees: Employee[]; errors: string[] } {
  const wb = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const errors: string[] = [];
  const employees: Employee[] = [];

  const todayStr = new Date().toISOString().split('T')[0];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;

    const nome =
      row['Nome do Colaborador *'] ||
      row['Nome do Colaborador'] ||
      row['Nome'] ||
      row['Colaborador'] ||
      '';

    const matricula =
      row['Matrícula *'] ||
      row['Matricula *'] ||
      row['Matrícula'] ||
      row['Matricula'] ||
      `GPA-${Math.floor(10000 + Math.random() * 90000)}`;

    if (!nome.trim()) {
      return; // Skip empty rows
    }

    const cpf = row['CPF'] || '';
    const cargo = row['Cargo / Função *'] || row['Cargo'] || row['Função'] || 'Operacional';
    const areaInput =
      row['Área / Setor *'] ||
      row['Área / Setor'] ||
      row['Área'] ||
      row['Area'] ||
      row['Setor'] ||
      'Geral';
    const empresa =
      row['Empresa Prestadora *'] ||
      row['Empresa'] ||
      row['Prestadora'] ||
      'GPA Operações';
    const contratoInput =
      row['Contrato (Número ou Título)'] ||
      row['Contrato'] ||
      row['Número do Contrato'] ||
      '';

    // Match Area
    const matchedArea = areas.find(
      (a) =>
        a.nome.toLowerCase().includes(areaInput.toLowerCase()) ||
        areaInput.toLowerCase().includes(a.nome.toLowerCase())
    );

    // Match Contract
    const matchedContract = contracts.find(
      (c) =>
        c.numero.toLowerCase() === contratoInput.toLowerCase() ||
        c.titulo.toLowerCase().includes(contratoInput.toLowerCase())
    );

    const parseDocStatus = (val: string): DocStatus => {
      const v = String(val).toUpperCase().trim();
      if (v.includes('VENC')) return 'VENCIDO';
      if (v.includes('PEND') || v.includes('FALTA')) return 'PENDENTE';
      if (v.includes('N/A') || v.includes('NAO') || v.includes('NÃO')) return 'NAO_APLICAVEL';
      return 'EM_DIA';
    };

    const formatDateVal = (val: any): string | undefined => {
      if (!val) return undefined;
      if (typeof val === 'number') {
        // Excel serial date to YYYY-MM-DD
        const d = new Date((val - 25569) * 86400 * 1000);
        return d.toISOString().split('T')[0];
      }
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [d, m, y] = str.split('/');
        return `${y}-${m}-${d}`;
      }
      return undefined;
    };

    const osStatus = parseDocStatus(
      row['Ordem de Serviço (NR-01) [EM_DIA / PENDENTE / VENCIDO]'] || row['Ordem de Serviço'] || ''
    );
    const osVenc = formatDateVal(
      row['Validade OS (AAAA-MM-DD)'] || row['Validade OS'] || row['Vencimento OS']
    );

    const asoStatus = parseDocStatus(
      row['ASO Ocupacional (NR-07) [EM_DIA / PENDENTE / VENCIDO]'] || row['ASO'] || ''
    );
    const asoVenc = formatDateVal(
      row['Validade ASO (AAAA-MM-DD)'] || row['Validade ASO'] || row['Vencimento ASO']
    );

    const epiStatus = parseDocStatus(
      row['Ficha de EPI (NR-06) [EM_DIA / PENDENTE / VENCIDO]'] || row['Ficha de EPI'] || row['EPI'] || ''
    );
    const epiVenc = formatDateVal(
      row['Validade Ficha EPI (AAAA-MM-DD)'] || row['Validade EPI'] || row['Vencimento EPI']
    );

    const certStatus = parseDocStatus(
      row['Treinamento / Certificação Técnica [EM_DIA / PENDENTE / VENCIDO / N_A]'] ||
        row['Treinamento'] ||
        row['Certificado'] ||
        ''
    );
    const certVenc = formatDateVal(
      row['Validade Certificado (AAAA-MM-DD)'] ||
        row['Validade Treinamento'] ||
        row['Vencimento Certificado']
    );

    const observacoes = row['Observações'] || row['Observacao'] || '';

    const newEmp: Employee = {
      id: `emp-imp-${Date.now()}-${index}`,
      nome: String(nome).trim(),
      matricula: String(matricula).trim(),
      cpf: String(cpf).trim(),
      cargo: String(cargo).trim(),
      setor: matchedArea?.nome || String(areaInput).trim(),
      areaId: matchedArea?.id,
      areaNome: matchedArea?.nome || String(areaInput).trim(),
      areaResponsavelNome: matchedArea?.responsavelNome,
      areaResponsavelEmail: matchedArea?.responsavelEmail,
      areaResponsavelTelefone: matchedArea?.responsavelTelefone,
      empresa: String(empresa).trim(),
      contratoId: matchedContract?.id,
      contratoNome: matchedContract ? `${matchedContract.numero} - ${matchedContract.titulo}` : contratoInput,
      statusGeral: 'EM_DIA',
      indicadorPercentual: 100,
      resumoGeral: observacoes,
      dataCadastro: todayStr,
      dataUltimaLeitura: todayStr,
      pendencias: [
        {
          id: `p-imp-${index}-1`,
          tipo: 'ORDEM_DE_SERVICO',
          nomeDocumento: 'Ordem de Serviço (NR-01)',
          status: osStatus,
          dataVencimento: osVenc,
          obrigatorio: true,
        },
        {
          id: `p-imp-${index}-2`,
          tipo: 'ATESTADO_SAUDE_OCUPACIONAL',
          nomeDocumento: 'ASO Ocupacional (NR-07)',
          status: asoStatus,
          dataVencimento: asoVenc,
          obrigatorio: true,
        },
        {
          id: `p-imp-${index}-3`,
          tipo: 'FICHA_EPI',
          nomeDocumento: 'Ficha de EPI (NR-06)',
          status: epiStatus,
          dataVencimento: epiVenc,
          obrigatorio: true,
        },
        {
          id: `p-imp-${index}-4`,
          tipo: 'TREINAMENTO_RADIOPROTECAO',
          nomeDocumento: 'Certificação Técnica / Treinamento',
          status: certStatus,
          dataVencimento: certVenc,
          obrigatorio: certStatus !== 'NAO_APLICAVEL',
        },
      ],
    };

    employees.push(updateEmployeeCalculatedFields(newEmp));
  });

  return { employees, errors };
}

/**
 * Generates an Excel (.xlsx) file with employees and documents
 */
export function exportEmployeesToExcel(
  employees: Employee[],
  contracts: Contract[],
  areas: AreaResponsavel[]
) {
  const rows = employees.map((emp) => {
    const getDocStatus = (type: string) => {
      const doc = emp.pendencias.find((p) => p.tipo === type);
      if (!doc) return 'NÃO CONSTA';
      if (doc.status === 'NAO_APLICAVEL') return 'N/A';
      return `${doc.status}${doc.dataVencimento ? ` (Venc: ${doc.dataVencimento})` : ''}`;
    };

    return {
      'Nome do Colaborador': emp.nome,
      'Matrícula': emp.matricula,
      'CPF': emp.cpf || '',
      'Cargo / Função': emp.cargo,
      'Área / Setor': emp.areaNome || emp.setor,
      'Responsável da Área': emp.areaResponsavelNome || '',
      'E-mail Responsável': emp.areaResponsavelEmail || '',
      'Telefone Responsável': emp.areaResponsavelTelefone || '',
      'Empresa Prestadora': emp.empresa,
      'Contrato': emp.contratoNome || '',
      'Status Geral': emp.statusGeral,
      'Índice de Conformidade (%)': `${emp.indicadorPercentual}%`,
      'Ordem de Serviço (NR-01)': getDocStatus('ORDEM_DE_SERVICO'),
      'ASO (NR-07)': getDocStatus('ATESTADO_SAUDE_OCUPACIONAL'),
      'Ficha de EPI (NR-06)': getDocStatus('FICHA_EPI'),
      'Treinamento / Certificação': getDocStatus('TREINAMENTO_RADIOPROTECAO'),
      'Resumo de Pendências': emp.resumoGeral || '',
      'Última Atualização': emp.dataUltimaLeitura || emp.dataCadastro,
    };
  });

  const areasRows = areas.map((a) => {
    const metrics = calculateAreaMetrics(a.id, employees);
    return {
      'Área / Setor': a.nome,
      'Gestor Responsável': a.responsavelNome,
      'Cargo': a.responsavelCargo,
      'E-mail': a.responsavelEmail,
      'WhatsApp / Telefone': a.responsavelTelefone,
      'Unidade / Loja': a.unidadeOuLoja || '',
      'Total de Colaboradores': metrics.totalColaboradores,
      '100% Em Dia': metrics.emDia,
      'A Vencer (30 Dias)': metrics.aVencer30Dias,
      'Com Pendências': metrics.comPendencias,
      'Críticos': metrics.criticos,
      'Taxa de Conformidade': `${metrics.taxaConformidade}%`,
    };
  });

  const contractsRows = contracts.map((c) => {
    const metrics = calculateContractMetrics(c.id, employees);
    return {
      'Código do Contrato': c.numero,
      'Título / Objeto': c.titulo,
      'Cliente': c.cliente,
      'Unidade / Local': c.unidade,
      'Área Vinculada': c.areaNome || '',
      'Gestor Responsável': c.gestorResponsavel,
      'E-mail Contato': c.emailContato || '',
      'Telefone': c.telefoneContato || '',
      'Vigência Início': c.vigenciaInicio,
      'Vigência Fim': c.vigenciaFim,
      'Total de Funcionários': metrics.totalColaboradores,
      'Em Dia': metrics.emDia,
      'A Vencer (30 Dias)': metrics.aVencer30Dias,
      'Com Pendências': metrics.comPendencias,
      'Taxa de Conformidade': `${metrics.taxaConformidade}%`,
      'Status de Acesso': metrics.temBloqueio ? 'BLOQUEADO / ALERTA' : 'REGULAR',
    };
  });

  const wb = XLSX.utils.book_new();

  const wsEmployees = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsEmployees, 'Colaboradores_e_Pendencias');

  const wsAreas = XLSX.utils.json_to_sheet(areasRows);
  XLSX.utils.book_append_sheet(wb, wsAreas, 'Areas_e_Responsaveis');

  const wsContracts = XLSX.utils.json_to_sheet(contractsRows);
  XLSX.utils.book_append_sheet(wb, wsContracts, 'Matriz_de_Contratos');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Relatorio_Gestao_Contratos_GPA_${today}.xlsx`);
}

/**
 * Downloads a structured CSV
 */
export function exportEmployeesToCsv(employees: Employee[]) {
  const headers = [
    'Nome',
    'Matricula',
    'CPF',
    'Cargo',
    'AreaSetor',
    'ResponsavelArea',
    'Empresa',
    'Contrato',
    'StatusGeral',
    'IndicadorConformidade',
    'OrdemDeServico',
    'ASO',
    'FichaEPI',
    'CertificacaoTecnica',
  ];

  const escapeCell = (val: string | number = '') => `"${String(val).replace(/"/g, '""')}"`;

  const rows = employees.map((emp) => {
    const getStatus = (tipo: string) => {
      const doc = emp.pendencias.find((p) => p.tipo === tipo);
      return doc ? doc.status : 'N/A';
    };

    return [
      escapeCell(emp.nome),
      escapeCell(emp.matricula),
      escapeCell(emp.cpf),
      escapeCell(emp.cargo),
      escapeCell(emp.areaNome || emp.setor),
      escapeCell(emp.areaResponsavelNome),
      escapeCell(emp.empresa),
      escapeCell(emp.contratoNome),
      escapeCell(emp.statusGeral),
      escapeCell(`${emp.indicadorPercentual}%`),
      escapeCell(getStatus('ORDEM_DE_SERVICO')),
      escapeCell(getStatus('ATESTADO_SAUDE_OCUPACIONAL')),
      escapeCell(getStatus('FICHA_EPI')),
      escapeCell(getStatus('TREINAMENTO_RADIOPROTECAO')),
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `base_dados_contratos_gpa_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
