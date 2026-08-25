import * as XLSX from 'xlsx';
import { AbastecimentoRecord } from '../types';

/**
 * Exports data directly to native Excel (.xlsx) workbook with formatted headers and widths
 * Matching the exact columns of the official Raízen Google Sheet (A to K):
 * A: Número
 * B: Forma de Pagamento
 * C: Cliente
 * D: Hora da Chegada
 * E: Início do Abastecimento
 * F: Término do Abastecimento
 * G: Produto
 * H: Volume
 * I: Obs.:
 * J: Assinatura do Cliente
 * K: Foto da Nota
 */
export function exportToExcelXLSX(records: AbastecimentoRecord[], filename: string = 'Dados_Raizen_Abastecimento.xlsx') {
  const data = records.map((r, idx) => ({
    'Número': r.numero || `OS-${String(idx + 1).padStart(4, '0')}`,
    'Forma de Pagamento': r.formaPagamento || 'CONTRATO',
    'Cliente': r.cliente || 'WFS AEROPORTO',
    'Hora da Chegada': r.horaChegada || '-',
    'Início do Abastecimento': r.inicioAbastecimento || '-',
    'Término do Abastecimento': r.terminoAbastecimento || '-',
    'Produto': r.produto || 'DIESEL',
    'Volume': r.volume ? r.volume.replace('.', ',') : '0,00',
    'Obs.:': r.obs || '-',
    'Assinatura do Cliente': r.assinaturaCliente || '-',
    'Foto da Nota': r.driveFileUrl || (r.driveFileId ? `https://drive.google.com/file/d/${r.driveFileId}/view` : (r.fileName || 'Foto Anexada')),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths matching A to K
  worksheet['!cols'] = [
    { wch: 16 }, // A: Número
    { wch: 22 }, // B: Forma de Pagamento
    { wch: 34 }, // C: Cliente
    { wch: 18 }, // D: Hora da Chegada
    { wch: 24 }, // E: Início do Abastecimento
    { wch: 24 }, // F: Término do Abastecimento
    { wch: 16 }, // G: Produto
    { wch: 14 }, // H: Volume
    { wch: 26 }, // I: Obs.:
    { wch: 24 }, // J: Assinatura do Cliente
    { wch: 40 }, // K: Foto da Nota
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados_Raizen');
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Exports data to CSV with UTF-8 BOM for perfect Excel compatibility in Portuguese
 */
export function exportToCSV(records: AbastecimentoRecord[], filename: string = 'Dados_Raizen_Abastecimento.csv') {
  const headers = [
    'Número',
    'Forma de Pagamento',
    'Cliente',
    'Hora da Chegada',
    'Início do Abastecimento',
    'Término do Abastecimento',
    'Produto',
    'Volume',
    'Obs.:',
    'Assinatura do Cliente',
    'Foto da Nota',
  ];

  const rows = records.map((r, idx) => [
    `"${r.numero || `OS-${String(idx + 1).padStart(4, '0')}`}"`,
    `"${r.formaPagamento || 'CONTRATO'}"`,
    `"${(r.cliente || 'WFS AEROPORTO').replace(/"/g, '""')}"`,
    `"${r.horaChegada || '-'}"`,
    `"${r.inicioAbastecimento || '-'}"`,
    `"${r.terminoAbastecimento || '-'}"`,
    `"${r.produto || 'DIESEL'}"`,
    `"${r.volume || '0,00'}"`,
    `"${(r.obs || '-').replace(/"/g, '""')}"`,
    `"${(r.assinaturaCliente || '-').replace(/"/g, '""')}"`,
    `"${r.driveFileUrl || (r.driveFileId ? `https://drive.google.com/file/d/${r.driveFileId}/view` : (r.fileName || 'Foto Anexada'))}"`,
  ]);

  // Include UTF-8 BOM so Excel opens with correct Portuguese accents and semicolons
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies the entire spreadsheet data formatted as TSV for pasting directly into Excel or Google Sheets
 */
export function copyTableAsTSV(records: AbastecimentoRecord[]): Promise<boolean> {
  const headers = [
    'Número',
    'Forma de Pagamento',
    'Cliente',
    'Hora da Chegada',
    'Início do Abastecimento',
    'Término do Abastecimento',
    'Produto',
    'Volume',
    'Obs.:',
    'Assinatura do Cliente',
    'Foto da Nota',
  ];

  const rows = records.map((r, idx) => [
    r.numero || `OS-${String(idx + 1).padStart(4, '0')}`,
    r.formaPagamento || 'CONTRATO',
    r.cliente || 'WFS AEROPORTO',
    r.horaChegada || '-',
    r.inicioAbastecimento || '-',
    r.terminoAbastecimento || '-',
    r.produto || 'DIESEL',
    r.volume || '0,00',
    r.obs || '-',
    r.assinaturaCliente || '-',
    r.driveFileUrl || (r.driveFileId ? `https://drive.google.com/file/d/${r.driveFileId}/view` : (r.fileName || 'Foto Anexada')),
  ]);

  const tsvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  return navigator.clipboard.writeText(tsvContent).then(() => true).catch(() => false);
}
