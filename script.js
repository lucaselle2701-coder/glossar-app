const API_URL = "https://script.google.com/macros/s/AKfycbwRG3Ki7KSAIkp8YZqzmEfWo1J-ZGmTcd0a-zRlwktS4pzdbPG8Lnny3N0jFSWx2DTkqA/exec";
let entries = [];
let editingId = null;

const $ = id => document.getElementById(id);

async function api(action, data = {}) {
  // GitHub Pages und Google Apps Script liegen auf unterschiedlichen Domains.
  // Deshalb lesen wir per JSONP (GET) und senden Änderungen als simple POST.
  if (action === "list") {
    return new Promise((resolve, reject) => {
      const callbackName = "glossarCallback_" + Date.now();
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Zeitüberschreitung beim Laden"));
      }, 10000);

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = result => {
        cleanup();
        if (result && result.error) reject(new Error(result.error));
        else resolve(result || []);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Google Apps Script konnte nicht geladen werden."));
      };

      script.src = `${API_URL}?action=list&callback=${encodeURIComponent(callbackName)}`;
      document.head.appendChild(script);
    });
  }

  // no-cors erlaubt den POST von GitHub Pages zu Apps Script.
  // Die Antwort ist dabei absichtlich nicht lesbar; danach laden wir die Liste neu.
  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {"Content-Type": "text/plain;charset=utf-8"},
    body: JSON.stringify({ action, ...data })
  });

  // Apps Script braucht kurz zum Schreiben in Google Sheets.
  await new Promise(resolve => setTimeout(resolve, 700));
  return { success: true };
}

async function loadEntries() {
  try {
    entries = await api("list");
    render();
  } catch (error) {
    showToast("Verbindung zu Google Sheets fehlgeschlagen.");
    console.error(error);
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function render() {
  const query = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const filtered = entries.filter(e =>
    (!query || [e.term,e.definition,e.example].some(x => (x||"").toLowerCase().includes(query))) &&
    (!category || e.category === category)
  );

  $("entries").innerHTML = filtered.map(e => `
    <article class="card">
      <div class="card-top"><h3>${escapeHTML(e.term)}</h3>${e.category ? `<span class="badge">${escapeHTML(e.category)}</span>` : ""}</div>
      <p class="definition">${escapeHTML(e.definition)}</p>
      ${e.example ? `<div class="example"><strong>Beispiel:</strong> ${escapeHTML(e.example)}</div>` : ""}
      <div class="card-footer">
        ${e.source ? `<a class="source" href="${escapeHTML(e.source)}" target="_blank" rel="noopener">Quelle öffnen ↗</a>` : "<span></span>"}
        <div class="actions">
          <button class="small-btn" onclick="editEntry('${e.id}')">Bearbeiten</button>
          <button class="small-btn delete" onclick="deleteEntry('${e.id}')">Löschen</button>
        </div>
      </div>
    </article>`).join("");

  $("emptyState").classList.toggle("hidden", filtered.length !== 0);
  $("totalCount").textContent = entries.length;
  $("categoryCount").textContent = new Set(entries.map(e => e.category).filter(Boolean)).size;
  const current = category;
  const categories = [...new Set(entries.map(e => e.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
  $("categoryFilter").innerHTML = '<option value="">Alle Kategorien</option>' + categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  $("categoryFilter").value = current;
}

function openModal(entry = null) {
  editingId = entry?.id || null;
  $("modalTitle").textContent = entry ? "Begriff bearbeiten" : "Neuen Begriff hinzufügen";
  $("entryId").value = entry?.id || "";
  $("term").value = entry?.term || "";
  $("definition").value = entry?.definition || "";
  $("category").value = entry?.category || "";
  $("example").value = entry?.example || "";
  $("source").value = entry?.source || "";
  $("modal").classList.remove("hidden");
  $("modal").setAttribute("aria-hidden","false");
  setTimeout(() => $("term").focus(), 50);
}

function closeModal() {
  $("modal").classList.add("hidden");
  $("modal").setAttribute("aria-hidden","true");
  $("entryForm").reset();
  editingId = null;
}

async function deleteEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e || !confirm(`„${e.term}“ wirklich löschen?`)) return;
  try {
    await api("delete", {id});
    showToast("Begriff gelöscht.");
    await loadEntries();
  } catch { showToast("Löschen fehlgeschlagen."); }
}

function editEntry(id) {
  const e = entries.find(x => x.id === id);
  if (e) openModal(e);
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2300);
}

$("addBtn").onclick = () => openModal();
$("closeModal").onclick = closeModal;
$("cancelBtn").onclick = closeModal;
$("modalBackdrop").onclick = closeModal;
$("searchInput").oninput = render;
$("categoryFilter").onchange = render;
$("resetBtn").onclick = () => { $("searchInput").value=""; $("categoryFilter").value=""; render(); };

$("entryForm").onsubmit = async event => {
  event.preventDefault();
  const data = {
    term: $("term").value.trim(),
    definition: $("definition").value.trim(),
    category: $("category").value.trim() || "Allgemein",
    example: $("example").value.trim(),
    source: $("source").value.trim()
  };
  if (!data.term || !data.definition) return;

  try {
    if (editingId) {
      await api("update", {id: editingId, data});
      showToast("Begriff aktualisiert.");
    } else {
      await api("create", {data});
      showToast("Begriff hinzugefügt.");
    }
    closeModal();
    await loadEntries();
  } catch (error) {
    showToast("Speichern fehlgeschlagen.");
    console.error(error);
  }
};

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("modal").classList.contains("hidden")) closeModal();
});

loadEntries();
