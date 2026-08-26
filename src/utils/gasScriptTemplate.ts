/**
 * Google Apps Script Templates
 * 1. webhook.gs: Comunicação front/back, upload no Drive e leitura dos dados da aba Dados_Raizen
 * 2. Código.gs: Processador automático com Gemini IA, grava na planilha e move fotos para Processados
 */

export const SCRIPT_WEBHOOK_GS = `/**
 * WFS / RAÍZEN - SCRIPT 3 (HÍBRIDO REVALIDADO COM SUPORTE A TOKEN DE SEGURANÇA, JSONP E CORS)
 * Baseado 100% no Script 1 funcional + Leitura de cabeçalhos (incluindo Data) + Validação de Token Opcional
 */

var NOME_ABA = "Dados_Raizen";
var FOLDER_ID = "1n2_zU5-2DG7tih314twOcf6lRSXZeFkc";

// Token secreto de segurança (opcional, pode ser configurado aqui ou em Propriedades do Script como SECRET_TOKEN)
var WEBHOOK_SECRET_TOKEN = "";

function validarAcessoToken(e, postData) {
  var expectedToken = WEBHOOK_SECRET_TOKEN || PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN') || "";
  if (!expectedToken) return true; // Se não houver token configurado, permite livre acesso compatível
  
  var receivedToken = "";
  if (e && e.parameter && e.parameter.token) {
    receivedToken = e.parameter.token;
  } else if (postData && postData.token) {
    receivedToken = postData.token;
  }
  
  return receivedToken === expectedToken;
}

/**
 * Endpoint GET: Permite que o React leia a planilha diretamente ao carregar
 * Suporta JSON padrão e JSONP (via parâmetro callback ou prefix) para desviar de restrições de CORS
 */
function doGet(e) {
  var callback = (e && e.parameter && (e.parameter.callback || e.parameter.prefix)) ? (e.parameter.callback || e.parameter.prefix) : null;
  
  if (!validarAcessoToken(e, null)) {
    var authErr = { sucesso: false, mensagem: "Acesso não autorizado: Token de segurança inválido." };
    var authErrJson = JSON.stringify(authErr);
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + authErrJson + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(authErrJson).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var records = lerRegistrosPlanilha();
    var responseData = {
      sucesso: true,
      mensagem: "Dados carregados da planilha com sucesso!",
      total: records.length,
      records: records,
      timestamp: new Date().toISOString()
    };
    var jsonString = JSON.stringify(responseData);

    // Se a chamada solicitou JSONP (callback), envelopa a resposta na função
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + jsonString + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var errData = {
      sucesso: false,
      mensagem: "Erro ao ler planilha: " + err.message,
      records: []
    };
    var errJson = JSON.stringify(errData);

    if (callback) {
      return ContentService.createTextOutput(callback + '(' + errJson + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(errJson)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint POST: Salva foto no Drive ou retorna dados
 * (NÃO grava mais linha na planilha diretamente)
 */
function doPost(e) {
  var output;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Nenhum dado recebido na requisição POST.");
    }
    var data = JSON.parse(e.postData.contents);

    // Validação de Token de Segurança (se configurado)
    if (!validarAcessoToken(e, data)) {
      throw new Error("Acesso não autorizado: Token de segurança inválido ou ausente.");
    }

    // 1. Teste de Conexão (Ping)
    if (data.action === 'ping_test' || data.action === 'test') {
      return ContentService.createTextOutput(JSON.stringify({
        sucesso: true,
        mensagem: "Conexão confirmada com sucesso com o Google Drive e Planilha!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Consulta / Leitura dos Registros da Planilha
    if (data.action === 'get_sheet_data' || data.action === 'read' || data.action === 'fetch_records') {
      var records = lerRegistrosPlanilha();
      return ContentService.createTextOutput(JSON.stringify({
        sucesso: true,
        mensagem: "Registros lidos da aba " + NOME_ABA,
        total: records.length,
        records: records
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Gravação: Salvar Foto no Drive (SEM gravar linha na planilha)
    if (!data.base64) {
      throw new Error("Imagem ausente.");
    }

    var fileId = "";
    var fileUrl = "";
    var fileName = data.fileName || ("OS_" + Utilities.formatDate(new Date(), "GMT-3", "yyyyMMdd_HHmmss") + ".jpg");

    var folder = DriveApp.getFolderById(FOLDER_ID);

    var base64Data = data.base64.replace(/^data:image\\/\\w+;base64,/, "");
    var decodedBytes = Utilities.base64Decode(base64Data);
    var mimeType = data.mimeType || "image/jpeg";
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
    var file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {}

    fileId = file.getId();
    fileUrl = file.getUrl();

    output = {
      sucesso: true,
      mensagem: "Foto salva no Drive! A linha será gravada na planilha pelo scanner automático.",
      fileId: fileId,
      driveUrl: fileUrl,
      fileName: fileName
    };
  } catch (err) {
    output = {
      sucesso: false,
      mensagem: "Erro no Apps Script: " + err.message
    };
  }
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Função para ler a planilha retornando os dados brutos com mapeamento inteligente de colunas
 */
function lerRegistrosPlanilha() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      var scriptProperties = PropertiesService.getScriptProperties();
      var sheetId = scriptProperties.getProperty('SPREADSHEET_ID');
      if (sheetId) ss = SpreadsheetApp.openById(sheetId);
    }
    if (!ss) return [];
    
    var sheet = ss.getSheetByName(NOME_ABA);
    if (!sheet) return [];

    // Pega todos os dados já formatados como exibidos na célula
    var data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return []; // Retorna vazio se só houver o cabeçalho ou estiver vazia

    var header = data[0].map(function(h) { return String(h || "").trim().toLowerCase(); });
    
    // Mapeamento dinâmico de índices por nome do cabeçalho
    function getIdx(aliases, defaultIdx) {
      for (var i = 0; i < header.length; i++) {
        for (var a = 0; a < aliases.length; a++) {
          if (header[i].indexOf(aliases[a].toLowerCase()) !== -1) return i;
        }
      }
      return defaultIdx;
    }

    var idxNumero = getIdx(["número", "numero", "nro", "os"], 0);
    var idxData = getIdx(["data do abastecimento", "data abastecimento", "data"], -1);
    var idxForma = getIdx(["forma de pagamento", "forma", "pagamento", "pagto"], idxData === 1 ? 2 : 1);
    var idxCliente = getIdx(["cliente", "empresa", "razao"], idxData === 1 ? 3 : 2);
    var idxChegada = getIdx(["hora da chegada", "hora chegada", "chegada"], idxData === 1 ? 4 : 3);
    var idxInicio = getIdx(["início do abastecimento", "inicio do abastecimento", "início", "inicio"], idxData === 1 ? 5 : 4);
    var idxTermino = getIdx(["término do abastecimento", "termino do abastecimento", "término", "termino", "fim"], idxData === 1 ? 6 : 5);
    var idxProduto = getIdx(["produto", "combustível", "combustivel"], idxData === 1 ? 7 : 6);
    var idxVolume = getIdx(["volume", "litros", "quantidade", "qtd"], idxData === 1 ? 8 : 7);
    var idxObs = getIdx(["obs", "observação", "observacao", "placa"], idxData === 1 ? 9 : 8);
    var idxAssinatura = getIdx(["assinatura do cliente", "assinatura", "conferido"], idxData === 1 ? 10 : 9);
    var idxFoto = getIdx(["foto da nota", "foto", "comprovante", "link", "drive"], idxData === 1 ? 11 : 10);

    var rows = data.slice(1);

    return rows.map(function(row, rIdx) {
      var numVal = (idxNumero !== -1 && row[idxNumero]) ? row[idxNumero] : ("OS-" + (rIdx + 1));
      var dataVal = (idxData !== -1 && row[idxData]) ? row[idxData] : "";
      var formaVal = (idxForma !== -1 && row[idxForma]) ? row[idxForma] : "CONTRATO";
      var cliVal = (idxCliente !== -1 && row[idxCliente]) ? row[idxCliente] : "";
      var chegVal = (idxChegada !== -1 && row[idxChegada]) ? row[idxChegada] : "";
      var iniVal = (idxInicio !== -1 && row[idxInicio]) ? row[idxInicio] : "";
      var terVal = (idxTermino !== -1 && row[idxTermino]) ? row[idxTermino] : "";
      var prodVal = (idxProduto !== -1 && row[idxProduto]) ? row[idxProduto] : "DIESEL";
      var volVal = (idxVolume !== -1 && row[idxVolume]) ? row[idxVolume] : "0,00";
      var obsVal = (idxObs !== -1 && row[idxObs]) ? row[idxObs] : "";
      var assVal = (idxAssinatura !== -1 && row[idxAssinatura]) ? row[idxAssinatura] : "";
      var fotoVal = (idxFoto !== -1 && row[idxFoto]) ? row[idxFoto] : "";

      // Ignora linhas totalmente em branco
      if (!numVal && !cliVal && !volVal) return null;

      return {
        "id": "sheet-row-" + (rIdx + 2) + "-" + numVal,
        "Número": numVal,
        "Data do Abastecimento": dataVal,
        "Data": dataVal,
        "Forma de Pagamento": formaVal,
        "Cliente": cliVal,
        "Hora da Chegada": chegVal,
        "Início do Abastecimento": iniVal,
        "Término do Abastecimento": terVal,
        "Produto": prodVal,
        "Volume": volVal,
        "Obs.:": obsVal,
        "Assinatura do Cliente": assVal,
        "Foto da Nota": fotoVal,
        
        // Mapeamento em camelCase para compatibilidade universal
        "numero": numVal,
        "dataAbastecimento": dataVal,
        "formaPagamento": formaVal,
        "cliente": cliVal,
        "horaChegada": chegVal,
        "inicioAbastecimento": iniVal,
        "terminoAbastecimento": terVal,
        "produto": prodVal,
        "volume": volVal,
        "obs": obsVal,
        "assinaturaCliente": assVal,
        "fotoNota": fotoVal,
        "driveFileUrl": fotoVal
      };
    }).filter(function(item) { return item !== null; });
  } catch (e) {
    return [];
  }
}`;

