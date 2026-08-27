/**
 * Generates realistic synthetic screenshots mimicking corporate legacy HR/SST systems
 * to allow immediate 1-click testing of the Gemini Multimodal OCR parser.
 */

export interface SampleProfile {
  nome: string;
  matricula: string;
  cpf: string;
  cargo: string;
  setor: string;
  empresa: string;
  contrato: string;
  indicador: number;
  status: string;
  osStatus: string;
  osData: string;
  asoStatus: string;
  asoData: string;
  epiStatus: string;
  epiData: string;
  radioStatus: string;
  radioData: string;
  obs: string;
}

export const SAMPLE_TEMPLATES: SampleProfile[] = [
  {
    nome: 'PAULO HENRIQUE GUIMARAES COSTA',
    matricula: 'ENG-48910',
    cpf: '329.418.905-22',
    cargo: 'Operador de Radiografia Industrial Nível II',
    setor: 'Ensaios Não Destrutivos - Planta Petroquímica',
    empresa: 'GamaTech Radiologia e Inspeções Ltda.',
    contrato: 'CTR-2026/04 - Petrobras REDUC',
    indicador: 50,
    status: 'BLOQUEADO / PENDENTE',
    osStatus: 'CONFORME (EM DIA)',
    osData: 'Emissão: 15/01/2026 | Validade: 15/01/2027',
    asoStatus: 'CONFORME (EM DIA)',
    asoData: 'Emissão: 10/03/2026 | Validade: 10/03/2027',
    epiStatus: 'PENDENTE (SEM ASSINATURA DOSÍMETRO)',
    epiData: 'Última ficha: 12/01/2025 (Expirada)',
    radioStatus: 'VENCIDO (RECICLAGEM CNEN OBRIGATÓRIA)',
    radioData: 'Emitido: 10/08/2024 | Venceu: 10/08/2026',
    obs: 'Colaborador com restrição de acesso na portaria principal até regularizar Treinamento de Radioproteção e Ficha de EPI.',
  },
  {
    nome: 'ANA BEATRIZ VASCONCELOS',
    matricula: 'BIO-19203',
    cpf: '711.238.441-90',
    cargo: 'Técnica de Tomografia e Medicina Nuclear',
    setor: 'Diagnóstico por Imagem - Sala de Ressonância e Raio-X',
    empresa: 'ServHospitalar Engenharia e Medicina',
    contrato: 'CTR-2026/09 - Hospital Santa Luzia',
    indicador: 75,
    status: 'PENDENTE',
    osStatus: 'PENDENTE DE ASSINATURA',
    osData: 'Aguardando validação do SESMT',
    asoStatus: 'CONFORME (EM DIA)',
    asoData: 'Emissão: 22/04/2026 | Validade: 22/04/2027',
    epiStatus: 'CONFORME (EM DIA)',
    epiData: 'Ficha atualizada com avental plumbífero 0.5mm',
    radioStatus: 'CONFORME (EM DIA)',
    radioData: 'Emitido: 15/05/2025 | Validade: 15/05/2027',
    obs: 'Necessário colher assinatura na nova Ordem de Serviço NR-01.',
  },
  {
    nome: 'VALTER DOS SANTOS BARBOSA',
    matricula: 'CALD-88219',
    cpf: '190.443.829-05',
    cargo: 'Caldeireiro e Montador Industrial',
    setor: 'Manutenção de Tubulações e Fornos',
    empresa: 'ValleMontagens Siderúrgicas Ltda.',
    contrato: 'CTR-2026/15 - Siderúrgica Vale do Aço',
    indicador: 25,
    status: 'CRÍTICO / BLOQUEIO PORTARIA',
    osStatus: 'PENDENTE (AUSENTE)',
    osData: 'Documento não enviado',
    asoStatus: 'VENCIDO (EXPIRADO EM 14/06/2026)',
    asoData: 'Exames complementares vencidos',
    epiStatus: 'PENDENTE (SEM FICHA NO SISTEMA)',
    epiData: 'Não consta registro de entrega',
    radioStatus: 'NÃO APLICÁVEL',
    radioData: 'Função sem exposição radiológica',
    obs: 'URGENTE: Colaborador barrado no turno da manhã. Necessário ASO periódico e Ficha de EPI.',
  },
];

