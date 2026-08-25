import React from 'react';
import { Camera, FileSpreadsheet, Settings, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';
import { WfsLogo } from './WfsLogo';

interface HeaderProps {
  activeTab: 'upload' | 'spreadsheet';
  setActiveTab: (tab: 'upload' | 'spreadsheet') => void;
  recordCount: number;
  isGasConfigured: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  recordCount,
  isGasConfigured,
  onOpenSettings,
}) => {
  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center space-x-3.5">
            {/* WFS Official Typography Logo */}
            <div className="flex items-center cursor-pointer py-1" onClick={() => setActiveTab('upload')}>
              <WfsLogo className="h-9 w-auto" />
            </div>

            <div className="h-7 w-px bg-neutral-300 hidden sm:block"></div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                  Controle de Abastecimento
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                  OCR IA + Drive
                </span>
              </div>
              <p className="text-xs text-neutral-500 hidden sm:block">
                Digitalização de notas de abastecimento e integração direta com Google Drive e Planilhas
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 sm:space-x-2 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
            <button
              id="btn-tab-upload"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-red-700 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Enviar & Digitalizar</span>
            </button>

            <button
              id="btn-tab-spreadsheet"
              onClick={() => setActiveTab('spreadsheet')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'spreadsheet'
                  ? 'bg-white text-red-700 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Planilha</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-xs ${
                  activeTab === 'spreadsheet'
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-neutral-300 text-neutral-700'
                }`}
              >
                {recordCount}
              </span>
            </button>
          </div>

          {/* Google Drive Status & Settings */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isGasConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Configurar URL do Google Apps Script / Drive"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isGasConfigured ? 'Drive Conectado' : 'Configurar Drive'}
              </span>
              {isGasConfigured ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              )}
              <Settings className="w-3.5 h-3.5 ml-1 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
