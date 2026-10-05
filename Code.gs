// Google Apps Script für das gemeinsame Glossar
// Verwendet die von euch angegebene Tabelle.

const SPREADSHEET_ID = "1zTi3Lj9YjAbUG9Saoh5eYPJYk_RLuU28fc2fdJtazaY";
const SHEET_NAME = "Glossar";

function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const headers = ["ID", "Begriff", "Erklärung", "Kategorie", "Beispiel", "Quelle"];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,headers.length).setFontWeight("bold");
  }
  return "Setup erfolgreich";
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({status:"ok", message:"Glossar API läuft"}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    setup();

    let result;
    switch (body.action) {
      case "list": result = listEntries(); break;
      case "create": result = createEntry(body.data); break;
      case "update": result = updateEntry(body.id, body.data); break;
      case "delete": result = deleteEntry(body.id); break;
      default: throw new Error("Unbekannte Aktion");
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({error: error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
}

function listEntries() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  return rows.filter(r => r[0]).map(r => ({
    id: String(r[0]),
    term: String(r[1] || ""),
    definition: String(r[2] || ""),
    category: String(r[3] || "Allgemein"),
    example: String(r[4] || ""),
    source: String(r[5] || "")
  }));
}

function createEntry(data) {
  if (!data || !data.term || !data.definition) throw new Error("Begriff und Erklärung sind erforderlich.");

  const id = Utilities.getUuid();
  getSheet().appendRow([
    id,
    data.term,
    data.definition,
    data.category || "Allgemein",
    data.example || "",
    data.source || ""
  ]);
  return {success:true, id};
}

function updateEntry(id, data) {
  const sheet = getSheet();
  const row = findRow(id);
  if (row === -1) throw new Error("Eintrag nicht gefunden.");

  sheet.getRange(row, 2, 1, 5).setValues([[
    data.term || "",
    data.definition || "",
    data.category || "Allgemein",
    data.example || "",
    data.source || ""
  ]]);
  return {success:true};
}

function deleteEntry(id) {
  const sheet = getSheet();
  const row = findRow(id);
  if (row === -1) throw new Error("Eintrag nicht gefunden.");

  sheet.deleteRow(row);
  return {success:true};
}

function findRow(id) {
  const sheet = getSheet();
  const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}