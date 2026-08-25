import { AbastecimentoRecord } from '../types';

export function exportToCSV(records: AbastecimentoRecord[], filename: string = 'abastecimentos.csv') {
  const headers = [
    'Número',
    'Forma de Pagamento',
    'Cliente',
    'Hora da Chegada',
    'Início do Abastecimento',
    'Produto',
    'Volume (L)',
    'Obs.:',
    'Assinatura do Cliente',
    'ID Arquivo Drive',
    'Link da Foto no Drive',
    'Data de Registro',
  ];

  const rows = records.map((r) => [
    `"${r.numero || ''}"`,
    `"${r.formaPagamento || ''}"`,
    `"${(r.cliente || '').replace(/"/g, '""')}"`,
    `"${r.horaChegada || ''}"`,
    `"${r.inicioAbastecimento || ''}"`,
    `"${r.produto || ''}"`,
    `"${r.volume || ''}"`,
    `"${(r.obs || '').replace(/"/g, '""')}"`,
    `"${(r.assinaturaCliente || '').replace(/"/g, '""')}"`,
    `"${r.driveFileId || ''}"`,
    `"${r.driveFileUrl || ''}"`,
    `"${new Date(r.dataCriacao).toLocaleString('pt-BR')}"`,
  ]);

  // Include UTF-8 BOM so Excel opens with correct Portuguese accents
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyTableAsTSV(records: AbastecimentoRecord[]): Promise<boolean> {
  const headers = [
    'Número',
    'Forma de Pagamento',
    'Cliente',
    'Hora da Chegada',
    'Início do Abastecimento',
    'Produto',
    'Volume',
    'Obs.:',
    'Assinatura do Cliente',
    'Foto da Nota',
  ];

  const rows = records.map((r) => [
    r.numero || '',
    r.formaPagamento || '',
    r.cliente || '',
    r.horaChegada || '',
    r.inicioAbastecimento || '',
    r.produto || '',
    r.volume || '',
    r.obs || '',
    r.assinaturaCliente || '',
    r.driveFileUrl ? r.driveFileUrl : (r.driveFileId ? `ID: ${r.driveFileId}` : (r.fotoBase64 ? 'Imagem Anexada' : '-')),
  ]);

  const tsvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  return navigator.clipboard.writeText(tsvContent).then(() => true).catch(() => false);
}
