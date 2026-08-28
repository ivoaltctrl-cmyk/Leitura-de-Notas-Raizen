import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Download,
  FileSpreadsheet,
  HardDrive,
  Eye,
  Camera,
  RefreshCw,
  Copy,
  Check,
  Printer,
  Table as TableIcon,
  Fuel,
  Layers,
  ExternalLink,
  Clock,
  Calendar,
  AlertCircle,
  Zap,
  DollarSign,
  X,
  Bot,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { AbastecimentoRecord, GasConfig } from '../types';
import { exportToExcelXLSX, exportToCSV, copyTableAsTSV } from '../utils/exportUtils';
import { fetchRecordsFromSheet, triggerGasProcessing } from '../utils/driveService';
import { 
  parseVolumeFloat, 
  parseCurrencyFloat, 
  formatCurrencyBRL, 
  formatVolumeL, 
  isRecordInDateRange, 
  formatDateToBR, 
  formatDateToInput 
} from '../utils/dateUtils';
import { FuelPriceModal } from './FuelPriceModal';

interface SpreadsheetTabProps {
  records: AbastecimentoRecord[];
  onSetRecords: (records: AbastecimentoRecord[]) => void;
  onOpenUploadTab: () => void;
  onPreviewReceipt: (record: AbastecimentoRecord) => void;
  gasConfig: GasConfig;
}

