// ── Formatting helpers ───────────────────────────────────────────────
function cls(val, good, bad) {
  if (val == null) return "neutral";
  if (val >= good) return "good";
  if (val <= bad)  return "bad";
  return "";
}

function fmt(val, suffix = "") {
  if (val == null || val === undefined) return '<span class="neutral">--</span>';
  return val + suffix;
}

function mcapFmt(cr) {
  if (!cr) return "--";
  if (cr >= 100000) return (cr / 100000).toFixed(1) + "L Cr";
  if (cr >= 1000)   return (cr / 1000).toFixed(1) + "K Cr";
  return cr + " Cr";
}

// Generates tag pills for a stock row
function tags(s) {
  let t = "";
  if (isAIRelated(s))
    t += '<span class="tag-pill ai">AI</span>';
  if (s.industry && s.industry.toLowerCase().includes("semi"))
    t += '<span class="tag-pill semi">Semi</span>';
  if (s.dipFrom52wHigh >= 15)
    t += `<span class="tag-pill dip">Dip ${s.dipFrom52wHigh}%</span>`;
  if (s.roe >= 15 && s.debtToEquity != null && s.debtToEquity < 0.5 && s.interestCoverage != null && s.interestCoverage >= 3)
    t += '<span class="tag-pill quality">Quality</span>';
  if (s.sales5yCagr != null && s.sales5yCagr >= 15 && s.profit5yCagr != null && s.profit5yCagr >= 15)
    t += '<span class="tag-pill compounder">5Y Compounder</span>';
  if (s.isPSU)
    t += '<span class="tag-pill psu">PSU</span>';
  if (s.pledgedPct != null && s.pledgedPct > 20)
    t += '<span class="tag-pill pledged-warn">⚠ Pledged</span>';
  return t;
}

// ── Stats bar ────────────────────────────────────────────────────────
function renderStats() {
  const { allStocks, filtered } = window.AppState;

  $("#stat-total").textContent    = allStocks.length;
  $("#stat-filtered").textContent = filtered.length;

  const avgROE = filtered.length
    ? (filtered.reduce((s, x) => s + (x.roe || 0), 0) / filtered.length).toFixed(1)
    : "--";
  $("#stat-avg-roe").textContent = avgROE + "%";

  let activeCount = 0;
  for (const [, cfg] of Object.entries(window.FILTERS)) {
    if (!cfg.el) continue;
    if (cfg.el.type === "checkbox") {
      if (cfg.el.checked !== cfg.default) activeCount++;
    } else {
      if (parseFloat(cfg.el.value) !== cfg.default) activeCount++;
    }
  }
  const filtersEl = $("#stat-filters");
  if (filtersEl) filtersEl.textContent = activeCount;
}

