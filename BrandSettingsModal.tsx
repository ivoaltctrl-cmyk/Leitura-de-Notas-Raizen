import React, { useState } from 'react';
import { BrandConfig, ThemePaletteId } from '../types/index.ts';
import { THEME_PALETTES, DEFAULT_BRAND_CONFIG } from '../utils/themePresets.ts';
import { WfsLogo } from './WfsLogo.tsx';
import {
  Palette,
  Upload,
  Image as ImageIcon,
  Check,
  RotateCcw,
  X,
  Sparkles,
  Sliders,
  Type,
  Building,
} from 'lucide-react';

interface BrandSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: BrandConfig;
  onSaveBrand: (newBrand: BrandConfig) => void;
}

export const BrandSettingsModal: React.FC<BrandSettingsModalProps> = ({
  isOpen,
  onClose,
  brand,
  onSaveBrand,
}) => {
  const [formData, setFormData] = useState<BrandConfig>({ ...brand });
  const [activeTab, setActiveTab] = useState<'palette' | 'logo' | 'text'>('palette');

  if (!isOpen) return null;

  const handlePaletteSelect = (presetId: ThemePaletteId) => {
    const preset = THEME_PALETTES.find((p) => p.id === presetId);
    if (!preset) return;

    setFormData((prev) => ({
      ...prev,
      paletteId: preset.id,
      primaryColor: preset.primaryColor,
      primaryHoverColor: preset.primaryHoverColor,
      accentColor: preset.accentColor,
      accentTextColor: preset.accentTextColor,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        logoType: 'custom_image',
        customLogoUrl: result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSaveBrand(formData);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar as configurações visuais padrões?')) {
      setFormData({ ...DEFAULT_BRAND_CONFIG });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: formData.primaryColor }}
              className="p-2 rounded-xl text-white shadow-xs"
            >
              <Palette className="w-5 h-5" style={{ color: formData.accentColor }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Identidade Visual & Paleta da Empresa
              </h3>
              <p className="text-xs text-slate-500">
                Personalize as cores corporativas, logotipo e identificação do sistema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Brand Preview Header */}
        <div className="p-4 mx-6 mt-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Prévia em Tempo Real:
            </span>
            <WfsLogo brand={formData} size="md" />
          </div>

          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: formData.primaryColor }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs"
            >
              Botão Principal
            </div>
            <div
              style={{
                backgroundColor: formData.accentColor,
                color: formData.accentTextColor || '#000000',
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs"
            >
              Destaque
            </div>
          </div>
        </div>

        {/* Navigation Tabs inside modal */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('palette')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'palette'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Paleta de Cores ({THEME_PALETTES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logo')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'logo'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Logotipo & Emblema</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Nomes & Textos</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Tab 1: Palettes */}
          {activeTab === 'palette' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Selecione uma Paleta Oficial ou Profissional:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEME_PALETTES.map((preset) => {
                  const isSelected = formData.paletteId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handlePaletteSelect(preset.id)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <span className="p-1 rounded-full bg-slate-900 text-white">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 leading-tight">
                        {preset.description}
                      </p>

                      {/* Color Preview Swatches */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-xs inline-block"
                            style={{ backgroundColor: preset.primaryColor }}
                          />
                          <span>Primária</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 ml-auto">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-xs inline-block"
                            style={{ backgroundColor: preset.accentColor }}
                          />
                          <span>Destaque</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Color Pickers */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Sliders className="w-4 h-4 text-slate-600" />
                  <span>Ajuste Fino de Cores Personalizadas (Hexadecimal / Seletor)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Cor Primária (Cabeçalho / Botões):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paletteId: 'custom',
                            primaryColor: e.target.value,
                            primaryHoverColor: e.target.value,
                          }))
                        }
                        className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paletteId: 'custom',
                            primaryColor: e.target.value,
                            primaryHoverColor: e.target.value,
                          }))
                        }
                        className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Cor de Acento / Destaque:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.accentColor}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paletteId: 'custom',
                            accentColor: e.target.value,
                          }))
                        }
                        className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={formData.accentColor}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paletteId: 'custom',
                            accentColor: e.target.value,
                          }))
                        }
                        className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Logo Configuration */}
          {activeTab === 'logo' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Formato do Logotipo da Empresa:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, logoType: 'custom_image' }))}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    formData.logoType === 'custom_image'
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">Upload Imagem</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Envie seu arquivo de logo (PNG, JPG, SVG)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, logoType: 'styled_wfs' }))}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    formData.logoType === 'styled_wfs'
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900">Escudo / Geométrico</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Símbolo de proteção SST com as cores da marca
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, logoType: 'initials_badge' }))}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    formData.logoType === 'initials_badge'
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">Iniciais (Monograma)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Badge quadrado moderno com a sigla da empresa
                  </span>
                </button>
              </div>

              {/* Upload section if custom image is selected */}
              {formData.logoType === 'custom_image' && (
                <div className="p-5 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-3">
                  {formData.customLogoUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-32 h-16 p-2 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-center">
                        <img
                          src={formData.customLogoUrl}
                          alt="Logo preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer shadow-xs">
                          <span>Substituir Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, customLogoUrl: undefined }))
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-200/70 flex items-center justify-center text-slate-600">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Clique para enviar a imagem do seu logotipo
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Formatos suportados: PNG, JPG, SVG ou WebP com fundo transparente
                        </p>
                      </div>
                      <label className="inline-block mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs">
                        <span>Escolher Arquivo no Computador</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Text & Naming */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome / Razão da Empresa ou Sigla:
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, companyName: e.target.value }))
                  }
                  placeholder="Ex: WFS ou WFS Serviços"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Etiqueta de Destaque / Especialidade (Badge):
                </label>
                <input
                  type="text"
                  value={formData.badgeText}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, badgeText: e.target.value }))
                  }
                  placeholder="Ex: SST & Compliance, Segurança do Trabalho, NRs"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtítulo / Descrição de Rodapé do Header:
                </label>
                <input
                  type="text"
                  value={formData.companySubtitle}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, companySubtitle: e.target.value }))
                  }
                  placeholder="Ex: Gestão de Pendências, Prontuários & Contratos"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              style={{ backgroundColor: formData.primaryColor }}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" style={{ color: formData.accentColor }} />
              <span>Salvar e Aplicar Tema</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
