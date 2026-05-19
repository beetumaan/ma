// ── Timeframe definitions ────────────────────────────────────────────
const TIMEFRAMES = [
  { key: "1d",  label: "1D" },
  { key: "5d",  label: "1W" },
  { key: "1mo", label: "1M" },
  { key: "6mo", label: "6M" },
  { key: "1y",  label: "1Y" },
  { key: "5y",  label: "5Y" },
  { key: "max", label: "All" },
];

// ── Metric health helpers ────────────────────────────────────────────
function metricHealth(key, val) {
  const m = window.METRIC_INFO[key];
  if (!m || val == null) return "";
  if (m.good(val)) return "health-good";
  if (m.bad(val))  return "health-bad";
  return "health-ok";
}

function metricDesc(key) {
  const m = window.METRIC_INFO[key];
  return m ? m.desc : "";
}

// ── Timeframe tabs ───────────────────────────────────────────────────
function renderTimeframeTabs() {
  const { currentTimeframe } = window.AppState;
  $("#timeframe-tabs").innerHTML = TIMEFRAMES.map((tf) =>
    `<button class="tf-btn${tf.key === currentTimeframe ? " active" : ""}" onclick="changeTimeframe('${tf.key}')">${tf.label}</button>`
  ).join("");
}

async function changeTimeframe(period) {
  if (!window.AppState.currentModalSymbol) return;
  window.AppState.currentTimeframe = period;
  renderTimeframeTabs();
  await loadChart(window.AppState.currentModalSymbol, period);
}

// ── Yahoo Finance API map (used when there is no backend) ────────────
const YF_PERIOD_MAP = {
  "1d":  { range: "1d",  interval: "5m"  },
  "5d":  { range: "5d",  interval: "30m" },
  "1mo": { range: "1mo", interval: "1d"  },
  "6mo": { range: "6mo", interval: "1d"  },
  "1y":  { range: "1y",  interval: "1wk" },
  "5y":  { range: "5y",  interval: "1wk" },
  "max": { range: "max", interval: "1mo" },
};

