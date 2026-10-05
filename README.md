# Gemeinsames Glossar – Google Sheets

## 1. Google Sheet vorbereiten
Die App verwendet bereits eure Sheet-ID:
`1zTi3Lj9YjAbUG9Saoh5eYPJYk_RLuU28fc2fdJtazaY`

## 2. Apps Script einrichten
1. Google Sheet öffnen.
2. **Erweiterungen → Apps Script** wählen.
3. Den vorhandenen Code löschen.
4. Den Inhalt von `Code.gs` hineinkopieren.
5. Speichern.
6. Einmal die Funktion `setup` auswählen und ausführen.
7. Die Berechtigungen bestätigen.

Danach existiert im Sheet ein Tabellenblatt namens **Glossar** mit:
ID | Begriff | Erklärung | Kategorie | Beispiel | Quelle

## 3. Web-App veröffentlichen
In Apps Script:
**Bereitstellen → Neue Bereitstellung → Web-App**

Einstellungen:
- Ausführen als: **Ich**
- Zugriff: **Jeder**

Bereitstellen und die erzeugte **Web-App-URL** kopieren.

## 4. App verbinden
In `script.js` diese Zeile ändern:

const API_URL = "DEINE_APPS_SCRIPT_URL_HIER_EINTRAGEN";

Beispiel:

const API_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";

Danach `index.html`, `style.css` und `script.js` gemeinsam auf GitHub hochladen.

## Ergebnis
Die Website liest und verändert die Daten über Apps Script direkt im Google Sheet.
