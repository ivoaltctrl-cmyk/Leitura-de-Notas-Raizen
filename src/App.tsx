import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadReceiptTab } from './components/UploadReceiptTab';
import { SpreadsheetTab } from './components/SpreadsheetTab';
import { GasConfigModal } from './components/GasConfigModal';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { AbastecimentoRecord, GasConfig } from './types';
import { INITIAL_RECORDS } from './data/sampleReceipts';

const STORAGE_KEY_RECORDS = 'abastecimento_records_v1';
const STORAGE_KEY_CONFIG = 'abastecimento_gas_config_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'spreadsheet'>('upload');
  const [records, setRecords] = useState<AbastecimentoRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        return JSON.parse(saved);
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
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao ler config do localStorage:', e);
    }
    return {
      webhookUrl: '',
      autoUploadToDrive: true,
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<AbastecimentoRecord | null>(null);

  // Sync records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }, [records]);

  // Sync config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(gasConfig));
    } catch (e) {
      console.error('Erro ao salvar config no localStorage:', e);
    }
  }, [gasConfig]);

  const handleAddRecord = (newRecord: AbastecimentoRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  const handleUpdateRecord = (updated: AbastecimentoRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveConfig = (newConfig: GasConfig) => {
    setGasConfig(newConfig);
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 flex flex-col font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={records.length}
        isGasConfigured={Boolean(gasConfig.webhookUrl && gasConfig.webhookUrl.trim())}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'upload' ? (
          <UploadReceiptTab
            gasConfig={gasConfig}
            onAddRecord={handleAddRecord}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSwitchToSpreadsheet={() => setActiveTab('spreadsheet')}
          />
        ) : (
          <SpreadsheetTab
            records={records}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
            onOpenUploadTab={() => setActiveTab('upload')}
            onPreviewReceipt={(rec) => setPreviewRecord(rec)}
            gasConfig={gasConfig}
          />
        )}
      </main>

      {/* Receipt Image Preview Modal */}
      <ReceiptPreviewModal record={previewRecord} onClose={() => setPreviewRecord(null)} />

      {/* Google Apps Script / Drive Settings Modal */}
      <GasConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={gasConfig}
        onSaveConfig={handleSaveConfig}
      />
    </div>
  );
}
