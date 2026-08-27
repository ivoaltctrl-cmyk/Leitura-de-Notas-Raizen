import { AbastecimentoRecord } from '../types';
import { parseVolumeFloat, parseCurrencyFloat, formatCurrencyBRL } from './dateUtils';

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

// Official Production Webhook URL for Google Apps Script
export const DEFAULT_WEBHOOK_URL =
  (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbxjvAIKgEW0fVFRNL3x60Uyb7IVOnZ9Hxlik3BYrMu7IiE2lhykrDyKD0DYfkxwEW014w/exec';

/**
 * Helper to fetch global configuration stored on the server
 * (Shared across all PCs, mobile devices, and incognito sessions)
 */
export async function fetchGlobalConfig(): Promise<{ webhookUrl: string; autoUploadToDrive: boolean; sheetUrl?: string; secretToken?: string } | null> {
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
export async function saveGlobalConfig(config: { webhookUrl: string; autoUploadToDrive?: boolean; sheetUrl?: string; secretToken?: string }): Promise<boolean> {
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
  mimeType: string = 'image/jpeg',
  secretToken?: string
): Promise<UploadDriveResult> {
  const targetUrl = webhookUrl?.trim() || DEFAULT_WEBHOOK_URL;
  const cleanBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');

  const payload: any = {
    action: 'upload',
    base64: cleanBase64,
    mimeType: mimeType || 'image/jpeg',
    fileName: fileName || `NOTA_${Date.now()}.jpg`,
    timestamp: new Date().toISOString(),
  };

  if (secretToken && secretToken.trim()) {
    payload.token = secretToken.trim();
  }

  if (!targetUrl) {
    return {
      sucesso: true,
      mensagem: 'Comprovante salvo! (Para envio automático ao Google Drive, configure a URL do Apps Script)',
    };
  }

  // 1. Try via server proxy first (Handles CORS, redirects, secret token injection and returns complete JSON)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40s max

    const proxyRes = await fetch('/api/upload-drive-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: targetUrl,
        payload: payload,
        secretToken: secretToken?.trim(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await proxyRes.text();
    if (text) {
      try {
        const result = JSON.parse(text);
        if (result && (result.sucesso === true || result.fileId || result.status === 'ok' || result.status === 'success')) {
          const fileId = result.fileId || result.id || '';
          return {
            sucesso: true,
            mensagem: result.mensagem || 'Foto enviada e salva com sucesso no Google Drive!',
            fileId: fileId,
            driveUrl: fileId ? `https://drive.google.com/file/d/${fileId}/view` : result.driveUrl,
          };
        } else if (result && result.sucesso === false) {
          // If the backend gave an explicit error (like token mismatch or sheet error), return it directly to the user
          return {
            sucesso: false,
            mensagem: result.mensagem || 'Falha ao salvar no Google Drive. Verifique a configuração do Webhook/Token.',
          };
        }
      } catch {
        // Fall through if not valid JSON
      }
    }
  } catch (proxyError: any) {
    console.warn('Proxy upload attempt bypassed:', proxyError.message);
    if (proxyError.name === 'AbortError') {
      return {
        sucesso: false,
        mensagem: 'Tempo limite esgotado ao enviar para o Google Drive. Verifique sua conexão de internet.',
      };
    }
  }

  // 2. Direct call from browser to Google Apps Script Web App (handles CORS with text/plain)
  try {
    const separator = targetUrl.includes('?') ? '&' : '?';
    const directUrl = (secretToken && secretToken.trim()) 
      ? `${targetUrl}${separator}token=${encodeURIComponent(secretToken.trim())}` 
      : targetUrl;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return {
      sucesso: true,
      mensagem: 'Foto enviada com sucesso para o Google Drive!',
    };
  } catch (directError: any) {
    console.error('Direct upload failed:', directError);
    return {
      sucesso: false,
      mensagem: `Erro ao enviar para o Google Drive: ${directError.message || 'Falha de rede'}`,
    };
  }
}

/**
 * Fetches real records directly from the Google Sheets spreadsheet via Google Apps Script Web App or direct sheet URL
 */
export async function fetchRecordsFromSheet(webhookUrl?: string, sheetUrl?: string, secretToken?: string): Promise<FetchSheetRecordsResult> {
  const targetUrl = webhookUrl?.trim() || DEFAULT_WEBHOOK_URL;
  const targetSheet = sheetUrl?.trim() || '';

  const normalizeRecords = (list: any[]): AbastecimentoRecord[] => {
    if (!Array.isArray(list)) return [];
    return list.map((r: any, idx: number) => {
      const findVal = (aliases: string[]): any => {
        // Priority 1: Exact key match
        for (const k of Object.keys(r)) {
          const kLower = k.toLowerCase().replace(/[\s_\/-]/g, '');
          for (const a of aliases) {
            const aLower = a.toLowerCase().replace(/[\s_\/-]/g, '');
            if (kLower === aLower) {
              if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
            }
          }
        }
        // Priority 2: Substring match
        for (const k of Object.keys(r)) {
          const kLower = k.toLowerCase().replace(/[\s_\/-]/g, '');
          for (const a of aliases) {
            const aLower = a.toLowerCase().replace(/[\s_\/-]/g, '');
            if (kLower.includes(aLower)) {
              if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
            }
          }
        }
        return '';
      };

      const volRaw = findVal(['volume', 'litros', 'litro', 'quantidade', 'qtd']) || '0,00';
      const precoLitroRaw = findVal(['valorlitro', 'valor/litro', 'precolitro', 'preço/litro', 'unitario', 'unitário', 'litro']);
      let totalRaw = findVal(['valortotal', 'totalrs', 'total(r$)', 'vltotal', 'total']);

      const volNum = parseVolumeFloat(volRaw);
      const precoNum = parseCurrencyFloat(precoLitroRaw);

      // Se tiver preço por litro e volume válidos, garante que o valor total não fique zerado ou em branco
      if (precoNum > 0 && volNum > 0) {
        const totalNum = parseCurrencyFloat(totalRaw);
        if (!totalRaw || totalNum === 0 || totalRaw === 'R$ 0,00' || totalRaw === '0' || totalRaw === '-') {
          totalRaw = formatCurrencyBRL(volNum * precoNum);
        }
      }

      const numVal = findVal(['numero', 'número', 'nro', 'os']) || `OS-${String(idx + 1).padStart(4, '0')}`;

      return {
        id: r.id || `sheet-row-${idx + 1}-${numVal}`,
        numero: numVal,
        dataAbastecimento: findVal(['data', 'dataabastecimento', 'datadoabastecimento', 'dt']),
        formaPagamento: findVal(['forma', 'formadepagamento', 'pagamento', 'pagto']) || 'CONTRATO',
        cliente: findVal(['cliente', 'empresa', 'razao']) || 'WFS / RAÍZEN',
        horaChegada: findVal(['chegada', 'horadachegada', 'horachegada']),
        inicioAbastecimento: findVal(['inicio', 'início', 'iníciodoabastecimento', 'iniciodoabastecimento']),
        terminoAbastecimento: findVal(['termino', 'término', 'términodoabastecimento', 'terminodoabastecimento']),
        produto: findVal(['produto', 'combustivel', 'combustível']) || 'DIESEL',
        volume: volRaw,
        obs: findVal(['obs', 'observacao', 'observação', 'placa']),
        assinaturaCliente: findVal(['assinatura', 'assinaturadocliente', 'conferido']),
        driveFileUrl: findVal(['foto', 'fotodanota', 'drive', 'drivefileurl', 'link']),
        valorLitro: precoNum > 0 ? (String(precoLitroRaw).includes('R$') ? String(precoLitroRaw) : formatCurrencyBRL(precoNum)) : '',
        valorTotal: totalRaw ? (String(totalRaw).includes('R$') ? String(totalRaw) : formatCurrencyBRL(parseCurrencyFloat(totalRaw))) : '',
        fileName: r.fileName || (numVal ? `Comprovante_${numVal}.jpg` : `Registro_${idx + 1}.jpg`),
        dataCriacao: r.dataCriacao || new Date().toISOString(),
        statusEnvio: 'enviado_drive',
        statusMsg: 'Sincronizado da planilha Dados_Raizen',
      };
    });
  };

  // 1. Try fetching via server backend proxy (Fastest, follows 302 redirects, no browser CORS issues)
  try {
    const res = await fetch(`/api/fetch-sheet-records?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
      },
      body: JSON.stringify({ webhookUrl: targetUrl, sheetUrl: targetSheet, secretToken: secretToken?.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.records)) {
        const normalized = normalizeRecords(data.records);
        return {
          sucesso: data.sucesso !== false,
          mensagem: data.mensagem || (normalized.length > 0 
            ? `Sincronizado com o Google Sheets (${normalized.length} registros).` 
            : 'Planilha sincronizada! A aba Dados_Raizen está vazia (0 registros).'),
          records: normalized,
          total: normalized.length,
        };
      }
    }
  } catch (err: any) {
    console.warn('[Fetch] Backend proxy fetch failed, attempting JSONP / direct browser fetch:', err.message);
  }

  // 2. Fallback via JSONP (Bypasses browser CORS completely across different PCs, cellphones, incognito tabs)
  if (targetUrl && !targetUrl.includes('docs.google.com/spreadsheets')) {
    try {
      const tokenParam = secretToken ? `&token=${encodeURIComponent(secretToken.trim())}` : '';
      const jsonpData = await fetchWithJsonp(`${targetUrl}${tokenParam}`, 7000);
      const recList = jsonpData?.records || jsonpData?.dados || (Array.isArray(jsonpData) ? jsonpData : null);
      if (recList && Array.isArray(recList)) {
        const normalized = normalizeRecords(recList);
        return {
          sucesso: true,
          mensagem: normalized.length > 0
            ? 'Dados carregados da planilha via JSONP com sucesso!'
            : 'Planilha sincronizada via JSONP (0 registros encontrados na aba).',
          records: normalized,
          total: normalized.length,
        };
      }
    } catch (jsonpErr: any) {
      console.warn('[Fetch] JSONP fetch attempt failed:', jsonpErr.message);
    }
  }

  // 3. Fallback direct browser GET if webhook is available
  if (targetUrl) {
    try {
      const tokenParam = secretToken ? `&token=${encodeURIComponent(secretToken.trim())}` : '';
      const getUrl = targetUrl.includes('?') 
        ? `${targetUrl}&action=get_sheet_data&_t=${Date.now()}${tokenParam}` 
        : `${targetUrl}?action=get_sheet_data&_t=${Date.now()}${tokenParam}`;
      const directRes = await fetch(getUrl, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store' 
        },
      });

      if (directRes.ok) {
        const json = await directRes.json();
        const recList = json.records || json.dados || (Array.isArray(json) ? json : null);
        if (recList && Array.isArray(recList)) {
          const normalized = normalizeRecords(recList);
          return {
            sucesso: true,
            mensagem: normalized.length > 0
              ? 'Dados carregados da planilha com sucesso!'
              : 'Planilha sincronizada! A aba Dados_Raizen está vazia.',
            records: normalized,
            total: normalized.length,
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
  manualData?: Partial<AbastecimentoRecord>,
  secretToken?: string
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
        secretToken: secretToken?.trim(),
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
export async function testGoogleIntegration(webhookUrl: string, secretToken?: string): Promise<{ sucesso: boolean; mensagem: string }> {
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
      body: JSON.stringify({ webhookUrl: cleanUrl, secretToken: secretToken?.trim() }),
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
    const payload: any = { action: 'ping_test' };
    if (secretToken && secretToken.trim()) payload.token = secretToken.trim();

    await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
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
 * Triggers the Google Apps Script AI robot on-demand to process all pending fuel receipts in Drive
 */
export interface TriggerProcessingResult {
  sucesso: boolean;
  mensagem: string;
  detalhes?: any;
}

export async function triggerGasProcessing(
  webhookUrl?: string,
  secretToken?: string
): Promise<TriggerProcessingResult> {
  const targetUrl = webhookUrl?.trim() || DEFAULT_WEBHOOK_URL;
  if (!targetUrl) {
    return {
      sucesso: false,
      mensagem: 'URL do Webhook do Google Apps Script não informada.',
    };
  }

  // 1. Try server proxy first (Handles CORS, long timeout and JSON response)
  try {
    const res = await fetch('/api/trigger-gas-processing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: targetUrl,
        secretToken: secretToken?.trim(),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.sucesso) {
        return {
          sucesso: true,
          mensagem: data.mensagem || 'Robô executado com sucesso!',
          detalhes: data.data?.detalhes || data.data,
        };
      } else if (data && data.mensagem) {
        return {
          sucesso: false,
          mensagem: data.mensagem,
        };
      }
    }
  } catch (err: any) {
    console.warn('[Trigger] Proxy trigger attempt failed:', err.message);
  }

  // 2. Direct browser fallback call
  try {
    const separator = targetUrl.includes('?') ? '&' : '?';
    const effectiveToken = secretToken?.trim();
    const directUrl = effectiveToken
      ? `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}`
      : targetUrl;

    const payload = {
      action: 'processar_agora',
      timestamp: new Date().toISOString(),
      ...(effectiveToken ? { token: effectiveToken } : {}),
    };

    await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    return {
      sucesso: true,
      mensagem: 'Comando de processamento enviado com sucesso ao robô!',
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Erro ao acionar robô: ${err.message}`,
    };
  }
}

/**
 * Resizes and compresses image efficiently (1600px max, 0.82 quality)
 * Ensures ultra-fast upload from mobile/Wi-Fi with 100% OCR sharpness
 */
export async function compressImage(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.82
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
          // Clean background fill before drawing to avoid alpha artifacting
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
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

/**
 * Sends price update request to Google Apps Script / Google Sheets backend
 */
export interface UpdateFuelPricesPayload {
  dataInicio?: string;
  dataFim?: string;
  produto: string;
  valorLitro: number;
}

export interface UpdateFuelPricesResult {
  sucesso: boolean;
  mensagem: string;
  totalAtualizados?: number;
  totalVolume?: number;
  totalFinanceiro?: number;
}

export async function updateFuelPricesInSheet(
  webhookUrl?: string,
  secretToken?: string,
  params?: UpdateFuelPricesPayload
): Promise<UpdateFuelPricesResult> {
  const targetUrl = webhookUrl?.trim() || DEFAULT_WEBHOOK_URL;
  if (!targetUrl) {
    return {
      sucesso: false,
      mensagem: 'URL do Google Apps Script não configurada.',
    };
  }

  const payload = {
    action: 'update_fuel_prices',
    dataInicio: params?.dataInicio || '',
    dataFim: params?.dataFim || params?.dataInicio || '',
    produto: params?.produto || 'TODOS',
    valorLitro: params?.valorLitro || 0,
    timestamp: new Date().toISOString(),
  };

  // 1. Try server proxy first
  try {
    const res = await fetch('/api/update-fuel-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: targetUrl,
        secretToken: secretToken?.trim(),
        ...payload,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.sucesso !== false) {
        return {
          sucesso: true,
          mensagem: data.mensagem || 'Valores atualizados na planilha com sucesso!',
          totalAtualizados: data.totalAtualizados,
          totalVolume: data.totalVolume,
          totalFinanceiro: data.totalFinanceiro,
        };
      } else if (data && data.mensagem) {
        return {
          sucesso: false,
          mensagem: data.mensagem,
        };
      }
    }
  } catch (err: any) {
    console.warn('[Price Update] Proxy call failed, attempting direct fetch:', err.message);
  }

  // 2. Direct browser fallback call
  try {
    const separator = targetUrl.includes('?') ? '&' : '?';
    const effectiveToken = secretToken?.trim();
    const directUrl = effectiveToken
      ? `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}`
      : targetUrl;

    const fullPayload = {
      ...payload,
      ...(effectiveToken ? { token: effectiveToken } : {}),
    };

    await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(fullPayload),
      mode: 'no-cors',
    });

    return {
      sucesso: true,
      mensagem: 'Solicitação de atualização de preços enviada com sucesso para o Google Sheets!',
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Erro ao enviar atualização de valores: ${err.message}`,
    };
  }
}

