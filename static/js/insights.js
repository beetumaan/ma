// Rule-based AI analysis — ported from core/insights.py
// Pure JS function, no network calls.

function generateInsight(s, query) {
  const sym    = s.symbol;
  const name   = s.name || sym;
  const price  = s.price || 0;
  const roe    = s.roe;
  const de     = s.debtToEquity;
  const pe     = s.pe || 0;
  const pb     = s.pb || 0;
  const peg    = s.pegRatio;
  const beta   = s.beta;
  const revG   = s.revenueGrowth;
  const earnG  = s.earningsGrowth;
  const cr     = s.currentRatio || 0;
  const dip    = s.dipFrom52wHigh || 0;
  const prom   = s.promoterHolding;
  const inst   = s.institutionalHolding;
  const dy     = s.dividendYield || 0;
  const mcap   = s.marketCapCr || 0;
  const w52h   = s.week52High || 0;
  const w52l   = s.week52Low || 0;
  const sector = s.sector || "—";
  const ind    = s.industry || "—";
  const q      = (query || "").toLowerCase();

  const matches = (...kw) => kw.some(k => q.includes(k));
  const loc = n => (n == null ? "--" : Number(n).toLocaleString("en-IN"));
  const pct = (n, s2 = "%") => n == null ? "--" : n + s2;

  // ── Summary ───────────────────────────────────────────────────────
  if (!q || matches("summary", "overview", "tell me", "what is", "describe")) {
    const strengths = [], concerns = [];
    if (roe > 15)  strengths.push(`Strong ROE of ${roe}%`);
    else if (roe < 8 && roe != null) concerns.push(`Weak ROE at ${roe}%`);
    if (de != null && de < 0.5) strengths.push(`Low debt (D/E: ${de})`);
    else if (de != null && de > 1.5) concerns.push(`High debt (D/E: ${de})`);
    if (revG > 15)  strengths.push(`Revenue growing ${revG}% YoY`);
    else if (revG < 0 && revG != null) concerns.push(`Revenue declining ${revG}%`);
    if (earnG > 15) strengths.push(`Earnings growing ${earnG}% YoY`);
    else if (earnG < 0 && earnG != null) concerns.push(`Earnings declining ${earnG}%`);
    if (prom > 60)  strengths.push(`High promoter holding (${prom}%)`);
    else if (prom < 30 && prom != null) concerns.push(`Low promoter holding (${prom}%)`);
    if (beta < 0.8 && beta != null) strengths.push("Low volatility (defensive)");
    else if (beta > 1.5 && beta != null) concerns.push(`High volatility (beta: ${beta})`);
    if (dip > 20) concerns.push(`Down ${dip}% from 52-week high`);

    const size = mcap > 20000 ? "Large-cap" : mcap > 5000 ? "Mid-cap" : "Small-cap";
    let out = `**${name} (${sym})** is a ${size} company in the ${sector} / ${ind} space, trading at ₹${loc(price)} with a market cap of ₹${loc(mcap)} Cr.`;
    if (strengths.length) out += `\n\n**Strengths:** ${strengths.join(" • ")}`;
    if (concerns.length)  out += `\n\n**Concerns:** ${concerns.join(" • ")}`;
    return out;
  }

  // ── Buy / Sell ────────────────────────────────────────────────────
  if (matches("buy", "invest", "worth", "should i", "entry", "accumulate")) {
    let score = 0;
    const reasons = [];
    if (roe > 15)       { score += 2; reasons.push(`✅ Strong ROE (${roe}%)`); }
    else if (roe > 10)  { score += 1; reasons.push(`🟡 Decent ROE (${roe}%)`); }
    else                { score -= 1; reasons.push(roe ? `❌ Weak ROE (${roe}%)` : "❌ ROE data unavailable"); }
    if (de != null && de < 0.5)  { score += 1; reasons.push(`✅ Low debt (D/E: ${de})`); }
    else if (de != null && de > 1.5) { score -= 1; reasons.push(`❌ High debt (D/E: ${de})`); }
    if (pe && pe < 20)  { score += 1; reasons.push(`✅ Attractively valued (P/E: ${pe})`); }
    else if (pe > 40)   { score -= 1; reasons.push(`❌ Expensive (P/E: ${pe})`); }
    if (peg && peg < 1) { score += 2; reasons.push(`✅ Growth at reasonable price (PEG: ${peg})`); }
    else if (peg > 2)   { score -= 1; reasons.push(`❌ Growth not justifying price (PEG: ${peg})`); }
    if (earnG > 15)     { score += 1; reasons.push(`✅ Strong earnings growth (${earnG}%)`); }
    else if (earnG < 0 && earnG != null) { score -= 1; reasons.push(`❌ Declining earnings (${earnG}%)`); }
    if (dip > 15 && dip < 35 && score >= 2) reasons.push(`🟡 ${dip}% dip from high — could be opportunity`);
    else if (dip > 35) reasons.push(`⚠️ ${dip}% dip — investigate before buying`);
    if (prom > 55) { score += 1; reasons.push(`✅ High promoter stake (${prom}%)`); }
    const verdict = score >= 5 ? "**Strong Buy** 🟢" : score >= 3 ? "**Buy** 🟢" : score >= 1 ? "**Hold / Wait** 🟡" : "**Avoid** 🔴";
    return [`**${sym} Buy Analysis** (Score: ${score}/8)\n`, `Verdict: ${verdict}\n`, ...reasons, "\n*Rule-based analysis, not financial advice.*"].join("\n");
  }

  // ── Valuation ─────────────────────────────────────────────────────
  if (matches("valuation", "expensive", "cheap", "overvalued", "undervalued", "p/e", "price to")) {
    const lines = [`**${sym} Valuation Analysis**\n`];
    if (pe)  lines.push(`• **P/E:** ${pe} — ${pe < 15 ? "Undervalued" : pe < 30 ? "Fair" : "Expensive"}`);
    if (pb)  lines.push(`• **P/B:** ${pb} — ${pb < 1 ? "Below book value" : pb < 3 ? "Fair" : "Premium"}`);
    if (peg) lines.push(`• **PEG:** ${peg} — ${peg < 1 ? "Growth at discount" : peg < 2 ? "Fair" : "Growth overpriced"}`);
    if (dy)  lines.push(`• **Dividend Yield:** ${dy}% — ${dy > 2 ? "Good income" : "Low yield"}`);
    const overall = (pe < 15 && peg < 1) ? "undervalued" : pe < 30 ? "fairly valued" : "appears expensive";
    lines.push(`\nOverall: ${sym} ${overall} based on current metrics.`);
    return lines.join("\n");
  }

  // ── Growth ────────────────────────────────────────────────────────
  if (matches("growth", "revenue", "earnings", "sales", "profit growth")) {
    const lines = [`**${sym} Growth Analysis**\n`];
    if (revG != null)  lines.push(`• **Revenue Growth:** ${revG}% YoY — ${revG > 15 ? "🟢 Strong" : revG > 5 ? "🟡 Moderate" : "🔴 Weak"}`);
    if (earnG != null) lines.push(`• **Earnings Growth:** ${earnG}% YoY — ${earnG > 15 ? "🟢 Strong" : earnG > 5 ? "🟡 Moderate" : "🔴 Weak"}`);
    if (revG && earnG) {
      if (earnG > revG) lines.push("\n💡 Earnings growing faster than revenue = **margin expansion** (bullish)");
      else if (earnG < revG && earnG > 0) lines.push("\n⚠️ Earnings growing slower than revenue = **margin compression**");
    }
    return lines.join("\n");
  }

  // ── Risk ─────────────────────────────────────────────────────────
  if (matches("risk", "safe", "volatile", "beta", "concern")) {
    const lines = [`**${sym} Risk Assessment**\n`];
    if (beta != null) lines.push(`• **Beta:** ${beta} — ${beta < 0.8 ? "Low volatility" : beta < 1.2 ? "Market-like" : "High volatility ⚠️"}`);
    if (de != null)   lines.push(`• **D/E:** ${de} — ${de < 0.5 ? "Safe" : de < 1 ? "Moderate" : "High leverage ⚠️"}`);
    if (cr)           lines.push(`• **Current Ratio:** ${cr} — ${cr > 1.5 ? "Healthy" : cr > 1 ? "Tight" : "Liquidity risk ⚠️"}`);
    if (dip > 20)     lines.push(`• **Dip from High:** ${dip}% — needs investigation`);
    if (prom < 35 && prom != null) lines.push(`• **Low Promoter:** ${prom}% — governance risk`);
    const rs = [beta > 1.3, de > 1, cr < 1, dip > 30, prom < 30].filter(Boolean).length;
    lines.push(`\nOverall: **${rs <= 1 ? "Low Risk 🟢" : rs <= 2 ? "Moderate Risk 🟡" : "High Risk 🔴"}** (${rs}/5 risk factors)`);
    return lines.join("\n");
  }

  // ── Balance Sheet ─────────────────────────────────────────────────
  if (matches("balance", "debt", "equity", "financial health", "leverage")) {
    const lines = [`**${sym} Balance Sheet**\n`];
    if (de != null) lines.push(`• **D/E:** ${de} — ${de < 0.1 ? "Debt-free" : de < 0.5 ? "Very safe" : de < 1 ? "Moderate" : "Highly leveraged ⚠️"}`);
    if (cr)         lines.push(`• **Current Ratio:** ${cr} — ${cr > 1.5 ? "Comfortable" : cr > 1 ? "Adequate" : "Tight ⚠️"}`);
    if (roe)        lines.push(`• **ROE:** ${roe}% — ${roe > 20 ? "Excellent" : roe > 12 ? "Good" : "Could do better"}`);
    return lines.join("\n");
  }

  // ── Dividend ──────────────────────────────────────────────────────
  if (matches("dividend", "yield", "income", "payout")) {
    const lines = [`**${sym} Dividend**\n`, `• **Dividend Yield:** ${dy}%`];
    if (dy > 3)      lines.push("Good dividend stock for passive income.");
    else if (dy > 1) lines.push("Moderate — some income plus growth.");
    else             lines.push("Low/no dividend — primarily a growth stock.");
    return lines.join("\n");
  }

  // ── Ownership ─────────────────────────────────────────────────────
  if (matches("promoter", "ownership", "insider", "holding", "shareholding")) {
    const lines = [`**${sym} Ownership**\n`];
    if (prom != null) lines.push(`• **Promoter:** ${prom}% — ${prom > 60 ? "High conviction" : prom > 40 ? "Moderate" : "Low"}`);
    if (inst != null) lines.push(`• **Institutional:** ${inst}% — ${inst > 30 ? "Strong FII/DII interest" : inst > 15 ? "Moderate" : "Low"}`);
    return lines.join("\n");
  }

  // ── Sector ────────────────────────────────────────────────────────
  if (matches("sector", "industry", "business")) {
    const size = mcap > 20000 ? "Large-cap" : mcap > 5000 ? "Mid-cap" : "Small-cap";
    return `**${name}** operates in **${sector}** / **${ind}**.\n\nMarket Cap: ₹${loc(mcap)} Cr (${size})`;
  }

  // ── 52-week ───────────────────────────────────────────────────────
  if (matches("52 week", "52w", "high", "low", "range")) {
    const pctLow = w52l ? ((price / w52l - 1) * 100).toFixed(1) : 0;
    return `**${sym} Price Position**\n\n• Current: ₹${loc(price)}\n• 52W High: ₹${loc(w52h)}\n• 52W Low: ₹${loc(w52l)}\n• Down ${dip}% from high\n• Up ${pctLow}% from low`;
  }

  // ── Fallback ──────────────────────────────────────────────────────
  return `Here's what I know about **${name} (${sym})**:\n\n` +
    `• **Price:** ₹${loc(price)} | **MCap:** ₹${loc(mcap)} Cr\n` +
    `• **P/E:** ${pe} | **P/B:** ${pb} | **PEG:** ${peg ?? "--"}\n` +
    `• **ROE:** ${pct(roe)} | **D/E:** ${de ?? "--"} | **Current Ratio:** ${cr}\n` +
    `• **Revenue Growth:** ${pct(revG)} | **Earnings Growth:** ${pct(earnG)}\n` +
    `• **Beta:** ${beta ?? "--"} | **Dividend Yield:** ${pct(dy)}\n` +
    `• **Promoter:** ${pct(prom)} | **Institutional:** ${pct(inst)}\n` +
    `• **52W Range:** ₹${loc(w52l)} — ₹${loc(w52h)} (dip: ${dip}%)\n\n` +
    `Try: "should I buy", "risk", "valuation", "growth", "balance sheet", "dividend"`;
}

window.generateInsight = generateInsight;
