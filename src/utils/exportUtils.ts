import ExcelJS from 'exceljs';
import { AbastecimentoRecord } from '../types';
import { parseVolumeFloat, parseCurrencyFloat, formatCurrencyBRL } from './dateUtils';

/**
 * Exports data directly to native Excel (.xlsx) workbook with formatted headers and widths
 * Matching the exact columns of the official Raízen Google Sheet (A to N):
 * A: Número
 * B: Data do Abastecimento
 * C: Forma de Pagamento
 * D: Cliente
 * E: Hora da Chegada
 * F: Início do Abastecimento
 * G: Término do Abastecimento
 * H: Produto
 * I: Volume
 * J: Obs.:
 * K: Assinatura do Cliente
 * L: Foto da Nota
 * M: Valor/Litro
 * N: Valor Total
 */
export async function exportToExcelXLSX(records: AbastecimentoRecord[], filename: string = 'Dados_Raizen_Abastecimento.xlsx') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WFS Raízen Sistema de Abastecimento';
  workbook.lastModifiedBy = 'WFS Raízen';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Dados_Raizen', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'Número', key: 'numero', width: 16 },
    { header: 'Data do Abastecimento', key: 'dataAbastecimento', width: 22 },
    { header: 'Forma de Pagamento', key: 'formaPagamento', width: 22 },
    { header: 'Cliente', key: 'cliente', width: 34 },
    { header: 'Hora da Chegada', key: 'horaChegada', width: 18 },
    { header: 'Início do Abastecimento', key: 'inicioAbastecimento', width: 24 },
    { header: 'Término do Abastecimento', key: 'terminoAbastecimento', width: 24 },
    { header: 'Produto', key: 'produto', width: 16 },
    { header: 'Volume', key: 'volume', width: 16 },
    { header: 'Obs.:', key: 'obs', width: 26 },
    { header: 'Assinatura do Cliente', key: 'assinaturaCliente', width: 24 },
    { header: 'Foto da Nota', key: 'fotoNota', width: 42 },
    { header: 'Valor/Litro', key: 'valorLitro', width: 18 },
    { header: 'Valor Total', key: 'valorTotal', width: 20 },
  ];

  // Header Styling (Raízen Red #E31B23)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE31B23' },
    };
    cell.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFC2151C' } },
      bottom: { style: 'medium', color: { argb: 'FFA01015' } },
      left: { style: 'thin', color: { argb: 'FFC2151C' } },
      right: { style: 'thin', color: { argb: 'FFC2151C' } },
    };
  });

  records.forEach((r, idx) => {
    const volNum = parseVolumeFloat(r.volume);
    const precoNum = parseCurrencyFloat(r.valorLitro);
    let totalNum = parseCurrencyFloat(r.valorTotal);
    
    let totalStr = r.valorTotal?.trim() || '';
    if ((!totalStr || totalStr === '-' || totalNum === 0) && precoNum > 0 && volNum > 0) {
      totalStr = formatCurrencyBRL(volNum * precoNum);
    } else if (totalNum > 0 && !totalStr.includes('R$')) {
      totalStr = formatCurrencyBRL(totalNum);
    }

    let precoStr = r.valorLitro?.trim() || '';
    if (precoNum > 0 && !precoStr.includes('R$')) {
      precoStr = formatCurrencyBRL(precoNum);
    } else if (!precoStr) {
      precoStr = '-';
    }

    const row = worksheet.addRow({
      numero: r.numero || `OS-${String(idx + 1).padStart(4, '0')}`,
      dataAbastecimento: r.dataAbastecimento || (r.dataCriacao ? new Date(r.dataCriacao).toLocaleDateString('pt-BR') : '-'),
      formaPagamento: r.formaPagamento || 'CONTRATO',
      cliente: r.cliente || 'WFS AEROPORTO',
      horaChegada: r.horaChegada || '-',
      inicioAbastecimento: r.inicioAbastecimento || '-',
      terminoAbastecimento: r.terminoAbastecimento || '-',
      produto: r.produto || 'DIESEL',
      volume: r.volume ? r.volume.replace('.', ',') : '0,00',
      obs: r.obs || '-',
      assinaturaCliente: r.assinaturaCliente || '-',
      fotoNota: r.driveFileUrl || (r.driveFileId ? `https://drive.google.com/file/d/${r.driveFileId}/view` : (r.fileName || 'Foto Anexada')),
      valorLitro: precoStr,
      valorTotal: totalStr || '-',
    });

    row.height = 22;
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle' };
      if (!isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };

      // Alignment specific columns
      if (colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 6 || colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 9 || colNumber === 13 || colNumber === 14) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports data to CSV with UTF-8 BOM for perfect Excel compatibility in Portuguese
 */
export function exportToCSV(records: AbastecimentoRecord[], filename: string = 'Dados_Raizen_Abastecimento.csv') {
  const headers = [
    'Número',
    'Data do Abastecimento',
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
    'Valor/Litro',
    'Valor Total',
  ];

  const rows = records.map((r, idx) => {
    const volNum = parseVolumeFloat(r.volume);
    const precoNum = parseCurrencyFloat(r.valorLitro);
    let totalNum = parseCurrencyFloat(r.valorTotal);
    
    let totalStr = r.valorTotal?.trim() || '';
    if ((!totalStr || totalStr === '-' || totalNum === 0) && precoNum > 0 && volNum > 0) {
      totalStr = formatCurrencyBRL(volNum * precoNum);
    } else if (totalNum > 0 && !totalStr.includes('R$')) {
      totalStr = formatCurrencyBRL(totalNum);
    }

    let precoStr = r.valorLitro?.trim() || '';
    if (precoNum > 0 && !precoStr.includes('R$')) {
      precoStr = formatCurrencyBRL(precoNum);
    } else if (!precoStr) {
      precoStr = '-';
    }

    return [
      `"${r.numero || `OS-${String(idx + 1).padStart(4, '0')}`}"`,
      `"${r.dataAbastecimento || (r.dataCriacao ? new Date(r.dataCriacao).toLocaleDateString('pt-BR') : '-')}"`,
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
      `"${precoStr}"`,
      `"${totalStr || '-'}"`,
    ];
  });

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
    'Data do Abastecimento',
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
    'Valor/Litro',
    'Valor Total',
  ];

  const rows = records.map((r, idx) => {
    const volNum = parseVolumeFloat(r.volume);
    const precoNum = parseCurrencyFloat(r.valorLitro);
    let totalNum = parseCurrencyFloat(r.valorTotal);
    
    let totalStr = r.valorTotal?.trim() || '';
    if ((!totalStr || totalStr === '-' || totalNum === 0) && precoNum > 0 && volNum > 0) {
      totalStr = formatCurrencyBRL(volNum * precoNum);
    } else if (totalNum > 0 && !totalStr.includes('R$')) {
      totalStr = formatCurrencyBRL(totalNum);
    }

    let precoStr = r.valorLitro?.trim() || '';
    if (precoNum > 0 && !precoStr.includes('R$')) {
      precoStr = formatCurrencyBRL(precoNum);
    } else if (!precoStr) {
      precoStr = '-';
    }

    return [
      r.numero || `OS-${String(idx + 1).padStart(4, '0')}`,
      r.dataAbastecimento || (r.dataCriacao ? new Date(r.dataCriacao).toLocaleDateString('pt-BR') : '-'),
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
      precoStr,
      totalStr || '-',
    ];
  });

  const tsvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  return navigator.clipboard.writeText(tsvContent).then(() => true).catch(() => false);
}
