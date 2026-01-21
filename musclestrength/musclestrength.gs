/**
 * 處理 GET 請求
 */
function doGet(e) {
  try {
    var action = e.parameter.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("工作表1"); 
    
    if (!sheet) return makeJsonResponse({error: "找不到 '工作表1' 分頁"});

    // 1. 抓取名單 (A欄組別, B欄姓名, 資料從第 3 列開始)
    if (action === 'members') {
      var lastRow = sheet.getLastRow();
      if (lastRow < 3) return makeJsonResponse([]);
      var data = sheet.getRange(3, 1, lastRow - 2, 2).getValues(); 
      var members = data.map(function(r) {
        return { group: String(r[0]), name: String(r[1]) };
      }).filter(function(m) { return m.name.trim() !== ""; });
      return makeJsonResponse(members);
    }
    
    // 2. 抓取特定選手數據 (編輯功能)
    if (action === 'getUserData') {
      var name = e.parameter.name;
      var stage = parseInt(e.parameter.stage);
      var names = sheet.getRange(1, 2, sheet.getLastRow(), 1).getValues();
      var targetRow = -1;
      for (var i = 0; i < names.length; i++) {
        if (names[i][0].toString().trim() === name.trim()) {
          targetRow = i + 1;
          break;
        }
      }
      if (targetRow === -1) return makeJsonResponse({error: "找不到選手"});
      var startCol = (stage - 1) * 15 + 4;
      var currentData = sheet.getRange(targetRow, startCol, 1, 14).getValues()[0];
      var reports = currentData.map(function(v) { return (v === 1 || v === "1") ? 1 : 0; });
      return makeJsonResponse({ reports: reports });
    }

    // 3. 抓取榜單 (讀取每階段的「運動次數」欄位：R欄, AG欄...)
    if (action === 'getLeaderboard') {
      var stage = parseInt(e.parameter.stage);
      var lastRow = sheet.getLastRow();
      if (lastRow < 3) return makeJsonResponse([]);
      
      // 計算總計次數欄位 (R=18, AG=33, AV=48...)
      var countCol = (stage - 1) * 15 + 18;
      
      // 抓取 A, B 及對應的總次數欄
      var data = sheet.getRange(3, 1, lastRow - 2, countCol).getValues();
      var leaderboard = data.map(function(r) {
        return {
          group: String(r[0]),
          name: String(r[1]),
          count: parseInt(r[countCol - 1]) || 0
        };
      }).filter(function(item) { return item.name.trim() !== ""; });

      // 排序：次數從多到少
      leaderboard.sort(function(a, b) { return b.count - a.count; });
      
      return makeJsonResponse(leaderboard);
    }
    
    return makeJsonResponse({ status: "online" });
  } catch (err) {
    return makeJsonResponse({error: err.toString()});
  }
}

/**
 * 處理 POST 請求 (提交數據)
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("工作表1");
    var request = JSON.parse(e.postData.contents);
    
    var names = sheet.getRange(1, 2, sheet.getLastRow(), 1).getValues();
    var targetRow = -1;
    for (var i = 0; i < names.length; i++) {
      if (names[i][0].toString().trim() === request.userName.trim()) {
        targetRow = i + 1;
        break;
      }
    }
    if (targetRow === -1) return makeJsonResponse({status: "error"});

    var startCol = (request.stage - 1) * 15 + 4;
    var valuesToOutput = [request.data.concat([request.total])]; 
    sheet.getRange(targetRow, startCol, 1, 15).setValues(valuesToOutput);

    return makeJsonResponse({status: "success"});
  } catch (err) { return makeJsonResponse({status: "error"}); }
}

function makeJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
