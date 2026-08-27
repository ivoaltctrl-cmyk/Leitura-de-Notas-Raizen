export interface TrabalhistaEnvio {
  id: string;
  mes: string; // "01" a "12"
  mesNome?: string; // "Janeiro", "Fevereiro", ...
  ano: number; // 2026, 2025...
  dataEnvio: string; // "27/07/2026 12:14:48"
  status: 'Validado' | 'Reprovado' | 'Em Análise';
  contratoId?: string;
  contratoNome?: string;
  empresa?: string;
  motivoReprovacao?: string;
  documentosAnexados?: string[];
  observacoes?: string;
  usuarioEnvio?: string;
  validadoPor?: string;
  dataValidacao?: string;
}

export interface TrabalhistaMesConsolidado {
  mes: string;
  mesNome: string;
  ano: number;
  totalEnvios: number;
  totalValidados: number;
  totalReprovados: number;
  isValidado: boolean;
  statusConsolidado: 'VALIDADO' | 'REPROVADO' | 'PENDENTE';
  ultimoEnvio?: TrabalhistaEnvio;
}

export type ThemePaletteId =
  | 'wfs-red'
  | 'gpa-corporate'
  | 'industrial-amber'
  | 'safety-orange'
  | 'hse-emerald'
  | 'corporate-red'
  | 'neutral-graphite'
  | 'custom';

export interface BrandConfig {
  companyName: string;
  companySubtitle: string;
  badgeText: string;
  logoType: 'styled_wfs' | 'custom_image' | 'styled_gpa' | 'initials_badge' | 'text_only';
  customLogoUrl?: string;
  paletteId: ThemePaletteId;
  primaryColor: string;
  primaryHoverColor: string;
  accentColor: string;
  accentTextColor: string;
}

export type DocCategory = 'SST' | 'TRABALHISTA' | 'DEMAIS';

export type DocType =
  | 'ORDEM_DE_SERVICO'
  | 'ATESTADO_SAUDE_OCUPACIONAL'
  | 'FICHA_EPI'
  | 'TREINAMENTO_RADIOPROTECAO'
  | 'TREINAMENTO_NR'
  | 'PGR_PCMSO'
  | 'REGISTRO_CTPS'
  | 'FOLHA_PAGAMENTO'
  | 'FGTS_GFIP'
  | 'CNDT'
  | 'CONTRATO_TRABALHO'
  | 'SEGURO_VIDA'
  | 'CERTIDOES'
  | 'CARTAO_CNPJ'
  | 'OUTRO';

export type DocStatus =
  | 'EM_DIA'
  | 'A_VENCER'
  | 'PENDENTE'
  | 'VENCIDO'
  | 'EM_ANALISE'
  | 'NAO_APLICAVEL';

export type EmployeeStatus = 'EM_DIA' | 'PENDENTE' | 'CRITICO' | 'BLOQUEADO';

export interface PendingDoc {
  id: string;
  tipo: DocType;
  nomeDocumento: string;
  categoria?: DocCategory;
  status: DocStatus;
  dataEmissao?: string;
  dataVencimento?: string;
  diasRestantes?: number;
  observacoes?: string;
  obrigatorio: boolean;
  ultimaAtualizacao?: string;
}

export interface AreaResponsavel {
  id: string;
  nome: string; // ex: "Logística & CD", "Manutenção & Obras", "Operações de Loja", "Segurança & Prevenção", "Facilities & TI"
  responsavelNome: string;
  responsavelCargo: string;
  responsavelEmail: string;
  responsavelTelefone: string;
  unidadeOuLoja?: string;
  observacoes?: string;
  totalColaboradores?: number;
  totalPendencias?: number;
  taxaConformidade?: number;
}

export interface Employee {
  id: string;
  nome: string;
  matricula: string;
  cpf?: string;
  cargo: string;
  setor: string; // Ex: Logística, Manutenção, etc.
  areaId?: string;
  areaNome?: string;
  areaResponsavelNome?: string;
  areaResponsavelEmail?: string;
  areaResponsavelTelefone?: string;
  empresa: string;
  contratoId?: string;
  contratoNome?: string;
  statusGeral: EmployeeStatus;
  indicadorPercentual: number; // 0 to 100
  resumoGeral?: string;
  pendencias: PendingDoc[];
  dataCadastro: string;
  dataUltimaLeitura: string;
  imagemOrigemUrl?: string;
}

export interface ContractDocumentItem {
  id: string;
  nome: string;
  tipo: string;
  status: 'Validado' | 'Reprovado' | 'Em Análise';
  motivoReprovacao?: string;
  dataUpload?: string;
  obrigatorio?: boolean;
}

export interface Contract {
  id: string;
  numero: string;
  titulo: string;
  cliente: string;
  unidade: string;
  gestorResponsavel: string;
  emailContato?: string;
  telefoneContato?: string;
  areaId?: string;
  areaNome?: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  status: 'ATIVO' | 'ALERTA' | 'BLOQUEADO' | 'ENCERRADO';
  limiteBloqueioConformidade: number; // e.g. 80%
  observacoes?: string;
  // Campos detalhados para controle de contratos e auditoria
  cnpjPrestador?: string;
  empresaPrestador?: string;
  objeto?: string;
  categoria?: string;
  dataInicio?: string; // Formato DD/MM/AAAA
  dataTermino?: string; // Formato DD/MM/AAAA
  statusVigencia?: 'Vigente' | 'Vencido';
  statusDocumentos?: 'Validado' | 'Em Análise' | 'Reprovado';
  documentosContrato?: ContractDocumentItem[];
}

export interface DemandLog {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  areaId?: string;
  areaNome?: string;
  responsavelArea?: string;
  contratoId?: string;
  contratoNome?: string;
  canal: 'whatsapp' | 'email' | 'chamado';
  destinatario: string;
  dataEnvio: string;
  prazoResolucao: string;
  status: 'ENVIADO' | 'EM_ANDAMENTO' | 'REGULARIZADO' | 'VENCIDO';
  pendenciasCobradas: string[];
  mensagemTexto: string;
  assunto?: string;
}

export interface SystemStats {
  totalFuncionarios: number;
  totalEmDia: number;
  totalComPendencia: number;
  totalAVencer30Dias: number;
  totalCriticos: number;
  totalBloqueados: number;
  taxaConformidadeGeral: number;
  // Stats by core SST document
  ordemServico: {
    total: number;
    emDia: number;
    aVencer: number;
    pendente: number;
    vencido: number;
    taxa: number;
  };
  aso: {
    total: number;
    emDia: number;
    aVencer: number;
    pendente: number;
    vencido: number;
    taxa: number;
  };
  fichaEpi: {
    total: number;
    emDia: number;
    aVencer: number;
    pendente: number;
    vencido: number;
    taxa: number;
  };
  radioprotecao: {
    total: number;
    emDia: number;
    aVencer: number;
    pendente: number;
    vencido: number;
    taxa: number;
  };
}
