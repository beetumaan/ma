// ── Shared application state ─────────────────────────────────────────
window.AppState = {
  allStocks:          [],
  filtered:           [],
  sortCol:            "marketCapCr",
  sortAsc:            false,
  pollTimer:          null,
  currentModalSymbol: null,
  currentTimeframe:   "5y",
};

// ── DOM shortcuts ────────────────────────────────────────────────────
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
window.$ = $;
window.$$ = $$;

// ── Load pre-computed stocks.json ────────────────────────────────────
async function loadStocksData() {
  const statusEl = document.getElementById("data-status");
  if (statusEl) statusEl.textContent = "Loading...";

  try {
    const res  = await fetch("./data/stocks.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    window.AppState.allStocks = data.stocks || [];

    if (statusEl) {
      if (!data.updated_at) {
        statusEl.textContent = "No scan data yet — trigger a GitHub Actions run";
      } else {
        const ago = _timeAgo(new Date(data.updated_at));
        statusEl.textContent =
          `${data.total_fetched} stocks · updated ${ago}`;
      }
    }

    applyFilters();
    renderIndustryList();
  } catch (e) {
    console.error("loadStocksData error:", e);
    if (statusEl) statusEl.textContent = "Failed to load data.json";
  }
}

function _timeAgo(date) {
  const ms   = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Bootstrap ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  bindFilters();
  bindSort();
  renderEmpty();
  loadStocksData();
});
