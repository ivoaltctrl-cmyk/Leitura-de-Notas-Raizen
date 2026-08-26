export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const targetUrl =
      body?.webhookUrl?.trim() ||
      context.env?.GOOGLE_APPS_SCRIPT_URL ||
      context.env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbxjvAIKgEW0fVFRNL3x60Uyb7IVOnZ9Hxlik3BYrMu7IiE2lhykrDyKD0DYfkxwEW014w/exec';

    const responseHeaders = {
      'Content-Type': 'application/json;charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };

    if (!targetUrl) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'URL do Webhook do Google Apps Script não configurada.',
          records: [],
        }),
        {
          status: 400,
          headers: responseHeaders,
        }
      );
    }

    const formatRecords = (recordsList: any[]) => {
      return recordsList.map((r: any, idx: number) => ({
        id: r.id || `sheet-row-${idx + 1}`,
        numero: r.numero || r['Número'] || r.Numero || `OS-${String(idx + 1).padStart(4, '0')}`,
        dataAbastecimento: r.dataAbastecimento || r.data || r['Data do Abastecimento'] || r['Data'] || '',
        formaPagamento: r.formaPagamento || r['Forma de Pagamento'] || 'CONTRATO',
        cliente: r.cliente || r['Cliente'] || 'WFS / RAÍZEN',
        horaChegada: r.horaChegada || r['Hora da Chegada'] || '',
        inicioAbastecimento: r.inicioAbastecimento || r['Início do Abastecimento'] || r['Inicio do Abastecimento'] || '',
        terminoAbastecimento: r.terminoAbastecimento || r['Término do Abastecimento'] || r['Termino do Abastecimento'] || '',
        produto: r.produto || r['Produto'] || 'DIESEL',
        volume: r.volume || r['Volume'] || '0,00',
        obs: r.obs || r['Obs.:'] || r['Obs'] || '',
        assinaturaCliente: r.assinaturaCliente || r['Assinatura do Cliente'] || '',
        driveFileUrl: r.driveFileUrl || r.driveUrl || r.fileUrl || r['Foto da Nota'] || '',
        dataCriacao: r.dataCriacao || new Date().toISOString(),
        statusEnvio: 'enviado_drive',
        statusMsg: 'Sincronizado da planilha Dados_Raizen',
      }));
    };

    // 1. Tenta GET primeiro
    try {
      const getUrl = targetUrl.includes('?') ? `${targetUrl}&action=get_sheet_data&_t=${Date.now()}` : `${targetUrl}?action=get_sheet_data&_t=${Date.now()}`;
      const gasResponse = await fetch(getUrl, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain' },
        redirect: 'follow',
      });

      const gasText = await gasResponse.text();
      try {
        const gasJson = JSON.parse(gasText);
        const recordsList = gasJson.records || gasJson.dados || gasJson.data || (Array.isArray(gasJson) ? gasJson : null);
        if (recordsList && Array.isArray(recordsList)) {
          const formatted = formatRecords(recordsList);
          return new Response(
            JSON.stringify({
              sucesso: true,
              mensagem: gasJson.mensagem || `Planilha sincronizada (${formatted.length} registros)`,
              records: formatted,
            }),
            { headers: responseHeaders }
          );
        }
      } catch (e) {
        // Fallback para POST
      }
    } catch (e) {
      // Fallback para POST
    }

    // 2. Fallback POST com action get_sheet_data
    const postResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'get_sheet_data' }),
      redirect: 'follow',
    });

    const postText = await postResponse.text();
    const postJson = JSON.parse(postText);
    const recordsList = postJson.records || postJson.dados || postJson.data || (Array.isArray(postJson) ? postJson : []);
    const formatted = formatRecords(recordsList);

    return new Response(
      JSON.stringify({
        sucesso: postJson.sucesso !== false,
        mensagem: postJson.mensagem || `Planilha sincronizada (${formatted.length} registros)`,
        records: formatted,
      }),
      { headers: responseHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: `Erro ao sincronizar com o Google Sheets: ${err.message}`,
        records: [],
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
};