// ── Initial empty state ──────────────────────────────────────────────
function renderEmpty() {
  const tbody = $("tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="19" style="text-align:center;padding:48px;color:var(--dim)">
    Click <strong>Scan NSE Stocks</strong> to begin screening ~170 stocks against your filters.
  </td></tr>`;
}

// ── Table rendering ──────────────────────────────────────────────────
function renderTable() {
  const tbody = $("tbody");
  if (!tbody) return;

  const { filtered, allStocks } = window.AppState;

  if (filtered.length === 0) {
    let hint = "";
    if (window._lastFilterRejections && window._lastFilterRejections.length > 0) {
      const top   = window._lastFilterRejections.slice(0, 6);
      const total = allStocks.length;
      hint =
        `<div style="margin-top:16px;text-align:left;display:inline-block">` +
        `<div style="font-size:13px;font-weight:600;color:var(--yellow);margin-bottom:10px">Top filter killers (out of ${total} stocks):</div>` +
        top.map((r) => {
          const pct = Math.round((r.count / total) * 100);
          const barColor = pct > 40 ? "var(--red)" : pct > 20 ? "var(--yellow)" : "var(--green)";
          return (
            `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">` +
            `<div style="width:200px;font-size:12px;color:var(--text);text-align:right">${r.label}</div>` +
            `<div style="flex:1;max-width:180px;height:8px;background:var(--card);border-radius:4px;overflow:hidden">` +
            `<div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div>` +
            `</div>` +
            `<div style="font-size:11px;color:var(--dim);min-width:70px">${r.count} stocks (${pct}%)</div>` +
            `</div>`
          );
        }).join("") +
        `<div style="font-size:11px;color:var(--dim);margin-top:12px">Tip: Relax the red/yellow filters above to see more results.</div>` +
        `</div>`;
    }

    tbody.innerHTML =
      `<tr><td colspan="19" style="text-align:center;padding:32px;color:var(--dim)">` +
      `<div style="font-size:15px;font-weight:600;margin-bottom:4px">No stocks match current filters</div>` +
      `<div style="font-size:12px">The combination of all active filters is too restrictive.</div>` +
      hint +
      `</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((s) => `<tr>
    <td class="symbol-cell" onclick="showDetail('${s.symbol}')">${s.symbol}</td>
    <td class="name-cell" title="${s.name || ""}">${s.name || "--"}</td>
    <td>${tags(s)}</td>
    <td>${s.price != null ? s.price.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }) : "--"}</td>
    <td>${mcapFmt(s.marketCapCr)}</td>
    <td class="${cls(s.roe, 15, 5)}">${fmt(s.roe, "%")}</td>
    <td class="${s.debtToEquity != null && s.debtToEquity < 0.5 ? "good" : s.debtToEquity > 1 ? "bad" : ""}">${fmt(s.debtToEquity)}</td>
    <td class="${cls(s.revenueGrowth, 15, 0)}">${fmt(s.revenueGrowth, "%")}</td>
    <td class="${cls(s.earningsGrowth, 15, 0)}">${fmt(s.earningsGrowth, "%")}</td>
    <td>${fmt(s.pe)}</td>
    <td class="${s.beta != null && s.beta < 1 ? "good" : s.beta > 1.5 ? "bad" : ""}">${fmt(s.beta)}</td>
    <td class="${s.promoterHolding != null && s.promoterHolding >= 50 ? "good" : "bad"}">${fmt(s.promoterHolding, "%")}</td>
    <td class="${s.dipFrom52wHigh >= 15 ? "warn" : ""}">${fmt(s.dipFrom52wHigh, "%")}</td>
    <td class="${cls(s.qtrProfitGrowth, 15, 0)}">${fmt(s.qtrProfitGrowth, "%")}</td>
    <td class="${cls(s.sales5yCagr, 12, 5)}">${fmt(s.sales5yCagr, "%")}</td>
    <td class="${cls(s.profit5yCagr, 12, 5)}">${fmt(s.profit5yCagr, "%")}</td>
    <td class="${s.interestCoverage != null && s.interestCoverage >= 3 ? "good" : s.interestCoverage != null && s.interestCoverage < 1.5 ? "bad" : ""}">${fmt(s.interestCoverage)}</td>
    <td class="${s.pledgedPct != null && s.pledgedPct > 20 ? "bad" : s.pledgedPct != null && s.pledgedPct <= 5 ? "good" : ""}">${fmt(s.pledgedPct, "%")}</td>
    <td>${s.sector || "--"}</td>
  </tr>`).join("");
}

// ── Sorting ──────────────────────────────────────────────────────────
function bindSort() {
  document.addEventListener("click", (e) => {
    const th = e.target.closest("th[data-col]");
    if (!th) return;
    const col = th.dataset.col;
    const state = window.AppState;
    if (state.sortCol === col) {
      state.sortAsc = !state.sortAsc;
    } else {
      state.sortCol = col;
      state.sortAsc = col === "symbol" || col === "name";
    }
    sortData();
    renderTable();
  });
}

function sortData() {
  const { sortCol, sortAsc } = window.AppState;
  window.AppState.filtered.sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (va == null) va = -Infinity;
    if (vb == null) vb = -Infinity;
    if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? va - vb : vb - va;
  });
}
