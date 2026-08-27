import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  Calendar, 
  Fuel, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  TrendingUp, 
  Calculator, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { AbastecimentoRecord, GasConfig } from '../types';
import { 
  parseVolumeFloat, 
  formatCurrencyBRL, 
  formatVolumeL, 
  isRecordInDateRange, 
  formatDateToBR, 
  formatDateToInput 
} from '../utils/dateUtils';
import { updateFuelPricesInSheet } from '../utils/driveService';

interface FuelPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AbastecimentoRecord[];
  onPricesUpdated: (updatedRecords: AbastecimentoRecord[], message: string) => void;
  gasConfig?: GasConfig;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

export const FuelPriceModal: React.FC<FuelPriceModalProps> = ({
  isOpen,
  onClose,
  records,
  onPricesUpdated,
  gasConfig,
  defaultStartDate = '',
  defaultEndDate = '',
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('TODOS');
  const [priceInput, setPriceInput] = useState<string>('5,89');
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate || defaultStartDate);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Extract all unique products from records
  const availableProducts = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.produto && r.produto.trim()) {
        set.add(r.produto.trim().toUpperCase());
      }
    });
    return Array.from(set);
  }, [records]);

  // Numeric price parsed
  const numericPrice = useMemo(() => {
    const clean = priceInput.replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [priceInput]);

  // Filter records matching the selected product and date range for real-time simulation
  const matchingRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Check product
      if (selectedProduct !== 'TODOS') {
        const prod = (r.produto || '').trim().toUpperCase();
        if (prod !== selectedProduct) return false;
      }

      // 2. Check date range
      return isRecordInDateRange(r.dataAbastecimento, startDate, endDate);
    });
  }, [records, selectedProduct, startDate, endDate]);

  // Simulation calculations
  const simulation = useMemo(() => {
    let totalVolume = 0;
    matchingRecords.forEach((r) => {
      totalVolume += parseVolumeFloat(r.volume);
    });
    const totalFinanceiro = totalVolume * numericPrice;
    return {
      count: matchingRecords.length,
      totalVolume,
      totalFinanceiro,
    };
  }, [matchingRecords, numericPrice]);

  // Quick date presets
  const handleSetToday = () => {
    const todayStr = formatDateToInput(new Date());
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const handleSetYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = formatDateToInput(y);
    setStartDate(yStr);
    setEndDate(yStr);
  };

  const handleSetLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    setStartDate(formatDateToInput(start));
    setEndDate(formatDateToInput(end));
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(formatDateToInput(start));
    setEndDate(formatDateToInput(end));
  };

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
  };

  // Submit and update Google Sheets & local state
  const handleConfirm = async () => {
    if (numericPrice <= 0) {
      setFeedback({ type: 'error', text: 'Informe um valor por litro válido (maior que zero).' });
      return;
    }

    if (matchingRecords.length === 0) {
      setFeedback({
        type: 'error',
        text: 'Nenhum lançamento encontrado para o período e combustível selecionados.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const formattedPriceStr = numericPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      // 1. Send to Backend / Google Apps Script
      const result = await updateFuelPricesInSheet(gasConfig?.webhookUrl, gasConfig?.secretToken, {
        dataInicio: startDate,
        dataFim: endDate || startDate,
        produto: selectedProduct,
        valorLitro: numericPrice,
      });

      // 2. Compute locally updated records
      const matchingIds = new Set(matchingRecords.map((r) => r.id));
      const updatedList = records.map((r) => {
        if (matchingIds.has(r.id)) {
          const vol = parseVolumeFloat(r.volume);
          const totalVal = vol * numericPrice;
          return {
            ...r,
            valorLitro: `R$ ${formattedPriceStr}`,
            valorTotal: formatCurrencyBRL(totalVal),
          };
        }
        return r;
      });

      const successMsg = result.sucesso
        ? `Preço de R$ ${formattedPriceStr}/L gravado com sucesso na planilha Dados_Raizen para ${matchingRecords.length} lançamento(s)!`
        : `Preços atualizados no painel para ${matchingRecords.length} lançamentos (Aviso: ${result.mensagem}).`;

      onPricesUpdated(updatedList, successMsg);
      setFeedback({ type: 'success', text: successMsg });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Erro ao gravar na planilha: ${err.message || 'Falha de comunicação'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="fuel-price-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          id="fuel-price-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Lançar Valor por Litro & Calcular Total</h3>
                <p className="text-xs text-red-100 mt-0.5">
                  Aplica o preço unitário e atualiza as Colunas M e N na planilha <span className="font-semibold text-white">Dados_Raizen</span>
                </p>
              </div>
            </div>
            <button
              id="close-fuel-price-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Feedback message */}
            {feedback && (
              <div
                className={`p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Product Select */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  1. Tipo de Combustível / Produto
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <select
                    id="fuel-modal-product-select"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  >
                    <option value="TODOS">TODOS OS PRODUTOS</option>
                    {availableProducts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {!availableProducts.includes('DIESEL') && <option value="DIESEL">DIESEL</option>}
                    {!availableProducts.includes('DIESEL S10') && <option value="DIESEL S10">DIESEL S10</option>}
                    {!availableProducts.includes('JET A-1') && <option value="JET A-1">JET A-1</option>}
                  </select>
                </div>
              </div>

              {/* Price per Liter Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  2. Valor por Litro (R$)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                    R$
                  </div>
                  <input
                    id="fuel-modal-price-input"
                    type="text"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Ex: 5,89"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  />
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPriceInput('5,89')}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded font-medium"
                  >
                    R$ 5,89
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceInput('6,20')}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded font-medium"
                  >
                    R$ 6,20
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceInput('6,75')}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded font-medium"
                  >
                    R$ 6,75
                  </button>
                </div>
              </div>
            </div>

            {/* Date Range Section */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
                  3. Em qual data aplicar? (Data Única ou Intervalo)
                </label>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={handleSetToday}
                    className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 font-medium transition-colors"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={handleSetYesterday}
                    className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 font-medium transition-colors"
                  >
                    Ontem
                  </button>
                  <button
                    type="button"
                    onClick={handleSetLast7Days}
                    className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 font-medium transition-colors"
                  >
                    Últimos 7 dias
                  </button>
                  <button
                    type="button"
                    onClick={handleSetThisMonth}
                    className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 font-medium transition-colors"
                  >
                    Este Mês
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDates}
                    className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 font-medium transition-colors"
                  >
                    Todas as Datas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    De (Data Inicial):
                  </span>
                  <input
                    id="fuel-modal-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate || endDate < e.target.value) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Até (Data Final):
                  </span>
                  <input
                    id="fuel-modal-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                {startDate && endDate && startDate === endDate ? (
                  <span>Será aplicado exclusivamente para os abastecimentos do dia <strong>{formatDateToBR(startDate)}</strong>.</span>
                ) : startDate && endDate ? (
                  <span>Será aplicado para os abastecimentos entre <strong>{formatDateToBR(startDate)}</strong> e <strong>{formatDateToBR(endDate)}</strong>.</span>
                ) : (
                  <span>Sem filtro de data: será aplicado a todos os lançamentos com o combustível selecionado.</span>
                )}
              </p>
            </div>

            {/* Real-time Calculation / Preview Cards */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-inner border border-slate-700">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Simulação do Lançamento em Tempo Real
                </div>
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-bold border border-emerald-500/30">
                  {simulation.count} lançamento(s) correspondente(s)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <div className="text-[11px] text-slate-400 uppercase font-medium">Volume Total</div>
                  <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                    {formatVolumeL(simulation.totalVolume)}
                  </div>
                </div>

                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <div className="text-[11px] text-slate-400 uppercase font-medium">Valor Unitário</div>
                  <div className="text-base sm:text-lg font-bold text-amber-300 mt-0.5">
                    {formatCurrencyBRL(numericPrice)} / L
                  </div>
                </div>

                <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/30">
                  <div className="text-[11px] text-emerald-400 uppercase font-bold">Valor Total (Coluna N)</div>
                  <div className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">
                    {formatCurrencyBRL(simulation.totalFinanceiro)}
                  </div>
                </div>
              </div>

              {/* Sample preview list */}
              {matchingRecords.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/60">
                  <div className="text-[11px] text-slate-400 mb-1.5 font-medium">
                    Prévia dos primeiros registros impactados:
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-xs">
                    {matchingRecords.slice(0, 4).map((rec, i) => {
                      const vol = parseVolumeFloat(rec.volume);
                      const tot = vol * numericPrice;
                      return (
                        <div
                          key={rec.id || i}
                          className="flex items-center justify-between px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-[11px] text-slate-300 font-mono"
                        >
                          <span>
                            <strong>{rec.numero || `OS-${i + 1}`}</strong> ({rec.dataAbastecimento || '-'}) - {rec.produto || 'DIESEL'}
                          </span>
                          <span className="text-emerald-300 font-bold">
                            {rec.volume || '0'} L × {formatCurrencyBRL(numericPrice)} = {formatCurrencyBRL(tot)}
                          </span>
                        </div>
                      );
                    })}
                    {matchingRecords.length > 4 && (
                      <div className="text-[10px] text-center text-slate-400 italic pt-1">
                        + mais {matchingRecords.length - 4} lançamento(s) serão atualizados na planilha
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              id="confirm-update-fuel-prices-btn"
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || numericPrice <= 0 || simulation.count === 0}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all transform active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gravando no Google Sheets...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Gravar na Planilha</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
