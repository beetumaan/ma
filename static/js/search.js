// ── Local rule-based analysis (no backend) ───────────────────────────
function localAnalysis(query) {
  const symbol = window.AppState.currentModalSymbol;
  const area   = document.getElementById("ai-response-area");
  const srcs   = document.getElementById("ai-sources");
  if (!symbol || !area) return;

  const stock = window.AppState.allStocks.find(s => s.symbol === symbol);
  if (!stock) {
    area.innerHTML = '<div class="ai-error">Stock data not loaded yet.</div>';
    return;
  }

  srcs.innerHTML = "";
  const answer = generateInsight(stock, query);
  area.innerHTML = `<div class="ai-answer">${renderMarkdown(answer)}</div>`;
}

// ── Google search (opens new tab) ────────────────────────────────────
function googleSearch(query) {
  const symbol = window.AppState.currentModalSymbol;
  if (!symbol) return;
  const q = (query || "").trim() || "NSE stock news";
  window.open(
    `https://www.google.com/search?q=${encodeURIComponent(symbol + " NSE " + q)}`,
    "_blank", "noopener,noreferrer"
  );
  const input = document.getElementById("search-input");
  if (input) input.value = "";
}

// ── Reset panel when modal closes ────────────────────────────────────
function resetSearch() {
  const area  = document.getElementById("ai-response-area");
  const srcs  = document.getElementById("ai-sources");
  const input = document.getElementById("search-input");
  if (area)  area.innerHTML = '<div class="ai-welcome-state"><div class="ai-welcome-icon">&#10024;</div><p>Click a topic or type a question</p></div>';
  if (srcs)  srcs.innerHTML = "";
  if (input) input.value = "";
}

// ── Markdown → HTML ───────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm,  "<h3>$1</h3>")
    .replace(/^# (.+)$/gm,   "<h3>$1</h3>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}
