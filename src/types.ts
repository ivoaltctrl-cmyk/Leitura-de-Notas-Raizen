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
}

export interface GasConfig {
  webhookUrl: string;
  sheetUrl?: string;
  folderId?: string;
  autoUploadToDrive: boolean;
}
