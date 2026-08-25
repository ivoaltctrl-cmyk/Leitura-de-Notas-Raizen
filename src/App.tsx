import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadReceiptTab } from './components/UploadReceiptTab';
import { SpreadsheetTab } from './components/SpreadsheetTab';
import { SettingsTab } from './components/SettingsTab';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { AbastecimentoRecord, GasConfig } from './types';
import { INITIAL_RECORDS } from './data/sampleReceipts';
import { fetchRecordsFromSheet } from './utils/driveService';

const STORAGE_KEY_RECORDS = 'abastecimento_records_v1';
const STORAGE_KEY_CONFIG = 'abastecimento_gas_config_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'spreadsheet' | 'settings'>('upload');

  // O localStorage aqui funciona só como CACHE local, para exibir algo
  // instantaneamente enquanto a sincronização com a planilha não termina.
  // A fonte de verdade real é sempre a planilha Google Sheets (Dados_Raizen).
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

  // Sincroniza com a planilha (fonte única e compartilhada por todos os usuários)
  // assim que o app abre, e depois a cada 30 segundos. Isso garante que todo
  // mundo veja o mesmo controle online, e não apenas o que foi feito naquele aparelho.
  useEffect(() => {
    if (!gasConfig.webhookUrl) return;

    let cancelled = false;

    const syncFromServer = async () => {
      try {
        const result = await fetchRecordsFromSheet(gasConfig.webhookUrl);
        if (!cancelled && result.sucesso && Array.isArray(result.records)) {
          setRecords(result.records);
        }
      } catch (e) {
        console.error('Erro ao sincronizar registros compartilhados:', e);
      }
    };

    syncFromServer();
    const intervalId = setInterval(syncFromServer, 30000); // a cada 30s

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [gasConfig.webhookUrl]);

  // Sync records to localStorage (agora só como cache local, não como fonte)
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

  const handleSetRecords = (newRecords: AbastecimentoRecord[]) => {
    setRecords(newRecords);
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

      {/* Receipt Image Preview Modal */}
      <ReceiptPreviewModal record={previewRecord} onClose={() => setPreviewRecord(null)} />
    </div>
  );
}