export const SpreadsheetTab: React.FC<SpreadsheetTabProps> = ({
  records,
  onSetRecords,
  onOpenUploadTab,
  onPreviewReceipt,
  gasConfig,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('TODOS');
  const [selectedPayment, setSelectedPayment] = useState<string>('TODOS');
  
  // Date Range Filters (YYYY-MM-DD for date inputs)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fuel Price Launch Modal state
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessingRobot, setIsProcessingRobot] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  // Cooldown timer interval for anti-spam protection
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Available unique products and payment methods for filters
  const uniqueProducts = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.produto) set.add(r.produto.trim().toUpperCase());
    });
    return Array.from(set);
  }, [records]);

  const uniquePayments = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.formaPagamento) set.add(r.formaPagamento.trim().toUpperCase());
    });
    return Array.from(set);
  }, [records]);

  // Filter records based on search, product, payment, and date range
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Date Range Filter
      if (startDate || endDate) {
        const inDate = isRecordInDateRange(r.dataAbastecimento || (r.dataCriacao ? new Date(r.dataCriacao).toLocaleDateString('pt-BR') : ''), startDate, endDate);
        if (!inDate) return false;
      }

      // 2. Product filter
      if (selectedProduct !== 'TODOS' && r.produto?.toUpperCase() !== selectedProduct) {
        return false;
      }

      // 3. Payment filter
      if (selectedPayment !== 'TODOS' && r.formaPagamento?.toUpperCase() !== selectedPayment) {
        return false;
      }

      // 4. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.numero?.toLowerCase().includes(q) ||
        r.dataAbastecimento?.toLowerCase().includes(q) ||
        r.cliente?.toLowerCase().includes(q) ||
        r.produto?.toLowerCase().includes(q) ||
        r.horaChegada?.toLowerCase().includes(q) ||
        r.inicioAbastecimento?.toLowerCase().includes(q) ||
        r.terminoAbastecimento?.toLowerCase().includes(q) ||
        r.obs?.toLowerCase().includes(q) ||
        r.assinaturaCliente?.toLowerCase().includes(q) ||
        r.fileName?.toLowerCase().includes(q) ||
        r.valorLitro?.toLowerCase().includes(q) ||
        r.valorTotal?.toLowerCase().includes(q)
      );
    });
  }, [records, searchQuery, selectedProduct, selectedPayment, startDate, endDate]);

  // Aggregate metrics
  const totalVolume = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + parseVolumeFloat(r.volume), 0);
  }, [filteredRecords]);

  const totalFinanceiro = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      if (r.valorTotal) {
        return acc + parseCurrencyFloat(r.valorTotal);
      }
      if (r.valorLitro && r.volume) {
        return acc + (parseVolumeFloat(r.volume) * parseCurrencyFloat(r.valorLitro));
      }
      return acc;
    }, 0);
  }, [filteredRecords]);

  const uniqueClientsCount = useMemo(() => {
    const set = new Set<string>();
    filteredRecords.forEach((r) => {
      if (r.cliente) set.add(r.cliente.trim());
    });
    return set.size;
  }, [filteredRecords]);

  // Quick Date Filter Presets
  const handleSetFilterToday = () => {
    const today = formatDateToInput(new Date());
    setStartDate(today);
    setEndDate(today);
  };

  const handleSetFilterYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = formatDateToInput(y);
    setStartDate(yStr);
    setEndDate(yStr);
  };

  const handleSetFilterLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    setStartDate(formatDateToInput(start));
    setEndDate(formatDateToInput(end));
  };

  const handleSetFilterThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(formatDateToInput(start));
    setEndDate(formatDateToInput(end));
  };

  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // Trigger AI Robot to process Drive files and immediately update the spreadsheet
  const handleTriggerRobotAndSync = async () => {
    if (isProcessingRobot || isRefreshing || cooldownSeconds > 0) return;

    setIsProcessingRobot(true);
    setSyncStatus({
      type: 'info',
      msg: '🤖 Robô acionado: analisando fotos no Google Drive com Gemini IA e gravando na planilha...',
    });

    try {
      const robotResult = await triggerGasProcessing(gasConfig.webhookUrl, gasConfig.secretToken);
      const sheetResult = await fetchRecordsFromSheet(gasConfig.webhookUrl, gasConfig.sheetUrl, gasConfig.secretToken);
      
      if (sheetResult.sucesso && Array.isArray(sheetResult.records)) {
        const prevMap = new Map<string, AbastecimentoRecord>();
        records.forEach((r) => {
          if (r.id) prevMap.set(r.id, r);
          if (r.numero) prevMap.set(r.numero, r);
        });

        const merged = sheetResult.records.map((newR) => {
          const prevMatch = (newR.id && prevMap.get(newR.id)) || (newR.numero && prevMap.get(newR.numero));
          const precoLitro = newR.valorLitro || prevMatch?.valorLitro || '';
          const volStr = newR.volume || prevMatch?.volume || '0,00';
          let valorTotal = newR.valorTotal || prevMatch?.valorTotal || '';

          const precoNum = parseCurrencyFloat(precoLitro);
          const volNum = parseVolumeFloat(volStr);
          const totalNum = parseCurrencyFloat(valorTotal);

          if (precoNum > 0 && volNum > 0 && (!valorTotal || totalNum === 0)) {
            valorTotal = formatCurrencyBRL(volNum * precoNum);
          }

          return {
            ...(prevMatch || {}),
            ...newR,
            valorLitro: precoLitro,
            valorTotal: valorTotal,
          };
        });

        onSetRecords(merged);
      }

      if (robotResult.sucesso) {
        const msg = robotResult.mensagem || 'Robô executado com sucesso!';
        setSyncStatus({
          type: 'success',
          msg: `${msg} (${sheetResult.records?.length || 0} linhas na planilha)`,
        });
      } else {
        setSyncStatus({
          type: 'error',
          msg: robotResult.mensagem || 'Aviso retornado ao acionar robô.',
        });
      }
    } catch (err: any) {
      setSyncStatus({
        type: 'error',
        msg: `Erro ao executar robô: ${err.message || 'Falha na conexão'}`,
      });
    } finally {
      setIsProcessingRobot(false);
      setCooldownSeconds(6);
      setTimeout(() => setSyncStatus(null), 8000);
    }
  };

  // Fetch real data from Google Sheets when user clicks Atualizar
  const handleSyncFromGoogleSheets = async (isManualClick: boolean = false) => {
    if (isRefreshing || isProcessingRobot || (isManualClick && cooldownSeconds > 0)) return;

    setIsRefreshing(true);
    setSyncStatus(null);

    try {
      const result = await fetchRecordsFromSheet(gasConfig.webhookUrl, gasConfig.sheetUrl, gasConfig.secretToken);
      if (result.sucesso && Array.isArray(result.records)) {
        // Smart merge with existing records in state to preserve valorLitro and valorTotal
        const prevMap = new Map<string, AbastecimentoRecord>();
        records.forEach((r) => {
          if (r.id) prevMap.set(r.id, r);
          if (r.numero) prevMap.set(r.numero, r);
        });

        const merged = result.records.map((newR) => {
          const prevMatch = (newR.id && prevMap.get(newR.id)) || (newR.numero && prevMap.get(newR.numero));
          const precoLitro = newR.valorLitro || prevMatch?.valorLitro || '';
          const volStr = newR.volume || prevMatch?.volume || '0,00';
          let valorTotal = newR.valorTotal || prevMatch?.valorTotal || '';

          const precoNum = parseCurrencyFloat(precoLitro);
          const volNum = parseVolumeFloat(volStr);
          const totalNum = parseCurrencyFloat(valorTotal);

          if (precoNum > 0 && volNum > 0 && (!valorTotal || totalNum === 0)) {
            valorTotal = formatCurrencyBRL(volNum * precoNum);
          }

          return {
            ...(prevMatch || {}),
            ...newR,
            valorLitro: precoLitro,
            valorTotal: valorTotal,
          };
        });

        onSetRecords(merged);

        if (result.records.length > 0) {
          setSyncStatus({
            type: 'success',
            msg: `Planilha sincronizada! ${result.records.length} linha(s) carregada(s) de Dados_Raizen.`,
          });
        } else {
          setSyncStatus({
            type: 'info',
            msg: 'Conexão efetuada com sucesso: a planilha online Dados_Raizen está vazia (0 registros).',
          });
        }
      } else {
        setSyncStatus({
          type: 'error',
          msg: result.mensagem || 'Falha ao buscar dados do Google Sheets.',
        });
      }
    } catch (err: any) {
      setSyncStatus({
        type: 'error',
        msg: `Erro de conexão: ${err.message || 'Verifique a URL em Configurações'}`,
      });
    } finally {
      setIsRefreshing(false);
      if (isManualClick) {
        setCooldownSeconds(4);
      }
      setTimeout(() => setSyncStatus(null), 6000);
    }
  };

  // Sincroniza ao abrir a aba
  useEffect(() => {
    handleSyncFromGoogleSheets(false);
  }, [gasConfig.webhookUrl, gasConfig.secretToken]);

  const handlePricesUpdated = (updatedList: AbastecimentoRecord[], message: string) => {
    onSetRecords(updatedList);
    setSyncStatus({ type: 'success', msg: message });
    setTimeout(() => setSyncStatus(null), 7000);
  };

  const handleCopyTSV = async () => {
    const ok = await copyTableAsTSV(filteredRecords);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isDateFilterActive = Boolean(startDate || endDate);

  return (
    <div className="space-y-4 w-full">
      {/* Top Spreadsheet Header & Action Bar */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-neutral-100 pb-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <TableIcon className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight flex items-center gap-2">
                <span>Leituras Raízen</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-mono">
                  Dados_Raizen (Colunas A a N)
                </span>
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Operação Raízen
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Visualização fiel da planilha Google Sheets com filtro por data e controle de preços (Colunas M e N).
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Action 1: Lançar Preço do Litro */}
            <button
              type="button"
              id="btn-lancar-preco"
              onClick={() => setIsPriceModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-98 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ring-1 ring-amber-400/40"
              title="Lança o valor por litro e calcula o valor total (Coluna N = Volume * Valor/Litro) no Google Sheets"
            >
              <DollarSign className="w-4 h-4 text-white" />
              <span>Lançar Preço do Litro</span>
            </button>

            {/* Primary Action 2: Acionar Robô de IA & Atualizar Planilha */}
            <button
              type="button"
              id="btn-acionar-robo"
              onClick={handleTriggerRobotAndSync}
              disabled={isProcessingRobot || isRefreshing || cooldownSeconds > 0}
              className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 active:scale-98 disabled:from-neutral-300 disabled:to-neutral-400 disabled:text-neutral-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ring-1 ring-red-500/30"
              title="Executa o robô Gemini no Drive para processar novas fotos e atualiza a planilha em seguida"
            >
              {isProcessingRobot ? (
                <Bot className="w-4 h-4 animate-bounce text-amber-300" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              )}
              <span>
                {isProcessingRobot
                  ? 'Processando...'
                  : cooldownSeconds > 0
                  ? `Aguarde (${cooldownSeconds}s)`
                  : 'Acionar Robô'}
              </span>
            </button>

            {/* Quick Sincronizar / Atualizar Button */}
            <button
              type="button"
              id="btn-atualizar-sheets"
              onClick={() => handleSyncFromGoogleSheets(true)}
              disabled={isRefreshing || isProcessingRobot || cooldownSeconds > 0}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400 text-neutral-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200"
              title="Recarrega os dados da planilha Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
              <span>{isRefreshing ? 'Carregando...' : 'Atualizar'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyTSV}
              className="px-2.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Copiar dados para colar no Excel ou Google Sheets"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Imprimir visualização"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Excel Download Button */}
            <button
              type="button"
              id="btn-download-excel"
              onClick={() => exportToExcelXLSX(filteredRecords)}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {/* CSV Download Button */}
            <button
              type="button"
              id="btn-download-csv"
              onClick={() => exportToCSV(filteredRecords)}
              className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast Banner */}
        {syncStatus && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              syncStatus.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : syncStatus.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            {syncStatus.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : syncStatus.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-semibold">{syncStatus.msg}</span>
          </div>
        )}

        {/* Metric Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl p-3 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <Fuel className="w-3 h-3 text-red-600" />
              Volume Total Filtrado
            </span>
            <div className="text-base sm:text-lg font-black text-neutral-900 font-mono">
              {totalVolume > 0 ? formatVolumeL(totalVolume) : `${filteredRecords.length} reg.`}
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-600" />
              Custo Previsto (R$)
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-900 font-mono">
              {totalFinanceiro > 0 ? formatCurrencyBRL(totalFinanceiro) : 'R$ 0,00'}
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl p-3 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <TableIcon className="w-3.5 h-3.5" />
              Total de Ordens (O.S.)
            </span>
            <div className="text-base sm:text-lg font-black text-neutral-900">
              {filteredRecords.length} <span className="text-xs font-normal text-neutral-500">lançamento(s)</span>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl p-3 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-600" />
              Clientes Atendidos
            </span>
            <div className="text-base sm:text-lg font-black text-neutral-900">
              {uniqueClientsCount} <span className="text-xs font-normal text-neutral-500">empresa(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter & Search Control Panel */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-3">
        {/* Row 1: Date Range Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-900 block">
                Filtrar por Data do Abastecimento (Coluna B)
              </span>
              <span className="text-[11px] text-neutral-500">
                Selecione uma data única (ex: 26/08/2026 a 26/08/2026) ou um período (ex: 26/08/2026 a 29/08/2026)
              </span>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={handleSetFilterToday}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                startDate && endDate && startDate === endDate && startDate === formatDateToInput(new Date())
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleSetFilterYesterday}
              className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-lg border border-neutral-200 font-semibold transition-colors cursor-pointer"
            >
              Ontem
            </button>
            <button
              type="button"
              onClick={handleSetFilterLast7Days}
              className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-lg border border-neutral-200 font-semibold transition-colors cursor-pointer"
            >
              Últimos 7 dias
            </button>
            <button
              type="button"
              onClick={handleSetFilterThisMonth}
              className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-lg border border-neutral-200 font-semibold transition-colors cursor-pointer"
            >
              Este Mês
            </button>
            {isDateFilterActive && (
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Limpar Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Date Inputs & Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Date Pickers */}
          <div className="md:col-span-5 flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                De (Início):
              </label>
              <input
                id="filter-date-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-neutral-300 rounded-xl bg-neutral-50/60 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="text-neutral-400 font-bold text-xs pt-4">até</div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Até (Fim):
              </label>
              <input
                id="filter-date-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-neutral-300 rounded-xl bg-neutral-50/60 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Search Query */}
          <div className="md:col-span-4 relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Buscar Termo:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2" />
              <input
                id="input-search-spreadsheet"
                type="text"
                placeholder="O.S., Cliente, Horários, Obs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-800 bg-neutral-50/50"
              />
            </div>
          </div>

          {/* Dropdown Filters (Product & Payment) */}
          <div className="md:col-span-3 flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Produto:
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-2 py-1.5 border border-neutral-300 rounded-xl text-xs bg-neutral-50 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                <option value="TODOS">Todos</option>
                {uniqueProducts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Pagamento:
              </label>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                className="w-full px-2 py-1.5 border border-neutral-300 rounded-xl text-xs bg-neutral-50 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                <option value="TODOS">Todas</option>
                {uniquePayments.map((pay) => (
                  <option key={pay} value={pay}>
                    {pay}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Summary Tag */}
        {isDateFilterActive && (
          <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>
                {startDate && endDate && startDate === endDate ? (
                  <>Exibindo lançamentos do dia <strong>{formatDateToBR(startDate)}</strong> ({filteredRecords.length} encontrados)</>
                ) : (
                  <>Exibindo intervalo de <strong>{formatDateToBR(startDate || '-')}</strong> até <strong>{formatDateToBR(endDate || '-')}</strong> ({filteredRecords.length} encontrados)</>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearDateFilter}
              className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remover Filtro</span>
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Grid Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {/* Google Sheets Tab Header */}
        <div className="bg-neutral-800 text-neutral-100 px-3.5 py-2 text-xs font-semibold flex items-center justify-between border-b border-neutral-700">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></div>
            <span className="tracking-wide font-mono text-[11px]">
              Leituras Raízen • Aba: Dados_Raizen (Colunas A1:N{Math.max(records.length + 1, 2)})
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 font-normal">
            Exibindo {filteredRecords.length} de {records.length} linha(s)
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-neutral-800">
              {records.length === 0 ? 'Nenhum lançamento registrado na planilha' : 'Nenhum registro corresponde aos filtros'}
            </div>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {records.length === 0
                ? 'A aba "Dados_Raizen" do Google Sheets está vazia ou aguardando novos abastecimentos.'
                : 'Tente alterar a data ou redefinir os filtros de busca para visualizar os registros.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              {isDateFilterActive && (
                <button
                  type="button"
                  onClick={handleClearDateFilter}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Limpar Filtro de Data</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSyncFromGoogleSheets(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Atualizar Planilha</span>
              </button>

              <button
                type="button"
                onClick={onOpenUploadTab}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capturar Nova Nota</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              {/* Column Letter Markers (A to N) */}
              <thead>
                {/* Column Letters Bar */}
                <tr className="bg-neutral-200/90 text-neutral-600 text-[9px] font-mono select-none border-b border-neutral-300">
                  <th className="py-0.5 px-1 text-center border-r border-neutral-300 w-7">#</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">A</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300 bg-amber-100 text-amber-900 font-bold">B</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">C</th>
                  <th className="py-0.5 px-2 text-center border-r border-neutral-300">D</th>
                  <th className="py-0.5 px-1 text-center border-r border-neutral-300">E</th>
                  <th className="py-0.5 px-1 text-center border-r border-neutral-300">F</th>
                  <th className="py-0.5 px-1 text-center border-r border-neutral-300 bg-red-100 text-red-800 font-bold">G</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">H</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">I</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">J</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">K</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">L</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300 bg-amber-100 text-amber-900 font-bold">M</th>
                  <th className="py-0.5 px-1.5 text-center bg-emerald-100 text-emerald-900 font-bold">N</th>
                </tr>

                {/* Primary Red Header Row */}
                <tr className="bg-[#E52421] text-white text-[11px] font-bold select-none border-b border-red-800">
                  {/* Row index indicator */}
                  <th className="py-2 px-1 text-center font-mono text-red-200 bg-red-800/80 border-r border-red-700 w-7">
                    1
                  </th>

                  {/* Col A: Número */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Número
                  </th>

                  {/* Col B: Data do Abastecimento */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap bg-red-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-300 shrink-0" />
                      <span>Data</span>
                    </div>
                  </th>

                  {/* Col C: Forma de Pagamento */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Forma Pagto
                  </th>

                  {/* Col D: Cliente */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Cliente
                  </th>

                  {/* Col E: Hora da Chegada */}
                  <th className="py-2 px-1.5 border-r border-red-700 text-center whitespace-nowrap">
                    Chegada
                  </th>

                  {/* Col F: Início do Abastecimento */}
                  <th className="py-2 px-1.5 border-r border-red-700 text-center whitespace-nowrap">
                    Início
                  </th>

                  {/* Col G: Término do Abastecimento */}
                  <th className="py-2 px-1.5 border-r border-red-700 text-center whitespace-nowrap bg-red-700">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-yellow-300 shrink-0" />
                      <span>Término</span>
                    </div>
                  </th>

                  {/* Col H: Produto */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Produto
                  </th>

                  {/* Col I: Volume */}
                  <th className="py-2 px-2 border-r border-red-700 text-right whitespace-nowrap">
                    Volume
                  </th>

                  {/* Col J: Obs.: */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Obs.:
                  </th>

                  {/* Col K: Assinatura do Cliente */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Assinatura
                  </th>

                  {/* Col L: Foto da Nota */}
                  <th className="py-2 px-1.5 border-r border-red-700 text-center whitespace-nowrap">
                    Foto Nota
                  </th>

                  {/* Col M: Valor/Litro (R$) */}
                  <th className="py-2 px-2 border-r border-red-700 text-right whitespace-nowrap bg-red-800">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="w-3 h-3 text-amber-300 shrink-0" />
                      <span>Valor/Litro</span>
                    </div>
                  </th>

                  {/* Col N: Valor Total (R$) */}
                  <th className="py-2 px-2 text-right whitespace-nowrap bg-emerald-800">
                    <span>Valor Total</span>
                  </th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-neutral-200 bg-white">
                {filteredRecords.map((r, index) => {
                  const volFloat = parseVolumeFloat(r.volume);
                  const precoLitroFloat = r.valorLitro ? parseCurrencyFloat(r.valorLitro) : 0;
                  const totalValFloat = r.valorTotal ? parseCurrencyFloat(r.valorTotal) : 0;
                  const totalCalculado = totalValFloat > 0 
                    ? (r.valorTotal?.includes('R$') ? r.valorTotal : formatCurrencyBRL(totalValFloat))
                    : (precoLitroFloat > 0 && volFloat > 0 ? formatCurrencyBRL(volFloat * precoLitroFloat) : '-');

                  return (
                    <tr
                      key={r.id || `row-${index}`}
                      className="hover:bg-red-50/40 transition-colors group"
                    >
                      {/* Row Index */}
                      <td className="py-2 px-1 text-center font-mono text-neutral-400 bg-neutral-50/80 border-r border-neutral-200 text-[10px] select-none">
                        {index + 2}
                      </td>

                      {/* Col A: Número */}
                      <td className="py-2 px-2 border-r border-neutral-100 font-mono">
                        <div className="max-w-[130px] truncate" title={r.numero || r.fileName}>
                          <span className="font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md text-[10px]">
                            {r.numero || `OS-${String(index + 1).padStart(4, '0')}`}
                          </span>
                        </div>
                      </td>

                      {/* Col B: Data do Abastecimento */}
                      <td className="py-2 px-2 border-r border-neutral-100 font-mono text-neutral-800 whitespace-nowrap font-semibold text-[10px] bg-amber-50/20">
                        {r.dataAbastecimento || (r.dataCriacao ? new Date(r.dataCriacao).toLocaleDateString('pt-BR') : '-')}
                      </td>

                      {/* Col C: Forma de Pagamento */}
                      <td className="py-2 px-2 border-r border-neutral-100 whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                            r.formaPagamento?.includes('CONTRATO')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : r.formaPagamento?.includes('FATURADO')
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {r.formaPagamento || 'CONTRATO'}
                        </span>
                      </td>

                      {/* Col D: Cliente */}
                      <td className="py-2 px-2 border-r border-neutral-100 font-bold text-neutral-900">
                        <div className="truncate max-w-[150px]" title={r.cliente || 'WFS / RAÍZEN'}>
                          {r.cliente || 'WFS / RAÍZEN'}
                        </div>
                      </td>

                      {/* Col E: Hora da Chegada */}
                      <td className="py-2 px-1.5 border-r border-neutral-100 text-center font-mono text-neutral-700 whitespace-nowrap">
                        {r.horaChegada || '-'}
                      </td>

                      {/* Col F: Início do Abastecimento */}
                      <td className="py-2 px-1.5 border-r border-neutral-100 text-center font-mono text-neutral-700 whitespace-nowrap">
                        {r.inicioAbastecimento || '-'}
                      </td>

                      {/* Col G: Término do Abastecimento */}
                      <td className="py-2 px-1.5 border-r border-neutral-100 text-center font-mono font-semibold text-neutral-800 bg-neutral-50/30 whitespace-nowrap">
                        {r.terminoAbastecimento ? (
                          <span className="text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded-md border border-neutral-200">
                            {r.terminoAbastecimento}
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>

                      {/* Col H: Produto */}
                      <td className="py-2 px-2 border-r border-neutral-100 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-neutral-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                          <span className="truncate max-w-[85px]">{r.produto || 'DIESEL'}</span>
                        </span>
                      </td>

                      {/* Col I: Volume */}
                      <td className="py-2 px-2 border-r border-neutral-100 text-right font-mono font-bold text-neutral-900 whitespace-nowrap">
                        {r.volume ? (r.volume.includes('L') ? r.volume : `${r.volume} L`) : '-'}
                      </td>

                      {/* Col J: Obs.: */}
                      <td className="py-2 px-2 border-r border-neutral-100 text-neutral-600">
                        <div className="truncate max-w-[120px]" title={r.obs || '-'}>
                          {r.obs || '-'}
                        </div>
                      </td>

                      {/* Col K: Assinatura do Cliente */}
                      <td className="py-2 px-2 border-r border-neutral-100 text-neutral-700">
                        <div className="truncate max-w-[110px] font-medium" title={r.assinaturaCliente || '-'}>
                          {r.assinaturaCliente || '-'}
                        </div>
                      </td>

                      {/* Col L: Foto da Nota */}
                      <td className="py-2 px-1.5 border-r border-neutral-100 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {r.fotoBase64 ? (
                            <button
                              type="button"
                              onClick={() => onPreviewReceipt(r)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 hover:bg-red-50 text-neutral-700 hover:text-red-700 rounded-md text-[10px] font-semibold border border-neutral-200 transition-colors cursor-pointer"
                              title="Ver foto da nota"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver</span>
                            </button>
                          ) : r.driveFileUrl ? (
                            <a
                              href={r.driveFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[10px] font-semibold transition-colors"
                              title="Abrir no Google Drive"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Drive</span>
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-[10px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* Col M: Valor/Litro */}
                      <td className="py-2 px-2 border-r border-neutral-100 text-right font-mono font-semibold text-neutral-800 whitespace-nowrap bg-amber-50/20">
                        {r.valorLitro ? (
                          <span className="text-amber-900 bg-amber-100/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {r.valorLitro.includes('R$') ? r.valorLitro : `R$ ${r.valorLitro}`}
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>

                      {/* Col N: Valor Total */}
                      <td className="py-2 px-2 text-right font-mono font-black text-emerald-800 whitespace-nowrap bg-emerald-50/30">
                        {totalCalculado !== '-' ? (
                          <span className="text-emerald-700 font-bold">
                            {totalCalculado}
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totalizer Footer */}
              <tfoot>
                <tr className="bg-neutral-100 border-t-2 border-neutral-300 font-bold text-neutral-900 text-[11px]">
                  <td colSpan={2} className="py-2.5 px-2 text-center font-mono bg-neutral-200/70 border-r border-neutral-300">
                    TOTAIS
                  </td>
                  <td colSpan={7} className="py-2.5 px-2 border-r border-neutral-300 text-neutral-600">
                    {filteredRecords.length} ORDEM(NS) DE SERVIÇO EM DADOS_RAIZEN
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-black text-red-700 border-r border-neutral-300 whitespace-nowrap">
                    {totalVolume > 0 ? formatVolumeL(totalVolume) : '-'}
                  </td>
                  <td colSpan={3} className="py-2.5 px-2 border-r border-neutral-300 text-neutral-500 text-[10px]">
                    Operação WFS / Raízen
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-800 border-r border-neutral-300 text-[10px]">
                    {totalVolume > 0 && totalFinanceiro > 0 ? `Méd. ${formatCurrencyBRL(totalFinanceiro / totalVolume)}/L` : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-700 whitespace-nowrap bg-emerald-100/50">
                    {totalFinanceiro > 0 ? formatCurrencyBRL(totalFinanceiro) : 'R$ 0,00'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Floating Action / Back to Upload */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <HardDrive className="w-4 h-4 text-emerald-600" />
          <span>Para registrar novos abastecimentos, tire uma foto pela guia Captura de Nota.</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsPriceModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>Lançar Preço (R$/L)</span>
          </button>

          <button
            type="button"
            onClick={onOpenUploadTab}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Tirar Nova Foto</span>
          </button>
        </div>
      </div>

      {/* Fuel Price Modal */}
      <FuelPriceModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        records={records}
        onPricesUpdated={handlePricesUpdated}
        gasConfig={gasConfig}
        defaultStartDate={startDate}
        defaultEndDate={endDate || startDate}
      />
    </div>
  );
};
