// ── Filter defaults ──────────────────────────────────────────────────
// Each entry: { default: <value>, el: null }
// el is populated at runtime by bindFilters(); do not set it here.
// Neutral defaults — no filtering applied at startup, all stocks pass through.
// A filter becomes "active" when its value differs from these defaults.
const FILTERS = {
  minROE:          { default: 0,       el: null },
  minRoe3y:        { default: 0,       el: null },
  minDividendYield:{ default: 0,       el: null },
  maxDebtEquity:   { default: 30,      el: null },
  minCurrentRatio: { default: 0,       el: null },
  minRevenueGr:    { default: -50,     el: null },
  minEarningsGr:   { default: -50,     el: null },
  maxPE:           { default: 500,     el: null },
  maxPEG:          { default: 10,      el: null },
  maxPrice:        { default: 200000,  el: null },
  maxBeta:         { default: 5,       el: null },
  minAvgVolCr:     { default: 0,       el: null },
  minPromoter:     { default: 0,       el: null },
  minDipPct:       { default: 0,       el: null },
  onlyProfitable:  { default: false,   el: null },
  onlyAI:          { default: false,   el: null },
  onlyLowCrude:    { default: false,   el: null },
  minMcap:         { default: 0,       el: null },
  maxMcap:         { default: 2000000, el: null },
  minQtrProfGr:    { default: -100,    el: null },
  maxQtrProfGr:    { default: 10000,   el: null },
  minSalesCagr:    { default: -50,     el: null },
  minProfitCagr:   { default: -50,     el: null },
  minICR:          { default: 0,       el: null },
  maxPledged:      { default: 100,     el: null },
  exclBanks:       { default: false,   el: null },
  exclCommodity:   { default: false,   el: null },
  exclRealEstate:  { default: false,   el: null },
  exclPSU:         { default: false,   el: null },
};

