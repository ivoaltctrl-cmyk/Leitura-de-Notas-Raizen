/**
 * Google Apps Script Templates
 * 1. webhook.gs: Comunicação front/back, upload no Drive e leitura dos dados da aba Dados_Raizen
 * 2. Código.gs: Processador automático com Gemini IA, grava na planilha e move fotos para Processados
 */

export const SCRIPT_WEBHOOK_GS = `/**
 * WFS / RAÍZEN - SCRIPT 3 (HÍBRIDO REVALIDADO COM SUPORTE A JSONP E CORS)
 * Baseado 100% no Script 1 funcional + Adição de doGet com suporte a callback/JSONP para o React
 */

var NOME_ABA = "Dados_Raizen";
var FOLDER_ID = "1n2_zU5-2DG7tih314twOcf6lRSXZeFkc";

/**
 * Endpoint GET: Permite que o React leia a planilha diretamente ao carregar
 * Suporta JSON padrão e JSONP (via parâmetro callback ou prefix) para desviar de restrições de CORS
 */
function doGet(e) {
  var callback = (e && e.parameter && (e.parameter.callback || e.parameter.prefix)) ? (e.parameter.callback || e.parameter.prefix) : null;
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
 * (NÃO grava mais linha na planilha)
 */
function doPost(e) {
  var output;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Nenhum dado recebido na requisição POST.");
    }
    var data = JSON.parse(e.postData.contents);

    // 1. Teste de Conexão (Ping)
    if (data.action === 'ping_test') {
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
 * Função para ler a planilha retornando os dados brutos
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
    if (data.length <= 1) return []; // Retorna vazio se só houver o cabeçalho

    var rows = data.slice(1);

    return rows.map(function(row) {
      return {
        "Número": row[0] || "",
        "Forma de Pagamento": row[1] || "",
        "Cliente": row[2] || "",
        "Hora da Chegada": row[3] || "",
        "Início do Abastecimento": row[4] || "",
        "Término do Abastecimento": row[5] || "",
        "Produto": row[6] || "",
        "Volume": row[7] || "",
        "Obs.:": row[8] || "",
        "Assinatura do Cliente": row[9] || "",
        "Foto da Nota": row[10] || "",
        
        // Mapeamento secundário em camelCase para garantia de compatibilidade com a interface
        "numero": row[0] || "",
        "formaPagamento": row[1] || "",
        "cliente": row[2] || "",
        "horaChegada": row[3] || "",
        "inicioAbastecimento": row[4] || "",
        "terminoAbastecimento": row[5] || "",
        "produto": row[6] || "",
        "volume": row[7] || "",
        "obs": row[8] || "",
        "assinaturaCliente": row[9] || "",
        "fotoNota": row[10] || "",
        "driveFileUrl": row[10] || ""
      };
    });
  } catch (e) {
    return [];
  }
}`;

export const SCRIPT_CODIGO_GS = `/**
 * ============================================================================
 * SCRIPT 2: PROCESSADOR AUTOMÁTICO GEMINI IA
 * ============================================================================
 * Função: Varre a pasta do Drive periodicamente via acionador temporal,
 * envia os comprovantes para a API Gemini, grava o resultado na aba "Dados_Raizen"
 * e move os arquivos para a pasta "Processados".
 * ============================================================================
 */
var ABASTECIMENTO_CONFIG = {
  SHEET_NAME: "Dados_Raizen",
  PASTA_PROCESSADOS: "Processados",
  MAX_FILE_SIZE_MB: 8
};

// Mantido o modelo de sua preferência
var GEMINI_MODEL_ABASTECIMENTO = 'gemini-3.6-flash';

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

        // Captura a URL ANTES de mover, pois é o dado que vai para a coluna K
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
    '(comprovante emitido pela Raízen/Shell, usado em abastecimento de veículos/equipamentos em aeroporto). ' +
    'Leia os campos visíveis e responda EXCLUSIVAMENTE com um JSON válido, sem qualquer marcação markdown ou texto extra, ' +
    'seguindo exatamente este formato: ' +
    '{' +
    '  "numero": "string ou null", ' +
    '  "formaPagamento": "string ou null", ' +
    '  "cliente": "string ou null", ' +
    '  "horaChegada": "HH:mm ou null", ' +
    '  "inicioAbastecimento": "HH:mm ou null", ' +
    '  "terminoAbastecimento": "HH:mm ou null", ' +
    '  "produto": "string ou null", ' +
    '  "volume": number ou null, ' +
    '  "obs": "string ou null", ' +
    '  "assinaturaCliente": "string ou null"' +
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

  // 11 colunas, na MESMA ordem do cabeçalho (A a K)
  var novaLinha = [
    dados.numero ? String(dados.numero).trim() : "",                             // A: Número
    dados.formaPagamento ? String(dados.formaPagamento).trim() : "",             // B: Forma de Pagamento
    dados.cliente ? String(dados.cliente).trim() : "",                           // C: Cliente
    dados.horaChegada ? String(dados.horaChegada).trim() : "",                   // D: Hora da Chegada
    dados.inicioAbastecimento ? String(dados.inicioAbastecimento).trim() : "",   // E: Início do Abastecimento
    dados.terminoAbastecimento ? String(dados.terminoAbastecimento).trim() : "", // F: Término do Abastecimento
    dados.produto ? String(dados.produto).trim() : "",                          // G: Produto
    volumeTratado,                                                               // H: Volume
    dados.obs ? String(dados.obs).trim() : "",                                  // I: Obs.:
    dados.assinaturaCliente ? String(dados.assinaturaCliente).trim() : "",      // J: Assinatura do Cliente
    fileUrl || ""                                                                // K: Foto da Nota (Link Drive)
  ];
  sheet.appendRow(novaLinha);
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 8).setNumberFormat("#,##0.00"); // H = Volume
  sheet.getRange(lastRow, 1, 1, novaLinha.length).setVerticalAlignment("middle");
  return { sucesso: true, mensagem: "Nota gravada com sucesso!" };
}

function configurarAbaAbastecimentos(ss) {
  var sheet = ss.getSheetByName(ABASTECIMENTO_CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(ABASTECIMENTO_CONFIG.SHEET_NAME);
  var headers = [
    "Número", "Forma de Pagamento", "Cliente", "Hora da Chegada",
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