export const SCRIPT_CODIGO_GS = `/**
 * ============================================================================
 * SCRIPT 2: PROCESSADOR AUTOMÁTICO GEMINI IA (ROBÔ DE LEITURA DAS NOTAS)
 * ============================================================================
 * Função: Varre a pasta do Drive periodicamente via acionador temporal,
 * envia os comprovantes para a API Gemini (extraindo Número, Data, Horários, etc.),
 * grava o resultado na aba "Dados_Raizen" e move os arquivos para "Processados".
 * ============================================================================
 */
var ABASTECIMENTO_CONFIG = {
  SHEET_NAME: "Dados_Raizen",
  PASTA_PROCESSADOS: "Processados",
  MAX_FILE_SIZE_MB: 8
};

// Modelo Gemini oficial para Google Apps Script REST v1beta
var GEMINI_MODEL_ABASTECIMENTO = 'gemini-1.5-flash';

function processarPastaAbastecimentos() {
  var scriptProperties = PropertiesService.getScriptProperties();

  var folderId = scriptProperties.getProperty('DRIVE_FOLDER_ID_ABASTECIMENTO') ||
                 scriptProperties.getProperty('DRIVE_FOLDER_ID');
  var apiKey = scriptProperties.getProperty('GEMINI_API_KEY_ABASTECIMENTO') ||
               scriptProperties.getProperty('GEMINI_API_KEY');
  
  if (!folderId || !apiKey) {
    Logger.log("Erro: Propriedades DRIVE_FOLDER_ID ou GEMINI_API_KEY não configuradas.");
    return;
  }
  
  var folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (e) {
    Logger.log("Erro de Acesso: Não foi possível acessar a pasta ID: " + folderId);
    return;
  }

  // Define/Cria a pasta "Processados" antes de varrer os arquivos
  var processedFolder = getOuCriarSubpasta(folder, ABASTECIMENTO_CONFIG.PASTA_PROCESSADOS);

  var files = folder.getFiles();
  
  while (files.hasNext()) {
    var file = files.next();
    var mimeType = file.getMimeType();
    
    if (mimeType.indexOf("image/") === 0 || mimeType === "application/pdf") {
      try {
        if (file.getSize() > ABASTECIMENTO_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
          Logger.log("Aviso: Arquivo " + file.getName() + " excede o limite de " + ABASTECIMENTO_CONFIG.MAX_FILE_SIZE_MB + "MB.");
          continue;
        }
        
        Logger.log("Processando arquivo: " + file.getName());

        // Captura a URL ANTES de mover, pois é o link gravado na planilha
        var fileUrl = file.getUrl();

        processarUmaNotaAbastecimento(file, apiKey, fileUrl);

        file.moveTo(processedFolder);
        Logger.log("Sucesso: Arquivo " + file.getName() + " movido para '" + ABASTECIMENTO_CONFIG.PASTA_PROCESSADOS + "'.");
        
        // PAUSA DE SEGURANÇA: 4 segundos entre arquivos para não estourar a cota por minuto
        Utilities.sleep(4000);

      } catch (err) {
        Logger.log('Erro ao processar ' + file.getName() + ': ' + err.message);
      }
    }
  }
}

function processarUmaNotaAbastecimento(file, apiKey, fileUrl) {
  var blob = file.getBlob();
  var mediaType = blob.getContentType();
  var imageBase64 = Utilities.base64Encode(blob.getBytes());
  var dados = extractFuelReceiptDataWithGemini(imageBase64, mediaType, apiKey);
  salvarAbastecimentoNaPlanilha(dados, fileUrl);
}

function extractFuelReceiptDataWithGemini(imageBase64, mediaType, apiKey) {
  var prompt = 'Você está analisando a imagem de uma NOTA DE ABASTECIMENTO de combustível ' +
    '(comprovante emitido pela Raízen/Shell, usado em abastecimento de veículos/equipamentos em aeroporto WFS). ' +
    'Leia os campos visíveis com máxima atenção e responda EXCLUSIVAMENTE com um JSON válido, sem markdown ou texto extra: ' +
    '{' +
    '  "numero": "string ou null (Número da nota ou OS)", ' +
    '  "dataAbastecimento": "DD/MM/AAAA ou null (Data do abastecimento impressa na nota, ex: 26/08/2026)", ' +
    '  "formaPagamento": "string ou null (ex: CONTRATO, FATURADO, A VISTA)", ' +
    '  "cliente": "string ou null (Razão social / Nome da empresa cliente)", ' +
    '  "horaChegada": "HH:mm ou null", ' +
    '  "inicioAbastecimento": "HH:mm ou null", ' +
    '  "terminoAbastecimento": "HH:mm ou null", ' +
    '  "produto": "string ou null (ex: DIESEL, DIESEL S10, JET A-1)", ' +
    '  "volume": number ou null (Quantidade em litros abastecida, ex: 60.00), ' +
    '  "obs": "string ou null (Prefixo, placa ou equipamento)", ' +
    '  "assinaturaCliente": "string ou null (Nome legível e matrícula de quem assinou)"' +
    '}';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL_ABASTECIMENTO + ':generateContent?key=' + apiKey;

  var requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mediaType, data: imageBase64 } }
      ]
    }],
    generationConfig: { responseMimeType: 'application/json' }
  };

  // SISTEMA DE RE-TENTATIVAS EM CASO DE ERRO 429
  var tentativasMax = 3;
  var respostaSucesso = false;
  var response, responseCode;

  for (var i = 0; i < tentativasMax; i++) {
    response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    });

    responseCode = response.getResponseCode();

    if (responseCode === 200) {
      respostaSucesso = true;
      break;
    } else if (responseCode === 429) {
      Logger.log("Limite de taxa (429) atingido. Aguardando 10 segundos antes de tentar novamente...");
      Utilities.sleep(10000);
    } else {
      break;
    }
  }

  if (!respostaSucesso) {
    throw new Error('Falha na resposta da API Gemini (Status: ' + responseCode + ')');
  }

  var json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error('Erro Gemini API: ' + json.error.message);
  }
  if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
    throw new Error('Resposta inválida recebida da API.');
  }
  var rawText = json.candidates[0].content.parts[0].text;
  var cleanText = rawText.replace(/` + "```" + `json|` + "```" + `/gi, '').trim();

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    throw new Error('Erro ao converter resposta em JSON.');
  }
}

function salvarAbastecimentoNaPlanilha(dados, fileUrl) {
  dados = dados || {};

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    var scriptProperties = PropertiesService.getScriptProperties();
    var sheetId = scriptProperties.getProperty('SPREADSHEET_ID');
    if (sheetId) {
      ss = SpreadsheetApp.openById(sheetId);
    } else {
      throw new Error("Impossível acessar a planilha. Configure 'SPREADSHEET_ID' nas Propriedades do Script.");
    }
  }
  var sheet = ss.getSheetByName(ABASTECIMENTO_CONFIG.SHEET_NAME) || configurarAbaAbastecimentos(ss);
  
  var volumeTratado = 0;
  if (dados.volume !== null && dados.volume !== undefined) {
    var parsed = parseFloat(dados.volume.toString().replace(',', '.'));
    volumeTratado = isNaN(parsed) ? 0 : parsed;
  }

  var dataHoje = Utilities.formatDate(new Date(), "GMT-3", "dd/MM/yyyy");
  var dataTratada = (dados.dataAbastecimento && String(dados.dataAbastecimento).trim().length >= 8) 
    ? String(dados.dataAbastecimento).trim() 
    : dataHoje;

  // Verifica o cabeçalho existente para saber se tem a coluna de Data
  var headerValues = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 11)).getDisplayValues()[0];
  var temColunaData = headerValues.some(function(h) { 
    return h.toLowerCase().indexOf("data") !== -1; 
  });

  var novaLinha;
  if (temColunaData) {
    // 12 Colunas Oficiais (A a L) com Data do Abastecimento na Coluna B:
    novaLinha = [
      dados.numero ? String(dados.numero).trim() : "",                             // A: Número
      dataTratada,                                                                 // B: Data do Abastecimento
      dados.formaPagamento ? String(dados.formaPagamento).trim() : "CONTRATO",     // C: Forma de Pagamento
      dados.cliente ? String(dados.cliente).trim() : "",                           // D: Cliente
      dados.horaChegada ? String(dados.horaChegada).trim() : "",                   // E: Hora da Chegada
      dados.inicioAbastecimento ? String(dados.inicioAbastecimento).trim() : "",   // F: Início do Abastecimento
      dados.terminoAbastecimento ? String(dados.terminoAbastecimento).trim() : "", // G: Término do Abastecimento
      dados.produto ? String(dados.produto).trim() : "DIESEL",                     // H: Produto
      volumeTratado,                                                               // I: Volume
      dados.obs ? String(dados.obs).trim() : "",                                  // J: Obs.:
      dados.assinaturaCliente ? String(dados.assinaturaCliente).trim() : "",      // K: Assinatura do Cliente
      fileUrl || ""                                                                // L: Foto da Nota (Link Drive)
    ];
    sheet.appendRow(novaLinha);
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 9).setNumberFormat("#,##0.00"); // Coluna I = Volume
    sheet.getRange(lastRow, 1, 1, novaLinha.length).setVerticalAlignment("middle");
  } else {
    // 11 Colunas Legado (A a K)
    novaLinha = [
      dados.numero ? String(dados.numero).trim() : "",                             // A: Número
      dados.formaPagamento ? String(dados.formaPagamento).trim() : "CONTRATO",     // B: Forma de Pagamento
      dados.cliente ? String(dados.cliente).trim() : "",                           // C: Cliente
      dados.horaChegada ? String(dados.horaChegada).trim() : "",                   // D: Hora da Chegada
      dados.inicioAbastecimento ? String(dados.inicioAbastecimento).trim() : "",   // E: Início do Abastecimento
      dados.terminoAbastecimento ? String(dados.terminoAbastecimento).trim() : "", // F: Término do Abastecimento
      dados.produto ? String(dados.produto).trim() : "DIESEL",                     // G: Produto
      volumeTratado,                                                               // H: Volume
      dados.obs ? String(dados.obs).trim() : "",                                  // I: Obs.:
      dados.assinaturaCliente ? String(dados.assinaturaCliente).trim() : "",      // J: Assinatura do Cliente
      fileUrl || ""                                                                // K: Foto da Nota (Link Drive)
    ];
    sheet.appendRow(novaLinha);
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 8).setNumberFormat("#,##0.00"); // Coluna H = Volume
    sheet.getRange(lastRow, 1, 1, novaLinha.length).setVerticalAlignment("middle");
  }

  return { sucesso: true, mensagem: "Nota gravada com sucesso!" };
}

function configurarAbaAbastecimentos(ss) {
  var sheet = ss.getSheetByName(ABASTECIMENTO_CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(ABASTECIMENTO_CONFIG.SHEET_NAME);
  var headers = [
    "Número", "Data do Abastecimento", "Forma de Pagamento", "Cliente", "Hora da Chegada",
    "Início do Abastecimento", "Término do Abastecimento", "Produto",
    "Volume", "Obs.:", "Assinatura do Cliente", "Foto da Nota"
  ];
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#E31B23").setFontColor("#FFFFFF").setFontWeight("bold")
             .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setFrozenRows(1);
  return sheet;
}

function getOuCriarSubpasta(pastaPai, nome) {
  var subpastas = pastaPai.getFoldersByName(nome);
  return subpastas.hasNext() ? subpastas.next() : pastaPai.createFolder(nome);
}`;

// Aliases para compatibilidade
export const GOOGLE_APPS_SCRIPT_CODE = SCRIPT_WEBHOOK_GS;