// ── Filter descriptions — rich popup content ────────────────────────
// Structure: { title, what, why, ranges: [[rangeStr, meaning], ...], tips }
const FILTER_INFO = {

  // ═══ MARKET CAP ═══════════════════════════════════════════════════
  minMcap: {
    title: "Min Market Cap (₹ Cr)",
    what: "Lower bound on company size. Market cap = share price × total shares outstanding.",
    why: "Smaller companies offer higher growth potential but come with higher risk: lower liquidity, less analyst coverage, more vulnerability to a single bad quarter. Setting a floor filters out micro-caps where information asymmetry is highest.",
    ranges: [
      ["< ₹500 Cr",         "Micro-cap — highest risk, can double or halve fast"],
      ["₹500 – ₹5,000 Cr",  "Small-cap — growth zone, moderate risk"],
      ["₹5,000 – ₹20,000 Cr","Mid-cap — sweet spot for compounding"],
      ["> ₹20,000 Cr",      "Large-cap — established, slower growth"],
    ],
    tips: "For a ₹50K portfolio, ₹1,000 Cr minimum is sensible — small enough for growth, large enough for liquidity. Drop to ₹500 Cr only if you have done deep research.",
  },

  maxMcap: {
    title: "Max Market Cap (₹ Cr)",
    what: "Upper bound on company size — excludes mega-caps above this threshold.",
    why: "Mega-caps (TCS, Reliance, HDFC Bank) are unlikely to double in 2-3 years — they're already worth lakhs of crores. For a small portfolio chasing growth, capping market cap forces focus on mid/small-caps where multi-baggers happen.",
    ranges: [
      ["< ₹10,000 Cr",     "Mid-small focus — highest growth runway"],
      ["₹10K – ₹40K Cr",  "Mid-cap focus — balance of growth + stability"],
      ["₹40K – ₹1L Cr",   "Large-cap zone — slower but safer"],
      ["> ₹1L Cr",        "Mega-cap — index hugger, low multi-bagger probability"],
    ],
    tips: "₹40,000 Cr is a good ceiling for chasing 2-5x returns. Above this, the law of large numbers kicks in hard.",
  },

  // ═══ PROFITABILITY ════════════════════════════════════════════════
  minROE: {
    title: "Min ROE % (Latest Year)",
    what: "Return on Equity = Net Profit ÷ Shareholders' Equity. Measures how efficiently the company uses your invested rupee to generate profit.",
    why: "ROE is the single most important profitability metric Warren Buffett uses. A company with consistently high ROE either has pricing power, a moat, or both. Low ROE = capital is sitting idle.",
    ranges: [
      ["< 10%",   "Mediocre — money would earn more in an FD"],
      ["10 – 15%","Acceptable — beats inflation but not exciting"],
      ["15 – 25%","Good — quality business zone"],
      ["> 25%",   "Excellent — likely has a strong moat"],
    ],
    tips: "ROE > 100% usually means very low book value (asset-light businesses) — verify it's not a data error. Banks naturally have ROE 12-18%; don't compare them to manufacturers.",
  },

  minRoe3y: {
    title: "Min 3Y Average ROE %",
    what: "Average ROE across the last 3 financial years. Tests for CONSISTENT capital efficiency, not just a single lucky year.",
    why: "A company can post 25% ROE in one year due to a one-time gain (asset sale, tax credit, currency benefit) — then drop to 8% next year. The 3-year average filters out flukes and reveals durable quality.",
    ranges: [
      ["< 10%",   "Inconsistent or low-quality"],
      ["10 – 15%","Acceptable but unexciting"],
      ["15 – 20%","Good — proven consistency"],
      ["> 20%",   "Excellent — durable competitive advantage"],
    ],
    tips: "If latest ROE is high but 3Y average is low, dig deeper — the recent year might be inflated. The opposite (3Y avg high, latest low) might signal a temporary problem worth investigating.",
  },

  minDividendYield: {
    title: "Min Dividend Yield %",
    what: "Annual dividend per share ÷ current price × 100. The cash yield you'd get from owning the stock.",
    why: "Dividend yield = downside cushion. Companies that consistently pay dividends are usually profitable, mature, and disciplined about cash. Useful in uncertain markets when growth bets aren't paying off.",
    ranges: [
      ["0 – 1%", "Pure growth play — reinvests everything"],
      ["1 – 3%", "Balanced — growth + small income"],
      ["3 – 5%", "Income-focused — mature business"],
      ["> 5%",   "Either deep value OR dividend trap (stock fell sharply, yield mechanically high)"],
    ],
    tips: "Default 0 (no filter). Use 2%+ when looking for defensive picks in volatile markets. Yields > 8% often signal trouble — the stock crashed and the yield calculation hasn't caught up yet.",
  },

  onlyProfitable: {
    title: "Only Profitable (ROE > 0)",
    what: "Shows ONLY companies with positive ROE — i.e., they are actually making money.",
    why: "Eliminates loss-making companies regardless of hype. A company with great revenue growth but negative earnings is burning cash — not investable unless you are a venture capitalist.",
    ranges: [],
    tips: "Almost always keep this ON. Turn it OFF only if specifically hunting turnaround stories — verify management is credible before investing.",
  },

  // ═══ BALANCE SHEET ════════════════════════════════════════════════
  maxDebtEquity: {
    title: "Max Debt / Equity",
    what: "Total debt ÷ shareholders' equity. Measures financial leverage — how much debt the company has relative to its own funds.",
    why: "High debt amplifies returns in good times but accelerates losses in downturns. Companies with D/E > 1 face existential risk during recessions or interest rate spikes. Strong businesses generate enough cash without heavy debt.",
    ranges: [
      ["< 0.3",    "Conservative — financial fortress"],
      ["0.3 – 0.7","Healthy — manageable leverage"],
      ["0.7 – 1.5","Elevated — watch interest costs"],
      ["> 1.5",    "Risky — vulnerable in downturns"],
    ],
    tips: "0.5 is a sensible default. Banks/NBFCs naturally run at D/E 5-10 — that's their business model. Always exclude them via the Sector filter when applying D/E filters.",
  },

  minCurrentRatio: {
    title: "Min Current Ratio",
    what: "Current Assets ÷ Current Liabilities. Measures short-term liquidity — can the company pay bills due within 12 months?",
    why: "A company can be profitable on paper but bankrupt in practice if it can't pay near-term bills. Current ratio above 1 means assets exceed liabilities; above 1.5 means meaningful safety margin.",
    ranges: [
      ["< 1.0",   "Danger zone — may struggle to pay bills"],
      ["1.0 – 1.5","Tight — vulnerable to any disruption"],
      ["1.5 – 2.5","Healthy — comfortable working capital"],
      ["> 3.0",   "Possibly inefficient — too much cash sitting idle"],
    ],
    tips: "1.5 is a good minimum. Software/IT companies often have very high current ratios (3-5) — that's fine. Manufacturing should be 1.5-2.5.",
  },

  minICR: {
    title: "Min Interest Coverage Ratio (ICR)",
    what: "EBIT (operating profit) ÷ Interest Expense. Measures how many times the company's profit covers its interest payments.",
    why: "D/E shows how much debt exists; ICR shows whether the company can SERVICE that debt comfortably. Even a company with D/E of 0.5 is risky if its profits barely cover interest. ICR < 1.5 = one bad quarter from default.",
    ranges: [
      ["< 1.5",   "Critical risk — interest eats most profit"],
      ["1.5 – 3.0","Tight — vulnerable in slowdowns"],
      ["3.0 – 6.0","Safe — comfortable margin"],
      ["> 6.0",   "Very safe — debt-light or extremely profitable"],
    ],
    tips: "Set minimum 3.0 for safety. Companies with no debt show null ICR — safe to allow through.",
  },

  // ═══ GROWTH ═══════════════════════════════════════════════════════
  minRevenueGr: {
    title: "Min Revenue Growth % (YoY)",
    what: "Year-over-year change in total revenue. Top-line growth.",
    why: "Revenue is harder to fake than profit. A company growing revenue 20%+ is genuinely capturing market share. If revenue stagnates but profit grows, the company is cutting costs — not sustainable forever.",
    ranges: [
      ["< 0%",    "Declining — investigate why"],
      ["0 – 8%",  "Sluggish — mature or in trouble"],
      ["8 – 20%", "Solid — healthy expansion"],
      ["> 20%",   "High growth — verify sustainability"],
    ],
    tips: "10-15% minimum is reasonable. Watch for one-time spikes from acquisitions or divestitures — check prior 2-3 years for context.",
  },

  minEarningsGr: {
    title: "Min Earnings Growth % (YoY)",
    what: "Year-over-year change in net profit. Bottom-line growth.",
    why: "Earnings growth is what ultimately drives stock prices long-term. A stock can be 'cheap' on P/E but if earnings are stagnant, it stays cheap forever.",
    ranges: [
      ["< 0%",    "Profit declining — red flag"],
      ["0 – 10%", "Slow growth — mature business"],
      ["10 – 25%","Healthy — quality compounder"],
      ["> 25%",   "Strong — verify it's organic, not one-time"],
    ],
    tips: "10%+ is decent. If earnings growth far exceeds revenue growth, the company is improving margins (good) — but that has a ceiling. Eventually revenue has to grow too.",
  },

  minQtrProfGr: {
    title: "Min Quarterly Profit Growth %",
    what: "Latest quarter's profit vs same quarter previous year. Most recent momentum signal.",
    why: "Annual numbers can lag reality by 6+ months. Quarterly growth catches inflection points — both positive (turnaround starting) and negative (story breaking).",
    ranges: [
      ["< -20%",  "Crashing — major problem brewing"],
      ["-20 – 0%","Weakening — investigate"],
      ["0 – 15%", "Stable but slow"],
      ["15 – 50%","Strong momentum — verify it's organic"],
    ],
    tips: "Set 5-10% minimum to filter out stocks losing momentum. Combined with the Max cap below, you avoid one-time windfalls.",
  },

  maxQtrProfGr: {
    title: "Max Quarterly Profit Growth %",
    what: "Caps stocks with absurdly high quarterly growth — usually one-time exceptional items, not real business growth.",
    why: "When you see 'profit growth +2000%' in a screen, it's almost never sustainable. It's usually: asset sale, tax credit, insurance payout, milestone payment, or currency gain. Capping at ~200% removes these false signals.",
    ranges: [
      ["50 – 100%", "Strict — only normal growth"],
      ["100 – 200%","Balanced — allows recovery quarters"],
      ["200 – 500%","Lenient — allows some flukes through"],
      ["> 500%",    "Effectively no cap — outliers will leak in"],
    ],
    tips: "200% is the sweet spot. Real business growth is rarely above this. Examples caught: SPARC (+2987% licensing milestone), JSW Steel (+991% one-time item).",
  },

  minSalesCagr: {
    title: "Min 5Y Sales CAGR %",
    what: "Compound annual growth rate of revenue over 5 years. Proves long-term ability to grow.",
    why: "1-year growth is volatile. 5-year CAGR proves the company has grown across full market cycles — through Covid, war, inflation, and rate hikes.",
    ranges: [
      ["< 5%",   "Stagnant — barely keeping up with inflation"],
      ["5 – 12%","Modest — slow compounder"],
      ["12 – 20%","Strong — high-quality compounder"],
      ["> 20%",  "Exceptional — but verify sustainability"],
    ],
    tips: "8-10% is a reasonable floor. Multi-baggers usually show 15%+ sales CAGR over 5 years. Below 5% means the business isn't growing meaningfully.",
  },

  minProfitCagr: {
    title: "Min 5Y Profit CAGR %",
    what: "Compound annual growth rate of net profit over 5 years. The wealth-creation metric.",
    why: "Stock prices ultimately track earnings. A stock with 20%+ profit CAGR over 5 years has likely been a multi-bagger (or will be). This is the holy grail filter for finding compounders.",
    ranges: [
      ["< 5%",   "Wealth destroyer — profit barely growing"],
      ["5 – 15%","Modest compounder"],
      ["15 – 25%","Strong compounder — likely outperformer"],
      ["> 25%",  "Exceptional — verify durability"],
    ],
    tips: "10% minimum to filter for genuine compounders. If profit CAGR is much higher than sales CAGR for 5 years straight, the company has structurally improved margins — that's gold.",
  },

  // ═══ VALUATION ════════════════════════════════════════════════════
  maxPE: {
    title: "Max P/E Ratio",
    what: "Price ÷ Earnings per share. How many years of current profit you're paying for in the stock price.",
    why: "Lower P/E = cheaper relative to earnings. But context matters — a high-growth company at P/E 50 may be 'cheaper' than a no-growth stock at P/E 15. Use this with PEG for a fuller picture.",
    ranges: [
      ["< 15",   "Cheap — potential value or low growth"],
      ["15 – 25","Reasonable — most quality stocks"],
      ["25 – 40","Premium — only if growth justifies it"],
      ["> 40",   "Expensive — must have very high growth"],
    ],
    tips: "30-40 is a sensible cap. Negative P/E means loss-making (filtered by 'Only Profitable'). P/E > 100 usually signals extreme overvaluation or a micro-cap.",
  },

  maxPEG: {
    title: "Max PEG Ratio",
    what: "P/E ratio ÷ Earnings Growth Rate. A growth-adjusted valuation metric.",
    why: "PEG normalizes valuation by growth. A stock at P/E 30 with 30% growth has PEG = 1 (fair). Same stock at 60% growth has PEG = 0.5 (cheap). PEG < 1 is Peter Lynch's classic GARP criterion (Growth at Reasonable Price).",
    ranges: [
      ["< 0.5",   "Very cheap relative to growth"],
      ["0.5 – 1.0","Fair value (Lynch's sweet spot)"],
      ["1.0 – 1.5","Slightly expensive but acceptable"],
      ["> 1.5",   "Overpaying for growth"],
    ],
    tips: "1.5 is a reasonable max. PEG requires both positive earnings AND positive growth — if either is negative, the ratio is meaningless and shouldn't be filtered on.",
  },

  // ═══ RISK & PRICE ═════════════════════════════════════════════════
  minAvgVolCr: {
    title: "Min Avg Daily Volume (₹ Cr)",
    what: "Average daily ₹ value traded (price × volume). Measures liquidity — can you actually enter and exit the position?",
    why: "A stock trading only ₹0.5 Cr/day means a single ₹50K buy moves the price 1-2%. For larger positions, you can't sell quickly without taking a haircut. Especially critical during market panics.",
    ranges: [
      ["< 1 Cr",  "Illiquid — entry/exit will be painful"],
      ["1 – 5 Cr","Acceptable for ₹50K positions"],
      ["5 – 20 Cr","Comfortable for ₹1-5L positions"],
      ["> 20 Cr", "Highly liquid — institutional-grade"],
    ],
    tips: "Set minimum 1-2 Cr for a ₹50K portfolio. Below this, you'll regret it during a market crash when you NEED to sell fast.",
  },

  maxBeta: {
    title: "Max Beta",
    what: "How much the stock moves relative to Nifty 50. Beta 1 = moves identically to Nifty. Beta 2 = moves 2x as much in either direction.",
    why: "High beta amplifies both gains and losses. In a bull market, beta 2 stocks double Nifty's returns. In a bear market, they crash twice as hard. Lower beta = smoother ride, but smaller upside.",
    ranges: [
      ["< 0.8",   "Defensive — moves less than market"],
      ["0.8 – 1.2","Market-like — normal volatility"],
      ["1.2 – 1.8","Aggressive — bigger swings"],
      ["> 1.8",   "Very volatile — high-conviction only"],
    ],
    tips: "1.3 is reasonable for moderate risk tolerance. Below 1.0 if you can't sleep through volatility. PSU and utility stocks have low beta but also low growth.",
  },

  maxPrice: {
    title: "Max Price (₹ per share)",
    what: "Filters out stocks above a certain per-share price — purely a position sizing constraint.",
    why: "If a stock costs ₹15,000/share (like MRF), allocating ₹50K means owning only 3 shares — no diversification and you can't average down meaningfully. Lower-priced shares allow finer position sizing.",
    ranges: [
      ["< ₹500",       "Cheap-priced — usually small or mid-caps"],
      ["₹500 – ₹2,000","Comfortable — most quality mid-caps"],
      ["₹2K – ₹5K",   "High-priced — accepts but limits sizing"],
      ["> ₹5,000",     "Very high — only if you have ₹2L+ per stock"],
    ],
    tips: "₹5,000 max works for ₹50K portfolios. Don't confuse low price with low value — Page Industries at ₹45,000 is a great business, just bad fit for small portfolios.",
  },

  minDipPct: {
    title: "Min Dip from 52W High %",
    what: "How far the current price is below the 52-week high. A sentiment indicator.",
    why: "Implements the 'buy good companies on temporary weakness' thesis. Stocks 20-40% off their peak are often suffering from sentiment/macro fears, not actual business problems — this is where margin-of-safety opportunities live.",
    ranges: [
      ["0 – 10%",  "Near peak — no margin of safety"],
      ["10 – 25%", "Moderate correction — interesting"],
      ["25 – 45%", "Deep dip — research carefully"],
      ["> 50%",    "Crashed — may be broken story, not just sentiment"],
    ],
    tips: "15-25% is the sweet spot for finding good entries. Stocks 50%+ off peak often have REAL problems (fraud, debt crisis, sector destruction) — not just sentiment. Always investigate WHY before buying.",
  },

  // ═══ OWNERSHIP ════════════════════════════════════════════════════
  minPromoter: {
    title: "Min Promoter Holding %",
    what: "Percentage of company owned by founders/family/parent company.",
    why: "High promoter holding = skin in the game. They have everything to lose if the business fails. If promoters are aggressively selling, that's the loudest 'sell' signal you'll get from insiders.",
    ranges: [
      ["< 25%",   "Low conviction — promoters cashed out"],
      ["25 – 50%","Acceptable but watch the trend"],
      ["50 – 70%","Strong commitment"],
      ["> 75%",   "Family-owned — promoters won't dilute"],
    ],
    tips: "30% is a reasonable floor. Many top IT companies (Infosys, Coforge) have promoter holding 13-30% but are professionally managed. Watch the TREND more than the absolute value.",
  },

  maxPledged: {
    title: "Max Pledged %",
    what: "Percentage of promoter holding pledged as collateral for personal loans.",
    why: "If promoters pledge shares for loans and the stock falls, lenders can force-sell those shares — creating a cascade where the stock drops further, more shares get force-sold, and so on. Classic collapse pattern (Future Retail, DHFL).",
    ranges: [
      ["0%",     "Clean — no force-sell risk"],
      ["0 – 10%","Acceptable — manageable risk"],
      ["10 – 30%","Elevated — watch closely"],
      ["> 30%",  "Dangerous — one bad quarter from cascade"],
    ],
    tips: "5% is a safe ceiling. Note: yfinance does not provide pledged data — this filter currently shows null for most stocks.",
  },

  // ═══ SECTOR ═══════════════════════════════════════════════════════
  onlyAI: {
    title: "AI / Tech / Semiconductor Only",
    what: "Restricts results to IT services, software, semiconductors, electronics, and cloud-related companies.",
    why: "Useful when specifically hunting for AI/chip beneficiaries during structural tech booms. Excludes everything not directly playing this theme.",
    ranges: [],
    tips: "Use sparingly — overly narrow when used with other strict filters. Better to leave OFF and scan the full universe.",
  },

  onlyLowCrude: {
    title: "Exclude Crude-Sensitive",
    what: "Removes airlines, paints, tyres, logistics, oil marketing companies — businesses with high crude oil cost exposure.",
    why: "When crude is volatile (wars, OPEC cuts), these sectors swing wildly. If you can't predict crude direction, excluding them simplifies your thesis.",
    ranges: [],
    tips: "Turn ON during oil price volatility. Turn OFF during stable energy markets to give yourself more options.",
  },

  exclBanks: {
    title: "Exclude Banks / NBFCs",
    what: "Removes banks and non-banking financial companies from results.",
    why: "Banks have totally different financial structures — D/E of 5-10 is normal for them. Many of our filters (D/E, current ratio) don't apply fairly. Evaluate banks with banking-specific metrics (NIM, GNPA, CASA) separately.",
    ranges: [],
    tips: "Keep ON by default. Banks deserve their own screening framework. Don't mix them with manufacturing companies in the same screen.",
  },

  exclCommodity: {
    title: "Exclude Commodity Cyclicals",
    what: "Removes steel, coal, metals, base chemicals — companies whose earnings swing with global commodity prices.",
    why: "Commodity stocks are cyclical — they look CHEAP when earnings peak (low P/E, high ROE) and EXPENSIVE when earnings trough. Traditional value metrics give wrong signals at wrong times.",
    ranges: [],
    tips: "Useful if you don't actively follow commodity cycles. Turn OFF if you specifically want metals exposure during cycle troughs.",
  },

  exclRealEstate: {
    title: "Exclude Real Estate",
    what: "Removes real estate developers, construction companies.",
    why: "Real estate has lumpy revenue (project completions), high debt, project delays, and interest rate sensitivity. Hard to value with standard ratios.",
    ranges: [],
    tips: "Turn ON unless specifically interested in real estate cycles.",
  },

  exclPSU: {
    title: "Exclude PSU",
    what: "Removes Public Sector Undertakings — government-owned companies like SBI, BHEL, BEL, ONGC, Coal India.",
    why: "PSUs often prioritize policy objectives (employment, subsidies) over shareholder returns. Capital allocation can be poor. Privatization is slow. That said, some PSUs (BEL, IRCTC, HAL) are genuinely well-run.",
    ranges: [],
    tips: "Turn ON for pure private-sector quality. Turn OFF to include defense (BEL, HAL) or infrastructure (IRCTC) plays.",
  },
};


