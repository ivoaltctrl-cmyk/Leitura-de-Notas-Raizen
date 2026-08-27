export interface AbastecimentoRecord {
  id: string;
  numero?: string;
  dataAbastecimento?: string;
  fotoBase64?: string;
  fotoMimeType?: string;
  fileName: string;
  fileSize?: number;
  driveFileId?: string;
  driveFileUrl?: string;
  dataCriacao: string;
  statusEnvio: 'enviado_drive' | 'pendente' | 'erro';
  statusMsg?: string;
  // Metadata fields:
  formaPagamento?: string;
  cliente?: string;
  horaChegada?: string;
  inicioAbastecimento?: string;
  terminoAbastecimento?: string;
  produto?: string;
  volume?: string;
  obs?: string;
  assinaturaCliente?: string;
  // Financial fields (Colunas M e N na planilha):
  valorLitro?: string; // ex: "5,89" ou "R$ 5,89"
  valorTotal?: string; // ex: "1.319,36" ou "R$ 1.319,36" (volume * valorLitro)
}

export interface GasConfig {
  webhookUrl: string;
  secretToken?: string;
  sheetUrl?: string;
  folderId?: string;
  autoUploadToDrive: boolean;
}
