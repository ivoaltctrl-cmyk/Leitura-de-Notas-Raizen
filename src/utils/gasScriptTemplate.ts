/**
 * Google Apps Script Templates (GAS)
 * Script 1: SCRIPT_WEBHOOK_GS (webhook.gs - Comunicação com o App e Planilha)
 * Script 2: SCRIPT_CODIGO_GS (Código.gs - Robô de IA Gemini 2.5 Flash Lite para OCR de Comprovantes)
 * Script 3: SCRIPT_CODIGO_UNIFICADO_GS (Tudo em 1 único arquivo opcional)
 */

export const SCRIPT_WEBHOOK_GS = `/**
 * ============================================================================
 * SISTEMA INTEGRADO WFS / RAÍZEN - WEBHOOK DE COMUNICAÇÃO (webhook.gs)
 * ============================================================================
 * Responsabilidade:
 * 1. Receber upload de fotos do App React e salvar no Google Drive
 * 2. Ler registros da aba "Dados_Raizen" em tempo real (GET/POST)
 * 3. Atualizar/Editar registros e recalcular valores (Colunas M e N)
 * 4. Excluir registros com segurança
 * 5. Atualizar preços de combustível em lote
 * ============================================================================
 */

var NOME_ABA = "Dados_Raizen";
var FOLDER_ID = "1n2_zU5-2DG7tih314twOcf6lRSXZeFkc"; // ID da pasta do Google Drive

// Token secreto de segurança opcional
var WEBHOOK_SECRET_TOKEN = "";

function validarAcessoToken(e, postData) {
  var expectedToken = WEBHOOK_SECRET_TOKEN || PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN') || "";
  if (!expectedToken || !expectedToken.trim()) return true;
  
  expectedToken = String(expectedToken).trim();
  var receivedToken = "";
  if (e && e.parameter && e.parameter.token) {
    receivedToken = e.parameter.token;
  } else if (postData && postData.token) {
    receivedToken = postData.token;
  }
  
  return receivedToken ? String(receivedToken).trim() === expectedToken : false;
}

/**
 * Endpoint GET: Permite que o React leia a planilha diretamente ao carregar
 * Suporta JSON padrão e JSONP (via parâmetro callback ou prefix)
 */
function doGet(e) {
  var callback = (e && e.parameter && (e.parameter.callback || e.parameter.prefix)) ? (e.parameter.callback || e.parameter.prefix) : null;
  
  if (!validarAcessoToken(e, null)) {
    var authErr = { sucesso: false, mensagem: "Acesso não autorizado: Token de segurança inválido." };
    var authErrJson = JSON.stringify(authErr);
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + authErrJson + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
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

    if (callback) {
      return ContentService.createTextOutput(callback + '(' + jsonString + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(jsonString).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var errData = {
      sucesso: false,
      mensagem: "Erro ao ler planilha: " + err.message,
      records: []
    };
    var errJson = JSON.stringify(errData);

    if (callback) {
      return ContentService.createTextOutput(callback + '(' + errJson + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(errJson).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint POST: Salva foto no Drive, lê dados, edita, exclui ou atualiza preços
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

    // 3. Atualização de Valores por Litro e Valor Total (Colunas M e N)
    if (data.action === 'update_fuel_prices' || data.action === 'atualizar_valores' || data.action === 'salvar_precos') {
      var resPrecos = atualizarPrecosCombustivel(data);
      return ContentService.createTextOutput(JSON.stringify(resPrecos))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Edição / Atualização de um Lançamento Específico na Planilha
    if (data.action === 'update_row' || data.action === 'edit_record' || data.action === 'atualizar_registro') {
      var resEdit = atualizarRegistroLinha(data);
      return ContentService.createTextOutput(JSON.stringify(resEdit))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Exclusão de um Lançamento Específico na Planilha
    if (data.action === 'delete_row' || data.action === 'delete_record' || data.action === 'excluir_registro') {
      var resDel = excluirRegistroLinha(data);
      return ContentService.createTextOutput(JSON.stringify(resDel))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 6. Gravação: Salvar Foto no Drive
    if (!data.base64) {
      throw new Error("Imagem ausente.");
    }

    var fileId = "";
    var fileUrl = "";
    var fileName = data.fileName || ("OS_" + Utilities.formatDate(new Date(), "GMT-3", "yyyyMMdd_HHmmss") + ".jpg");

    var targetFolderId = FOLDER_ID;
    var scriptProps = PropertiesService.getScriptProperties();
    if (scriptProps) {
      targetFolderId = scriptProps.getProperty('DRIVE_FOLDER_ID') || scriptProps.getProperty('DRIVE_FOLDER_ID_ABASTECIMENTO') || FOLDER_ID;
    }

    var folder = DriveApp.getFolderById(targetFolderId);

    var base64Data = data.base64.indexOf(',') > -1 ? data.base64.split(',')[1] : data.base64;
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
      mensagem: "Foto salva no Drive com sucesso! O robô de IA fará a leitura para a planilha.",
      fileId: fileId,
      driveUrl: fileUrl,
      fileName: fileName
    };
  } catch (err) {
    output = {
      sucesso: false,
      mensagem: "Erro no processamento: " + err.message
    };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Lê os registros da aba "Dados_Raizen" da planilha
 */
function lerRegistrosPlanilha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var scriptProperties = PropertiesService.getScriptProperties();
    var sheetId = scriptProperties.getProperty('SPREADSHEET_ID');
    if (sheetId) {
      ss = SpreadsheetApp.openById(sheetId);
    }
  }

  if (!ss) return [];

  var sheet = ss.getSheetByName(NOME_ABA) || ss.getSheetByName("Dados_Raizen");
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var lastCol = Math.max(sheet.getLastColumn(), 14);
  var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  var values = range.getDisplayValues();

  var records = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var numero = row[0] ? String(row[0]).trim() : "";
    var data = row[1] ? String(row[1]).trim() : "";
    var volume = row[8] ? String(row[8]).trim() : "";

    if (!numero && !data && !volume) continue;

    records.push({
      id: "gas_row_" + (i + 2) + "_" + (numero || ("idx" + i)),
      rowNumber: i + 2,
      numero: numero,
      dataAbastecimento: data,
      formaPagamento: row[2] ? String(row[2]).trim() : "",
      cliente: row[3] ? String(row[3]).trim() : "",
      horaChegada: row[4] ? String(row[4]).trim() : "",
      inicioAbastecimento: row[5] ? String(row[5]).trim() : "",
      terminoAbastecimento: row[6] ? String(row[6]).trim() : "",
      produto: row[7] ? String(row[7]).trim() : "",
      volume: volume,
      obs: row[9] ? String(row[9]).trim() : "",
      assinaturaCliente: row[10] ? String(row[10]).trim() : "",
      driveFileUrl: row[11] ? String(row[11]).trim() : "",
      valorLitro: row[12] ? String(row[12]).trim() : "",
      valorTotal: row[13] ? String(row[13]).trim() : ""
    });
  }

  return records;
}

/**
 * Atualiza preços de combustível em lote (Colunas M e N)
 */
function atualizarPrecosCombustivel(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      var scriptProperties = PropertiesService.getScriptProperties();
      var sheetId = scriptProperties.getProperty('SPREADSHEET_ID');
      if (sheetId) ss = SpreadsheetApp.openById(sheetId);
    }
    if (!ss) return { sucesso: false, mensagem: "Planilha não encontrada." };

    var sheet = ss.getSheetByName(NOME_ABA);
    if (!sheet) return { sucesso: false, mensagem: "Aba não encontrada." };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { sucesso: false, mensagem: "Nenhum dado na planilha." };

    var updates = data.updates || [];
    var count = 0;

    for (var u = 0; u < updates.length; u++) {
      var item = updates[u];
      var row = item.rowNumber;
      if (row >= 2 && row <= lastRow) {
        if (item.valorLitro !== undefined) {
          sheet.getRange(row, 13).setValue(item.valorLitro);
        }
        if (item.valorTotal !== undefined) {
          sheet.getRange(row, 14).setValue(item.valorTotal);
        }
        count++;
      }
    }

    return {
      sucesso: true,
      mensagem: "Preços atualizados com sucesso para " + count + " lançamento(s)!",
      updatedCount: count
    };
  } catch (err) {
    return { sucesso: false, mensagem: "Erro ao atualizar preços: " + err.message };
  }
}

/**
 * Edita uma linha existente na planilha
 */
function atualizarRegistroLinha(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      var scriptProperties = PropertiesService.getScriptProperties();
      var sheetId = scriptProperties.getProperty('SPREADSHEET_ID');
      if (sheetId) ss = SpreadsheetApp.openById(sheetId);
    }
    if (!ss) return { sucesso: false, mensagem: "Planilha não encontrada." };

    var sheet = ss.getSheetByName(NOME_ABA);
    if (!sheet) return { sucesso: false, mensagem: "Aba não encontrada." };

    var lastRow = sheet.getLastRow();
    var targetNumero = String(data.oldNumero || data.numeroOriginal || data.numero || "").trim();
    var rowIdx = -1;

    if (data.rowNumber && typeof data.rowNumber === 'number' && data.rowNumber >= 2 && data.rowNumber <= lastRow) {
      rowIdx = data.rowNumber;
    }

    if (rowIdx === -1 && targetNumero) {
      var numValues = sheet.getRange(2, 1, Math.max(1, lastRow - 1), 1).getDisplayValues();
      for (var i = 0; i < numValues.length; i++) {
        var cellVal = String(numValues[i][0] || "").trim();
        if (cellVal === targetNumero) {
          rowIdx = i + 2;
          break;
        }
      }
    }

    if (rowIdx === -1) {
      return { sucesso: false, mensagem: "Lançamento com Número '" + targetNumero + "' não encontrado para edição." };
    }

    if (data.numero !== undefined) sheet.getRange(rowIdx, 1).setValue(String(data.numero));
    if (data.dataAbastecimento !== undefined) sheet.getRange(rowIdx, 2).setValue(String(data.dataAbastecimento));
    if (data.formaPagamento !== undefined) sheet.getRange(rowIdx, 3).setValue(String(data.formaPagamento));
    if (data.cliente !== undefined) sheet.getRange(rowIdx, 4).setValue(String(data.cliente));
    if (data.horaChegada !== undefined) sheet.getRange(rowIdx, 5).setValue(String(data.horaChegada));
    if (data.inicioAbastecimento !== undefined) sheet.getRange(rowIdx, 6).setValue(String(data.inicioAbastecimento));
    if (data.terminoAbastecimento !== undefined) sheet.getRange(rowIdx, 7).setValue(String(data.terminoAbastecimento));
    if (data.produto !== undefined) sheet.getRange(rowIdx, 8).setValue(String(data.produto));
    
    if (data.volume !== undefined) {
      var vClean = String(data.volume).replace(',', '.');
      var vNum = parseFloat(vClean);
      if (!isNaN(vNum) && vNum > 0) {
        sheet.getRange(rowIdx, 9).setValue(vNum.toFixed(2).replace('.', ','));
      } else {
        sheet.getRange(rowIdx, 9).setValue(String(data.volume));
      }
    }

    if (data.obs !== undefined) sheet.getRange(rowIdx, 10).setValue(String(data.obs));
    if (data.assinaturaCliente !== undefined) sheet.getRange(rowIdx, 11).setValue(String(data.assinaturaCliente));
    if (data.driveFileUrl !== undefined && data.driveFileUrl) sheet.getRange(rowIdx, 12).setValue(String(data.driveFileUrl));

    if (data.valorLitro !== undefined || data.valorTotal !== undefined) {
      var vLitroStr = String(data.valorLitro || "").replace(/[^\\d,\\.-]/g, '').replace(/\\./g, '').replace(',', '.');
      var vLitroNum = parseFloat(vLitroStr);
      var volCurrentStr = String(data.volume !== undefined ? data.volume : sheet.getRange(rowIdx, 9).getValue()).replace(/[^\\d,\\.-]/g, '').replace(/\\./g, '').replace(',', '.');
      var volCurrentNum = parseFloat(volCurrentStr);

      if (!isNaN(vLitroNum) && vLitroNum > 0) {
        sheet.getRange(rowIdx, 13).setValue("R$ " + vLitroNum.toFixed(2).replace('.', ','));
        if (!isNaN(volCurrentNum) && volCurrentNum > 0) {
          var tot = Math.round(vLitroNum * volCurrentNum * 100) / 100;
          sheet.getRange(rowIdx, 14).setValue("R$ " + tot.toFixed(2).replace('.', ','));
        }
      } else if (data.valorTotal) {
        sheet.getRange(rowIdx, 14).setValue(String(data.valorTotal));
      }
    }

    return {
      sucesso: true,
      mensagem: "Lançamento Nº " + (data.numero || targetNumero) + " atualizado na planilha!",
      row: rowIdx
    };
  } catch (err) {
    return { sucesso: false, mensagem: "Erro ao atualizar registro: " + err.message };
  }
}

/**
 * Exclui uma linha da planilha
 */
function excluirRegistroLinha(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      var scriptProperties = PropertiesService.getScriptProperties();
      var sheetId = scriptProperties.getProperty('SPREADSHEET_ID');
      if (sheetId) ss = SpreadsheetApp.openById(sheetId);
    }
    if (!ss) return { sucesso: false, mensagem: "Planilha não encontrada." };

    var sheet = ss.getSheetByName(NOME_ABA);
    if (!sheet) return { sucesso: false, mensagem: "Aba não encontrada." };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { sucesso: false, mensagem: "Nenhum registro para excluir." };

    var targetNumero = String(data.numero || data.numeroOriginal || "").trim();
    var rowIdx = -1;

    if (data.rowNumber && typeof data.rowNumber === 'number' && data.rowNumber >= 2 && data.rowNumber <= lastRow) {
      rowIdx = data.rowNumber;
    }

    if (rowIdx === -1 && targetNumero) {
      var numValues = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
      for (var i = 0; i < numValues.length; i++) {
        var cellVal = String(numValues[i][0] || "").trim();
        if (cellVal === targetNumero) {
          rowIdx = i + 2;
          break;
        }
      }
    }

    if (rowIdx === -1) {
      return { sucesso: false, mensagem: "Lançamento com Número '" + targetNumero + "' não encontrado." };
    }

    sheet.deleteRow(rowIdx);

    return {
      sucesso: true,
      mensagem: "Lançamento Nº " + targetNumero + " excluído com sucesso!",
      row: rowIdx
    };
  } catch (err) {
    return { sucesso: false, mensagem: "Erro ao excluir linha: " + err.message };
  }
}
`;