// ── Metric health thresholds used in the detail modal ────────────────
const METRIC_INFO = {
  pe:                 { desc: "Years of profit being paid for",          good: v => v > 0 && v < 25, bad: v => v > 40 },
  pb:                 { desc: "Price relative to book value",            good: v => v > 0 && v < 3,  bad: v => v > 5 },
  roe:                { desc: "Profit per ₹1 of equity",                 good: v => v >= 15,         bad: v => v < 8 },
  debtToEquity:       { desc: "Borrowed vs own money",                   good: v => v < 0.5,         bad: v => v > 1.5 },
  currentRatio:       { desc: "Ability to pay short-term bills",         good: v => v >= 1.5,        bad: v => v < 1 },
  revenueGrowth:      { desc: "YoY sales momentum",                      good: v => v >= 15,         bad: v => v < 0 },
  earningsGrowth:     { desc: "YoY profit momentum",                     good: v => v >= 15,         bad: v => v < 0 },
  pegRatio:           { desc: "P/E adjusted for growth",                 good: v => v > 0 && v < 1,  bad: v => v > 2 },
  beta:               { desc: "Volatility vs Nifty 50",                  good: v => v < 1,           bad: v => v > 1.5 },
  dividendYield:      { desc: "Annual dividend as % of price",           good: v => v >= 2,          bad: v => v < 0.5 },
  promoterHolding:    { desc: "Founders' skin in the game",              good: v => v >= 50,         bad: v => v < 30 },
  institutionalHolding:{ desc: "FII + DII ownership",                   good: v => v >= 30,         bad: v => v < 10 },
  dipFrom52wHigh:     { desc: "Drop from recent peak",                   good: v => v < 10,          bad: v => v > 30 },
  qtrProfitGrowth:    { desc: "Latest quarter profit growth",            good: v => v >= 15,         bad: v => v < 0 },
  sales5yCagr:        { desc: "5-year sales compound growth",            good: v => v >= 12,         bad: v => v < 5 },
  profit5yCagr:       { desc: "5-year profit compound growth",           good: v => v >= 12,         bad: v => v < 5 },
  interestCoverage:   { desc: "Ability to service debt interest",        good: v => v >= 3,          bad: v => v < 1.5 },
  pledgedPct:         { desc: "Promoter shares pledged as collateral",   good: v => v <= 5,          bad: v => v > 20 },
};

