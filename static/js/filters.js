// ── Sector / industry classifiers ────────────────────────────────────
function isAIRelated(stock) {
  const s = `${stock.sector} ${stock.industry}`.toLowerCase();
  return window.AI_KEYWORDS.some((k) => s.includes(k));
}
function isCrudeSensitive(stock) {
  const s = `${stock.sector} ${stock.industry}`.toLowerCase();
  return window.CRUDE_SECTORS.some((k) => s.includes(k));
}
function isBankNBFC(stock) {
  const s = `${stock.sector} ${stock.industry}`.toLowerCase();
  return window.BANK_KEYWORDS.some((k) => s.includes(k));
}
function isCommodityCyclical(stock) {
  const s = `${stock.sector} ${stock.industry}`.toLowerCase();
  return window.COMMODITY_KEYWORDS.some((k) => s.includes(k));
}
function isRealEstate(stock) {
  const s = `${stock.sector} ${stock.industry}`.toLowerCase();
  return window.REALESTATE_KEYWORDS.some((k) => s.includes(k));
}

// ── Sidebar tab navigation ────────────────────────────────────────────
function switchFilterTab(name) {
  $$(".ftab").forEach((b) => b.classList.remove("active"));
  $$(".ftab-panel").forEach((p) => p.classList.remove("active"));
  const btn   = document.getElementById(`ftab-btn-${name}`);
  const panel = document.getElementById(`ftab-${name}`);
  if (btn)   btn.classList.add("active");
  if (panel) panel.classList.add("active");
}

// ── Active filter summary shown on Home tab ───────────────────────────
function updateOverview() {
  const list  = document.getElementById("active-filter-list");
  const badge = document.getElementById("ftab-count");
  if (!list) return;

  const active = [];
  for (const [key, cfg] of Object.entries(window.FILTERS)) {
    if (!cfg.el) continue;
    const val = cfg.el.type === "checkbox" ? cfg.el.checked : parseFloat(cfg.el.value);
    if (val !== cfg.default) {
      const label = _filterLabel(key, val);
      if (label) active.push(label);
    }
  }

  // Industry exclusions (not in FILTERS object, tracked separately)
  if (window._excludedIndustries?.size > 0) {
    const n = window._excludedIndustries.size;
    active.push(`Excl ${n} industr${n === 1 ? "y" : "ies"}: ${[...window._excludedIndustries].slice(0, 2).join(", ")}${n > 2 ? "…" : ""}`);
  }

  if (active.length === 0) {
    list.innerHTML = '<p class="no-filters-msg">No filters active — all stocks pass through</p>';
    if (badge) badge.style.display = "none";
  } else {
    list.innerHTML = active
      .map((l) => `<div class="active-filter-item"><div class="afl-dot"></div><span>${l}</span></div>`)
      .join("");
    if (badge) { badge.textContent = active.length; badge.style.display = "flex"; }
  }
}

