import React, { useState, useMemo } from 'react';
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
  Trash2,
} from 'lucide-react';
import { AbastecimentoRecord, GasConfig } from '../types';
import { exportToExcelXLSX, exportToCSV, copyTableAsTSV } from '../utils/exportUtils';

interface SpreadsheetTabProps {
  records: AbastecimentoRecord[];
  onUpdateRecord: (updated: AbastecimentoRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearAllRecords?: () => void;
  onOpenUploadTab: () => void;
  onPreviewReceipt: (record: AbastecimentoRecord) => void;
  gasConfig: GasConfig;
}

export const SpreadsheetTab: React.FC<SpreadsheetTabProps> = ({
  records,
  onDeleteRecord,
  onClearAllRecords,
  onOpenUploadTab,
  onPreviewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('TODOS');
  const [selectedPayment, setSelectedPayment] = useState<string>('TODOS');
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Product filter
      if (selectedProduct !== 'TODOS' && r.produto?.toUpperCase() !== selectedProduct) {
        return false;
      }
      // Payment filter
      if (selectedPayment !== 'TODOS' && r.formaPagamento?.toUpperCase() !== selectedPayment) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.numero?.toLowerCase().includes(q) ||
        r.cliente?.toLowerCase().includes(q) ||
        r.produto?.toLowerCase().includes(q) ||
        r.horaChegada?.toLowerCase().includes(q) ||
        r.inicioAbastecimento?.toLowerCase().includes(q) ||
        r.terminoAbastecimento?.toLowerCase().includes(q) ||
        r.obs?.toLowerCase().includes(q) ||
        r.assinaturaCliente?.toLowerCase().includes(q) ||
        r.fileName?.toLowerCase().includes(q)
      );
    });
  }, [records, searchQuery, selectedProduct, selectedPayment]);

  // Aggregate metrics
  const totalVolume = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      if (!r.volume) return acc;
      const clean = r.volume.replace(/\./g, '').replace(',', '.');
      const val = parseFloat(clean);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [filteredRecords]);

  const uniqueClientsCount = useMemo(() => {
    const set = new Set<string>();
    filteredRecords.forEach((r) => {
      if (r.cliente) set.add(r.cliente.trim());
    });
    return set.size;
  }, [filteredRecords]);

  const handleCopyTSV = async () => {
    const ok = await copyTableAsTSV(filteredRecords);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handlePrint = () => {
    window.print();
  };

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
                  Dados_Raizen (Colunas A a K)
                </span>
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Produção WFS
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Registros operacionais sincronizados com a planilha Google Sheets da operação Raízen.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleRefresh}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Atualizar tabela"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
              <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyTSV}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Copiar dados para colar no Excel ou Google Sheets"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Baixar Excel</span>
            </button>

            {/* CSV Download Button */}
            <button
              type="button"
              id="btn-download-csv"
              onClick={() => exportToCSV(filteredRecords)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {onClearAllRecords && records.length > 0 && (
              <button
                type="button"
                onClick={onClearAllRecords}
                className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-transparent hover:border-red-200"
                title="Limpar todos os registros salvos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Limpar Tudo</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl p-3 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <Fuel className="w-3 h-3 text-red-600" />
              Volume Total Filtrado
            </span>
            <div className="text-base sm:text-lg font-black text-neutral-900 font-mono">
              {totalVolume > 0
                ? `${totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`
                : 'Salvo no Drive'}
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl p-3 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <TableIcon className="w-3 h-3 text-blue-600" />
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

          <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl p-3 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-emerald-600" />
              Status Sincronização
            </span>
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {records.filter((r) => r.statusEnvio === 'enviado_drive' || r.driveFileId).length} enviado(s) ao Drive
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-neutral-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            id="input-search-spreadsheet"
            type="text"
            placeholder="Buscar por O.S., Cliente, Horários, Produto, Obs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-800 bg-neutral-50/50"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Product Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-neutral-500 font-medium hidden sm:inline">Produto:</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-2 py-1.5 border border-neutral-300 rounded-xl text-xs bg-neutral-50 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500"
            >
              <option value="TODOS">Todos os Produtos</option>
              {uniqueProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-neutral-500 font-medium hidden sm:inline">Pagto:</span>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="px-2 py-1.5 border border-neutral-300 rounded-xl text-xs bg-neutral-50 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500"
            >
              <option value="TODOS">Todas as Formas</option>
              {uniquePayments.map((pay) => (
                <option key={pay} value={pay}>
                  {pay}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedProduct !== 'TODOS' || selectedPayment !== 'TODOS') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedProduct('TODOS');
                setSelectedPayment('TODOS');
              }}
              className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Grid - Screen-optimized without horizontal overflow */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {/* Google Sheets Tab Header */}
        <div className="bg-neutral-800 text-neutral-100 px-3.5 py-2 text-xs font-semibold flex items-center justify-between border-b border-neutral-700">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></div>
            <span className="tracking-wide font-mono text-[11px]">
              Leituras Raizen • Aba: Dados_Raizen (Colunas A1:K{Math.max(records.length + 1, 2)})
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
              {records.length === 0 ? 'Nenhum lançamento registrado ainda' : 'Nenhum registro corresponde aos filtros'}
            </div>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {records.length === 0
                ? 'Tire uma foto do comprovante na aba "Captura de Nota" para registrar o primeiro abastecimento.'
                : 'Tente redefinir os filtros de busca para visualizar os registros.'}
            </p>
            {records.length === 0 && (
              <button
                type="button"
                onClick={onOpenUploadTab}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capturar Nova Nota</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              {/* Column Letter Markers (A, B, C, D, E, F, G, H, I, J, K) */}
              <thead>
                {/* Column Letters Bar */}
                <tr className="bg-neutral-200/90 text-neutral-600 text-[9px] font-mono select-none border-b border-neutral-300">
                  <th className="py-0.5 px-1 text-center border-r border-neutral-300 w-7">#</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">A</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">B</th>
                  <th className="py-0.5 px-2 text-center border-r border-neutral-300">C</th>
                  <th className="py-0.5 px-1 text-center border-r border-neutral-300">D</th>
                  <th className="py-0.5 px-1 text-center border-r border-neutral-300">E</th>
                  <th className="py-0.5 px-1 text-center border-r border-neutral-300 bg-red-100 text-red-800 font-bold">F</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">G</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">H</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">I</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">J</th>
                  <th className="py-0.5 px-1.5 text-center border-r border-neutral-300">K</th>
                  <th className="py-0.5 px-1 text-center w-7"></th>
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

                  {/* Col B: Forma de Pagamento */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Forma de Pagto
                  </th>

                  {/* Col C: Cliente */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Cliente
                  </th>

                  {/* Col D: Hora da Chegada */}
                  <th className="py-2 px-1.5 border-r border-red-700 text-center whitespace-nowrap">
                    Chegada
                  </th>

                  {/* Col E: Início do Abastecimento */}
                  <th className="py-2 px-1.5 border-r border-red-700 text-center whitespace-nowrap">
                    Início
                  </th>

                  {/* Col F: Término do Abastecimento */}
                  <th className="py-2 px-1.5 border-r border-red-700 text-center whitespace-nowrap bg-red-700">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-yellow-300 shrink-0" />
                      <span>Término</span>
                    </div>
                  </th>

                  {/* Col G: Produto */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Produto
                  </th>

                  {/* Col H: Volume */}
                  <th className="py-2 px-2 border-r border-red-700 text-right whitespace-nowrap">
                    Volume
                  </th>

                  {/* Col I: Obs.: */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Obs.:
                  </th>

                  {/* Col J: Assinatura do Cliente */}
                  <th className="py-2 px-2 border-r border-red-700 whitespace-nowrap">
                    Assinatura
                  </th>

                  {/* Col K: Foto da Nota */}
                  <th className="py-2 px-1.5 text-center border-r border-red-700 whitespace-nowrap">
                    Foto da Nota
                  </th>

                  {/* Quick Action Delete */}
                  <th className="py-2 px-1 text-center w-7"></th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-neutral-200 bg-white">
                {filteredRecords.map((r, index) => (
                  <tr
                    key={r.id}
                    className="hover:bg-red-50/40 transition-colors group"
                  >
                    {/* Row Index */}
                    <td className="py-2 px-1 text-center font-mono text-neutral-400 bg-neutral-50/80 border-r border-neutral-200 text-[10px] select-none">
                      {index + 2}
                    </td>

                    {/* Col A: Número */}
                    <td className="py-2 px-2 border-r border-neutral-100 font-mono">
                      <div className="max-w-[140px] truncate" title={r.numero || r.fileName}>
                        <span className="font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md text-[10px]">
                          {r.numero || `OS-${String(index + 1).padStart(4, '0')}`}
                        </span>
                      </div>
                    </td>

                    {/* Col B: Forma de Pagamento */}
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

                    {/* Col C: Cliente */}
                    <td className="py-2 px-2 border-r border-neutral-100 font-bold text-neutral-900">
                      <div className="truncate max-w-[170px]" title={r.cliente || 'WFS / RAÍZEN'}>
                        {r.cliente || 'WFS / RAÍZEN'}
                      </div>
                    </td>

                    {/* Col D: Hora da Chegada */}
                    <td className="py-2 px-1.5 border-r border-neutral-100 text-center font-mono text-neutral-700 whitespace-nowrap">
                      {r.horaChegada || '-'}
                    </td>

                    {/* Col E: Início do Abastecimento */}
                    <td className="py-2 px-1.5 border-r border-neutral-100 text-center font-mono text-neutral-700 whitespace-nowrap">
                      {r.inicioAbastecimento || '-'}
                    </td>

                    {/* Col F: Término do Abastecimento */}
                    <td className="py-2 px-1.5 border-r border-neutral-100 text-center font-mono font-semibold text-neutral-800 bg-neutral-50/30 whitespace-nowrap">
                      {r.terminoAbastecimento ? (
                        <span className="text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded-md border border-neutral-200">
                          {r.terminoAbastecimento}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>

                    {/* Col G: Produto */}
                    <td className="py-2 px-2 border-r border-neutral-100 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-neutral-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                        <span className="truncate max-w-[90px]">{r.produto || 'DIESEL'}</span>
                      </span>
                    </td>

                    {/* Col H: Volume */}
                    <td className="py-2 px-2 border-r border-neutral-100 text-right font-mono font-bold text-neutral-900 whitespace-nowrap">
                      {r.volume ? (r.volume.includes('L') ? r.volume : `${r.volume} L`) : '-'}
                    </td>

                    {/* Col I: Obs.: */}
                    <td className="py-2 px-2 border-r border-neutral-100 text-neutral-600">
                      <div className="truncate max-w-[140px]" title={r.obs || '-'}>
                        {r.obs || '-'}
                      </div>
                    </td>

                    {/* Col J: Assinatura do Cliente */}
                    <td className="py-2 px-2 border-r border-neutral-100 text-neutral-700">
                      <div className="truncate max-w-[130px] font-medium" title={r.assinaturaCliente || '-'}>
                        {r.assinaturaCliente || '-'}
                      </div>
                    </td>

                    {/* Col K: Foto da Nota */}
                    <td className="py-2 px-1.5 text-center border-r border-neutral-100 whitespace-nowrap">
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
                        ) : (
                          <span className="text-neutral-400 text-[10px]">-</span>
                        )}

                        {r.driveFileUrl && (
                          <a
                            href={r.driveFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                            title="Abrir no Google Drive"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Row Delete Action */}
                    <td className="py-2 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Deseja excluir este lançamento da lista?')) {
                            onDeleteRecord(r.id);
                          }
                        }}
                        className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Excluir lançamento"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Totalizer Footer */}
              <tfoot>
                <tr className="bg-neutral-100 border-t-2 border-neutral-300 font-bold text-neutral-900 text-[11px]">
                  <td colSpan={2} className="py-2.5 px-2 text-center font-mono bg-neutral-200/70 border-r border-neutral-300">
                    TOTAIS
                  </td>
                  <td colSpan={6} className="py-2.5 px-2 border-r border-neutral-300 text-neutral-600">
                    {filteredRecords.length} ORDEM(NS) DE SERVIÇO EM DADOS_RAIZEN
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-black text-red-700 border-r border-neutral-300 whitespace-nowrap">
                    {totalVolume > 0
                      ? `${totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`
                      : '-'}
                  </td>
                  <td colSpan={4} className="py-2.5 px-2 text-neutral-500 text-[10px]">
                    Operação WFS / Raízen
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
  );
};
