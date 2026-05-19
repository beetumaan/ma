// ── News feed — preloaded from stocks.json, no runtime API call ───────
async function loadNews() {
  const symbol = window.AppState.currentModalSymbol;
  const area   = document.getElementById("ai-response-area");
  const srcs   = document.getElementById("ai-sources");
  if (!symbol || !area) return;

  area.innerHTML = '<div class="ai-thinking"><span></span><span></span><span></span></div>';
  srcs.innerHTML = "";

  const stock = window.AppState.allStocks.find(s => s.symbol === symbol);

  // Use news pre-fetched by GitHub Actions (embedded in stocks.json)
  const preloaded = stock?.news || [];
  if (preloaded.length > 0) {
    area.innerHTML = preloaded.map((a) => {
      const ts = a.d ? _timeAgo(new Date(a.d)) : "";
      return `<a class="news-item" href="${a.u}" target="_blank" rel="noopener noreferrer">
        <div class="news-title">${_esc(a.t)}</div>
        <div class="news-meta">
          <span class="news-source">${_esc(a.p)}</span>
          ${ts ? `<span class="news-age">${ts}</span>` : ""}
        </div>
      </a>`;
    }).join("");
    return;
  }

  // Fallback: show rule-based stock summary if no news in JSON yet
  _showFallbackSummary(symbol);
}

function _showFallbackSummary(symbol) {
  const area  = document.getElementById("ai-response-area");
  const stock = window.AppState.allStocks.find(s => s.symbol === symbol);
  if (!area) return;
  if (stock) {
    area.innerHTML = `<div class="ai-answer">${renderMarkdown(generateInsight(stock, "summary"))}</div>`;
  } else {
    area.innerHTML = `<div class="ai-welcome-state">
      <p>News unavailable (network blocked)</p>
      <p style="font-size:10px;margin-top:4px">Will work on GitHub Pages</p>
    </div>`;
  }
}

// ── Local rule-based analysis ─────────────────────────────────────────
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
  if (area)  area.innerHTML = '<div class="ai-welcome-state"><div class="ai-welcome-icon">&#128240;</div><p>Loading news...</p></div>';
  if (srcs)  srcs.innerHTML = "";
  if (input) input.value = "";
}

// ── Helpers ───────────────────────────────────────────────────────────
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

function _esc(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function _timeAgo(date) {
  const ms   = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