function _filterLabel(key, val) {
  const loc = (n) => Number(n).toLocaleString("en-IN");
  const map = {
    minROE:          () => `Min ROE ≥ ${val}%`,
    minRoe3y:        () => `Min 3Y Avg ROE ≥ ${val}%`,
    minDividendYield:() => `Min Dividend Yield ≥ ${val}%`,
    minAvgVolCr:     () => `Min Avg Daily Vol ≥ ₹${val} Cr`,
    maxDebtEquity:   () => `Max D/E ≤ ${val}`,
    minCurrentRatio: () => `Min Current Ratio ≥ ${val}`,
    minRevenueGr:    () => `Min Revenue Growth ≥ ${val}%`,
    minEarningsGr:   () => `Min Earnings Growth ≥ ${val}%`,
    maxPE:           () => `Max P/E ≤ ${val}`,
    maxPEG:          () => `Max PEG ≤ ${val}`,
    maxPrice:        () => `Max Price ≤ ₹${loc(val)}`,
    maxBeta:         () => `Max Beta ≤ ${val}`,
    minPromoter:     () => `Min Promoter ≥ ${val}%`,
    minDipPct:       () => `Min Dip ≥ ${val}%`,
    onlyProfitable:  () => val ? "Only Profitable (ROE > 0)" : null,
    onlyAI:          () => val ? "AI / Tech / Semi only" : null,
    onlyLowCrude:    () => val ? "Excl Crude-Sensitive" : null,
    minMcap:         () => `Min MCap ≥ ${loc(val)} Cr`,
    maxMcap:         () => `Max MCap ≤ ${loc(val)} Cr`,
    minQtrProfGr:    () => `Min Qtr Profit Gr ≥ ${val}%`,
    maxQtrProfGr:    () => `Max Qtr Profit Gr ≤ ${val}%`,
    minSalesCagr:    () => `Min 5Y Sales CAGR ≥ ${val}%`,
    minProfitCagr:   () => `Min 5Y Profit CAGR ≥ ${val}%`,
    minICR:          () => `Min ICR ≥ ${val}x`,
    maxPledged:      () => `Max Pledged ≤ ${val}%`,
    exclBanks:       () => val ? "Excl Banks / NBFCs" : null,
    exclCommodity:   () => val ? "Excl Commodity Cyclicals" : null,
    exclRealEstate:  () => val ? "Excl Real Estate" : null,
    exclPSU:         () => val ? "Excl PSU" : null,
  };
  const fn = map[key];
  return fn ? fn() : null;
}

// ── Reset all filters to neutral defaults ─────────────────────────────
function resetAllFilters() {
  for (const [key, cfg] of Object.entries(window.FILTERS)) {
    if (!cfg.el) continue;
    if (cfg.el.type === "checkbox") {
      cfg.el.checked = cfg.default;
    } else {
      cfg.el.value = cfg.default;
      const display = $(`#v-${key}`);
      if (display) display.textContent = cfg.default;
    }
  }
  applyFilters();
}

// ── Filter info popup ────────────────────────────────────────────────
function showFilterInfo(key) {
  const info = window.FILTER_INFO[key];
  if (!info) return;

  document.getElementById("info-title").textContent = info.title;

  let html = `<div class="info-what">${info.what}</div>`;

  if (info.why) {
    html += `<div class="info-section-label">Why it matters</div>
             <div class="info-why">${info.why}</div>`;
  }

  if (info.ranges && info.ranges.length > 0) {
    html += `<div class="info-section-label">Range Guide</div>
             <table class="info-ranges">`;
    info.ranges.forEach(([range, meaning]) => {
      html += `<tr><td class="info-range-val">${range}</td>
                   <td class="info-range-desc">${meaning}</td></tr>`;
    });
    html += `</table>`;
  }

  if (info.tips) {
    html += `<div class="info-section-label">Pro Tip</div>
             <div class="info-tips">${info.tips}</div>`;
  }

  document.getElementById("info-body").innerHTML = html;
  document.querySelector(".info-overlay").classList.add("open");
}

function closeFilterInfo() {
  document.querySelector(".info-overlay").classList.remove("open");
}

// ── Filter binding ────────────────────────────────────────────────────
function bindFilters() {
  for (const [key, cfg] of Object.entries(window.FILTERS)) {
    const el = $(`#f-${key}`);
    if (!el) continue;
    cfg.el = el;

    // Inject ? button if this filter has rich info
    if (window.FILTER_INFO[key]) {
      const block = el.closest(".filter-block");
      const header = block && block.querySelector(".fblock-header, .fblock-toggle");
      if (header && !header.querySelector(".fblock-info-btn")) {
        const btn = document.createElement("button");
        btn.className = "fblock-info-btn";
        btn.textContent = "?";
        btn.title = "More info";
        btn.onclick = (e) => { e.preventDefault(); showFilterInfo(key); };
        header.appendChild(btn);
      }
    }

    if (el.type === "range" || el.type === "number") {
      el.addEventListener("input", () => {
        const display = $(`#v-${key}`);
        if (display) display.textContent = el.value;
        applyFilters();
      });
    } else if (el.type === "checkbox") {
      el.addEventListener("change", () => applyFilters());
    }
  }
}