async function _fetchYahooChart(symbol, period) {
  const { range, interval } = YF_PERIOD_MAP[period] || YF_PERIOD_MAP["5y"];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`
    + `?range=${range}&interval=${interval}&corsDomain=finance.yahoo.com`;
  const res  = await fetch(url);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("no data");
  const timestamps = result.timestamp || [];
  const closes     = result.indicators?.quote?.[0]?.close || [];
  return timestamps.map((ts, i) => ({
    date:  new Date(ts * 1000).toISOString().slice(0, 10),
    close: closes[i] != null ? Math.round(closes[i] * 100) / 100 : null,
  })).filter(d => d.close != null);
}

// ── Chart ────────────────────────────────────────────────────────────
async function loadChart(symbol, period) {
  const canvas = $("#price-chart");
  const ctx    = canvas.getContext("2d");
  if (window._chart) window._chart.destroy();

  try {
    // Prefer pre-computed 5Y data embedded in stocks.json (works offline/everywhere)
    const stock     = window.AppState.allStocks.find(s => s.symbol === symbol);
    const preloaded = (period === "5y" && stock?.h5y?.length > 0)
      ? stock.h5y.map(h => ({ date: h.d, close: h.c }))
      : null;

    const history = preloaded || await _fetchYahooChart(symbol, period);

    // Wrap in the same shape so the rendering code is identical
    const data = { history };

    if (data.history && data.history.length > 0) {
      const tf        = TIMEFRAMES.find((t) => t.key === period);
      const first     = data.history[0].close;
      const last      = data.history[data.history.length - 1].close;
      const pctChange = ((last - first) / first * 100).toFixed(1);
      const isPos     = pctChange >= 0;
      const returnEl  = document.getElementById("chart-return");
      if (returnEl) {
        returnEl.innerHTML =
          `<span class="chart-return-badge ${isPos ? "cr-pos" : "cr-neg"}">` +
          `${isPos ? "+" : ""}${pctChange}%` +
          `<span class="cr-label">${tf ? tf.label : period}</span>` +
          `</span>`;
      }

      window._chart = new Chart(ctx, {
        type: "line",
        data: {
          labels:   data.history.map((d) => d.date),
          datasets: [{
            label:           `${symbol} — ${tf ? tf.label : period}`,
            data:            data.history.map((d) => d.close),
            borderColor:     "#58a6ff",
            backgroundColor: "rgba(88,166,255,.08)",
            fill:            true,
            tension:         0.3,
            pointRadius:     0,
            borderWidth:     2,
          }],
        },
        options: {
          responsive:          true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: "#e6edf3" } },
          },
          scales: {
            x: {
              ticks: { color: "#8b949e", maxTicksLimit: 12 },
              grid:  { color: "rgba(48,54,61,.5)" },
            },
            y: {
              ticks: {
                color:    "#8b949e",
                callback: (v) => "₹" + v.toLocaleString("en-IN"),
              },
              grid: { color: "rgba(48,54,61,.5)" },
            },
          },
        },
      });
    }
  } catch (_) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#8b949e";
    ctx.font      = "13px Inter, sans-serif";
    ctx.fillText("5Y chart available after next GitHub Actions scan", 12, 36);
    const returnEl = document.getElementById("chart-return");
    if (returnEl) returnEl.innerHTML = "";
  }
}

// ── Detail modal ─────────────────────────────────────────────────────
async function showDetail(symbol) {
  const stock = window.AppState.allStocks.find((s) => s.symbol === symbol);
  if (!stock) return;

  window.AppState.currentModalSymbol = symbol;
  window.AppState.currentTimeframe   = "5y";

  $("#modal-title").textContent = `${stock.symbol} — ${stock.name}`;
  renderTimeframeTabs();

  // Each metric: { label, value, metricKey, rawVal, field, higherBetter, filterKey }
  // field/higherBetter are used for percentile. filterKey opens the rich info popup.
  const metrics = [
    { label: "Price",           value: `₹${stock.price}` },
    { label: "Market Cap",      value: mcapFmt(stock.marketCapCr) },
    { label: "P/E",             value: fmt(stock.pe),                   metricKey: "pe",                   rawVal: stock.pe,               field: "pe",               higherBetter: false, filterKey: "maxPE" },
    { label: "P/B",             value: fmt(stock.pb),                   metricKey: "pb",                   rawVal: stock.pb,               field: "pb",               higherBetter: false },
    { label: "ROE",             value: fmt(stock.roe, "%"),             metricKey: "roe",                  rawVal: stock.roe,              field: "roe",              higherBetter: true,  filterKey: "minROE" },
    { label: "Debt/Equity",     value: fmt(stock.debtToEquity),        metricKey: "debtToEquity",         rawVal: stock.debtToEquity,     field: "debtToEquity",     higherBetter: false, filterKey: "maxDebtEquity" },
    { label: "Current Ratio",   value: fmt(stock.currentRatio),        metricKey: "currentRatio",         rawVal: stock.currentRatio,     field: "currentRatio",     higherBetter: true,  filterKey: "minCurrentRatio" },
    { label: "Revenue Growth",  value: fmt(stock.revenueGrowth, "%"),  metricKey: "revenueGrowth",        rawVal: stock.revenueGrowth,    field: "revenueGrowth",    higherBetter: true,  filterKey: "minRevenueGr" },
    { label: "Earnings Growth", value: fmt(stock.earningsGrowth, "%"), metricKey: "earningsGrowth",       rawVal: stock.earningsGrowth,   field: "earningsGrowth",   higherBetter: true,  filterKey: "minEarningsGr" },
    { label: "PEG Ratio",       value: fmt(stock.pegRatio),            metricKey: "pegRatio",             rawVal: stock.pegRatio,         field: "pegRatio",         higherBetter: false, filterKey: "maxPEG" },
    { label: "Beta",            value: fmt(stock.beta),                metricKey: "beta",                 rawVal: stock.beta,             field: "beta",             higherBetter: false, filterKey: "maxBeta" },
    { label: "Dividend Yield",  value: fmt(stock.dividendYield, "%"),  metricKey: "dividendYield",        rawVal: stock.dividendYield,    field: "dividendYield",    higherBetter: true,  filterKey: "minDividendYield" },
    { label: "Promoter Holding",value: fmt(stock.promoterHolding, "%"),metricKey: "promoterHolding",      rawVal: stock.promoterHolding,  field: "promoterHolding",  higherBetter: true,  filterKey: "minPromoter" },
    { label: "Institutional",   value: fmt(stock.institutionalHolding,"%"),metricKey:"institutionalHolding",rawVal:stock.institutionalHolding,field:"institutionalHolding",higherBetter:true },
    { label: "52W High",        value: `₹${stock.week52High}` },
    { label: "52W Low",         value: `₹${stock.week52Low}` },
    { label: "Dip from 52W High",value:fmt(stock.dipFrom52wHigh,"%"),  metricKey: "dipFrom52wHigh",       rawVal: stock.dipFrom52wHigh,   field: "dipFrom52wHigh",   higherBetter: false, filterKey: "minDipPct" },
    { label: "Qtr Profit Growth",value:fmt(stock.qtrProfitGrowth,"%"), metricKey: "qtrProfitGrowth",      rawVal: stock.qtrProfitGrowth,  field: "qtrProfitGrowth",  higherBetter: true,  filterKey: "minQtrProfGr" },
    { label: "5Y Sales CAGR",   value: fmt(stock.sales5yCagr, "%"),    metricKey: "sales5yCagr",          rawVal: stock.sales5yCagr,      field: "sales5yCagr",      higherBetter: true,  filterKey: "minSalesCagr" },
    { label: "5Y Profit CAGR",  value: fmt(stock.profit5yCagr, "%"),   metricKey: "profit5yCagr",         rawVal: stock.profit5yCagr,     field: "profit5yCagr",     higherBetter: true,  filterKey: "minProfitCagr" },
    { label: "Interest Coverage",value:fmt(stock.interestCoverage),    metricKey: "interestCoverage",     rawVal: stock.interestCoverage, field: "interestCoverage", higherBetter: true,  filterKey: "minICR" },
    { label: "Pledged %",       value: fmt(stock.pledgedPct, "%"),      metricKey: "pledgedPct",           rawVal: stock.pledgedPct,       field: "pledgedPct",       higherBetter: false, filterKey: "maxPledged" },
    { label: "Sector",          value: stock.sector },
    { label: "Industry",        value: stock.industry },
  ];

  const allStocks = window.AppState.allStocks;

  $("#detail-grid").innerHTML = metrics.map((m) => {
    const healthCls  = m.metricKey ? metricHealth(m.metricKey, m.rawVal) : "";
    const desc       = m.metricKey ? metricDesc(m.metricKey) : "";
    const clickable  = m.filterKey ? `onclick="showFilterInfo('${m.filterKey}')" style="cursor:pointer"` : "";
    const tooltip    = m.filterKey ? ' title="Click for details"' : "";

    // Percentile badge
    let pctBadge = "";
    if (m.field && m.rawVal != null && allStocks.length > 1) {
      const vals = allStocks.map((s) => s[m.field]).filter((v) => v != null && !isNaN(v));
      if (vals.length > 1) {
        const beats = m.higherBetter
          ? vals.filter((v) => v <= m.rawVal).length
          : vals.filter((v) => v >= m.rawVal).length;
        const pct = Math.round((beats / vals.length) * 100);
        const pctCls = pct >= 70 ? "pct-good" : pct >= 40 ? "pct-mid" : "pct-bad";
        pctBadge = `<span class="metric-pct ${pctCls}">P${pct}</span>`;
      }
    }

    return `<div class="detail-item ${healthCls}" ${clickable}${tooltip}>
      <div class="detail-item-header">
        <div class="dlabel">${m.label}</div>
        ${pctBadge}
      </div>
      <div class="dvalue">${m.value}</div>
      ${desc ? `<div class="ddesc">${desc}</div>` : ""}
    </div>`;
  }).join("");

  const nseSymbol = symbol.replace("&", "%26");
  const links = [
    { label: "Google Finance", url: `https://www.google.com/finance/quote/${nseSymbol}:NSE` },
    { label: "Screener.in",    url: `https://www.screener.in/company/${nseSymbol}/consolidated/` },
    { label: "MoneyControl",   url: `https://www.moneycontrol.com/india/stockpricequote/${nseSymbol}` },
    { label: "Trendlyne",      url: `https://trendlyne.com/equity/${nseSymbol}/` },
    { label: "TradingView",    url: `https://www.tradingview.com/chart/?symbol=NSE%3A${nseSymbol}` },
  ];

  $("#external-links").innerHTML = links
    .map((l) => `<a class="ext-link" href="${l.url}" target="_blank" rel="noopener">${l.label} &#8599;</a>`)
    .join("");

  $(".modal-overlay").classList.add("open");
  loadChart(symbol, "5y");
  loadNews();
}

function closeModal() {
  $(".modal-overlay").classList.remove("open");
  window.AppState.currentModalSymbol = null;
  resetSearch();
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.querySelector(".info-overlay")?.classList.contains("open")) {
    closeFilterInfo();
  } else if ($(".modal-overlay")?.classList.contains("open")) {
    closeModal();
  }
});
