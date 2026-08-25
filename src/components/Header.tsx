import React from 'react';
import { Camera, FileSpreadsheet, HardDrive, Settings, Zap } from 'lucide-react';
import { WfsLogo } from './WfsLogo';

interface HeaderProps {
  activeTab: 'upload' | 'spreadsheet';
  setActiveTab: (tab: 'upload' | 'spreadsheet') => void;
  recordCount: number;
  onOpenSettings: () => void;
  hasWebhookConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  recordCount,
  onOpenSettings,
  hasWebhookConfigured,
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                  <Zap className="w-3 h-3 text-red-600" />
                  Fluxo Integrado
                </span>
              </div>
              <p className="text-xs text-neutral-500 hidden sm:block">
                Front ➔ Google Drive ➔ Back (IA) ➔ Sheets (Dados_Raizen) ➔ Front
              </p>
            </div>
          </div>

          {/* Actions & Navigation Tabs */}
          <div className="flex items-center space-x-2">
            {/* Direct Settings / Integration Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              title="Configurar Integração com Google Drive e Google Sheets"
              className="p-2 sm:px-3 sm:py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200"
            >
              <HardDrive className={`w-4 h-4 ${hasWebhookConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="hidden md:inline">Drive & Sheets</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  hasWebhookConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              ></span>
            </button>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              <button
                id="btn-tab-upload"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-red-700 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Foto</span>
              </button>

              <button
                id="btn-tab-spreadsheet"
                onClick={() => setActiveTab('spreadsheet')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'spreadsheet'
                    ? 'bg-white text-red-700 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Planilha</span>
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] ${
                    activeTab === 'spreadsheet'
                      ? 'bg-red-600 text-white font-bold'
                      : 'bg-neutral-300 text-neutral-700'
                  }`}
                >
                  {recordCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
