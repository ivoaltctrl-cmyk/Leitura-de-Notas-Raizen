import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Copy,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  HardDrive,
  Filter,
  Image as ImageIcon,
  Check,
  Fuel,
  TrendingUp,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { AbastecimentoRecord, GasConfig } from '../types';
import { exportToCSV, copyTableAsTSV } from '../utils/exportUtils';
import { uploadImageToGoogleDrive } from '../utils/driveService';

interface SpreadsheetTabProps {
  records: AbastecimentoRecord[];
  onUpdateRecord: (updated: AbastecimentoRecord) => void;
  onDeleteRecord: (id: string) => void;
  onOpenUploadTab: () => void;
  onPreviewReceipt: (record: AbastecimentoRecord) => void;
  gasConfig: GasConfig;
}

export const SpreadsheetTab: React.FC<SpreadsheetTabProps> = ({
  records,
  onUpdateRecord,
  onDeleteRecord,
  onOpenUploadTab,
  onPreviewReceipt,
  gasConfig,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProduto, setFilterProduto] = useState('ALL');
  const [filterCliente, setFilterCliente] = useState('ALL');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        r.numero?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cliente?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.obs?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.assinaturaCliente?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.produto?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchProd = filterProduto === 'ALL' || r.produto === filterProduto;
      const matchCli = filterCliente === 'ALL' || r.cliente === filterCliente;

      return matchSearch && matchProd && matchCli;
    });
  }, [records, searchQuery, filterProduto, filterCliente]);

  // Unique clients and products for dropdown filters
  const uniqueProducts = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.produto && set.add(r.produto));
    return Array.from(set);
  }, [records]);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.cliente && set.add(r.cliente));
    return Array.from(set);
  }, [records]);

  // Calculate totals
  const totalVolume = useMemo(() => {
    return records.reduce((acc, r) => {
      const cleanVal = parseFloat((r.volume || '0').replace(/\./g, '').replace(',', '.'));
      return isNaN(cleanVal) ? acc : acc + cleanVal;
    }, 0);
  }, [records]);

  const driveCount = useMemo(() => {
    return records.filter((r) => r.statusEnvio === 'enviado_drive' || r.driveFileId).length;
  }, [records]);

  // Copy to clipboard formatted for Google Sheets
  const handleCopyTSV = async () => {
    const success = await copyTableAsTSV(filteredRecords);
    if (success) {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  // Sync all pending records to Google Drive
  const handleSyncAllPending = async () => {
    if (!gasConfig.webhookUrl) {
      alert('Por favor, configure a URL do Google Apps Script primeiro nas configurações.');
      return;
    }

    const pending = records.filter((r) => r.statusEnvio === 'pendente' && r.fotoBase64);
    if (pending.length === 0) {
      alert('Nenhum registro pendente com foto anexada para sincronizar.');
      return;
    }

    setSyncingAll(true);
    for (const rec of pending) {
      try {
        const uploadRes = await uploadImageToGoogleDrive(
          gasConfig.webhookUrl,
          rec.fotoBase64!,
          rec.fileName || `OS_${rec.numero}.jpg`,
          rec.fotoMimeType || 'image/jpeg',
          rec
        );

        if (uploadRes.sucesso) {
          onUpdateRecord({
            ...rec,
            driveFileId: uploadRes.fileId,
            driveFileUrl: uploadRes.driveUrl,
            statusEnvio: 'enviado_drive',
            statusMsg: 'Salvo com sucesso no Drive',
          });
        }
      } catch (e) {
        console.error('Erro ao sincronizar:', e);
      }
    }
    setSyncingAll(false);
  };

  // Selected row for the formula bar
  const selectedRecord = useMemo(() => {
    return records.find((r) => r.id === selectedRowId) || filteredRecords[0] || null;
  }, [records, selectedRowId, filteredRecords]);

  // Pad table with empty rows to look exactly like Google Sheets screenshot
  const emptyRowsNeeded = Math.max(0, 10 - filteredRecords.length);

  return (
    <div className="space-y-4">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 block">Total de Registros</span>
            <span className="text-lg font-bold text-neutral-900">{records.length} notas</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 block">Volume Total Abastecido</span>
            <span className="text-lg font-bold text-emerald-700 font-mono">
              {totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 block">Arquivadas no Drive</span>
            <span className="text-lg font-bold text-blue-900">
              {driveCount} de {records.length}
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-neutral-600" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 block">Status de Sincronia</span>
            <span className="text-xs font-bold text-neutral-800">
              {gasConfig.webhookUrl ? 'Drive Conectado' : 'Apenas Local'}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar / Actions Bar */}
      <div className="bg-white rounded-xl p-3 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              id="input-search-records"
              type="text"
              placeholder="Buscar por número, cliente, obs, produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 text-neutral-800 bg-neutral-50/50"
            />
          </div>

          {uniqueProducts.length > 0 && (
            <select
              value={filterProduto}
              onChange={(e) => setFilterProduto(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-700 font-medium"
            >
              <option value="ALL">Todos Produtos</option>
              {uniqueProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}

          {uniqueClients.length > 0 && (
            <select
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-700 font-medium max-w-[180px] truncate"
            >
              <option value="ALL">Todos Clientes</option>
              {uniqueClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {records.some((r) => r.statusEnvio === 'pendente' && r.fotoBase64) && (
            <button
              onClick={handleSyncAllPending}
              disabled={syncingAll}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
              Sincronizar com Drive
            </button>
          )}

          <button
            id="btn-copy-tsv"
            onClick={handleCopyTSV}
            className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copiar em formato tabulado para colar diretamente no Google Planilhas (Ctrl+V)"
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copiado p/ Planilha!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Tabela (Colar no Planilhas)</span>
              </>
            )}
          </button>

          <button
            id="btn-export-csv"
            onClick={() => exportToCSV(filteredRecords)}
            className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onOpenUploadTab}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Nota</span>
          </button>
        </div>
      </div>

      {/* Google Sheets Formula Bar Lookalike */}
      <div className="bg-neutral-100 border border-neutral-300 rounded-t-lg px-3 py-1.5 flex items-center space-x-2 text-xs font-mono text-neutral-600">
        <span className="font-bold text-neutral-800 px-2 py-0.5 bg-white border border-neutral-300 rounded">
          {selectedRecord ? `A${records.indexOf(selectedRecord) + 2}` : 'A2'}
        </span>
        <span className="italic text-neutral-400 font-serif font-bold text-sm select-none">fx</span>
        <div className="flex-1 bg-white border border-neutral-300 px-2.5 py-0.5 rounded text-neutral-800 font-sans truncate">
          {selectedRecord
            ? `${selectedRecord.numero} | ${selectedRecord.cliente} | ${selectedRecord.produto} | ${selectedRecord.volume} L`
            : 'Selecione uma linha para visualizar'}
        </div>
      </div>

      {/* SPREADSHEET TABLE: Exact Google Sheets styling matching the user's reference image */}
      <div className="bg-white border-x border-b border-neutral-300 rounded-b-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans select-text">
            {/* Top Coordinate Row (A, B, C, D, E, F, G, H, I, J) */}
            <thead>
              <tr className="bg-neutral-200 text-neutral-600 text-[11px] font-mono border-b border-neutral-300 select-none">
                <th className="w-10 px-2 py-1 text-center font-medium border-r border-neutral-300 bg-neutral-300/80"></th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">A</th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">B</th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">C</th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">D</th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">E</th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">F</th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">G</th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">H</th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">I</th>
                <th className="px-3 py-1 text-center font-medium border-r border-neutral-300">J</th>
                <th className="w-16 px-2 py-1 text-center font-medium">Ações</th>
              </tr>

              {/* ROW 1: THE ICONIC RED HEADER (Exact copy of the user's uploaded image) */}
              <tr className="bg-[#D91424] text-white font-bold border-b border-neutral-300 leading-tight">
                <th className="px-2 py-2 text-center text-white/90 font-mono text-[11px] border-r border-red-700 bg-red-800/60 select-none">
                  1
                </th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap">Número</th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap">Forma de Pagamento</th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap min-w-[220px]">Cliente</th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap text-center">Hora da Chegad</th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap text-center">Início do Abastecimento</th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap">Produto</th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap text-right">Volume</th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap">Obs.:</th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap">Assinatura do Cliente</th>
                <th className="px-3 py-2 border-r border-red-700 whitespace-nowrap text-center">Foto da Nota</th>
                <th className="px-2 py-2 text-center text-white/80 select-none">Opções</th>
              </tr>
            </thead>

            {/* DATA ROWS (Row 2, 3, 4...) */}
            <tbody className="divide-y divide-neutral-200">
              {filteredRecords.map((record, index) => {
                const rowIndex = index + 2;
                const isSelected = selectedRowId === record.id;

                return (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRowId(record.id)}
                    className={`transition-colors hover:bg-neutral-50/80 cursor-pointer ${
                      isSelected ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-400' : 'bg-white'
                    }`}
                  >
                    {/* Row Index (2, 3, 4...) */}
                    <td className="px-2 py-2 text-center font-mono text-[11px] text-neutral-500 bg-neutral-100 border-r border-neutral-300 font-semibold select-none">
                      {rowIndex}
                    </td>

                    {/* Col A: Número */}
                    <td className="px-3 py-2 border-r border-neutral-200 font-mono font-medium text-neutral-900 whitespace-nowrap">
                      {record.numero}
                    </td>

                    {/* Col B: Forma de Pagamento */}
                    <td className="px-3 py-2 border-r border-neutral-200 text-neutral-800 whitespace-nowrap">
                      {record.formaPagamento}
                    </td>

                    {/* Col C: Cliente */}
                    <td className="px-3 py-2 border-r border-neutral-200 font-medium text-neutral-900 whitespace-nowrap">
                      {record.cliente}
                    </td>

                    {/* Col D: Hora da Chegada */}
                    <td className="px-3 py-2 border-r border-neutral-200 text-center font-mono text-neutral-800 whitespace-nowrap">
                      {record.horaChegada || '-'}
                    </td>

                    {/* Col E: Início do Abastecimento */}
                    <td className="px-3 py-2 border-r border-neutral-200 text-center font-mono text-neutral-800 whitespace-nowrap">
                      {record.inicioAbastecimento || '-'}
                    </td>

                    {/* Col F: Produto */}
                    <td className="px-3 py-2 border-r border-neutral-200 font-semibold text-neutral-800 whitespace-nowrap">
                      {record.produto}
                    </td>

                    {/* Col G: Volume */}
                    <td className="px-3 py-2 border-r border-neutral-200 text-right font-mono font-bold text-neutral-900 whitespace-nowrap">
                      {record.volume}
                    </td>

                    {/* Col H: Obs.: */}
                    <td className="px-3 py-2 border-r border-neutral-200 text-neutral-700 whitespace-nowrap font-mono text-xs">
                      {record.obs || '-'}
                    </td>

                    {/* Col I: Assinatura do Cliente */}
                    <td className="px-3 py-2 border-r border-neutral-200 text-neutral-800 whitespace-nowrap">
                      {record.assinaturaCliente || '-'}
                    </td>

                    {/* Col J: Foto da Nota (Link or Preview) */}
                    <td className="px-3 py-2 border-r border-neutral-200 text-center whitespace-nowrap">
                      {record.fotoBase64 || record.driveFileId ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewReceipt(record);
                            }}
                            className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold flex items-center gap-1 border border-neutral-300 cursor-pointer shadow-2xs"
                            title="Visualizar foto da nota"
                          >
                            <Eye className="w-3 h-3 text-neutral-600" />
                            <span>Ver Foto</span>
                          </button>

                          {record.driveFileId && (
                            <a
                              href={record.driveFileUrl || `https://drive.google.com/file/d/${record.driveFileId}/view`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 cursor-pointer"
                              title="Abrir no Google Drive"
                            >
                              <HardDrive className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Deseja excluir o registro da nota #${record.numero}?`)) {
                            onDeleteRecord(record.id);
                          }
                        }}
                        className="p-1 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer transition-colors"
                        title="Excluir linha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Empty grid rows for authentic spreadsheet feeling */}
              {Array.from({ length: emptyRowsNeeded }).map((_, i) => {
                const rowIndex = filteredRecords.length + i + 2;
                return (
                  <tr key={`empty-${i}`} className="bg-white hover:bg-neutral-50/50">
                    <td className="px-2 py-2 text-center font-mono text-[11px] text-neutral-400 bg-neutral-100 border-r border-neutral-300 select-none">
                      {rowIndex}
                    </td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-3 py-2 border-r border-neutral-200">&nbsp;</td>
                    <td className="px-2 py-2">&nbsp;</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Spreadsheet Footer status bar */}
        <div className="bg-neutral-100 border-t border-neutral-300 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-neutral-800">
              {filteredRecords.length} {filteredRecords.length === 1 ? 'linha' : 'linhas'}
            </span>
            <span className="text-neutral-400">•</span>
            <span>
              Soma Volume:{' '}
              <strong className="text-neutral-900 font-mono">
                {totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-neutral-500">
            <span>💡 Dica: Clique em "Copiar Tabela" e dê Ctrl+V direto no Google Planilhas!</span>
          </div>
        </div>
      </div>
    </div>
  );
};