// ── Filter application ────────────────────────────────────────────────
function applyFilters() {
  const f = {};
  for (const [key, cfg] of Object.entries(window.FILTERS)) {
    if (!cfg.el) continue;
    f[key] = cfg.el.type === "checkbox" ? cfg.el.checked : parseFloat(cfg.el.value);
  }

  const filterChecks = [
    { key: "onlyProfitable",  label: "Only Profitable (ROE>0)",          test: (s) => f.onlyProfitable && (s.roe === null || s.roe <= 0) },
    { key: "minROE",          label: `Min ROE ≥ ${f.minROE}%`,           test: (s) => s.roe !== null && s.roe < f.minROE },
    { key: "minRoe3y",        label: `Min 3Y Avg ROE ≥ ${f.minRoe3y}%`,  test: (s) => s.roe3yAvg !== null && s.roe3yAvg !== undefined && s.roe3yAvg < f.minRoe3y },
    { key: "minDividendYield",label: `Min Dividend ≥ ${f.minDividendYield}%`, test: (s) => s.dividendYield !== null && s.dividendYield < f.minDividendYield },
    { key: "minAvgVolCr",     label: `Min Daily Vol ≥ ₹${f.minAvgVolCr} Cr`, test: (s) => s.avgValueCr !== null && s.avgValueCr !== undefined && s.avgValueCr < f.minAvgVolCr },
    { key: "maxDebtEquity",  label: `D/E ≤ ${f.maxDebtEquity}`,            test: (s) => s.debtToEquity !== null && s.debtToEquity > f.maxDebtEquity },
    { key: "minCurrentRatio",label: `Current Ratio ≥ ${f.minCurrentRatio}`,test: (s) => s.currentRatio && s.currentRatio < f.minCurrentRatio },
    { key: "minRevenueGr",   label: `Rev Growth ≥ ${f.minRevenueGr}%`,     test: (s) => s.revenueGrowth !== null && s.revenueGrowth < f.minRevenueGr },
    { key: "minEarningsGr",  label: `Earn Growth ≥ ${f.minEarningsGr}%`,   test: (s) => s.earningsGrowth !== null && s.earningsGrowth < f.minEarningsGr },
    { key: "maxPE",          label: `P/E ≤ ${f.maxPE}`,                    test: (s) => s.pe && s.pe > f.maxPE },
    { key: "maxPEG",         label: `PEG ≤ ${f.maxPEG}`,                   test: (s) => s.pegRatio !== null && s.pegRatio > f.maxPEG && s.pegRatio > 0 },
    { key: "maxPrice",       label: `Price ≤ ₹${f.maxPrice}`,              test: (s) => s.price > f.maxPrice },
    { key: "maxBeta",        label: `Beta ≤ ${f.maxBeta}`,                 test: (s) => s.beta !== null && s.beta > f.maxBeta },
    { key: "minPromoter",    label: `Promoter ≥ ${f.minPromoter}%`,        test: (s) => s.promoterHolding !== null && s.promoterHolding < f.minPromoter },
    { key: "minDipPct",      label: `Dip ≥ ${f.minDipPct}%`,              test: (s) => s.dipFrom52wHigh < f.minDipPct },
    { key: "onlyAI",         label: "AI/Tech only",                         test: (s) => f.onlyAI && !isAIRelated(s) },
    { key: "onlyLowCrude",   label: "Excl crude-sensitive",                test: (s) => f.onlyLowCrude && isCrudeSensitive(s) },
    { key: "minMcap",        label: `MCap ≥ ${f.minMcap} Cr`,              test: (s) => s.marketCapCr != null && s.marketCapCr < f.minMcap },
    { key: "maxMcap",        label: `MCap ≤ ${f.maxMcap} Cr`,              test: (s) => s.marketCapCr != null && s.marketCapCr > f.maxMcap },
    { key: "minQtrProfGr",   label: `Qtr Profit Gr ≥ ${f.minQtrProfGr}%`, test: (s) => s.qtrProfitGrowth != null && s.qtrProfitGrowth < f.minQtrProfGr },
    { key: "maxQtrProfGr",   label: `Qtr Profit Gr ≤ ${f.maxQtrProfGr}%`, test: (s) => s.qtrProfitGrowth != null && s.qtrProfitGrowth > f.maxQtrProfGr },
    { key: "minSalesCagr",   label: `5Y Sales CAGR ≥ ${f.minSalesCagr}%`, test: (s) => s.sales5yCagr != null && s.sales5yCagr < f.minSalesCagr },
    { key: "minProfitCagr",  label: `5Y Profit CAGR ≥ ${f.minProfitCagr}%`,test: (s) => s.profit5yCagr != null && s.profit5yCagr < f.minProfitCagr },
    { key: "minICR",         label: `ICR ≥ ${f.minICR}`,                   test: (s) => s.interestCoverage != null && s.interestCoverage < f.minICR },
    { key: "maxPledged",     label: `Pledged ≤ ${f.maxPledged}%`,          test: (s) => s.pledgedPct != null && s.pledgedPct > f.maxPledged },
    { key: "exclBanks",      label: "Excl Banks/NBFCs",                     test: (s) => f.exclBanks && isBankNBFC(s) },
    { key: "exclCommodity",  label: "Excl Commodities",                     test: (s) => f.exclCommodity && isCommodityCyclical(s) },
    { key: "exclRealEstate", label: "Excl Real Estate",                     test: (s) => f.exclRealEstate && isRealEstate(s) },
    { key: "exclPSU",        label: "Excl PSU",                             test: (s) => f.exclPSU && s.isPSU },
    { key: "_industries",    label: `Excl ${(window._excludedIndustries?.size || 0)} industr${window._excludedIndustries?.size === 1 ? "y" : "ies"}`,
                                                                             test: (s) => window._excludedIndustries?.size > 0 && window._excludedIndustries.has(s.industry) },
  ];

  const { allStocks } = window.AppState;
  window.AppState.filtered = allStocks.filter((s) => !filterChecks.some((fc) => fc.test(s)));

  if (window.AppState.filtered.length === 0 && allStocks.length > 0) {
    window._lastFilterRejections = filterChecks
      .map((fc) => ({ label: fc.label, count: allStocks.filter((s) => fc.test(s)).length }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  } else {
    window._lastFilterRejections = null;
  }

  sortData();
  renderTable();
  renderStats();
  updateOverview();
}

// ── Industry multi-select ─────────────────────────────────────────────
window._excludedIndustries = new Set();

function renderIndustryList() {
  const block = document.getElementById("industry-filter-block");
  const container = document.getElementById("industry-list");
  if (!container) return;

  const industries = [...new Set(
    (window.AppState.allStocks || []).map((s) => s.industry).filter((i) => i && i !== "—")
  )].sort();

  if (industries.length === 0) return;
  if (block) block.style.display = "";

  _renderIndustryItems(industries, "");
}

function _renderIndustryItems(industries, query) {
  const container = document.getElementById("industry-list");
  if (!container) return;
  const filtered = query ? industries.filter((i) => i.toLowerCase().includes(query.toLowerCase())) : industries;
  container.innerHTML = filtered.map((ind) => {
    const checked = window._excludedIndustries.has(ind) ? "checked" : "";
    const safe = ind.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    return `<label class="industry-row">
      <input type="checkbox" ${checked} onchange="toggleIndustry('${safe}', this.checked)">
      <span>${ind}</span>
    </label>`;
  }).join("");
}

function filterIndustryList(query) {
  const industries = [...new Set(
    (window.AppState.allStocks || []).map((s) => s.industry).filter((i) => i && i !== "—")
  )].sort();
  _renderIndustryItems(industries, query);
}

function toggleIndustry(industry, exclude) {
  if (exclude) window._excludedIndustries.add(industry);
  else window._excludedIndustries.delete(industry);
  applyFilters();
}

function clearIndustryExclusions() {
  window._excludedIndustries.clear();
  const container = document.getElementById("industry-list");
  if (container) container.querySelectorAll("input[type=checkbox]").forEach((cb) => cb.checked = false);
  const search = document.getElementById("industry-search");
  if (search) search.value = "";
  applyFilters();
}
