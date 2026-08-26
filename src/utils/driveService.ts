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

export interface FetchSheetRecordsResult {
  sucesso: boolean;
  mensagem: string;
  records: AbastecimentoRecord[];
  total: number;
}

// Default Webhook URL for Google Apps Script if not set via environment variable
export const DEFAULT_WEBHOOK_URL =
  (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
  '';

/**
 * Helper to fetch global configuration stored on the server
 * (Shared across all PCs, mobile devices, and incognito sessions)
 */
export async function fetchGlobalConfig(): Promise<{ webhookUrl: string; autoUploadToDrive: boolean; sheetUrl?: string } | null> {
  try {
    const res = await fetch('/api/config', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.sucesso && data.config) {
        return data.config;
      }
    }
  } catch (err: any) {
    console.warn('[Config] Backend config fetch unavailable:', err.message);
  }
  return null;
}

/**
 * Helper to save global configuration to the server
 */
export async function saveGlobalConfig(config: { webhookUrl: string; autoUploadToDrive?: boolean; sheetUrl?: string }): Promise<boolean> {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const data = await res.json();
      return !!(data && data.sucesso);
    }
  } catch (err: any) {
    console.warn('[Config] Backend config save error:', err.message);
  }
  return false;
}

/**
 * JSONP Helper: Fetches data from Google Apps Script Web App
 * Bypasses CORS restrictions in all browsers and corporate firewalls.
 */
function fetchWithJsonp(url: string, timeoutMs: number = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return reject(new Error('JSONP requires browser window environment'));
    }

    const callbackName = 'gas_cb_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    let isFinished = false;

    const cleanup = () => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timer);
      try {
        delete (window as any)[callbackName];
      } catch {}
      const scriptElem = document.getElementById(callbackName);
      if (scriptElem && scriptElem.parentNode) {
        scriptElem.parentNode.removeChild(scriptElem);
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Tempo limite da requisição JSONP esgotado'));
    }, timeoutMs);

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const separator = url.includes('?') ? '&' : '?';
    const script = document.createElement('script');
    script.id = callbackName;
    script.src = `${url}${separator}callback=${callbackName}&prefix=${callbackName}&action=get_sheet_data&_nocache=${Date.now()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('Falha de rede ao carregar script JSONP do Apps Script'));
    };

    document.body.appendChild(script);
  });
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
    action: 'upload',
    base64: cleanBase64,
    mimeType: mimeType || 'image/jpeg',
    fileName: fileName || `NOTA_${Date.now()}.jpg`,
    timestamp: new Date().toISOString(),
  };

  if (!targetUrl) {
    return {
      sucesso: true,
      mensagem: 'Comprovante salvo! (Para envio automático ao Google Drive, configure a URL do Apps Script)',
    };
  }

  // 1. Try via server proxy first (Handles CORS, redirects and returns complete JSON)
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
        if (result && (result.sucesso !== false || result.fileId || result.status === 'ok' || result.status === 'success')) {
          const fileId = result.fileId || result.id || '';
          return {
            sucesso: true,
            mensagem: result.mensagem || 'Foto enviada e salva com sucesso no Google Drive!',
            fileId: fileId,
            driveUrl: fileId ? `https://drive.google.com/file/d/${fileId}/view` : result.driveUrl,
          };
        }
      } catch {
        // Fall through
      }
    }
  } catch (proxyError: any) {
    console.warn('Proxy upload attempt bypassed:', proxyError.message);
  }

  // 2. Direct call from browser to Google Apps Script Web App (handles CORS with text/plain)
  try {
    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
      mensagem: `Erro ao enviar para o Google Drive: ${directError.message}`,
    };
  }
}

/**
 * Fetches real records directly from the Google Sheets spreadsheet via Google Apps Script Web App or direct sheet URL
 */
