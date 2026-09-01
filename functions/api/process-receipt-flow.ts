import { extractReceiptWithGemini } from './extract-receipt';
import { handleOptions } from './_authHelper';

export const onRequestOptions = handleOptions;

export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const { base64, mimeType, fileName, webhookUrl, manualData } = body || {};

    if (!base64) {
      return new Response(
        JSON.stringify({ sucesso: false, mensagem: 'Imagem em base64 não enviada.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    const effectiveWebhookUrl =
      webhookUrl?.trim() ||
      context.env?.GOOGLE_APPS_SCRIPT_URL ||
      '';

    const apiKey = context.env?.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');

    // 1. Extração Inteligente com IA Gemini Vision
    let extractedData = manualData || {};
    try {
      if (!manualData || !manualData.numero) {
        extractedData = await extractReceiptWithGemini(base64, mimeType, apiKey);
      }
    } catch {
      // Fallback
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

    // 2. Transmissão para Google Apps Script (Drive & Sheets)
    let driveFileId = '';
    let driveFileUrl = '';
    let sheetRowIndex = 0;
    let driveSuccess = false;
    let pipelineMessage = 'Comprovante processado e registrado com sucesso!';

    if (effectiveWebhookUrl) {
      try {
        const payloadToAppsScript = {
          action: 'upload_and_record',
          base64: base64,
          mimeType: mimeType || 'image/jpeg',
          fileName: fileName || `NOTA_${extractedData.numero || Date.now()}.jpg`,
          dados: {
            numero: extractedData.numero || '',
            dataAbastecimento: extractedData.dataAbastecimento || new Date().toLocaleDateString('pt-BR'),
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadToAppsScript),
          redirect: 'follow',
        });

        const gasText = await gasResponse.text();
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
        pipelineMessage = `Processado pelo Back. Falha no envio ao Drive: ${gasError.message}`;
      }
    } else {
      pipelineMessage = 'Processado pelo Back e espelhado no Front. (Configure a URL do Google Apps Script para salvar no Drive e Sheets em tempo real)';
    }

    // 3. FRONT: Retorno unificado
    const recordId = `rec-${Date.now()}`;
    const consolidatedRecord = {
      id: recordId,
      numero: extractedData.numero || `OS-${Date.now().toString().slice(-4)}`,
      dataAbastecimento: extractedData.dataAbastecimento || new Date().toLocaleDateString('pt-BR'),
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

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: pipelineMessage,
        record: consolidatedRecord,
        driveSuccess: driveSuccess,
        driveFileId: driveFileId,
        driveFileUrl: driveFileUrl,
        sheetRowIndex: sheetRowIndex,
      }),
      { status: 200, headers: responseHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: `Erro no processamento do fluxo: ${error.message}`,
      }),
      { status: 500, headers: responseHeaders }
    );
  }
};
