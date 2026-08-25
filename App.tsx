import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadReceiptTab } from './components/UploadReceiptTab';
import { SpreadsheetTab } from './components/SpreadsheetTab';
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

  const [gasConfig] = useState<GasConfig>(() => {
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

  const handleAddRecord = (newRecord: AbastecimentoRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  const handleUpdateRecord = (updated: AbastecimentoRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 flex flex-col font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={records.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'upload' ? (
          <UploadReceiptTab
            gasConfig={gasConfig}
            onAddRecord={handleAddRecord}
            onSwitchToSpreadsheet={() => setActiveTab('spreadsheet')}
            recentRecords={records}
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
    </div>
  );
}