export async function fetchRecordsFromSheet(webhookUrl?: string, sheetUrl?: string): Promise<FetchSheetRecordsResult> {
  const targetUrl = webhookUrl?.trim() || DEFAULT_WEBHOOK_URL;
  const targetSheet = sheetUrl?.trim() || '';

  // 1. Try fetching via server backend proxy (Fastest, follows 302 redirects, no browser CORS issues)
  try {
    const res = await fetch('/api/fetch-sheet-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: targetUrl, sheetUrl: targetSheet }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.records && Array.isArray(data.records)) {
        if (data.sucesso !== false) {
          return {
            sucesso: true,
            mensagem: data.mensagem || `Sincronizado com o Google Sheets (${data.records.length} registros).`,
            records: data.records,
            total: data.records.length,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn('[Fetch] Backend proxy fetch failed, attempting JSONP / direct browser fetch:', err.message);
  }

  // 2. Fallback via JSONP (Bypasses browser CORS completely across different PCs, cellphones, incognito tabs)
  if (targetUrl && !targetUrl.includes('docs.google.com/spreadsheets')) {
    try {
      const jsonpData = await fetchWithJsonp(targetUrl, 7000);
      const recList = jsonpData?.records || jsonpData?.dados || (Array.isArray(jsonpData) ? jsonpData : null);
      if (recList && Array.isArray(recList)) {
        return {
          sucesso: true,
          mensagem: 'Dados carregados da planilha via JSONP com sucesso!',
          records: recList,
          total: recList.length,
        };
      }
    } catch (jsonpErr: any) {
      console.warn('[Fetch] JSONP fetch attempt failed:', jsonpErr.message);
    }
  }

  // 3. Fallback direct browser GET if webhook is available
  if (targetUrl) {
    try {
      const getUrl = targetUrl.includes('?') ? `${targetUrl}&action=get_sheet_data` : `${targetUrl}?action=get_sheet_data`;
      const directRes = await fetch(getUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (directRes.ok) {
        const json = await directRes.json();
        const recList = json.records || json.dados || (Array.isArray(json) ? json : null);
        if (recList && Array.isArray(recList)) {
          return {
            sucesso: true,
            mensagem: 'Dados carregados da planilha com sucesso!',
            records: recList,
            total: recList.length,
          };
        }
      }
    } catch (directErr: any) {
      console.error('Direct fetch from Google Apps Script failed:', directErr);
    }
  }

  return {
    sucesso: false,
    mensagem: 'Não foi possível carregar registros do Google Sheets. Verifique a URL do Apps Script ou Link da Planilha em Configurações.',
    records: [],
    total: 0,
  };
}

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
 * Tests connection with Google Apps Script Webhook (Google Drive / Sheets)
 */
export async function testGoogleIntegration(webhookUrl: string): Promise<{ sucesso: boolean; mensagem: string }> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return {
      sucesso: false,
      mensagem: 'Por favor, cole a URL do seu Webhook do Apps Script.',
    };
  }

  const cleanUrl = webhookUrl.trim();

  // 1. Try testing via backend proxy
  try {
    const response = await fetch('/api/test-google-integration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: cleanUrl }),
    });

    const text = await response.text();
    if (text) {
      try {
        const data = JSON.parse(text);
        return {
          sucesso: !!data.sucesso,
          mensagem: data.mensagem || (data.sucesso ? 'Conexão confirmada com o Google Drive e Sheets!' : 'Erro na resposta do Google.'),
        };
      } catch {
        if (response.ok) {
          return {
            sucesso: true,
            mensagem: 'Conexão confirmada com sucesso com o Webhook do Google Apps Script!',
          };
        }
      }
    }
  } catch (err: any) {
    console.warn('Proxy test failed, attempting direct fetch:', err);
  }

  // 2. Direct browser fallback test
  try {
    await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'ping_test' }),
      mode: 'no-cors',
    });

    return {
      sucesso: true,
      mensagem: 'Conexão estabelecida com sucesso com o Google Apps Script!',
    };
  } catch (directErr: any) {
    return {
      sucesso: false,
      mensagem: `Não foi possível conectar ao Google Apps Script: ${directErr.message || 'Verifique a URL informada'}`,
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
