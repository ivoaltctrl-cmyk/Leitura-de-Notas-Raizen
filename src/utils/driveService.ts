export async function fetchRecordsFromSheet(webhookUrl: string): Promise<{ sucesso: boolean; records: any[]; mensagem?: string }> {
  try {
    if (!webhookUrl) {
      throw new Error("URL do Webhook não configurada.");
    }

    // 1. Tenta carregar via JSONP para contornar restrições de CORS do navegador
    const records = await fetchViaJsonp(webhookUrl);
    
    return {
      sucesso: true,
      records: records,
      mensagem: "Registros sincronizados com sucesso!"
    };

  } catch (errorJsonp) {
    console.warn("JSONP falhou, tentando requisição Fetch direta...", errorJsonp);

    // 2. Fallback via Fetch tradicional com redirecionamento ativo
    try {
      const response = await fetch(webhookUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: Status ${response.status}`);
      }

      const data = await response.json();
      const rawRecords = data.records || data.data || [];

      return {
        sucesso: true,
        records: normalizarRegistros(rawRecords)
      };
    } catch (fetchError: any) {
      console.error("Erro final em fetchRecordsFromSheet:", fetchError);
      return {
        sucesso: false,
        mensagem: "Não foi possível carregar registros do Google Sheets. Verifique a URL em Configurações.",
        records: []
      };
    }
  }
}

/**
 * Auxiliar para requisição JSONP (Bypassa CORS completamente no navegador)
 */
function fetchViaJsonp(url: string, timeoutMs = 8000): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const callbackName = 'gas_callback_' + Math.round(100000 * Math.random());
    const script = document.createElement('script');

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout na conexão JSONP"));
    }, timeoutMs);

    function cleanup() {
      if (timer) clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete (window as any)[callbackName];
    }

    (window as any)[callbackName] = function (data: any) {
      cleanup();
      if (data && (data.sucesso || data.success) && Array.isArray(data.records)) {
        resolve(normalizarRegistros(data.records));
      } else if (Array.isArray(data)) {
        resolve(normalizarRegistros(data));
      } else {
        reject(new Error(data?.mensagem || "Formato de dados inválido"));
      }
    };

    const separator = url.indexOf('?') >= 0 ? '&' : '?';
    script.src = `${url}${separator}prefix=${callbackName}&callback=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("Falha ao carregar script JSONP"));
    };

    document.body.appendChild(script);
  });
}

/**
 * Normaliza os campos brutos retornados do Apps Script para o modelo da tabela
 */
function normalizarRegistros(rows: any[]): any[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((item: any, index: number) => {
    return {
      id: item.id || `sheet-${index}-${Date.now()}`,
      numero: item["Número"] || item.numero || "",
      formaPagamento: item["Forma de Pagamento"] || item.formaPagamento || "CONTRATO",
      cliente: item["Cliente"] || item.cliente || "",
      horaChegada: item["Hora da Chegada"] || item.horaChegada || "",
      inicioAbastecimento: item["Início do Abastecimento"] || item.inicioAbastecimento || "",
      terminoAbastecimento: item["Término do Abastecimento"] || item.terminoAbastecimento || "",
      produto: item["Produto"] || item.produto || "DIESEL",
      volume: item["Volume"] || item.volume || "0,00",
      obs: item["Obs.:"] || item.obs || "",
      assinaturaCliente: item["Assinatura do Cliente"] || item.assinaturaCliente || "",
      driveFileUrl: item["Foto da Nota"] || item.fotoNota || item.driveFileUrl || "",
      dataCriacao: new Date().toISOString(),
      statusEnvio: 'enviado_drive'
    };
  });
}