// ── Sector / industry keyword lists ─────────────────────────────────
const AI_KEYWORDS = [
  "software", "information tech", "semiconductor", "electronic",
  "computer", "data", "cloud", "artificial", "chip", "digital",
  "automation", "robotics", "tech", "internet",
];

const CRUDE_SECTORS = [
  "oil", "gas", "petroleum", "airline", "paint", "logistics",
  "shipping", "fertilizer", "chemical",
];

const BANK_KEYWORDS = [
  "bank", "nbfc", "financial service", "finance company",
  "credit", "housing finance", "microfinance",
];

const COMMODITY_KEYWORDS = [
  "metal", "mining", "steel", "coal", "alumin",
  "copper", "zinc", "iron ore", "cement",
];

const REALESTATE_KEYWORDS = [
  "real estate", "realty", "property", "housing development", "construction",
];

// Expose to other scripts
window.FILTERS            = FILTERS;
window.FILTER_INFO        = FILTER_INFO;
window.METRIC_INFO        = METRIC_INFO;
window.AI_KEYWORDS        = AI_KEYWORDS;
window.CRUDE_SECTORS      = CRUDE_SECTORS;
window.BANK_KEYWORDS      = BANK_KEYWORDS;
window.COMMODITY_KEYWORDS = COMMODITY_KEYWORDS;
window.REALESTATE_KEYWORDS = REALESTATE_KEYWORDS;
