import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UploadReceiptTab } from './components/UploadReceiptTab';
import { SpreadsheetTab } from './components/SpreadsheetTab';
import { SettingsTab } from './components/SettingsTab';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { AbastecimentoRecord, GasConfig } from './types';
import { INITIAL_RECORDS } from './data/sampleReceipts';
import { fetchGlobalConfig, saveGlobalConfig, fetchRecordsFromSheet, clearServerRecords } from './utils/driveService';

const STORAGE_KEY_RECORDS = 'abastecimento_records_v1';
const STORAGE_KEY_CONFIG = 'abastecimento_gas_config_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'spreadsheet' | 'settings'>('upload');
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);

  // Local state initialized with fallback from localStorage
  const [records, setRecords] = useState<AbastecimentoRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const parsed: AbastecimentoRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
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
        if (parsed && typeof parsed === 'object') return parsed;
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

  // Sync records to localStorage as backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }, [records]);

  // Master synchronization function across all computers
  const syncWithServerAndSheets = useCallback(async (forcedWebhookUrl?: string) => {
    const activeUrl = forcedWebhookUrl || gasConfig.webhookUrl;

    // 1. Fetch shared global config from backend server
    const serverConfig = await fetchGlobalConfig();
    if (serverConfig && serverConfig.webhookUrl) {
      setGasConfig(serverConfig);
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(serverConfig));
      } catch (e) {}
    }

    const effectiveUrl = serverConfig?.webhookUrl || activeUrl;

    // 2. Fetch live data from Google Sheets / central server
    try {
      const result = await fetchRecordsFromSheet(effectiveUrl);
      if (result.sucesso && Array.isArray(result.records) && result.records.length > 0) {
        setRecords(result.records);
      }
    } catch (err) {
      console.warn('Erro na sincronização em background:', err);
    } finally {
      setIsInitialSyncDone(true);
    }
  }, [gasConfig.webhookUrl]);

  // Initial load sync
  useEffect(() => {
    syncWithServerAndSheets();
  }, []);

  // Periodic multi-device synchronization (every 25 seconds or on window focus)
  useEffect(() => {
    const handleFocus = () => {
      syncWithServerAndSheets();
    };

    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      // Background sync to ensure all PCs see new receipts
      syncWithServerAndSheets();
    }, 25000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [syncWithServerAndSheets]);

  // Sync gasConfig to server & localStorage
  const handleSaveGasConfig = async (newConfig: GasConfig) => {
    setGasConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    } catch (e) {
      console.error('Erro ao salvar config no localStorage:', e);
    }

    // Persist on central server so all other computers get this webhookUrl
    await saveGlobalConfig(newConfig);

    // Immediately trigger a sync with Google Sheets
    if (newConfig.webhookUrl) {
      await syncWithServerAndSheets(newConfig.webhookUrl);
    }
  };

  const handleAddRecord = (newRecord: AbastecimentoRecord) => {
    setRecords((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
  };

  const handleSetRecords = (newRecords: AbastecimentoRecord[]) => {
    setRecords(newRecords);
  };

  const handleClearAllRecords = async () => {
    setRecords([]);
    try {
      localStorage.removeItem(STORAGE_KEY_RECORDS);
    } catch (e) {
      console.error('Erro ao limpar localStorage:', e);
    }
    await clearServerRecords();
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 flex flex-col font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={records.length}
      />

      {/* Main Container - Full-width optimized without horizontal scrollbar */}
      <main className="flex-1 w-full max-w-[1750px] mx-auto px-2.5 sm:px-4 lg:px-6 py-4">
        {activeTab === 'upload' && (
          <UploadReceiptTab
            gasConfig={gasConfig}
            onAddRecord={handleAddRecord}
            onSwitchToSpreadsheet={() => {
              setActiveTab('spreadsheet');
              syncWithServerAndSheets();
            }}
            recentRecords={records}
          />
        )}

        {activeTab === 'spreadsheet' && (
          <SpreadsheetTab
            records={records}
            onSetRecords={handleSetRecords}
            onOpenUploadTab={() => setActiveTab('upload')}
            onPreviewReceipt={(rec) => setPreviewRecord(rec)}
            gasConfig={gasConfig}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            gasConfig={gasConfig}
            onSaveConfig={handleSaveGasConfig}
            onClearAllRecords={handleClearAllRecords}
            recordsCount={records.length}
          />
        )}
      </main>

      {/* Receipt Image Preview Modal */}
      <ReceiptPreviewModal record={previewRecord} onClose={() => setPreviewRecord(null)} />
    </div>
  );
}
