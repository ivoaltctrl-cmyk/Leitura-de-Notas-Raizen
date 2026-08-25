/**
 * Google Apps Script Template Code
 * - Salva as fotos capturadas na pasta do Google Drive
 * - Grava as linhas na aba "Dados_Raizen" (Colunas A até K)
 * - Lê e retorna os dados reais da planilha para o App quando solicitado (doGet / doPost)
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * WFS / RAÍZEN - SISTEMA DE CONTROLE DE ABASTECIMENTO
 * Integração Google Drive + Google Sheets (Aba: Dados_Raizen)
 */

// Nome exato da aba na planilha
var NOME_ABA = "Dados_Raizen";
var NOME_PASTA_DRIVE = "Comprovantes_Raizen";

/**
 * Endpoint GET: Retorna todos os lançamentos da planilha Dados_Raizen em formato JSON
 */
function doGet(e) {
  try {
    var records = getSheetRecords();
    return ContentService.createTextOutput(JSON.stringify({
      sucesso: true,
      mensagem: "Dados carregados da planilha com sucesso!",
      total: records.length,
      records: records,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      sucesso: false,
      mensagem: "Erro ao ler planilha: " + err.message,
      records: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint POST: Salva foto no Drive, grava linha na planilha ou retorna dados
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
        mensagem: "Conexão estabelecida com sucesso com o Google Drive e Planilha!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Consulta / Leitura dos Registros da Planilha
    if (data.action === 'get_sheet_data' || data.action === 'read' || data.action === 'fetch_records') {
      var records = getSheetRecords();
      return ContentService.createTextOutput(JSON.stringify({
        sucesso: true,
        mensagem: "Registros lidos da aba " + NOME_ABA,
        total: records.length,
        records: records
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Gravação: Salvar Foto no Drive + Linha no Sheets
    if (!data.base64 && !data.dados) {
      throw new Error("Dados da nota ou imagem ausentes.");
    }

    var fileId = "";
    var fileUrl = "";
    var fileName = data.fileName || ("OS_" + Utilities.formatDate(new Date(), "GMT-3", "yyyyMMdd_HHmmss") + ".jpg");

    // Salvar arquivo no Google Drive se houver imagem base64
    if (data.base64) {
      var folder = getOrCreateFolder();
      var base64Data = data.base64.replace(/^data:image\\/\\w+;base64,/, "");
      var decodedBytes = Utilities.base64Decode(base64Data);
      var mimeType = data.mimeType || "image/jpeg";
      var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
      var file = folder.createFile(blob);
      fileId = file.getId();
      fileUrl = file.getUrl();
    }

    // Gravar linha na Planilha Dados_Raizen
    var rowIndex = 0;
    var d = data.dados || {};
    var ss = getSpreadsheet();
    if (ss) {
      var sheet = getOrCreateSheet(ss);
      rowIndex = sheet.getLastRow() + 1;

      // Colunas A a K
      var newRow = [
        d.numero || fileName.replace(/\\.[^/.]+$/, ""), // A: Número
        d.formaPagamento || "CONTRATO",                 // B: Forma de Pagamento
        d.cliente || "WFS / RAÍZEN",                    // C: Cliente
        d.horaChegada || "",                            // D: Hora da Chegada
        d.inicioAbastecimento || "",                    // E: Início do Abastecimento
        d.terminoAbastecimento || "",                   // F: Término do Abastecimento
        d.produto || "DIESEL",                          // G: Produto
        d.volume || "0,00",                             // H: Volume
        d.obs || "",                                    // I: Obs.:
        d.assinaturaCliente || "",                      // J: Assinatura do Cliente
        fileUrl || ""                                   // K: Foto da Nota (Link Drive)
      ];

      sheet.appendRow(newRow);
    }

    output = {
      sucesso: true,
      mensagem: "Foto salva no Drive e linha gravada na planilha Dados_Raizen!",
      fileId: fileId,
      driveUrl: fileUrl,
      fileName: fileName,
      sheetRowIndex: rowIndex
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
 * Função Auxiliar: Lê todas as linhas da aba Dados_Raizen
 */
function getSheetRecords() {
  var ss = getSpreadsheet();
  if (!ss) return [];

  var sheet = ss.getSheetByName(NOME_ABA) || ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var range = sheet.getRange(2, 1, lastRow - 1, 11);
  var values = range.getValues();
  var records = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var colA = String(row[0] || "").trim();
    var colC = String(row[2] || "").trim();
    var colH = String(row[7] || "").trim();

    // Pula linhas totalmente vazias
    if (!colA && !colC && !colH) continue;

    records.push({
      id: "sheet-row-" + (i + 2) + "-" + (colA || i),
      numero: colA || ("OS-" + (i + 1)),
      formaPagamento: String(row[1] || "CONTRATO").trim(),
      cliente: colC || "WFS / RAÍZEN",
      horaChegada: formatTimeValue(row[3]),
      inicioAbastecimento: formatTimeValue(row[4]),
      terminoAbastecimento: formatTimeValue(row[5]),
      produto: String(row[6] || "DIESEL").trim(),
      volume: formatVolumeValue(row[7]),
      obs: String(row[8] || "").trim(),
      assinaturaCliente: String(row[9] || "").trim(),
      driveFileUrl: String(row[10] || "").trim(),
      dataCriacao: new Date().toISOString(),
      statusEnvio: 'enviado_drive'
    });
  }

  // Retorna os mais recentes primeiro
  return records.reverse();
}

function formatTimeValue(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "GMT-3", "HH:mm");
  }
  return String(val).trim();
}

function formatVolumeValue(val) {
  if (val === null || val === undefined || val === "") return "0,00";
  if (typeof val === 'number') {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(val).trim();
}

function getSpreadsheet() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!ss) {
    var props = PropertiesService.getScriptProperties();
    var id = props.getProperty('SPREADSHEET_ID');
    if (id) {
      try { ss = SpreadsheetApp.openById(id); } catch(e) {}
    }
  }
  return ss;
}

function getOrCreateSheet(ss) {
  var sheet = ss.getSheetByName(NOME_ABA);
  if (!sheet) {
    sheet = ss.insertSheet(NOME_ABA);
    // Cria cabeçalho padrão
    sheet.appendRow([
      "Número",
      "Forma de Pagamento",
      "Cliente",
      "Hora da Chegada",
      "Início do Abastecimento",
      "Término do Abastecimento",
      "Produto",
      "Volume",
      "Obs.:",
      "Assinatura do Cliente",
      "Foto da Nota"
    ]);
    sheet.getRange("A1:K1").setBackground("#E52421").setFontColor("#FFFFFF").setFontWeight("bold");
  }
  return sheet;
}

function getOrCreateFolder() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('DRIVE_FOLDER_ID_ABASTECIMENTO') || props.getProperty('DRIVE_FOLDER_ID');
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch(e) {}
  }

  var folders = DriveApp.getFoldersByName(NOME_PASTA_DRIVE);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(NOME_PASTA_DRIVE);
}
`;
