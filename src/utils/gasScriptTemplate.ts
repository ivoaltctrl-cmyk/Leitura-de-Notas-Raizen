/**
 * Google Apps Script Templates
 * 1. webhook.gs: Comunicação front/back, upload no Drive, leitura e atualização de valores na aba Dados_Raizen
 * 2. Código.gs: Processador automático com Gemini IA, grava na planilha e move fotos para Processados
 */

export const SCRIPT_WEBHOOK_GS = `/**
 * WFS / RAÍZEN - SCRIPT 3 (HÍBRIDO REVALIDADO COM SUPORTE A TOKEN DE SEGURANÇA, JSONP, CORS E LANÇAMENTO DE PREÇOS)
 * Baseado 100% no Script 1 funcional + Leitura de cabeçalhos + Atualização de Preços por Litro (Colunas M e N)
 */

var NOME_ABA = "Dados_Raizen";
var FOLDER_ID = "1n2_zU5-2DG7tih314twOcf6lRSXZeFkc";

// Token secreto de segurança (opcional, pode ser configurado aqui ou em Propriedades do Script como SECRET_TOKEN)
var WEBHOOK_SECRET_TOKEN = "";

function validarAcessoToken(e, postData) {
  var expectedToken = WEBHOOK_SECRET_TOKEN || PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN') || "";
  if (!expectedToken || !expectedToken.trim()) return true; // Se não houver token configurado, permite livre acesso compatível
  
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
 * Endpoint POST: Salva foto no Drive, lê dados ou atualiza preços
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

    // 4. Executar Robô de IA manualmente (On-Demand) via Webhook
    if (data.action === 'processar_agora' || data.action === 'processar_fila' || data.action === 'executar_robo') {
      try {
        if (typeof processarPastaAbastecimentos === 'function') {
          var resRobo = processarPastaAbastecimentos(20);
          return ContentService.createTextOutput(JSON.stringify({
            sucesso: true,
            mensagem: (resRobo && resRobo.mensagem) || "Robô de IA executado com sucesso!",
            detalhes: resRobo || null
          })).setMimeType(ContentService.MimeType.JSON);
        } else {
          return ContentService.createTextOutput(JSON.stringify({
            sucesso: false,
            mensagem: "Função 'processarPastaAbastecimentos' não encontrada no projeto. Verifique se o Código.gs está salvo no mesmo projeto do Webhook."
          })).setMimeType(ContentService.MimeType.JSON);
        }
      } catch (errRobo) {
        return ContentService.createTextOutput(JSON.stringify({
          sucesso: false,
          mensagem: "Erro ao executar robô: " + errRobo.message
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 5. Gravação: Salvar Foto no Drive
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
 * Função para atualizar o Valor/Litro (Coluna M) e calcular o Valor Total (Coluna N = Volume * Valor/Litro)
 * filtrando por período de data e tipo de combustível
 */
function atualizarPrecosCombustivel(data) {
  var NOME_ABA = "Dados_Raizen";
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      var scriptProperties = PropertiesService.getScriptProperties();
      var sheetId = scriptProperties.getProperty('SPREADSHEET_ID');
      if (sheetId) ss = SpreadsheetApp.openById(sheetId);
    }
    if (!ss) return { sucesso: false, mensagem: "Planilha não encontrada. Configure SPREADSHEET_ID se necessário." };

    var sheet = ss.getSheetByName(NOME_ABA);
    if (!sheet) return { sucesso: false, mensagem: "Aba '" + NOME_ABA + "' não encontrada na planilha." };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { sucesso: false, mensagem: "A planilha não possui lançamentos para atualizar." };
    }

    var lastCol = Math.max(sheet.getLastColumn(), 14);
    var fullRange = sheet.getRange(1, 1, lastRow, lastCol);
    var displayValues = fullRange.getDisplayValues();
    var rawValues = fullRange.getValues();

    var headerDisplay = displayValues[0];
    var headerLower = headerDisplay.map(function(h) { return String(h || "").trim().toLowerCase(); });

    function findColIdx(aliases, defaultIdx) {
      for (var c = 0; c < headerLower.length; c++) {
        for (var a = 0; a < aliases.length; a++) {
          if (headerLower[c].indexOf(aliases[a].toLowerCase()) !== -1) return c;
        }
      }
      return defaultIdx;
    }

    var idxData = findColIdx(['data do abastecimento', 'data', 'dt'], 1);
    var idxProduto = findColIdx(['produto', 'combustivel', 'item'], 7);
    var idxVolume = findColIdx(['volume', 'litro', 'litros', 'qtd', 'quantidade'], 8);
    var idxValorLitro = findColIdx(['valor/litro', 'valor litro', 'preço/litro', 'preco/litro', 'unitario'], 12);
    var idxValorTotal = findColIdx(['valor total', 'vl total', 'total (r$)', 'total'], 13);

    // Garante cabeçalhos de Valor/Litro e Valor Total
    if (idxValorLitro === -1 || idxValorLitro >= headerDisplay.length || !headerDisplay[idxValorLitro]) {
      idxValorLitro = 12;
      sheet.getRange(1, idxValorLitro + 1).setValue("Valor/Litro")
        .setBackground("#E31B23").setFontColor("#FFFFFF").setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
    }
    if (idxValorTotal === -1 || idxValorTotal >= headerDisplay.length || !headerDisplay[idxValorTotal]) {
      idxValorTotal = 13;
      sheet.getRange(1, idxValorTotal + 1).setValue("Valor Total")
        .setBackground("#E31B23").setFontColor("#FFFFFF").setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
    }

    var filtroProduto = data.produto ? String(data.produto).trim().toUpperCase() : "TODOS";
    var valorLitroNum = typeof data.valorLitro === 'number' ? data.valorLitro : parseFloat(String(data.valorLitro || 0).replace(',', '.'));
    if (isNaN(valorLitroNum) || valorLitroNum < 0) {
      return { sucesso: false, mensagem: "Valor por litro inválido informado." };
    }

    var dataInicioStr = data.dataInicio ? String(data.dataInicio).trim() : "";
    var dataFimStr = data.dataFim ? String(data.dataFim).trim() : dataInicioStr;

    // Parser de data ultra-robusto (funciona com DD/MM/YYYY, YYYY-MM-DD e objetos Date sem depender de regex)
    function parseDateGAS(dInput) {
      if (!dInput) return null;
      if (Object.prototype.toString.call(dInput) === '[object Date]') {
        return isNaN(dInput.getTime()) ? null : new Date(dInput.getFullYear(), dInput.getMonth(), dInput.getDate(), 12, 0, 0);
      }
      var str = String(dInput).trim();
      if (!str) return null;

      // Normaliza separadores
      var cleanStr = str.split('-').join('/').split('.').join('/');
      var parts = cleanStr.split('/');

      if (parts.length >= 3) {
        var p0 = parseInt(parts[0], 10);
        var p1 = parseInt(parts[1], 10);
        var p2 = parseInt(parts[2], 10);

        if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
          // Formato YYYY/MM/DD
          if (p0 > 1000) {
            return new Date(p0, p1 - 1, p2, 12, 0, 0);
          }
          // Formato DD/MM/YYYY
          if (p2 < 100) p2 += 2000;
          return new Date(p2, p1 - 1, p0, 12, 0, 0);
        }
      }

      var f = new Date(str);
      return isNaN(f.getTime()) ? null : new Date(f.getFullYear(), f.getMonth(), f.getDate(), 12, 0, 0);
    }

    // Parser numérico ultra-robusto sem regex frágil
    function parseNumberGAS(val) {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (!val) return 0;
      var str = String(val).trim();
      var digitsOnly = "";
      for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if ((ch >= '0' && ch <= '9') || ch === ',' || ch === '.') {
          digitsOnly += ch;
        }
      }
      if (!digitsOnly) return 0;
      if (digitsOnly.indexOf(',') !== -1 && digitsOnly.indexOf('.') !== -1) {
        digitsOnly = digitsOnly.split('.').join('').replace(',', '.');
      } else if (digitsOnly.indexOf(',') !== -1) {
        digitsOnly = digitsOnly.replace(',', '.');
      }
      var num = parseFloat(digitsOnly);
      return isNaN(num) ? 0 : num;
    }

    var dateInicio = parseDateGAS(dataInicioStr);
    var dateFim = parseDateGAS(dataFimStr);

    var updatedCount = 0;
    var totalVolumeAtualizado = 0;
    var totalFinanceiroAtualizado = 0;

    for (var r = 1; r < displayValues.length; r++) {
      var rowIdx = r + 1;
      var rowDisp = displayValues[r];
      var rowRaw = rawValues[r];

      var rowDataStr = rowDisp[idxData] || "";
      var rowProdStr = String(rowDisp[idxProduto] || "").toUpperCase();
      var rawVol = rowRaw[idxVolume];
      var dispVol = rowDisp[idxVolume];

      // Linhas totalmente vazias são ignoradas
      if (!rowDataStr && !dispVol && !rowDisp[0]) continue;

      // Valida filtro de combustível
      if (filtroProduto !== "TODOS" && rowProdStr.indexOf(filtroProduto) === -1 && filtroProduto.indexOf(rowProdStr) === -1) {
        continue;
      }

      // Valida intervalo de datas
      if (dateInicio || dateFim) {
        var rowDate = parseDateGAS(rowDataStr) || (Object.prototype.toString.call(rawValues[r][idxData]) === '[object Date]' ? parseDateGAS(rawValues[r][idxData]) : null);
        if (rowDate) {
          if (dateInicio) {
            var startTime = new Date(dateInicio.getFullYear(), dateInicio.getMonth(), dateInicio.getDate(), 0, 0, 0).getTime();
            if (rowDate.getTime() < startTime) continue;
          }
          if (dateFim) {
            var endTime = new Date(dateFim.getFullYear(), dateFim.getMonth(), dateFim.getDate(), 23, 59, 59).getTime();
            if (rowDate.getTime() > endTime) continue;
          }
        }
      }

      // Extração precisa e segura do Volume
      var volNum = parseNumberGAS(rawVol) || parseNumberGAS(dispVol);
      var valorTotalRow = Math.round(volNum * valorLitroNum * 100) / 100;

      // Grava nas Colunas M (Valor/Litro) e N (Valor Total)
      sheet.getRange(rowIdx, idxValorLitro + 1).setValue(valorLitroNum).setNumberFormat("R$ #,##0.00");
      sheet.getRange(rowIdx, idxValorTotal + 1).setValue(valorTotalRow).setNumberFormat("R$ #,##0.00");

      updatedCount++;
      totalVolumeAtualizado += volNum;
      totalFinanceiroAtualizado += valorTotalRow;
    }

    SpreadsheetApp.flush();

    return {
      sucesso: true,
      mensagem: "Preços gravados com sucesso em " + updatedCount + " linha(s) da planilha Dados_Raizen!",
      totalAtualizados: updatedCount,
      totalVolume: totalVolumeAtualizado,
      totalFinanceiro: totalFinanceiroAtualizado
    };
  } catch (e) {
    return {
      sucesso: false,
      mensagem: "Erro ao atualizar valores na planilha: " + e.message
    };
  }
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

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    var lastCol = Math.max(sheet.getLastColumn(), 14);
    var fullRange = sheet.getRange(1, 1, lastRow, lastCol);
    var data = fullRange.getDisplayValues();
    if (!data || data.length <= 1) return [];

    var header = data[0].map(function(h) { return String(h || "").trim().toLowerCase(); });
    
    function getIdx(aliases, defaultIdx) {
      for (var i = 0; i < header.length; i++) {
        for (var a = 0; a < aliases.length; a++) {
          if (header[i].indexOf(aliases[a].toLowerCase()) !== -1) return i;
        }
      }
      return defaultIdx;
    }

    var idxNumero = getIdx(["número", "numero", "nro", "os"], 0);
    var idxData = getIdx(["data do abastecimento", "data abastecimento", "data"], 1);
    var idxForma = getIdx(["forma de pagamento", "forma", "pagamento", "pagto"], 2);
    var idxCliente = getIdx(["cliente", "empresa", "razao"], 3);
    var idxChegada = getIdx(["hora da chegada", "hora chegada", "chegada"], 4);
    var idxInicio = getIdx(["início do abastecimento", "inicio do abastecimento", "início", "inicio"], 5);
    var idxTermino = getIdx(["término do abastecimento", "termino do abastecimento", "término", "termino", "fim"], 6);
    var idxProduto = getIdx(["produto", "combustível", "combustivel"], 7);
    var idxVolume = getIdx(["volume", "litros", "quantidade", "qtd"], 8);
    var idxObs = getIdx(["obs", "observação", "observacao", "placa"], 9);
    var idxAssinatura = getIdx(["assinatura do cliente", "assinatura", "conferido"], 10);
    var idxFoto = getIdx(["foto da nota", "foto", "comprovante", "link", "drive"], 11);
    var idxValorLitro = getIdx(["valor/litro", "valor litro", "preço/litro", "preco/litro", "unitario", "unitário"], 12);
    var idxValorTotal = getIdx(["valor total", "vl total", "total (r$)", "total r$", "total"], 13);

    function parseNumClean(val) {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (!val) return 0;
      var str = String(val).trim();
      var digitsOnly = "";
      for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if ((ch >= '0' && ch <= '9') || ch === ',' || ch === '.') {
          digitsOnly += ch;
        }
      }
      if (!digitsOnly) return 0;
      if (digitsOnly.indexOf(',') !== -1 && digitsOnly.indexOf('.') !== -1) {
        digitsOnly = digitsOnly.split('.').join('').replace(',', '.');
      } else if (digitsOnly.indexOf(',') !== -1) {
        digitsOnly = digitsOnly.replace(',', '.');
      }
      var num = parseFloat(digitsOnly);
      return isNaN(num) ? 0 : num;
    }

    var rows = data.slice(1);

    return rows.map(function(row, rIdx) {
      var numVal = (idxNumero < row.length && row[idxNumero]) ? row[idxNumero] : ("OS-" + (rIdx + 1));
      var dataVal = (idxData < row.length && row[idxData]) ? row[idxData] : "";
      var formaVal = (idxForma < row.length && row[idxForma]) ? row[idxForma] : "CONTRATO";
      var cliVal = (idxCliente < row.length && row[idxCliente]) ? row[idxCliente] : "";
      var chegVal = (idxChegada < row.length && row[idxChegada]) ? row[idxChegada] : "";
      var iniVal = (idxInicio < row.length && row[idxInicio]) ? row[idxInicio] : "";
      var terVal = (idxTermino < row.length && row[idxTermino]) ? row[idxTermino] : "";
      var prodVal = (idxProduto < row.length && row[idxProduto]) ? row[idxProduto] : "DIESEL";
      var volVal = (idxVolume < row.length && row[idxVolume]) ? row[idxVolume] : "0,00";
      var obsVal = (idxObs < row.length && row[idxObs]) ? row[idxObs] : "";
      var assVal = (idxAssinatura < row.length && row[idxAssinatura]) ? row[idxAssinatura] : "";
      var fotoVal = (idxFoto < row.length && row[idxFoto]) ? row[idxFoto] : "";
      var valorLitroVal = (idxValorLitro < row.length && row[idxValorLitro]) ? row[idxValorLitro] : "";
      var valorTotalVal = (idxValorTotal < row.length && row[idxValorTotal]) ? row[idxValorTotal] : "";

      // Ignora linhas totalmente em branco
      if (!numVal && !cliVal && !volVal) return null;

      // Se tiver valorLitro e volume, calcula o valor total se não estiver preenchido
      var vLitroF = parseNumClean(valorLitroVal);
      var vVolF = parseNumClean(volVal);
      var vTotF = parseNumClean(valorTotalVal);

      if (vLitroF > 0 && vVolF > 0) {
        if (!valorTotalVal || vTotF === 0 || valorTotalVal === "-" || valorTotalVal === "R$ 0,00") {
          var calcTot = Math.round(vLitroF * vVolF * 100) / 100;
          valorTotalVal = "R$ " + calcTot.toFixed(2).replace(".", ",");
        }
      }

      if (valorLitroVal && vLitroF > 0 && valorLitroVal.indexOf("R$") === -1) {
        valorLitroVal = "R$ " + vLitroF.toFixed(2).replace(".", ",");
      }

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
        "Valor/Litro": valorLitroVal,
        "Valor Total": valorTotalVal,
        
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
        "driveFileUrl": fotoVal,
        "valorLitro": valorLitroVal,
        "valorTotal": valorTotalVal
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
 * grava o resultado na aba "Dados_Raizen" (Colunas A a N) e move para "Processados".
 * ============================================================================
 */
var ABASTECIMENTO_CONFIG = {
  SHEET_NAME: "Dados_Raizen",
  PASTA_PROCESSADOS: "Processados",
  MAX_FILE_SIZE_MB: 8
};

// Modelo configurado e validado
var GEMINI_MODEL_ABASTECIMENTO = 'gemini-3.5-flash';

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
                   scriptProperties.getProperty('DRIVE_FOLDER_ID');
    var apiKey = scriptProperties.getProperty('GEMINI_API_KEY_ABASTECIMENTO') ||
                 scriptProperties.getProperty('GEMINI_API_KEY');
    
    if (!folderId || !apiKey) {
      Logger.log("Erro: Propriedades DRIVE_FOLDER_ID ou GEMINI_API_KEY não configuradas.");
      return { sucesso: false, mensagem: "Propriedades DRIVE_FOLDER_ID ou GEMINI_API_KEY não configuradas no Script." };
    }
    
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      Logger.log("Erro de Acesso: Não foi possível acessar a pasta ID: " + folderId);
      return { sucesso: false, mensagem: "Não foi possível acessar a pasta ID: " + folderId };
    }

    // Define/Cria a pasta "Processados" antes de varrer os arquivos
    var processedFolder = getOuCriarSubpasta(folder, ABASTECIMENTO_CONFIG.PASTA_PROCESSADOS);

    var files = folder.getFiles();
    
    while (files.hasNext() && countProcessados < maxArquivos) {
      var file = files.next();
      var mimeType = file.getMimeType();
      
      if (mimeType.indexOf("image/") === 0 || mimeType === "application/pdf") {
        try {
          if (file.getSize() > ABASTECIMENTO_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
            Logger.log("Aviso: Arquivo " + file.getName() + " excede o limite de " + ABASTECIMENTO_CONFIG.MAX_FILE_SIZE_MB + "MB.");
            continue;
          }
          
          Logger.log("Processando arquivo (" + (countProcessados + 1) + "): " + file.getName());

          // Captura a URL ANTES de mover, pois é o link gravado na planilha
          var fileUrl = file.getUrl();

          processarUmaNotaAbastecimento(file, apiKey, fileUrl);

          file.moveTo(processedFolder);
          countProcessados++;
          Logger.log("Sucesso: Arquivo " + file.getName() + " movido para '" + ABASTECIMENTO_CONFIG.PASTA_PROCESSADOS + "'.");
          
          // PAUSA DE SEGURANÇA: 4 segundos entre arquivos para respeitar cotas
          Utilities.sleep(4000);

        } catch (err) {
          countErros++;
          Logger.log('Erro ao processar ' + file.getName() + ': ' + err.message);
        }
      }
    }

    var temMaisPendentes = files.hasNext();
    var mensagemRetorno = countProcessados > 0 
      ? ("Sucesso: " + countProcessados + " nota(s) processada(s) e inserida(s) na planilha!" + (temMaisPendentes ? " (Ainda restam arquivos na fila - clique novamente para o próximo lote)." : ""))
      : "Nenhuma foto nova pendente para processar na pasta.";

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
    '  "volume": number ou null (Quantidade em litros abastecida, ex: 60.00)", ' +
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

  // Verifica o cabeçalho existente
  var headerValues = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 14)).getDisplayValues()[0];
  var temColunaData = headerValues.some(function(h) { 
    return h.toLowerCase().indexOf("data") !== -1; 
  });

  var novaLinha;
  if (temColunaData) {
    // 14 Colunas Oficiais (A a N):
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
      fileUrl || "",                                                               // L: Foto da Nota (Link Drive)
      "",                                                                          // M: Valor/Litro (alimentado pelo usuário)
      ""                                                                           // N: Valor Total (calculado)
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
    "Volume", "Obs.:", "Assinatura do Cliente", "Foto da Nota", "Valor/Litro", "Valor Total"
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
}
`;

// Aliases para compatibilidade
export const GOOGLE_APPS_SCRIPT_CODE = SCRIPT_WEBHOOK_GS;
