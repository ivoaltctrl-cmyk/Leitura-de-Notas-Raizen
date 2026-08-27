import { BrandConfig, ThemePaletteId } from '../types/index.ts';

export interface PalettePreset {
  id: ThemePaletteId;
  name: string;
  category: string;
  description: string;
  primaryColor: string;
  primaryHoverColor: string;
  accentColor: string;
  accentTextColor: string;
  previewBg: string;
}

export const THEME_PALETTES: PalettePreset[] = [
  {
    id: 'wfs-red',
    name: 'Vermelho Oficial WFS (A SATS Company)',
    category: 'Identidade Corporativa WFS',
    description: 'Padrão global WFS com vermelho dinâmico (#E21B23), tipografia corporativa e alta visibilidade operacional.',
    primaryColor: '#E21B23', // Vermelho WFS Oficial
    primaryHoverColor: '#B81219',
    accentColor: '#1E293B', // Slate Escuro / Navy
    accentTextColor: '#ffffff',
    previewBg: 'from-[#E21B23] to-[#1E293B]',
  },
  {
    id: 'gpa-corporate',
    name: 'Verde Oficial GPA & Dourado',
    category: 'Identidade Corporativa GPA',
    description: 'Paleta padrão do GPA (Grupo Pão de Açúcar) com verde corporativo e detalhes em ouro.',
    primaryColor: '#006837', // Verde GPA
    primaryHoverColor: '#004d28',
    accentColor: '#f59e0b', // Âmbar Dourado
    accentTextColor: '#0f172a',
    previewBg: 'from-[#006837] to-[#f59e0b]',
  },
  {
    id: 'industrial-amber',
    name: 'Grafite Escuro & Âmbar Industrial',
    category: 'Indústria & Contratos',
    description: 'Tons neutros de grafite executivo com destaque âmbar dourado de alta legibilidade.',
    primaryColor: '#1e293b', // slate-800
    primaryHoverColor: '#0f172a', // slate-900
    accentColor: '#f59e0b', // amber-500
    accentTextColor: '#0f172a',
    previewBg: 'from-slate-800 to-amber-500',
  },
  {
    id: 'safety-orange',
    name: 'Carvão & Laranja Segurança SST',
    category: 'Segurança do Trabalho (NRs)',
    description: 'Preto carvão com laranja sinalizador padrão normas de segurança e fiscalização.',
    primaryColor: '#18181b', // zinc-900
    primaryHoverColor: '#09090b', // zinc-950
    accentColor: '#ea580c', // orange-600
    accentTextColor: '#ffffff',
    previewBg: 'from-zinc-900 to-orange-600',
  },
  {
    id: 'hse-emerald',
    name: 'Verde Esmeralda HSE & Floresta',
    category: 'Saúde & Meio Ambiente',
    description: 'Combinação clássica de conformidade, saúde ocupacional e sustentabilidade.',
    primaryColor: '#064e3b', // emerald-900
    primaryHoverColor: '#022c22', // emerald-950
    accentColor: '#10b981', // emerald-500
    accentTextColor: '#ffffff',
    previewBg: 'from-emerald-900 to-emerald-500',
  },
  {
    id: 'corporate-red',
    name: 'Bordô & Vermelho Corporativo',
    category: 'Corporativo & Auditoria',
    description: 'Elegante tom bordô escuro com acentos em carmim para inspeções rigorosas.',
    primaryColor: '#881337', // rose-900
    primaryHoverColor: '#4c0519', // rose-950
    accentColor: '#e11d48', // rose-600
    accentTextColor: '#ffffff',
    previewBg: 'from-rose-900 to-rose-600',
  },
  {
    id: 'neutral-graphite',
    name: 'Neutro Minimalista (Preto & Branco)',
    category: 'Minimalista & Técnico',
    description: 'Design sóbrio e técnico em tons de preto, grafite e cinza suave.',
    primaryColor: '#09090b', // zinc-950
    primaryHoverColor: '#18181b', // zinc-900
    accentColor: '#52525b', // zinc-600
    accentTextColor: '#ffffff',
    previewBg: 'from-zinc-950 to-zinc-600',
  },
];

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  companyName: 'WFS',
  companySubtitle: 'A SATS COMPANY',
  badgeText: 'SST & CONFORMIDADE OPERACIONAL',
  logoType: 'styled_wfs',
  paletteId: 'wfs-red',
  primaryColor: '#E21B23', // Vermelho Oficial WFS
  primaryHoverColor: '#B81219',
  accentColor: '#1E293B',
  accentTextColor: '#ffffff',
};

/**
 * Injects CSS variables onto document root so styles can reference var(--brand-primary), etc.
 */
export function applyBrandThemeToCss(brand: BrandConfig) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', brand.primaryColor);
  root.style.setProperty('--brand-primary-hover', brand.primaryHoverColor);
  root.style.setProperty('--brand-accent', brand.accentColor);
  root.style.setProperty('--brand-accent-text', brand.accentTextColor);
}
