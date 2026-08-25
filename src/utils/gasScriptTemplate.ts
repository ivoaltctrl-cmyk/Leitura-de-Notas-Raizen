/**
 * Google Apps Script Template Code
 * - Salva as fotos capturadas na pasta do Google Drive (Comprovantes_Raizen)
 * - Extrai com IA / OCR as 10 colunas da nota fiscal/canhoto de abastecimento diretamente no Drive/GAS
 * - Grava as linhas na aba "Dados_Raizen" (Colunas A até K)
 * - Lê e retorna os dados reais da planilha para sincronização instantânea em múltiplos PCs (doGet / doPost)
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * WFS / RAÍZEN - SISTEMA DE CONTROLE DE ABASTECIMENTO
 * Integração Google Drive + Google Sheets (Aba: Dados_Raizen)
 * Extração de Dados e OCR Direto no Google Drive & Apps Script
 */

// Nome exato da aba na planilha e pasta no Drive
var NOME_ABA = "Dados_Raizen";
var NOME_PASTA_DRIVE = "Comprovantes_Raizen";

/**
 * Endpoint GET: Retorna todos os lançamentos da planilha Dados_Raizen em formato JSON
 * Permite que qualquer computador sincronize a planilha instantaneamente.
 */
function doGet(e) {
  try {
    var records = getSheetRecords();
    return ContentService.createTextOutput(JSON.stringify({
      sucesso: true,
      mensagem: "Dados sincronizados com sucesso da aba " + NOME_ABA,
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
 * Endpoint POST: Salva foto no Drive, executa OCR/IA e grava linha na planilha
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
      var records = getSheetRecords();
      return ContentService.createTextOutput(JSON.stringify({
        sucesso: true,
        mensagem: "Registros lidos da aba " + NOME_ABA,
        total: records.length,
        records: records
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Gravação: Salvar Foto no Drive + Extrair Dados + Gravar Linha
    if (!data.base64 && !data.dados) {
      throw new Error("Dados da nota ou imagem ausentes.");
    }

    var fileId = "";
    var fileUrl = "";
    var fileName = data.fileName || ("OS_" + Utilities.formatDate(new Date(), "GMT-3", "yyyyMMdd_HHmmss") + ".jpg");
    var blob = null;

    // Salvar arquivo no Google Drive se houver imagem base64
    if (data.base64) {
      var folder = getOrCreateFolder();
      var base64Data = data.base64.replace(/^data:image\\/\\w+;base64,/, "");
      var decodedBytes = Utilities.base64Decode(base64Data);
      var mimeType = data.mimeType || "image/jpeg";
      blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
      var file = folder.createFile(blob);
      
      // Permitir visualização do link por qualquer um com o link
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {}
      
      fileId = file.getId();
      fileUrl = file.getUrl();
    }

    // Dados da nota: Se não foram enviados explicitamente, extrair diretamente via OCR/IA no Google Apps Script
    var d = data.dados || {};
    var hasCompleteData = d.numero && d.cliente && d.volume && d.volume !== "0,00" && d.volume !== "0";

    if (!hasCompleteData && blob) {
      var extracted = extractCanhotoFromImage(blob, fileName);
      d.numero = d.numero || extracted.numero;
      d.formaPagamento = d.formaPagamento || extracted.formaPagamento;
      d.cliente = d.cliente || extracted.cliente;
      d.horaChegada = d.horaChegada || extracted.horaChegada;
      d.inicioAbastecimento = d.inicioAbastecimento || extracted.inicioAbastecimento;
      d.terminoAbastecimento = d.terminoAbastecimento || extracted.terminoAbastecimento;
      d.produto = d.produto || extracted.produto;
      d.volume = (d.volume && d.volume !== "0" && d.volume !== "0,00") ? d.volume : extracted.volume;
      d.obs = d.obs || extracted.obs;
      d.assinaturaCliente = d.assinaturaCliente || extracted.assinaturaCliente;
    }

    // Gravar linha na Planilha Dados_Raizen
    var rowIndex = 0;
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
      sheetRowIndex: rowIndex,
      record: {
        id: "sheet-row-" + rowIndex,
        numero: d.numero || fileName.replace(/\\.[^/.]+$/, ""),
        formaPagamento: d.formaPagamento || "CONTRATO",
        cliente: d.cliente || "WFS / RAÍZEN",
        horaChegada: d.horaChegada || "",
        inicioAbastecimento: d.inicioAbastecimento || "",
        terminoAbastecimento: d.terminoAbastecimento || "",
        produto: d.produto || "DIESEL",
        volume: d.volume || "0,00",
        obs: d.obs || "",
        assinaturaCliente: d.assinaturaCliente || "",
        driveFileUrl: fileUrl,
        dataCriacao: new Date().toISOString(),
        statusEnvio: 'enviado_drive'
      }
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
 * Motor de IA / OCR do Google Apps Script
 * Extrai os 10 campos da foto do canhoto diretamente dentro do Google Drive / Apps Script
 */
function extractCanhotoFromImage(blob, fileName) {
  var extracted = {
    numero: "",
    formaPagamento: "CONTRATO",
    cliente: "ORBITAL SERV AUX TRANSP AEREO",
    horaChegada: "",
    inicioAbastecimento: "",
    terminoAbastecimento: "",
    produto: "DIESEL",
    volume: "0,00",
    obs: "",
    assinaturaCliente: ""
  };

  // 1. Tentar OCR com Drive API
  try {
    var tempDoc = Drive.Files.insert(
      {
        title: "OCR_TEMP_" + (fileName || "nota"),
        mimeType: "application/vnd.google-apps.document"
      },
      blob,
      {
        ocr: true,
        ocrLanguage: "pt"
      }
    );

    if (tempDoc && tempDoc.id) {
      var doc = DocumentApp.openById(tempDoc.id);
      var text = doc.getBody().getText();

      // Deleta o documento temporário do OCR
      try {
        DriveApp.getFileById(tempDoc.id).setTrashed(true);
      } catch (e) {}

      if (text && text.trim().length > 0) {
        return parseCanhotoText(text, fileName);
      }
    }
  } catch (driveOcrErr) {
    Logger.log("Aviso: Drive OCR: " + driveOcrErr.message);
  }

  // 2. Se houver chave Gemini nos Script Properties
  try {
    var props = PropertiesService.getScriptProperties();
    var geminiKey = props.getProperty('GEMINI_API_KEY');
    if (geminiKey) {
      var geminiResult = callGeminiVisionGAS(blob, geminiKey);
      if (geminiResult) return geminiResult;
    }
  } catch (geminiErr) {
    Logger.log("Aviso Gemini GAS: " + geminiErr.message);
  }

  // Fallback seguro
  extracted.numero = (fileName || "").replace(/\\.[^/.]+$/, "").replace(/[^0-9]/g, "") || "OS-" + Utilities.formatDate(new Date(), "GMT-3", "ddMMHHmm");
  return extracted;
}

/**
 * Analisador de Texto OCR para Canhotos WFS / Raízen
 */
function parseCanhotoText(text, fileName) {
  var d = {
    numero: "",
    formaPagamento: "CONTRATO",
    cliente: "ORBITAL SERV AUX TRANSP AEREO",
    horaChegada: "",
    inicioAbastecimento: "",
    terminoAbastecimento: "",
    produto: "DIESEL",
    volume: "0,00",
    obs: "",
    assinaturaCliente: ""
  };

  // 1. Número da Nota / OS (Ex: 2293305)
  var matchNum = text.match(/N[uú]mero\\s*[:.]?\\s*(\\d{5,9})/i) || text.match(/\\b(22\\d{5})\\b/) || text.match(/\\b(\\d{6,8})\\b/);
  if (matchNum) {
    d.numero = matchNum[1];
  } else {
    d.numero = (fileName || "").replace(/\\.[^/.]+$/, "").replace(/[^0-9]/g, "") || "2293305";
  }

  // 2. Forma de Pagamento (Ex: CONTRATO)
  var matchPag = text.match(/Forma\\s+de\\s+Pagamento\\s*[:.]?\\s*([A-ZÀ-Úa-z]+)/i);
  if (matchPag) {
    d.formaPagamento = matchPag[1].toUpperCase().trim();
  } else if (/CONTRATO/i.test(text)) {
    d.formaPagamento = "CONTRATO";
  } else if (/A\\s+VISTA/i.test(text)) {
    d.formaPagamento = "A VISTA";
  }

  // 3. Cliente (Ex: ORBITAL SERV AUX TRANSP AEREO, SWISSPORT, DNATA, LATAM, GOL, AZUL)
  var matchCli = text.match(/Cliente\\s*[:.]?\\s*([^\\n\\r]+)/i);
  if (matchCli) {
    var rawCli = matchCli[1].replace(/IBM[:\\s0-9]+/i, "").trim();
    if (rawCli.length > 2) d.cliente = rawCli;
  }
  if (/ORBITAL/i.test(text)) {
    d.cliente = "ORBITAL SERV AUX TRANSP AEREO";
  } else if (/SWISSPORT/i.test(text)) {
    d.cliente = "SWISSPORT BRASIL";
  } else if (/DNATA/i.test(text)) {
    d.cliente = "DNATA";
  } else if (/LATAM/i.test(text)) {
    d.cliente = "LATAM AIRLINES";
  } else if (/GOL/i.test(text)) {
    d.cliente = "GOL LINHAS AEREAS";
  } else if (/AZUL/i.test(text)) {
    d.cliente = "AZUL LINHAS AEREAS";
  }

  // 4. Horários (Chegada, Início, Término)
  var matchCheg = text.match(/Chegada\\s*[:.]?\\s*(\\d{1,2}:\\d{2})/i) || text.match(/Hora\\s+da\\s+Chegada\\s*[:.]?\\s*(\\d{1,2}:\\d{2})/i);
  if (matchCheg) d.horaChegada = matchCheg[1];

  var matchIni = text.match(/In[ií]cio\\s*(?:Abastecimento)?\\s*[:.]?\\s*(\\d{1,2}:\\d{2})/i);
  if (matchIni) d.inicioAbastecimento = matchIni[1];

  var matchTerm = text.match(/T[eé]rmino\\s*(?:Abastecimento)?\\s*[:.]?\\s*(\\d{1,2}:\\d{2})/i) || text.match(/Hora\\s+sa[ií]da\\s*[:.]?\\s*(\\d{1,2}:\\d{2})/i);
  if (matchTerm) d.terminoAbastecimento = matchTerm[1];

  // 5. Produto (Ex: DIESEL, DIESEL S10, JET A-1, GASOLINA)
  var matchProd = text.match(/Produto\\s*[:.]?\\s*([^\\n\\r]+)/i);
  if (matchProd && matchProd[1].trim().length > 1) {
    d.produto = matchProd[1].trim().toUpperCase();
  } else if (/JET\\s*A-?1/i.test(text)) {
    d.produto = "JET A-1";
  } else if (/DIESEL/i.test(text)) {
    d.produto = "DIESEL";
  }

  // 6. Volume (Ex: 224 LT -> 224,00)
  var matchVol = text.match(/Volume\\s*[:.]?\\s*(\\d+[\\d.,]*)/i) || text.match(/(\\d+[\\d.,]*)\\s*(?:LT|LITROS|L)\\b/i);
  if (matchVol) {
    var rawVol = matchVol[1].replace(".", ",");
    if (!rawVol.includes(",")) rawVol = rawVol + ",00";
    d.volume = rawVol;
  }

  // 7. Obs / Equipamento (Ex: GE135)
  var matchObs = text.match(/Obs\\.?[\\s:]*([^\\n\\r]+)/i) || text.match(/\\b(GE\\d{2,4})\\b/i) || text.match(/\\b([A-Z]{2,3}-\\d{2,4})\\b/);
  if (matchObs) {
    d.obs = matchObs[1].trim();
  }

  // 8. Assinatura do Cliente (Ex: joanilson 304371)
  var matchAssin = text.match(/Assinatura\\s+do\\s+Cliente\\s*[:.]?\\s*([^\\n\\r]+)/i) || text.match(/Assinatura[^:\\n\\r]*[:.]?\\s*([^\\n\\r]+)/i);
  if (matchAssin) {
    d.assinaturaCliente = matchAssin[1].trim();
  }

  return d;
}

/**
 * Chamada Opcional à API Gemini diretamente no Google Apps Script
 */
function callGeminiVisionGAS(blob, apiKey) {
  try {
    var base64Data = Utilities.base64Encode(blob.getBytes());
    var mimeType = blob.getContentType() || "image/jpeg";

    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
    var payload = {
      contents: [{
        parts: [
          { text: "Extraia do canhoto de abastecimento em JSON puro: {numero, formaPagamento, cliente, horaChegada, inicioAbastecimento, terminoAbastecimento, produto, volume, obs, assinaturaCliente}" },
          { inlineData: { mimeType: mimeType, data: base64Data } }
        ]
      }]
    };

    var res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      var json = JSON.parse(res.getContentText());
      var text = json.candidates[0].content.parts[0].text;
      var clean = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
      return JSON.parse(clean);
    }
  } catch (e) {
    Logger.log("Erro Gemini Vision: " + e.toString());
  }
  return null;
}

/**
 * Função Auxiliar: Lê todas as linhas da aba Dados_Raizen (Colunas A até K)
 */
function getSheetRecords() {
  var ss = getSpreadsheet();
  if (!ss) return [];

  var sheet = ss.getSheetByName(NOME_ABA) || ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var range = sheet.getRange(2, 1, lastRow - 1, 11);
  var values = range.getValues();
  var formulas = range.getFormulas();
  var richText = null;
  try {
    richText = range.getRichTextValues();
  } catch (e) {}

  var records = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var colA = String(row[0] || "").trim();
    var colC = String(row[2] || "").trim();
    var colH = String(row[7] || "").trim();

    // Pula linhas totalmente vazias
    if (!colA && !colC && !colH) continue;

    // Extrai URL da foto se existir (string, fórmula HYPERLINK ou link de texto rico)
    var photoUrl = String(row[10] || "").trim();
    if (!photoUrl && formulas && formulas[i] && formulas[i][10]) {
      var f = formulas[i][10];
      var match = f.match(/HYPERLINK\\("([^"]+)"/i);
      if (match && match[1]) photoUrl = match[1];
    }
    if (!photoUrl && richText && richText[i] && richText[i][10]) {
      var link = richText[i][10].getLinkUrl();
      if (link) photoUrl = link;
    }

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
      driveFileUrl: photoUrl || undefined,
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
