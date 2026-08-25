export interface AbastecimentoRecord {
  id: string;
  numero: string;
  formaPagamento: string;
  cliente: string;
  horaChegada: string;
  inicioAbastecimento: string;
  produto: string;
  volume: string;
  obs: string;
  assinaturaCliente: string;
  fotoBase64?: string;
  fotoMimeType?: string;
  fileName?: string;
  driveFileId?: string;
  driveFileUrl?: string;
  dataCriacao: string;
  statusEnvio: 'pendente' | 'enviado_drive' | 'erro';
  statusMsg?: string;
}

export interface GasConfig {
  webhookUrl: string;
  folderId?: string;
  autoUploadToDrive: boolean;
  geminiApiKey?: string;
}

export interface ExtractedReceiptData {
  numero: string;
  formaPagamento: string;
  cliente: string;
  horaChegada: string;
  inicioAbastecimento: string;
  produto: string;
  volume: string;
  obs: string;
  assinaturaCliente: string;
  confidenceNotes?: string;
}
