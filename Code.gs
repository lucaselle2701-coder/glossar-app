```javascript
// ======================================================
// GLOSSAR API – GOOGLE APPS SCRIPT
// ======================================================

const SPREADSHEET_ID = "1zTi3Lj9YjAbUG9Saoh5eYPJYk_RLuU28fc2fdJtazaY";
const SHEET_NAME = "Glossar";

// ======================================================
// SETUP
// ======================================================

function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  const headers = [
    "ID",
    "Begriff",
    "Erklärung",
    "Kategorie",
    "Beispiel",
    "Quelle"
  ];

  // Kopfzeile erstellen, falls noch keine vorhanden ist
  if (sheet.getLastRow() === 0) {
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);

    sheet.setFrozenRows(1);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setFontWeight("bold");
  }

  return sheet;
}


// ======================================================
// GET – LISTE DER BEGRIFFE
// ======================================================

function doGet(e) {

  try {

    setup();

    const action = e && e.parameter
      ? e.parameter.action
      : "list";

    // ----------------------------------------------
    // LIST
    // ----------------------------------------------

    if (action === "list") {

      const entries = listEntries();

      // JSONP-Unterstützung
      const callback =
        e.parameter.callback;

      const json = JSON.stringify(entries);

      if (callback) {

        return ContentService
          .createTextOutput(
            callback + "(" + json + ");"
          )
          .setMimeType(
            ContentService.MimeType.JAVASCRIPT
          );
      }

      return ContentService
        .createTextOutput(json)
        .setMimeType(
          ContentService.MimeType.JSON
        );
    }

    // ----------------------------------------------
    // TEST
    // ----------------------------------------------

    return jsonResponse({
      success: true,
      message: "Glossar API läuft"
    });

  } catch (error) {

    return jsonResponse({
      success: false,
      error: error.message
    });
  }
}


// ======================================================
// POST – ERSTELLEN / BEARBEITEN / LÖSCHEN
// ======================================================

function doPost(e) {

  try {

    setup();

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Keine Daten empfangen.");
    }

    const body =
      JSON.parse(e.postData.contents);

    const action = body.action;

    let result;

    switch (action) {

      case "create":
        result = createEntry(body.data);
        break;

      case "update":
        result = updateEntry(
          body.id,
          body.data
        );
        break;

      case "delete":
        result = deleteEntry(body.id);
        break;

      default:
        throw new Error(
          "Unbekannte Aktion: " + action
        );
    }

    return jsonResponse(result);

  } catch (error) {

    return jsonResponse({
      success: false,
      error: error.message
    });
  }
}


// ======================================================
// JSON RESPONSE
// ======================================================

function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


// ======================================================
// GOOGLE SHEET
// ======================================================

function getSheet() {

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );

  let sheet =
    ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = setup();
  }

  return sheet;
}


// ======================================================
// LIST
// ======================================================

function listEntries() {

  const sheet = getSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        6
      )
      .getValues();

  return rows
    .filter(row => row[0])
    .map(row => ({

      id: String(row[0]),

      term: String(
        row[1] || ""
      ),

      definition: String(
        row[2] || ""
      ),

      category: String(
        row[3] || "Allgemein"
      ),

      example: String(
        row[4] || ""
      ),

      source: String(
        row[5] || ""
      )

    }));
}


// ======================================================
// CREATE
// ======================================================

function createEntry(data) {

  if (!data) {
    throw new Error(
      "Keine Daten erhalten."
    );
  }

  if (!data.term) {
    throw new Error(
      "Bitte einen Begriff eingeben."
    );
  }

  if (!data.definition) {
    throw new Error(
      "Bitte eine Erklärung eingeben."
    );
  }

  const id =
    Utilities.getUuid();

  const sheet = getSheet();

  sheet.appendRow([

    id,

    data.term,

    data.definition,

    data.category ||
      "Allgemein",

    data.example ||
      "",

    data.source ||
      ""

  ]);

  SpreadsheetApp.flush();

  return {
    success: true,
    id: id
  };
}


// ======================================================
// UPDATE
// ======================================================

function updateEntry(id, data) {

  if (!id) {
    throw new Error(
      "Keine ID angegeben."
    );
  }

  if (!data) {
    throw new Error(
      "Keine Daten erhalten."
    );
  }

  const sheet = getSheet();

  const row =
    findRow(id);

  if (row === -1) {
    throw new Error(
      "Eintrag nicht gefunden."
    );
  }

  sheet
    .getRange(
      row,
      2,
      1,
      5
    )
    .setValues([[
      data.term || "",

      data.definition || "",

      data.category ||
        "Allgemein",

      data.example ||
        "",

      data.source ||
        ""
    ]]);

  SpreadsheetApp.flush();

  return {
    success: true
  };
}


// ======================================================
// DELETE
// ======================================================

function deleteEntry(id) {

  if (!id) {
    throw new Error(
      "Keine ID angegeben."
    );
  }

  const sheet = getSheet();

  const row =
    findRow(id);

  if (row === -1) {
    throw new Error(
      "Eintrag nicht gefunden."
    );
  }

  sheet.deleteRow(row);

  SpreadsheetApp.flush();

  return {
    success: true
  };
}


// ======================================================
// ROW FINDEN
// ======================================================

function findRow(id) {

  const sheet = getSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return -1;
  }

  const ids =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getValues();

  for (
    let i = 0;
    i < ids.length;
    i++
  ) {

    if (
      String(ids[i][0]) ===
      String(id)
    ) {

      return i + 2;

    }

  }

  return -1;
}
```
