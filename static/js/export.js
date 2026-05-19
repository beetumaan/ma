function exportCSV() {
  const { filtered } = window.AppState;
  if (!filtered.length) return alert("No data to export");

  const headers = [
    "Symbol", "Name", "Price", "MarketCap(Cr)", "ROE%", "D/E",
    "CurrRatio", "RevGrowth%", "EarnGrowth%", "PE", "PEG",
    "Beta", "Promoter%", "DipFrom52WH%", "QtrProfGr%", "5YSalesCAGR%",
    "5YProfitCAGR%", "ICR", "Pledged%", "Sector", "Industry",
  ];

  const rows = filtered.map((s) => [
    s.symbol,
    `"${s.name}"`,
    s.price,
    s.marketCapCr,
    s.roe,
    s.debtToEquity,
    s.currentRatio,
    s.revenueGrowth,
    s.earningsGrowth,
    s.pe,
    s.pegRatio,
    s.beta,
    s.promoterHolding,
    s.dipFrom52wHigh,
    s.qtrProfitGrowth,
    s.sales5yCagr,
    s.profit5yCagr,
    s.interestCoverage,
    s.pledgedPct,
    `"${s.sector}"`,
    `"${s.industry}"`,
  ]);

  const csv  = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `nse_screener_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}
