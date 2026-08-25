/**
 * Google Apps Script Template Code
 * Salva diretamente a foto tirada pelo Front na pasta do Google Drive.
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * WFS / RAIZEN - SALVAR COMPROVANTE NO GOOGLE DRIVE
 * Recebe a imagem do front-end e grava na pasta do Google Drive.
 */

function doPost(e) {
  var output;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Nenhum dado recebido na requisição POST.");
    }

    var data = JSON.parse(e.postData.contents);

    // Teste de conexão (Ping)
    if (data.action === 'ping_test') {
      return ContentService.createTextOutput(JSON.stringify({
        sucesso: true,
        mensagem: "Conexão estabelecida com sucesso com o Google Drive!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Validação da imagem
    if (!data.base64) {
      throw new Error("Dados da imagem (base64) ausentes.");
    }

    // Obter Pasta no Google Drive
    var scriptProperties = PropertiesService.getScriptProperties();
    var folderId = scriptProperties.getProperty('DRIVE_FOLDER_ID_ABASTECIMENTO') || 
                   scriptProperties.getProperty('DRIVE_FOLDER_ID');

    var folder;
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      var defaultFolderName = "Comprovantes_Raizen";
      var folders = DriveApp.getFoldersByName(defaultFolderName);
      folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(defaultFolderName);
    }

    // Decodificar Base64 e criar arquivo
    var base64Data = data.base64.replace(/^data:image\\/\\w+;base64,/, "");
    var decodedBytes = Utilities.base64Decode(base64Data);
    var fileName = data.fileName || ("OS_" + Utilities.formatDate(new Date(), "GMT-3", "yyyyMMdd_HHmmss") + ".jpg");
    var mimeType = data.mimeType || "image/jpeg";
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    var file = folder.createFile(blob);

    output = {
      sucesso: true,
      mensagem: "Arquivo salvo com sucesso no Google Drive!",
      fileId: file.getId(),
      driveUrl: file.getUrl(),
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

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    sucesso: true,
    mensagem: "Webhook Google Apps Script ativo e pronto para receber fotos."
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
