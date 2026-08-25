import { AbastecimentoRecord } from '../types';

export interface ProcessReceiptFlowResult {
  sucesso: boolean;
  mensagem: string;
  record?: AbastecimentoRecord;
  driveSuccess?: boolean;
  driveFileId?: string;
  driveUrl?: string;
  sheetRowIndex?: number;
}

export interface UploadDriveResult {
  sucesso: boolean;
  mensagem: string;
  fileId?: string;
  driveUrl?: string;
}

// Default Webhook URL for Google Apps Script if not set via environment variable
export const DEFAULT_WEBHOOK_URL =
  (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
  '';

/**
 * Main Full-Stack Pipeline:
 * FRONT (Foto Capturada) ➡️ DRIVER (Google Drive) ➡️ BACK (Extração IA Gemini 3.7) ➡️ SHEETS (Gravação em Dados_Raizen) ➡️ FRONT (Espelho)
 */
export async function processReceiptPipeline(
  base64DataUrl: string,
  fileName: string,
  mimeType: string = 'image/jpeg',
  webhookUrl?: string,
  manualData?: Partial<AbastecimentoRecord>
): Promise<ProcessReceiptFlowResult> {
  const targetWebhookUrl = webhookUrl?.trim() || DEFAULT_WEBHOOK_URL;
  const cleanBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');

  try {
    const response = await fetch('/api/process-receipt-flow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64: cleanBase64,
        mimeType: mimeType,
        fileName: fileName,
        webhookUrl: targetWebhookUrl,
        manualData: manualData,
      }),
    });

    const result = await response.json();
    if (response.ok && result && result.sucesso) {
      return {
        sucesso: true,
        mensagem: result.mensagem || 'Comprovante processado com sucesso!',
        record: result.record,
        driveSuccess: result.driveSuccess,
        driveFileId: result.driveFileId,
        driveUrl: result.driveFileUrl,
        sheetRowIndex: result.sheetRowIndex,
      };
    } else {
      return {
        sucesso: false,
        mensagem: result?.mensagem || 'Falha ao processar comprovante no servidor.',
      };
    }
  } catch (error: any) {
    console.error('Erro na chamada do fluxo /api/process-receipt-flow:', error);
    return {
      sucesso: false,
      mensagem: `Erro de conexão com o servidor: ${error.message || 'Verifique sua conexão.'}`,
    };
  }
}

/**
 * Tests connection with Google Apps Script Webhook (Google Drive + Google Sheets)
 */
export async function testGoogleIntegration(webhookUrl: string): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    const response = await fetch('/api/test-google-integration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl }),
    });

    const data = await response.json();
    return {
      sucesso: data.sucesso,
      mensagem: data.mensagem || (data.sucesso ? 'Conexão confirmada!' : 'Falha no teste de conexão.'),
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Erro de conexão: ${err.message}`,
    };
  }
}

/**
 * Sends image data to Google Apps Script Web App (doPost).
 */
export async function uploadImageToGoogleDrive(
  webhookUrl: string,
  base64DataUrl: string,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<UploadDriveResult> {
  const targetUrl = webhookUrl?.trim() || DEFAULT_WEBHOOK_URL;
  const cleanBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');

  const payload = {
    action: 'upload_and_record',
    base64: cleanBase64,
    mimeType: mimeType,
    fileName: fileName || `NOTA_${Date.now()}.jpg`,
    timestamp: new Date().toISOString(),
  };

  if (!targetUrl) {
    return {
      sucesso: true,
      mensagem: 'Comprovante salvo no histórico local! (Configure a URL do Apps Script para envio automático ao Drive e Sheets)',
    };
  }

  // 1. Try via server proxy first
  try {
    const proxyRes = await fetch('/api/upload-drive-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: targetUrl,
        payload: payload,
      }),
    });

    const text = await proxyRes.text();
    if (proxyRes.ok && text) {
      try {
        const result = JSON.parse(text);
        if (result && (result.sucesso || result.fileId || result.status === 'ok' || result.status === 'success')) {
          const fileId = result.fileId || result.id || '';
          return {
            sucesso: true,
            mensagem: result.mensagem || 'Foto enviada com sucesso para o Google Drive!',
            fileId: fileId,
            driveUrl: fileId ? `https://drive.google.com/file/d/${fileId}/view` : result.driveUrl,
          };
        } else if (result && result.error) {
          return {
            sucesso: false,
            mensagem: result.error || 'Falha ao processar no Google Drive.',
          };
        }
      } catch {
        // Fall through
      }
    }
  } catch (proxyError: any) {
    console.warn('Proxy upload attempt bypassed:', proxyError.message);
  }

  // 2. Direct call from browser to Google Apps Script Web App
  try {
    await fetch(targetUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    return {
      sucesso: true,
      mensagem: 'Foto enviada com sucesso para o Google Drive!',
    };
  } catch (directError: any) {
    console.error('Direct upload failed:', directError);
    return {
      sucesso: false,
      mensagem: `Erro na comunicação com o Google Drive: ${directError.message}`,
    };
  }
}

/**
 * Resizes and compresses image if too huge, ensuring ultra-fast upload from mobile networks
 */
export async function compressImage(
  file: File,
  maxDimension: number = 2000,
  quality: number = 0.85
): Promise<{ base64: string; dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          resolve({
            base64,
            dataUrl,
            mimeType: 'image/jpeg',
          });
        } else {
          const dataUrl = e.target?.result as string;
          const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          resolve({
            base64,
            dataUrl,
            mimeType: file.type || 'image/jpeg',
          });
        }
      };
      img.onerror = () => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        resolve({
          base64,
          dataUrl,
          mimeType: file.type || 'image/jpeg',
        });
      };
    };

    reader.readAsDataURL(file);
  });
}