export function generateSampleScreenshotBase64(profileIndex: number = 0): string {
  const profile = SAMPLE_TEMPLATES[profileIndex % SAMPLE_TEMPLATES.length];

  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#0f172a'; // dark navy background
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top header bar (mimicking portal header)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, 60);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('SISTEMA INTEGRADO DE GESTÃO DE SST & CONFORMIDADE DE TERCEIROS', 24, 38);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.fillText('PORTAL DO PRESTADOR | FICHA CADASTRAL E PENDÊNCIAS DOCUMENTAIS', 24, 52);

  // Status Indicator Box in Header
  ctx.fillStyle = profile.indicador >= 80 ? '#14532d' : profile.indicador >= 50 ? '#713f12' : '#7f1d1d';
  ctx.fillRect(860, 12, 215, 36);
  ctx.strokeStyle = profile.indicador >= 80 ? '#22c55e' : profile.indicador >= 50 ? '#eab308' : '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(860, 12, 215, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`INDICADOR: ${profile.indicador}% CONFORME`, 875, 35);

  // Card: Employee Header Info
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(24, 80, 1052, 140, 8);
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`COLABORADOR: ${profile.nome}`, 40, 115);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '14px sans-serif';
  ctx.fillText(`MATRÍCULA: ${profile.matricula}`, 40, 145);
  ctx.fillText(`CPF: ${profile.cpf}`, 260, 145);
  ctx.fillText(`CARGO: ${profile.cargo}`, 480, 145);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`EMPRESA: ${profile.empresa}`, 40, 175);
  ctx.fillText(`SETOR: ${profile.setor}`, 480, 175);

  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`CONTRATO VINCULADO: ${profile.contrato}`, 40, 205);

  ctx.fillStyle = profile.status.includes('CONFORME') ? '#22c55e' : '#f87171';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`STATUS GERAL NO SISTEMA: ${profile.status}`, 650, 205);

  // Title for Checklist
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('QUADRO DE PENDÊNCIAS E OBRIGAÇÕES LEGAIS DE SST', 24, 248);

  // Document 1: Ordem de Serviço (NR-01)
  drawDocBox(ctx, 24, 260, 1052, 75, '1. ORDEM DE SERVIÇO DE SST (NR-01)', profile.osStatus, profile.osData, '#38bdf8');

  // Document 2: ASO (NR-07)
  drawDocBox(ctx, 24, 345, 1052, 75, '2. ATESTADO DE SAÚDE OCUPACIONAL - ASO (NR-07)', profile.asoStatus, profile.asoData, '#a855f7');

  // Document 3: Ficha de EPI (NR-06)
  drawDocBox(ctx, 24, 430, 1052, 75, '3. FICHA DE DISTRIBUIÇÃO E CONTROLE DE EPI (NR-06)', profile.epiStatus, profile.epiData, '#ec4899');

  // Document 4: Certificado de Radioproteção
  drawDocBox(ctx, 24, 515, 1052, 75, '4. CERTIFICADO DE TREINAMENTO DE RADIOPROTEÇÃO (CNEN / NR-32)', profile.radioStatus, profile.radioData, '#f59e0b');

  // Bottom Notice / Observações
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(24, 605, 1052, 90, 8);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('OBSERVAÇÕES E NOTIFICAÇÕES DO SISTEMA:', 40, 630);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '13px sans-serif';
  ctx.fillText(profile.obs, 40, 655);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('Data de Extração: 21/08/2026 15:40:12 | ID do Registro: #8920194 | Sistema Host: SST-Corp Web v4.2', 40, 680);

  return canvas.toDataURL('image/png');
}

function drawDocBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  statusText: string,
  details: string,
  accentColor: string
) {
  const isOk = statusText.includes('CONFORME') || statusText.includes('EM DIA');
  const isVencido = statusText.includes('VENCIDO') || statusText.includes('EXPIRADO');
  const isPendente = statusText.includes('PENDENTE') || statusText.includes('SEM');
  const isNA = statusText.includes('NÃO APLICÁVEL');

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  // Left accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y, 6, h);

  // Title
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(title, x + 20, y + 28);

  // Details
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.fillText(details, x + 20, y + 54);

  // Status Badge
  const badgeWidth = 260;
  const badgeX = x + w - badgeWidth - 20;
  const badgeY = y + 18;

  let badgeBg = '#334155';
  let badgeBorder = '#64748b';
  let badgeTextColor = '#f8fafc';

  if (isOk) {
    badgeBg = '#14532d';
    badgeBorder = '#22c55e';
    badgeTextColor = '#86efac';
  } else if (isVencido) {
    badgeBg = '#7f1d1d';
    badgeBorder = '#ef4444';
    badgeTextColor = '#fca5a5';
  } else if (isPendente) {
    badgeBg = '#713f12';
    badgeBorder = '#eab308';
    badgeTextColor = '#fde047';
  } else if (isNA) {
    badgeBg = '#1e293b';
    badgeBorder = '#475569';
    badgeTextColor = '#94a3b8';
  }

  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, 38, 4);
  ctx.fill();
  ctx.strokeStyle = badgeBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = badgeTextColor;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(statusText, badgeX + badgeWidth / 2, badgeY + 24);
  ctx.textAlign = 'left';
}
