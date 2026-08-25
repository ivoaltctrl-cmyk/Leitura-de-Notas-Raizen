import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadReceiptTab } from './components/UploadReceiptTab';
import { SpreadsheetTab } from './components/SpreadsheetTab';
import { SettingsTab } from './components/SettingsTab';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { AbastecimentoRecord, GasConfig } from './types';
import { INITIAL_RECORDS } from './data/sampleReceipts';

const STORAGE_KEY_RECORDS = 'abastecimento_records_v1';
const STORAGE_KEY_CONFIG = 'abastecimento_gas_config_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'spreadsheet' | 'settings'>('upload');

  // Load records from localStorage, automatically purging any legacy mock demo records (e.g. rec-1, rec-2)
  const [records, setRecords] = useState<AbastecimentoRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const parsed: AbastecimentoRecord[] = JSON.parse(saved);
        // Retain only real user-created records, filter out mock records
        const realRecords = parsed.filter(
          (r) => r.id && !r.id.startsWith('rec-')
        );
        return realRecords;
      }
    } catch (e) {
      console.error('Erro ao ler registros do localStorage:', e);
    }
    return INITIAL_RECORDS;
  });

  const [gasConfig, setGasConfig] = useState<GasConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.webhookUrl) return parsed;
      }
    } catch (e) {
      console.error('Erro ao ler config do localStorage:', e);
    }
    return {
      webhookUrl: (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL || '',
      autoUploadToDrive: true,
    };
  });

  const [previewRecord, setPreviewRecord] = useState<AbastecimentoRecord | null>(null);

  // Sync records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }, [records]);

  // Sync gasConfig to localStorage
  const handleSaveGasConfig = (newConfig: GasConfig) => {
    setGasConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    } catch (e) {
      console.error('Erro ao salvar config no localStorage:', e);
    }
  };

  const handleAddRecord = (newRecord: AbastecimentoRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  const handleUpdateRecord = (updated: AbastecimentoRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAllRecords = () => {
    if (window.confirm('Tem certeza de que deseja limpar todos os registros salvos localmente?')) {
      setRecords([]);
      try {
        localStorage.removeItem(STORAGE_KEY_RECORDS);
      } catch (e) {
        console.error('Erro ao limpar localStorage:', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 flex flex-col font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={records.length}
      />

      {/* Main Container - Full-width optimized to eliminate horizontal scrollbar on desktops */}
      <main className="flex-1 w-full max-w-[1750px] mx-auto px-2.5 sm:px-4 lg:px-6 py-4">
        {activeTab === 'upload' && (
          <UploadReceiptTab
            gasConfig={gasConfig}
            onAddRecord={handleAddRecord}
            onSwitchToSpreadsheet={() => setActiveTab('spreadsheet')}
            recentRecords={records}
          />
        )}

        {activeTab === 'spreadsheet' && (
          <SpreadsheetTab
            records={records}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
            onClearAllRecords={handleClearAllRecords}
            onOpenUploadTab={() => setActiveTab('upload')}
            onPreviewReceipt={(rec) => setPreviewRecord(rec)}
            gasConfig={gasConfig}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            gasConfig={gasConfig}
            onSaveConfig={handleSaveGasConfig}
          />
        )}
      </main>

      {/* Receipt Image Preview Modal */}
      <ReceiptPreviewModal record={previewRecord} onClose={() => setPreviewRecord(null)} />
    </div>
  );
}
