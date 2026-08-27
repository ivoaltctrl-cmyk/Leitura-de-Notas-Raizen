import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  Database,
  GitMerge,
  Copy,
  Code2,
  Download,
  Upload,
  ClipboardCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  DEFAULT_SPREADSHEET_ID,
  getStoredSpreadsheetId,
  saveStoredSpreadsheetId,
  getStoredWebhookUrl,
  saveStoredWebhookUrl,
  pullAllFromSheets,
  pushAllToSheets,
  smartMergeData,
  parseCsvRows,
  convertSstRowsToEmployees,
  convertTrabRowsToTrabalhistas,
  convertContractRowsToContracts,
  APPS_SCRIPT_CODE_TEMPLATE,
  SHEET_TABS,
} from '../services/googleSheetsService.ts';
import { Employee, Contract, TrabalhistaEnvio, AreaResponsavel, BrandConfig } from '../types/index.ts';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  contracts: Contract[];
  trabalhistas: TrabalhistaEnvio[];
  areas: AreaResponsavel[];
  onApplyImportedData: (data: {
    employees?: Employee[];
    contracts?: Contract[];
    trabalhistas?: TrabalhistaEnvio[];
    areas?: AreaResponsavel[];
  }) => void;
  brand?: BrandConfig;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  employees,
  contracts,
  trabalhistas,
  areas,
  onApplyImportedData,
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState(getStoredSpreadsheetId());
  const [webhookUrl, setWebhookUrl] = useState(getStoredWebhookUrl());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeTabPreview, setActiveTabPreview] = useState<'sst' | 'trabalhistas' | 'contratuais'>('sst');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedData, setCopiedData] = useState(false);

  useEffect(() => {
    setSpreadsheetId(getStoredSpreadsheetId());
    setWebhookUrl(getStoredWebhookUrl());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    saveStoredSpreadsheetId(spreadsheetId);
    saveStoredWebhookUrl(webhookUrl);
    setStatusMessage({ type: 'success', text: 'Configurações de conexão salvas com sucesso!' });
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  /**
   * Importação e Mesclagem Inteligente (Sem script e sem login)
   */
  const handleImportMergeFromSheets = async () => {
    setLoadingAction('merge');
    setStatusMessage(null);
    try {
      saveStoredSpreadsheetId(spreadsheetId);
      saveStoredWebhookUrl(webhookUrl);

      const imported = await pullAllFromSheets(spreadsheetId, undefined, webhookUrl);

      if (imported.employees.length === 0 && imported.contracts.length === 0 && imported.trabalhistas.length === 0) {
        setStatusMessage({
          type: 'info',
          text: 'A planilha foi lida com sucesso, mas não possui novos registros preenchidos abaixo dos cabeçalhos.',
        });
        return;
      }

      // Mesclagem Inteligente (Sem Conflito de IDs / Upsert)
      const merged = smartMergeData(
        { employees, trabalhistas, contracts },
        imported
      );

      onApplyImportedData({
        employees: merged.employees,
        contracts: merged.contracts,
        trabalhistas: merged.trabalhistas,
      });

      setStatusMessage({
        type: 'success',
        text: `Sincronização concluída diretamente com a planilha GPA_BD! +${merged.stats.newEmployees} novos colaboradores, ${merged.stats.updatedEmployees} atualizados, ${merged.stats.newContracts} contratos e ${merged.stats.newTrabalhistas} envios trabalhistas mesclados sem perdas!`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erro ao ler dados da planilha.',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  /**
   * Copia todas as linhas formatadas para o Clipboard (Ctrl+V direto no Google Sheets)
   */
  const handleCopyRowsForSheets = () => {
    try {
      const rows = employees.map((emp) => {
        const getDoc = (type: string) => emp.pendencias?.find((p) => p.tipo === type);
        const osDoc = getDoc('ORDEM_DE_SERVICO');
        const asoDoc = getDoc('ATESTADO_SAUDE_OCUPACIONAL');
        const epiDoc = getDoc('FICHA_EPI');
        const nrDoc = getDoc('TREINAMENTO_NR') || getDoc('TREINAMENTO_RADIOPROTECAO');
        const docClean = emp.cpf ? emp.cpf.replace(/\D/g, '') : emp.matricula || '';

        return [
          docClean,
          emp.nome,
          emp.cargo || 'AGENTE DE PROTECAO',
          emp.setor || emp.areaNome || 'GRU SEGURANCA CANAL DE II',
          emp.statusGeral === 'EM_DIA' ? 'A' : 'A',
          emp.contratoNome || emp.contratoId || '1',
          '5007113000132',
          osDoc ? osDoc.status : 'EM_DIA',
          osDoc?.dataVencimento || '2027-01-01',
          asoDoc ? asoDoc.status : 'EM_DIA',
          asoDoc?.dataVencimento || '2027-01-01',
          epiDoc ? epiDoc.status : 'EM_DIA',
          epiDoc?.dataVencimento || '2027-01-01',
          nrDoc ? nrDoc.status : 'EM_DIA',
          nrDoc?.dataVencimento || '2027-01-01',
          `Conformidade: ${emp.indicadorPercentual || 100}%`,
        ].join('\t');
      });

      const tsvText = rows.join('\n');
      navigator.clipboard.writeText(tsvText);
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 4000);
      setStatusMessage({
        type: 'success',
        text: `Copiado com sucesso! Agora basta abrir sua planilha GPA_BD na aba "Pendências SST", clicar na célula A2 e apertar Ctrl + V.`,
      });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: `Erro ao copiar: ${e.message}` });
    }
  };

  /**
   * Baixa a planilha Excel (.xlsx) com as 3 abas oficiais formatadas
   */
  const handleDownloadFullExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Aba Pendências SST
      const sstData = [
        [
          'Documento',
          'Nome do Colaborador *',
          'Cargo / Função *',
          'Área / Setor *',
          'STATUS',
          'Contrato',
          'CNPJ',
          'Ordem de Serviço (NR-01) [EM_DIA / PENDENTE / VENCIDO]',
          'Validade OS (AAAA-MM-DD)',
          'ASO Ocupacional (NR-07) [EM_DIA / PENDENTE / VENCIDO]',
          'Validade ASO (AAAA-MM-DD)',
          'Ficha de EPI (NR-06) [EM_DIA / PENDENTE / VENCIDO]',
          'Validade Ficha EPI (AAAA-MM-DD)',
          'Treinamento / Certificação Técnica [EM_DIA / PENDENTE / VENCIDO / N_A]',
          'Validade Certificado (AAAA-MM-DD)',
          'Observações',
        ],
        ...employees.map((emp) => {
          const getDoc = (type: string) => emp.pendencias?.find((p) => p.tipo === type);
          const osDoc = getDoc('ORDEM_DE_SERVICO');
          const asoDoc = getDoc('ATESTADO_SAUDE_OCUPACIONAL');
          const epiDoc = getDoc('FICHA_EPI');
          const nrDoc = getDoc('TREINAMENTO_NR') || getDoc('TREINAMENTO_RADIOPROTECAO');
          const docClean = emp.cpf ? emp.cpf.replace(/\D/g, '') : emp.matricula || '';

          return [
            docClean,
            emp.nome,
            emp.cargo || 'AGENTE DE PROTECAO',
            emp.setor || emp.areaNome || 'GRU SEGURANCA CANAL DE II',
            emp.statusGeral === 'EM_DIA' ? 'A' : 'A',
            emp.contratoNome || emp.contratoId || '1',
            '5007113000132',
            osDoc ? osDoc.status : 'EM_DIA',
            osDoc?.dataVencimento || '2027-01-01',
            asoDoc ? asoDoc.status : 'EM_DIA',
            asoDoc?.dataVencimento || '2027-01-01',
            epiDoc ? epiDoc.status : 'EM_DIA',
            epiDoc?.dataVencimento || '2027-01-01',
            nrDoc ? nrDoc.status : 'EM_DIA',
            nrDoc?.dataVencimento || '2027-01-01',
            `Conformidade: ${emp.indicadorPercentual || 100}%`,
          ];
        }),
      ];
      const wsSst = XLSX.utils.aoa_to_sheet(sstData);
      XLSX.utils.book_append_sheet(wb, wsSst, SHEET_TABS.SST);

      // 2. Aba Pendências trabalhistas
      const trabData = [
        ['Mês', 'Ano', 'Envio', 'Status'],
        ...trabalhistas.map((t) => [
          Number(t.mes) || 1,
          Number(t.ano) || 2026,
          t.dataEnvio || new Date().toLocaleString('pt-BR'),
          t.status || 'Validado',
        ]),
      ];
      const wsTrab = XLSX.utils.aoa_to_sheet(trabData);
      XLSX.utils.book_append_sheet(wb, wsTrab, SHEET_TABS.TRABALHISTAS);

      // 3. Aba Pendências Contratuais
      const contData = [
        ['Contrato', 'Objeto do Contrato', 'Categoria', 'Início', 'Término', 'Status', 'Documentos'],
        ...contracts.map((c) => [
          c.numero || c.id,
          c.objeto || c.titulo || 'PRESTAÇÃO DE SERVIÇOS',
          c.categoria || 'ESATA',
          c.dataInicio || c.vigenciaInicio || '01/10/2020',
          c.dataTermino || c.vigenciaFim || '30/11/2026',
          c.statusVigencia || (c.status === 'ATIVO' ? 'Vigente' : 'Vencido'),
          c.statusDocumentos || 'Validado',
        ]),
      ];
      const wsCont = XLSX.utils.aoa_to_sheet(contData);
      XLSX.utils.book_append_sheet(wb, wsCont, SHEET_TABS.CONTRATUAIS);

      const fileName = `GPA_BD_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setStatusMessage({
        type: 'success',
        text: `Arquivo "${fileName}" gerado e baixado com sucesso contendo as 3 abas oficiais!`,
      });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: `Erro ao exportar Excel: ${e.message}` });
    }
  };

  /**
   * Importação Manual por Arquivo CSV / Excel (Fallback 100% local)
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const rows = parseCsvRows(text);

        if (rows.length < 2) {
          setStatusMessage({ type: 'error', text: 'O arquivo selecionado está vazio ou sem linhas de dados.' });
          return;
        }

        const headerStr = rows[0].join(' ').toLowerCase();
        if (headerStr.includes('nome') || headerStr.includes('aso') || headerStr.includes('epi') || headerStr.includes('documento')) {
          const importedEmps = convertSstRowsToEmployees(rows);
          const merged = smartMergeData({ employees, trabalhistas, contracts }, { employees: importedEmps, trabalhistas: [], contracts: [] });
          onApplyImportedData({ employees: merged.employees });
          setStatusMessage({
            type: 'success',
            text: `Arquivo CSV de SST importado com sucesso! ${importedEmps.length} colaboradores mesclados.`,
          });
        } else if (headerStr.includes('contrato') || headerStr.includes('objeto')) {
          const importedCtrs = convertContractRowsToContracts(rows);
          const merged = smartMergeData({ employees, trabalhistas, contracts }, { employees: [], trabalhistas: [], contracts: importedCtrs });
          onApplyImportedData({ contracts: merged.contracts });
          setStatusMessage({
            type: 'success',
            text: `Arquivo de Contratos importado com sucesso! ${importedCtrs.length} contratos mesclados.`,
          });
        } else {
          const importedEmps = convertSstRowsToEmployees(rows);
          const merged = smartMergeData({ employees, trabalhistas, contracts }, { employees: importedEmps, trabalhistas: [], contracts: [] });
          onApplyImportedData({ employees: merged.employees });
          setStatusMessage({
            type: 'success',
            text: `Dados importados: ${importedEmps.length} colaboradores mesclados com sucesso!`,
          });
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: `Erro ao processar arquivo: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Planilha Oficial GPA_BD
                </span>
                <span className="text-[10px] font-mono text-slate-400">Sincronização Direta</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                Central de Dados GPA_BD
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
            {statusMessage.type === 'info' && <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* 1. Direct Import Section (Zero Script / Zero Login) */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
              <GitMerge className="w-4 h-4 text-blue-700" />
              <span>1. Importar Dados da Planilha Google (Sem Script / 1 Clique)</span>
            </span>
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
            >
              <span>Abrir Planilha GPA_BD</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-xs text-blue-800 leading-relaxed">
            Lê diretamente as 3 abas da planilha GPA_BD (SST, Trabalhistas e Contratos) e atualiza o painel instantaneamente:
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={handleImportMergeFromSheets}
              disabled={loadingAction === 'merge'}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingAction === 'merge' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Lendo Planilha GPA_BD...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Importar e Mesclar Dados da Planilha Agora</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Direct Export / Paste Options (No Script needed) */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-emerald-700" />
              <span>2. Atualizar ou Salvar na Planilha GPA_BD</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Zero Código / Sem Script
            </span>
          </div>

          <p className="text-xs text-emerald-800 leading-relaxed">
            Escolha como prefere levar os dados do sistema para a planilha:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Copy to Clipboard (Ctrl+V into Google Sheets) */}
            <button
              onClick={handleCopyRowsForSheets}
              className="p-3.5 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100/40 text-emerald-950 text-xs font-bold flex flex-col items-start gap-1 shadow-2xs transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-1.5 text-emerald-800">
                {copiedData ? <ClipboardCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span className="font-black text-xs">Copiar Linhas (Ctrl + V)</span>
              </div>
              <span className="text-[11px] text-slate-600 font-normal">
                Copia os dados formatados. Basta abrir a planilha na célula A2 e apertar <strong>Ctrl + V</strong>.
              </span>
            </button>

            {/* Download Full Excel */}
            <button
              onClick={handleDownloadFullExcel}
              className="p-3.5 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100/40 text-emerald-950 text-xs font-bold flex flex-col items-start gap-1 shadow-2xs transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-1.5 text-emerald-800">
                <Download className="w-4 h-4" />
                <span className="font-black text-xs">Baixar Planilha Excel (.xlsx)</span>
              </div>
              <span className="text-[11px] text-slate-600 font-normal">
                Gera o arquivo Excel completo com as 3 abas oficiais prontas para uso.
              </span>
            </button>
          </div>
        </div>

        {/* 3. Structured Tabs Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Abas Oficiais da Planilha GPA_BD:</span>
            </h4>
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTabPreview('sst')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTabPreview === 'sst' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Pendências SST
              </button>
              <button
                onClick={() => setActiveTabPreview('trabalhistas')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTabPreview === 'trabalhistas' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Pendências trabalhistas
              </button>
              <button
                onClick={() => setActiveTabPreview('contratuais')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTabPreview === 'contratuais' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Pendências Contratuais
              </button>
            </div>
          </div>

          {activeTabPreview === 'sst' && (
            <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-emerald-900 block mb-0.5">Colunas da Aba "Pendências SST":</span>
              <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                A: Documento | B: Nome do Colaborador * | C: Cargo / Função * | D: Área / Setor * | E: STATUS | F: Contrato | G: CNPJ | H: Ordem de Serviço | I: Validade OS | J: ASO | K: Validade ASO | L: EPI | M: Validade EPI | N: Treinamento | O: Validade Certificado | P: Observações
              </p>
            </div>
          )}

          {activeTabPreview === 'trabalhistas' && (
            <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-emerald-900 block mb-0.5">Colunas da Aba "Pendências trabalhistas":</span>
              <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                A: Mês | B: Ano | C: Envio (Data e Hora) | D: Status (Validado / Reprovado / Em Análise)
              </p>
            </div>
          )}

          {activeTabPreview === 'contratuais' && (
            <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-emerald-900 block mb-0.5">Colunas da Aba "Pendências Contratuais":</span>
              <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                A: Contrato | B: Objeto do Contrato | C: Categoria | D: Início | E: Término | F: Status | G: Documentos
              </p>
            </div>
          )}
        </div>

        {/* 4. Advanced / Optional Link Config */}
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>{showAdvancedOptions ? 'Ocultar ID da Planilha' : 'Ver ID da Planilha Vinculada'}</span>
          </button>

          {showAdvancedOptions && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">ID da Planilha Google GPA_BD:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-800"
                />
                <button
                  onClick={handleSaveConfig}
                  className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Importar Arquivo CSV Local</span>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
