```javascript
// ======================================================
// GLOSSAR – FRONTEND
// ======================================================

const API_URL =
  "https://script.google.com/macros/s/AKfycbwRG3Ki7KSAIkp8YZqzmEfWo1J-ZGmTcd0a-zRlwktS4pzdbPG8Lnny3N0jFSWx2DTkqA/exec";

let entries = [];
let editingId = null;


// ======================================================
// HILFSFUNKTION
// ======================================================

const $ = id =>
  document.getElementById(id);


// ======================================================
// API
// ======================================================

async function api(action, data = {}) {

  // --------------------------------------------------
  // LIST
  // --------------------------------------------------

  if (action === "list") {

    return new Promise(
      (resolve, reject) => {

        const callbackName =
          "glossarCallback_" +
          Date.now();

        const script =
          document.createElement(
            "script"
          );

        const timeout =
          setTimeout(() => {

            cleanup();

            reject(
              new Error(
                "Zeitüberschreitung beim Laden."
              )
            );

          }, 10000);


        function cleanup() {

          clearTimeout(timeout);

          delete window[
            callbackName
          ];

          script.remove();
        }


        window[callbackName] =
          result => {

            cleanup();

            if (
              result &&
              result.error
            ) {

              reject(
                new Error(
                  result.error
                )
              );

              return;
            }

            resolve(
              Array.isArray(result)
                ? result
                : []
            );
          };


        script.onerror = () => {

          cleanup();

          reject(
            new Error(
              "Google Apps Script konnte nicht geladen werden."
            )
          );

        };


        script.src =
          API_URL +
          "?action=list&callback=" +
          encodeURIComponent(
            callbackName
          );

        document.head.appendChild(
          script
        );
      }
    );
  }


  // --------------------------------------------------
  // CREATE / UPDATE / DELETE
  // --------------------------------------------------

  const response =
    await fetch(
      API_URL,
      {
        method: "POST",

        mode: "cors",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({
          action,
          ...data
        })
      }
    );


  if (!response.ok) {

    throw new Error(
      "Google Apps Script antwortet nicht."
    );
  }


  let result;

  try {

    result =
      await response.json();

  } catch {

    throw new Error(
      "Ungültige Antwort von Google Apps Script."
    );
  }


  if (
    result &&
    result.success === false
  ) {

    throw new Error(
      result.error ||
      "Unbekannter Fehler."
    );
  }


  return result;
}


// ======================================================
// EINTRÄGE LADEN
// ======================================================

async function loadEntries() {

  try {

    entries =
      await api("list");

    render();

  } catch (error) {

    console.error(error);

    showToast(
      "Verbindung zu Google Sheets fehlgeschlagen."
    );
  }
}


// ======================================================
// HTML SICHER MACHEN
// ======================================================

function escapeHTML(
  value = ""
) {

  return String(value)
    .replace(
      /[&<>"']/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[c]
    );
}


// ======================================================
// RENDER
// ======================================================

function render() {

  const query =
    $("searchInput")
      .value
      .trim()
      .toLowerCase();


  const category =
    $("categoryFilter").value;


  const filtered =
    entries.filter(e => {

      const matchesSearch =
        !query ||
        [
          e.term,
          e.definition,
          e.example
        ].some(
          x =>
            String(x || "")
              .toLowerCase()
              .includes(query)
        );


      const matchesCategory =
        !category ||
        e.category === category;


      return (
        matchesSearch &&
        matchesCategory
      );

    });


  $("entries").innerHTML =
    filtered
      .map(e => `

        <article class="card">

          <div class="card-top">

            <h3>
              ${escapeHTML(e.term)}
            </h3>

            ${
              e.category
                ? `
                  <span class="badge">
                    ${escapeHTML(
                      e.category
                    )}
                  </span>
                `
                : ""
            }

          </div>


          <p class="definition">
            ${escapeHTML(
              e.definition
            )}
          </p>


          ${
            e.example
              ? `
                <div class="example">
                  <strong>
                    Beispiel:
                  </strong>

                  ${escapeHTML(
                    e.example
                  )}
                </div>
              `
              : ""
          }


          <div class="card-footer">

            ${
              e.source
                ? `
                  <a
                    class="source"
                    href="${escapeHTML(
                      e.source
                    )}"
                    target="_blank"
                    rel="noopener"
                  >
                    Quelle öffnen ↗
                  </a>
                `
                : "<span></span>"
            }


            <div class="actions">

              <button
                class="small-btn"
                onclick="editEntry('${e.id}')"
              >
                Bearbeiten
              </button>


              <button
                class="small-btn delete"
                onclick="deleteEntry('${e.id}')"
              >
                Löschen
              </button>

            </div>

          </div>

        </article>

      `)
      .join("");


  $("emptyState")
    .classList
    .toggle(
      "hidden",
      filtered.length !== 0
    );


  $("totalCount")
    .textContent =
      entries.length;


  $("categoryCount")
    .textContent =
      new Set(
        entries
          .map(e => e.category)
          .filter(Boolean)
      ).size;


  // Kategorien neu aufbauen

  const current =
    category;


  const categories =
    [
      ...new Set(
        entries
          .map(e => e.category)
          .filter(Boolean)
      )
    ]
    .sort(
      (a, b) =>
        a.localeCompare(
          b,
          "de"
        )
    );


  $("categoryFilter").innerHTML =
    `
      <option value="">
        Alle Kategorien
      </option>
    ` +
    categories
      .map(
        c =>
          `
            <option value="${escapeHTML(c)}">
              ${escapeHTML(c)}
            </option>
          `
      )
      .join("");


  $("categoryFilter")
    .value = current;
}


// ======================================================
// MODAL ÖFFNEN
// ======================================================

function openModal(
  entry = null
) {

  editingId =
    entry?.id || null;


  $("modalTitle")
    .textContent =
      entry
        ? "Begriff bearbeiten"
        : "Neuen Begriff hinzufügen";


  $("entryId").value =
    entry?.id || "";


  $("term").value =
    entry?.term || "";


  $("definition").value =
    entry?.definition || "";


  $("category").value =
    entry?.category || "";


  $("example").value =
    entry?.example || "";


  $("source").value =
    entry?.source || "";


  $("modal")
    .classList
    .remove("hidden");


  $("modal")
    .setAttribute(
      "aria-hidden",
      "false"
    );


  setTimeout(
    () =>
      $("term").focus(),
    50
  );
}


// ======================================================
// MODAL SCHLIESSEN
// ======================================================

function closeModal() {

  $("modal")
    .classList
    .add("hidden");


  $("modal")
    .setAttribute(
      "aria-hidden",
      "true"
    );


  $("entryForm").reset();

  editingId = null;
}


// ======================================================
// LÖSCHEN
// ======================================================

async function deleteEntry(id) {

  const entry =
    entries.find(
      x => x.id === id
    );


  if (
    !entry ||
    !confirm(
      `„${entry.term}“ wirklich löschen?`
    )
  ) {

    return;
  }


  try {

    showToast(
      "Wird gelöscht..."
    );


    await api(
      "delete",
      { id }
    );


    showToast(
      "Begriff gelöscht."
    );


    await loadEntries();

  } catch (error) {

    console.error(error);

    showToast(
      "Löschen fehlgeschlagen."
    );
  }
}


// ======================================================
// BEARBEITEN
// ======================================================

function editEntry(id) {

  const entry =
    entries.find(
      x => x.id === id
    );


  if (entry) {

    openModal(entry);

  }
}


// ======================================================
// TOAST
// ======================================================

function showToast(
  message
) {

  $("toast")
    .textContent = message;


  $("toast")
    .classList
    .add("show");


  setTimeout(
    () =>
      $("toast")
        .classList
        .remove("show"),
    2300
  );
}


// ======================================================
// BUTTONS
// ======================================================

$("addBtn").onclick =
  () => openModal();


$("closeModal").onclick =
  closeModal;


$("cancelBtn").onclick =
  closeModal;


$("modalBackdrop").onclick =
  closeModal;


$("searchInput").oninput =
  render;


$("categoryFilter").onchange =
  render;


$("resetBtn").onclick =
  () => {

    $("searchInput").value =
      "";

    $("categoryFilter").value =
      "";

    render();
  };


// ======================================================
// FORMULAR ABSENDEN
// ======================================================

$("entryForm").onsubmit =
  async event => {

    event.preventDefault();


    const data = {

      term:
        $("term")
          .value
          .trim(),

      definition:
        $("definition")
          .value
          .trim(),

      category:
        $("category")
          .value
          .trim() ||
        "Allgemein",

      example:
        $("example")
          .value
          .trim(),

      source:
        $("source")
          .value
          .trim()
    };


    // Pflichtfelder

    if (
      !data.term ||
      !data.definition
    ) {

      showToast(
        "Bitte Begriff und Erklärung eingeben."
      );

      return;
    }


    try {

      // Button während des Speicherns deaktivieren

      const submitButton =
        $("entryForm")
          .querySelector(
            'button[type="submit"]'
          );


      if (submitButton) {

        submitButton.disabled =
          true;

        submitButton.textContent =
          "Speichern...";
      }


      // ------------------------------------------
      // UPDATE
      // ------------------------------------------

      if (editingId) {

        await api(
          "update",
          {
            id: editingId,
            data
          }
        );


        showToast(
          "Begriff aktualisiert."
        );

      }


      // ------------------------------------------
      // CREATE
      // ------------------------------------------

      else {

        await api(
          "create",
          {
            data
          }
        );


        showToast(
          "Begriff hinzugefügt."
        );
      }


      closeModal();

      await loadEntries();


    } catch (error) {

      console.error(error);

      showToast(
        error.message ||
        "Speichern fehlgeschlagen."
      );


    } finally {

      const submitButton =
        $("entryForm")
          .querySelector(
            'button[type="submit"]'
          );


      if (submitButton) {

        submitButton.disabled =
          false;

        submitButton.textContent =
          "Speichern";
      }

    }

  };


// ======================================================
// ESC = MODAL SCHLIESSEN
// ======================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      !$("modal")
        .classList
        .contains("hidden")
    ) {

      closeModal();

    }

  }
);


// ======================================================
// START
// ======================================================

loadEntries();
```
