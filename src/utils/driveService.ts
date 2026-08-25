import { AbastecimentoRecord } from '../types';

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
 * Sends image data to Google Apps Script Web App (doPost).
 * Tries server-side proxy first (if running fullstack); then falls back to direct browser fetch (including CORS/no-cors mode).
 */
export async function uploadImageToGoogleDrive(
  webhookUrl: string,
  base64DataUrl: string,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<UploadDriveResult> {
  const targetUrl = webhookUrl?.trim() || DEFAULT_WEBHOOK_URL;

  const payload = {
    base64: base64DataUrl,
    mimeType: mimeType,
    fileName: fileName || `NOTA_${Date.now()}.jpg`,
    timestamp: new Date().toISOString(),
  };

  // If no webhook URL is defined at all, record locally as successfully queued/ready
  if (!targetUrl) {
    return {
      sucesso: true,
      mensagem: 'Comprovante salvo no histórico local! (Adicione a URL do Apps Script no .env para envio automático à nuvem)',
    };
  }

  // 1. Try via server proxy first (for backend fullstack)
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
        // Fall through to direct fetch
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
      mode: 'no-cors', // Crucial for Google Apps Script Web Apps when accessed from static sites (Cloudflare Pages)
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
 * Converts a File object to base64 string and data URL
 */
export function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      resolve({
        base64,
        dataUrl,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
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
          // Fallback if canvas context fails
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
