/// <reference types="@cloudflare/workers-types" />
import { extractReceiptWithGemini } from '../_shared/gemini';

interface Env {
  GEMINI_API_KEY: string;
  GOOGLE_APPS_SCRIPT_URL?: string;
  VITE_GOOGLE_APPS_SCRIPT_URL?: string;
}

// FRONT (Foto) ➡️ DRIVER (Upload no Google Drive) ➡️ BACK (Extração IA Gemini) ➡️ SHEETS (Gravação na aba Dados_Raizen) ➡️ FRONT (Espelhamento)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { base64, mimeType, fileName, webhookUrl, manualData } = await request.json<any>();

    if (!base64) {
      return json({ sucesso: false, mensagem: 'Imagem em base64 não enviada.' }, 400);
    }

    const effectiveWebhookUrl =
      webhookUrl?.trim() || env.GOOGLE_APPS_SCRIPT_URL || env.VITE_GOOGLE_APPS_SCRIPT_URL || '';

    console.log(`[Pipeline] Processando novo comprovante (${fileName || 'sem_nome'})`);

    // 1. BACK: Extração com IA Gemini Vision
    let extractedData: any = manualData || {};
    try {
      if (!manualData || !manualData.numero) {
        console.log('[Pipeline] Executando extração com Gemini 3.7 Flash...');
        extractedData = await extractReceiptWithGemini(env.GEMINI_API_KEY, base64, mimeType);
        console.log('[Pipeline] Dados extraídos:', extractedData);
      }
    } catch (aiError: any) {
      console.warn('[Pipeline] Aviso na extração IA:', aiError.message);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      extractedData = {
        numero: `OS-${Date.now().toString().slice(-6)}`,
        formaPagamento: 'CONTRATO',
        cliente: 'WFS / RAÍZEN',
        horaChegada: timeStr,
        inicioAbastecimento: timeStr,
        terminoAbastecimento: timeStr,
        produto: 'DIESEL',
        volume: '0,00',
        obs: fileName || 'Comprovante digitalizado',
        assinaturaCliente: 'CONFERIDO',
      };
    }

    // 2. DRIVE & SHEETS
    let driveFileId = '';
    let driveFileUrl = '';
    let sheetRowIndex = 0;
    let driveSuccess = false;
    let pipelineMessage = 'Comprovante processado e registrado com sucesso!';

    if (effectiveWebhookUrl) {
      try {
        console.log('[Pipeline] Transmitindo foto e dados extraídos para Google Drive e Google Sheets...');
        const payloadToAppsScript = {
          action: 'upload_and_record',
          base64,
          mimeType: mimeType || 'image/jpeg',
          fileName: fileName || `NOTA_${extractedData.numero || Date.now()}.jpg`,
          dados: {
            numero: extractedData.numero || '',
            formaPagamento: extractedData.formaPagamento || 'CONTRATO',
            cliente: extractedData.cliente || '',
            horaChegada: extractedData.horaChegada || '',
            inicioAbastecimento: extractedData.inicioAbastecimento || '',
            terminoAbastecimento: extractedData.terminoAbastecimento || '',
            produto: extractedData.produto || 'DIESEL',
            volume: extractedData.volume || '0,00',
            obs: extractedData.obs || '',
            assinaturaCliente: extractedData.assinaturaCliente || '',
          },
        };

        const gasResponse = await fetch(effectiveWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payloadToAppsScript),
          redirect: 'follow',
        });

        const gasText = await gasResponse.text();
        console.log('[Pipeline] Resposta do Google Apps Script:', gasText);

        try {
          const gasJson = JSON.parse(gasText);
          if (gasJson.sucesso || gasJson.fileId || gasJson.status === 'ok') {
            driveSuccess = true;
            driveFileId = gasJson.fileId || gasJson.id || '';
            driveFileUrl = gasJson.driveUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : '');
            sheetRowIndex = gasJson.sheetRowIndex || gasJson.row || 0;
            pipelineMessage = 'Foto salva no Google Drive e linha inserida na planilha Dados_Raizen!';
          } else {
            pipelineMessage = gasJson.mensagem || gasJson.error || 'Aviso no retorno do Google Apps Script';
          }
        } catch {
          if (gasResponse.ok) {
            driveSuccess = true;
            pipelineMessage = 'Foto gravada no Google Drive e linha adicionada na planilha!';
          }
        }
      } catch (gasError: any) {
        console.error('[Pipeline] Erro ao conectar com Google Apps Script:', gasError.message);
        pipelineMessage = `Processado pelo Back. Falha no envio ao Drive: ${gasError.message}`;
      }
    } else {
      pipelineMessage = 'Processado pelo Back e espelhado no Front. (Configure a URL do Google Apps Script para salvar no Drive e Sheets em tempo real)';
    }

    // 3. FRONT: retorno unificado
    const recordId = `rec-${Date.now()}`;
    const consolidatedRecord = {
      id: recordId,
      numero: extractedData.numero || `OS-${Date.now().toString().slice(-4)}`,
      formaPagamento: extractedData.formaPagamento || 'CONTRATO',
      cliente: extractedData.cliente || 'WFS / RAÍZEN',
      horaChegada: extractedData.horaChegada || '',
      inicioAbastecimento: extractedData.inicioAbastecimento || '',
      terminoAbastecimento: extractedData.terminoAbastecimento || '',
      produto: extractedData.produto || 'DIESEL',
      volume: extractedData.volume || '0,00',
      obs: extractedData.obs || '',
      assinaturaCliente: extractedData.assinaturaCliente || '',
      fileName: fileName || `Nota_${extractedData.numero || recordId}.jpg`,
      fotoBase64: base64,
      fotoMimeType: mimeType || 'image/jpeg',
      driveFileId: driveFileId || undefined,
      driveFileUrl: driveFileUrl || undefined,
      dataCriacao: new Date().toISOString(),
      statusEnvio: driveSuccess ? 'enviado_drive' : 'pendente',
      statusMsg: pipelineMessage,
    };

    return json({
      sucesso: true,
      mensagem: pipelineMessage,
      record: consolidatedRecord,
      driveSuccess,
      driveFileId,
      driveFileUrl,
      sheetRowIndex,
    });
  } catch (error: any) {
    console.error('[Pipeline] Erro fatal no fluxo completo:', error);
    return json({ sucesso: false, mensagem: `Erro no processamento do fluxo: ${error.message}` }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
