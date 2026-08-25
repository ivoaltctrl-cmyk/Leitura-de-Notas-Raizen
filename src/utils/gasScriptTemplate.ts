/**
 * Google Apps Script Template Code
 * This code is deployed inside Google Sheets (Extensões > Apps Script) to handle:
 * 1. Saving photo files to Google Drive folder "Comprovantes_Raizen"
 * 2. Inserting rows into sheet "Dados_Raizen" with all 11 columns (A to K):
 *    A: Número | B: Forma de Pagamento | C: Cliente | D: Hora da Chegada | E: Início do Abastecimento
 *    F: Término do Abastecimento | G: Produto | H: Volume | I: Obs.: | J: Assinatura do Cliente | K: Foto da Nota
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * WFS / RAIZEN - BACKEND GOOGLE APPS SCRIPT
 * Integração completa: Salva fotos no Google Drive e dados na aba Dados_Raizen
 */

const FOLDER_NAME = "Comprovantes_Raizen";
const SHEET_NAME = "Dados_Raizen";

function doPost(e) {
  try {
    let contents = {};
    if (e && e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      contents = e.parameter;
    }

    const action = contents.action || 'upload_and_record';

    // Teste de conexão (Ping)
    if (action === 'ping_test') {
      return createJsonResponse({
        sucesso: true,
        mensagem: "Conexão estabelecida com sucesso com o Google Drive e Planilha Raízen!"
      });
    }

    // Processamento do Comprovante
    let fileId = "";
    let fileUrl = "";

    // 1. Salvar imagem no Google Drive (se enviada)
    if (contents.base64) {
      let rawBase64 = contents.base64;
      if (rawBase64.indexOf(',') > -1) {
        rawBase64 = rawBase64.split(',')[1];
      }

      const mimeType = contents.mimeType || "image/jpeg";
      const fileName = contents.fileName || ("Comprovante_" + Utilities.formatDate(new Date(), "GMT-3", "yyyyMMdd_HHmmss") + ".jpg");
      const decodedBytes = Utilities.base64Decode(rawBase64);
      const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

      // Obter ou criar pasta no Google Drive
      const folder = getOrCreateFolder(FOLDER_NAME);
      const file = folder.createFile(blob);
      
      // Permitir visualização de quem tem o link
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (err) {
        // Ignora caso restrito por política corporativa
      }

      fileId = file.getId();
      fileUrl = file.getUrl();
    }

    // 2. Gravar dados na aba "Dados_Raizen" da Planilha
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_NAME);
    const dados = contents.dados || {};

    const rowData = [
      dados.numero || "",                         // Col A: Número
      dados.formaPagamento || "CONTRATO",         // Col B: Forma de Pagamento
      dados.cliente || "WFS AEROPORTO",           // Col C: Cliente
      dados.horaChegada || "",                    // Col D: Hora da Chegada
      dados.inicioAbastecimento || "",             // Col E: Início do Abastecimento
      dados.terminoAbastecimento || "",            // Col F: Término do Abastecimento (NOVA)
      dados.produto || "DIESEL",                  // Col G: Produto
      dados.volume || "0,00",                     // Col H: Volume
      dados.obs || "",                            // Col I: Obs.:
      dados.assinaturaCliente || "",              // Col J: Assinatura do Cliente
      fileUrl || (fileId ? ("https://drive.google.com/file/d/" + fileId + "/view") : "Foto Anexada") // Col K: Foto da Nota
    ];

    sheet.appendRow(rowData);
    const lastRow = sheet.getLastRow();

    return createJsonResponse({
      sucesso: true,
      mensagem: "Comprovante salvo no Drive e registrado na planilha Dados_Raizen!",
      fileId: fileId,
      driveUrl: fileUrl,
      sheetRowIndex: lastRow
    });

  } catch (error) {
    return createJsonResponse({
      sucesso: false,
      mensagem: "Erro ao processar: " + error.toString()
    });
  }
}

function doGet(e) {
  return createJsonResponse({
    sucesso: true,
    mensagem: "Webhook WFS Raízen Google Apps Script está ativo e pronto para receber requisições POST."
  });
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function getOrCreateSheet(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    // Criar cabeçalho oficial em vermelho com as 11 colunas A a K
    const headers = [
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
    ];
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, 11);
    headerRange.setBackground("#E52421");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
