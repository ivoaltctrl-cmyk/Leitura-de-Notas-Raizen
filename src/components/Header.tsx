import React from 'react';
import { Camera, FileSpreadsheet, Lock } from 'lucide-react';
import { WfsLogo } from './WfsLogo';

interface HeaderProps {
  activeTab: 'upload' | 'spreadsheet' | 'settings';
  setActiveTab: (tab: 'upload' | 'spreadsheet' | 'settings') => void;
  recordCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  recordCount,
}) => {
  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center space-x-3.5">
            <div className="flex items-center cursor-pointer py-1" onClick={() => setActiveTab('upload')}>
              <WfsLogo className="h-9 w-auto" />
            </div>

            <div className="h-7 w-px bg-neutral-300 hidden sm:block"></div>

            <div>
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                Controle de Abastecimento
              </h1>
              <p className="text-xs text-neutral-500 hidden sm:block font-medium">
                WFS Ground Support • Operação Raízen
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
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
              <span>Captura de Nota</span>
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

            <button
              id="btn-tab-settings"
              onClick={() => setActiveTab('settings')}
              title="Configurações Administrativas"
              className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Configurações</span>
              <span className="sm:hidden">ADM</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
