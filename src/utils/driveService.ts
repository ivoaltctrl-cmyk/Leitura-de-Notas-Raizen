import { AbastecimentoRecord } from '../types';

export interface UploadDriveResult {
  sucesso: boolean;
  mensagem: string;
  fileId?: string;
  driveUrl?: string;
}

/**
 * Sends image data to user's Google Apps Script Web App (doPost).
 * Tries direct call first; if blocked by CORS or network, falls back through backend proxy.
 */
export async function uploadImageToGoogleDrive(
  webhookUrl: string,
  base64DataUrl: string,
  fileName: string,
  mimeType: string = 'image/jpeg',
  metadata?: Partial<AbastecimentoRecord>
): Promise<UploadDriveResult> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return {
      sucesso: false,
      mensagem: 'URL do Google Apps Script não configurada.',
    };
  }

  const payload = {
    base64: base64DataUrl,
    mimeType: mimeType,
    fileName: fileName || `OS_${Date.now()}.jpg`,
    // Extra fields if script is upgraded to append to sheet:
    numero: metadata?.numero || '',
    formaPagamento: metadata?.formaPagamento || '',
    cliente: metadata?.cliente || '',
    horaChegada: metadata?.horaChegada || '',
    inicioAbastecimento: metadata?.inicioAbastecimento || '',
    produto: metadata?.produto || '',
    volume: metadata?.volume || '',
    obs: metadata?.obs || '',
    assinaturaCliente: metadata?.assinaturaCliente || '',
  };

  // Try via server proxy first (for backend fullstack)
  try {
    const proxyRes = await fetch('/api/upload-drive-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: webhookUrl.trim(),
        payload: payload,
      }),
    });

    const text = await proxyRes.text();
    if (proxyRes.ok && text) {
      try {
        const result = JSON.parse(text);
        if (result && (result.sucesso || result.fileId || result.status === 'ok')) {
          const fileId = result.fileId || result.id || '';
          return {
            sucesso: true,
            mensagem: result.mensagem || 'Arquivo salvo com sucesso no Google Drive!',
            fileId: fileId,
            driveUrl: fileId ? `https://drive.google.com/file/d/${fileId}/view` : undefined,
          };
        } else if (result) {
          return {
            sucesso: false,
            mensagem: result.mensagem || result.error || 'Falha ao salvar no Google Drive.',
          };
        }
      } catch {
        // Fallback to direct call below
      }
    }
  } catch (proxyError: any) {
    console.warn('Proxy upload failed, attempting direct fetch:', proxyError.message);
  }

  // Fallback: Direct call from browser to Google Apps Script Web App
  try {
    const directRes = await fetch(webhookUrl.trim(), {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'no-cors', // Apps Script standard client bypass
    });

    return {
      sucesso: true,
      mensagem: 'Envio disparado diretamente para o Google Apps Script!',
    };
  } catch (directError: any) {
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
 * Resizes and compresses image if too huge, ensuring fast OCR & upload
 */
export async function compressImage(file: File, maxDimension: number = 2000, quality: number = 0.85): Promise<{ base64: string; dataUrl: string; mimeType: string }> {
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
          return;
        }

        // Fallback to original
        fileToBase64(file).then(resolve);
      };
    };

    reader.readAsDataURL(file);
  });
}
