import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadReceiptTab } from './components/UploadReceiptTab';
import { SpreadsheetTab } from './components/SpreadsheetTab';
import { SettingsTab, DEFAULT_WEBHOOK_URL } from './components/SettingsTab';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { AbastecimentoRecord, GasConfig } from './types';
import { INITIAL_RECORDS } from './data/sampleReceipts';
import { fetchRecordsFromSheet, fetchGlobalConfig, saveGlobalConfig } from './utils/driveService';

const STORAGE_KEY_RECORDS = 'abastecimento_records_v1';
const STORAGE_KEY_CONFIG = 'abastecimento_gas_config_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'spreadsheet' | 'settings'>('upload');

  const [records, setRecords] = useState<AbastecimentoRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const parsed: AbastecimentoRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erro ao ler registros do localStorage:', e);
    }
    return INITIAL_RECORDS;
  });

  // Ajuste no estado inicial do gasConfig:
  const [gasConfig, setGasConfig] = useState<GasConfig>(() => {
    // 1. Prioridade: chave direta salva pelas configurações
    const directUrl = localStorage.getItem('sheets_webhook_url');
    
    // 2. Segunda opção: objeto salvo anteriormente
    let savedObjectUrl = '';
    let autoUpload = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          savedObjectUrl = parsed.webhookUrl || '';
          if (typeof parsed.autoUploadToDrive === 'boolean') {
            autoUpload = parsed.autoUploadToDrive;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao ler config do localStorage:', e);
    }

    // 3. Terceira opção: Variável de ambiente
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL;

    // Resolução da URL com Fallback para a DEFAULT_WEBHOOK_URL
    const resolvedUrl = directUrl || savedObjectUrl || envUrl || DEFAULT_WEBHOOK_URL;

    return {
      webhookUrl: resolvedUrl,
      autoUploadToDrive: autoUpload,
    };
  });

  const [previewRecord, setPreviewRecord] = useState<AbastecimentoRecord | null>(null);

  // Load shared server configuration on startup (ensures all PCs, mobile devices, and incognito sessions share the webhook URL)
  useEffect(() => {
    fetchGlobalConfig().then((serverConfig) => {
      if (serverConfig && serverConfig.webhookUrl) {
        setGasConfig((prev) => ({
          ...prev,
          webhookUrl: serverConfig.webhookUrl || prev.webhookUrl,
          autoUploadToDrive: serverConfig.autoUploadToDrive ?? prev.autoUploadToDrive,
        }));
        try {
          localStorage.setItem('sheets_webhook_url', serverConfig.webhookUrl);
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncFromServer = async () => {
      const urlToUse = gasConfig.webhookUrl || DEFAULT_WEBHOOK_URL;
      if (!urlToUse) return;

      try {
        const result = await fetchRecordsFromSheet(urlToUse);
        if (!cancelled && result.sucesso && Array.isArray(result.records)) {
          setRecords(result.records);
        }
      } catch (e) {
        console.error('Erro ao sincronizar registros compartilhados:', e);
      }
    };

    syncFromServer();
    const intervalId = setInterval(syncFromServer, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [gasConfig.webhookUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }, [records]);

  const handleSaveGasConfig = (newConfig: GasConfig) => {
    setGasConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
      localStorage.setItem('sheets_webhook_url', newConfig.webhookUrl);
    } catch (e) {
      console.error('Erro ao salvar config no localStorage:', e);
    }
    // Save to server so other PCs/browsers get it automatically
    saveGlobalConfig(newConfig);
  };

  const handleAddRecord = (newRecord: AbastecimentoRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  const handleSetRecords = (newRecords: AbastecimentoRecord[]) => {
    setRecords(newRecords);
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 flex flex-col font-sans antialiased selection:bg-red-500 selection:text-white">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={records.length}
      />

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
          />
        )}
      </main>

      <ReceiptPreviewModal record={previewRecord} onClose={() => setPreviewRecord(null)} />
    </div>
  );
}