export const SCRIPT_CODIGO_GS = `/**
 * ============================================================================
 * SISTEMA INTEGRADO WFS / RAÍZEN - ROBÔ DE IA GEMINI (Código.gs)
 * ============================================================================
 * Responsabilidade:
 * 1. Processar pasta do Google Drive com fotos de notas/comprovantes
 * 2. Realizar OCR e auditoria com modelo Gemini 2.5 Flash Lite
 * 3. Gravar dados extraídos na aba "Dados_Raizen" da planilha Google Sheets
 * 4. Mover fotos processadas para a subpasta "Processados"
 * ============================================================================
 */

var ABASTECIMENTO_CONFIG = {
  SHEET_NAME: "Dados_Raizen",
  PASTA_PROCESSADOS: "Processados",
  MAX_FILE_SIZE_MB: 8
};

var GEMINI_MODEL_ABASTECIMENTO = "gemini-2.5-flash-lite"; // Alta volumetria e velocidade

function processarPastaAbastecimentos(limiteLote) {
  var lock = LockService.getScriptLock();
  var temLock = lock.tryLock(5000);

  if (!temLock) {
    Logger.log("Execução anterior ainda em andamento. Pulando esta chamada.");
    return { sucesso: false, mensagem: "Execução já em andamento. Aguarde alguns instantes." };
  }

  var countProcessados = 0;
  var countErros = 0;
  var maxArquivos = (typeof limiteLote === 'number' && limiteLote > 0) ? limiteLote : 20;

  try {
    var scriptProperties = PropertiesService.getScriptProperties();

    var folderId = scriptProperties.getProperty('DRIVE_FOLDER_ID_ABASTECIMENTO') ||
                   scriptProperties.getProperty('DRIVE_FOLDER_ID') ||
                   "1n2_zU5-2DG7tih314twOcf6lRSXZeFkc";
    var apiKey = scriptProperties.getProperty('GEMINI_API_KEY_ABASTECIMENTO') ||
                 scriptProperties.getProperty('GEMINI_API_KEY');
    
    if (!folderId || !apiKey) {
      Logger.log("Erro: Propriedades DRIVE_FOLDER_ID ou GEMINI_API_KEY não configuradas.");
      return { sucesso: false, mensagem: "Configure DRIVE_FOLDER_ID e GEMINI_API_KEY nas Propriedades do Script." };
    }
    
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      return { sucesso: false, mensagem: "Não foi possível acessar a pasta ID: " + folderId };
    }

    var processedFolder = getOuCriarSubpasta(folder, ABASTECIMENTO_CONFIG.PASTA_PROCESSADOS);
    var files = folder.getFiles();
    
    while (files.hasNext() && countProcessados < maxArquivos) {
      var file = files.next();
      var mimeType = file.getMimeType();
      
      if (mimeType.indexOf("image/") === 0 || mimeType === "application/pdf") {
        try {
          if (file.getSize() > ABASTECIMENTO_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
            continue;
          }
          
          var fileUrl = file.getUrl();
          processarUmaNotaAbastecimento(file, apiKey, fileUrl);
          file.moveTo(processedFolder);
          countProcessados++;
          
          Utilities.sleep(3000); // 3 segundos entre chamadas
        } catch (err) {
          countErros++;
          Logger.log('Erro ao processar ' + file.getName() + ': ' + err.message);
        }
      }
    }

    var temMaisPendentes = files.hasNext();
    var mensagemRetorno = countProcessados > 0 
      ? ("Sucesso: " + countProcessados + " nota(s) processada(s) e inserida(s) na planilha!" + (temMaisPendentes ? " (Ainda restam fotos na pasta)." : ""))
      : "Nenhuma foto pendente para processar na pasta.";

    Logger.log(mensagemRetorno);
    return {
      sucesso: true,
      processados: countProcessados,
      erros: countErros,
      temMais: temMaisPendentes,
      mensagem: mensagemRetorno
    };
  } finally {
    lock.releaseLock();
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
  var promptLines = [
    "Você é um especialista em OCR e auditoria de NOTAS E COMPROVANTES DE ABASTECIMENTO de combustível da Raízen / Shell / WFS Aviation Ground Handling.",
    "Analise a imagem com precisão cirúrgica de 100%, sem alucinações, sem suposições e sem arredondamentos arbitrários.",
    "",
    "=== REGRAS OBRIGATÓRIAS DE EXTRAÇÃO ===",
    "1. VOLUME (QUANTIDADE ABASTECIDA):",
    "   - Deve ser SEMPRE um número com 2 casas decimais (ex: 35.00, 37.00, 120.50).",
    "   - Se a nota exibir 37 ou 37.000 ou 37,00, registre estritamente 37.00.",
    "   - Se o valor impresso na nota tiver 3 casas decimais (ex: 35.000), converta para 35.00.",
    "   - Verifique a prova real: Volume = Valor Total / Preço Unitário para desempatar números embaçados.",
    "",
    "2. OBSERVAÇÃO / EQUIPAMENTO / PREFIXO:",
    "   - Copie exatamente os caracteres de identificação do equipamento, rampa, prefixo e placa.",
    "   - EXEMPLOS: GASOL XXD / TZ01A81, QTA-01, GPU-04, TRATOR-12, REBOCADOR 03, VAN-08.",
    "",
    "3. HORÁRIOS (CHEGADA, INÍCIO, TÉRMINO): Formato HH:mm (24h, ex: 12:51, 16:14, 16:15).",
    "4. NÚMERO DA NOTA: Sequência numérica impressa no cabeçalho ou campo OS (ex: 2393379).",
    "5. DATA: Formato DD/MM/AAAA (ex: 27/08/2026).",
    "6. CLIENTE & PRODUTO: Cliente (ex: ORBITAL, WFS, GOL) e Produto (GASOLINA, DIESEL, JET A-1).",
    "",
    "Responda EXCLUSIVAMENTE com o JSON estruturado abaixo, sem markdown e sem comentários:",
    "{",
    '  "numero": "string ou null",',
    '  "dataAbastecimento": "DD/MM/AAAA ou null",',
    '  "formaPagamento": "string ou null",',
    '  "cliente": "string ou null",',
    '  "horaChegada": "HH:mm ou null",',
    '  "inicioAbastecimento": "HH:mm ou null",',
    '  "terminoAbastecimento": "HH:mm ou null",',
    '  "produto": "string ou null",',
    '  "volume": 0.00,',
    '  "obs": "string ou null",',
    '  "assinaturaCliente": "string ou null"',
    "}"
  ];
  var prompt = promptLines.join("\\n");

  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL_ABASTECIMENTO + ":generateContent?key=" + apiKey;

  var requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mediaType, data: imageBase64 } }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.0,
      topP: 0.1,
      maxOutputTokens: 1024
    }
  };

  var tentativasMax = 3;
  var respostaSucesso = false;
  var response, responseCode;

  for (var i = 0; i < tentativasMax; i++) {
    response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    });

    responseCode = response.getResponseCode();

    if (responseCode === 200) {
      respostaSucesso = true;
      break;
    } else if (responseCode === 429) {
      Utilities.sleep(8000);
    } else {
      break;
    }
  }

  if (!respostaSucesso) {
    throw new Error("Falha na API Gemini (Status: " + responseCode + ")");
  }

  var json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error("Erro Gemini API: " + json.error.message);
  }
  if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
    throw new Error("Resposta inválida da API Gemini.");
  }
  var rawText = json.candidates[0].content.parts[0].text;
  var cleanText = rawText.indexOf("{") > -1 ? rawText.slice(rawText.indexOf("{"), rawText.lastIndexOf("}") + 1) : rawText.trim();

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    throw new Error("Erro ao converter resposta do Gemini em JSON: " + cleanText);
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
      throw new Error("Planilha não configurada. Defina 'SPREADSHEET_ID' nas Propriedades do Script.");
    }
  }
  var sheet = ss.getSheetByName(ABASTECIMENTO_CONFIG.SHEET_NAME) || configurarAbaAbastecimentos(ss);
  
  var volumeTratado = 0;
  if (dados.volume !== null && dados.volume !== undefined) {
    var parsed = parseFloat(dados.volume.toString().replace(',', '.'));
    volumeTratado = isNaN(parsed) ? 0 : parsed;
  }
  var volumeFormatado = volumeTratado > 0 ? volumeTratado.toFixed(2).replace('.', ',') : (dados.volume ? String(dados.volume) : "");

  var nextRow = sheet.getLastRow() + 1;
  var formulaValorTotal = "=IF(AND(ISNUMBER(I" + nextRow + "),ISNUMBER(M" + nextRow + ")),I" + nextRow + "*M" + nextRow + ",\"\")";

  var rowData = [
    dados.numero ? String(dados.numero) : "",
    dados.dataAbastecimento ? String(dados.dataAbastecimento) : "",
    dados.formaPagamento ? String(dados.formaPagamento).toUpperCase() : "CONTRATO",
    dados.cliente ? String(dados.cliente).toUpperCase() : "",
    dados.horaChegada ? String(dados.horaChegada) : "",
    dados.inicioAbastecimento ? String(dados.inicioAbastecimento) : "",
    dados.terminoAbastecimento ? String(dados.terminoAbastecimento) : "",
    dados.produto ? String(dados.produto).toUpperCase() : "DIESEL",
    volumeFormatado,
    dados.obs ? String(dados.obs) : "",
    dados.assinaturaCliente ? String(dados.assinaturaCliente) : "",
    fileUrl || "",
    "",
    formulaValorTotal
  ];

  sheet.appendRow(rowData);
  Logger.log("Registro inserido com sucesso na linha " + nextRow + " (Nota Nº " + dados.numero + ")");
}

function configurarAbaAbastecimentos(ss) {
  var sheet = ss.insertSheet(ABASTECIMENTO_CONFIG.SHEET_NAME);
  var headers = [
    "Número", "Data", "Forma Pagamento", "Cliente",
    "Chegada", "Início", "Término", "Produto",
    "Volume", "Obs.", "Assinatura do Cliente", "Link da Foto",
    "Valor/Litro", "Valor Total"
  ];
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#D32F2F").setFontColor("#FFFFFF").setFontWeight("bold");
  sheet.setFrozenRows(1);
  return sheet;
}

function getOuCriarSubpasta(pastaPai, nome) {
  var pastas = pastaPai.getFoldersByName(nome);
  if (pastas.hasNext()) return pastas.next();
  return pastaPai.createFolder(nome);
}

// Aliases para acionadores manuais
function triggerProcessarPasta() {
  processarPastaAbastecimentos(20);
}
function processarFila() {
  processarPastaAbastecimentos(20);
}
`;

export const SCRIPT_CODIGO_UNIFICADO_GS = SCRIPT_WEBHOOK_GS + "\n\n" + SCRIPT_CODIGO_GS;
