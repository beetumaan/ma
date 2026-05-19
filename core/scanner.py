import math
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import yfinance as yf

from .config import NSE_SYMBOLS, PSU_SYMBOLS


def _clean(value):
    """Recursively replace float NaN/Inf with None so the dict is JSON-safe."""
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, dict):
        return {k: _clean(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_clean(v) for v in value]
    return value

FETCH_WORKERS = 20  # 500 stocks — more workers keeps scan time reasonable

scan_state = {
    "running": False,
    "progress": 0,
    "total": 0,
    "results": [],
    "errors": 0,
    "lock": threading.Lock(),
}


def fetch_one(symbol: str) -> dict | None:
    """Fetch fundamental + price data for a single NSE stock via yfinance."""
    try:
        t = yf.Ticker(f"{symbol}.NS")
        info = t.info
        if not info or info.get("regularMarketPrice") is None:
            return None

        price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
        mcap = info.get("marketCap", 0)
        if not price or not mcap:
            return None

        roe_raw = info.get("returnOnEquity")
        roe = round(roe_raw * 100, 2) if roe_raw else None

        # yfinance sometimes returns D/E * 100 — normalise values > 5
        de_raw = info.get("debtToEquity")
        de = round(de_raw / 100, 2) if de_raw and de_raw > 5 else de_raw

        rev_g = info.get("revenueGrowth")
        rev_growth = round(rev_g * 100, 1) if rev_g else None

        earn_g = info.get("earningsGrowth")
        earn_growth = round(earn_g * 100, 1) if earn_g else None

        prom = info.get("heldPercentInsiders")
        inst = info.get("heldPercentInstitutions")

        w52h = info.get("fiftyTwoWeekHigh", 0)
        dip_pct = round((1 - price / w52h) * 100, 1) if w52h else 0

        # Quarterly profit growth (QoQ)
        qtr_profit_growth = None
        try:
            qf = t.quarterly_financials
            if qf is not None and not qf.empty:
                net_row = None
                for label in ["Net Income", "Net Income Common Stockholders"]:
                    if label in qf.index:
                        net_row = qf.loc[label]
                        break
                if net_row is not None and len(net_row) >= 2:
                    latest = net_row.iloc[0]
                    prev = net_row.iloc[1]
                    if prev and prev != 0:
                        qtr_profit_growth = round(((latest - prev) / abs(prev)) * 100, 1)
        except Exception:
            pass

        # Average daily traded value (₹ Cr)
        avg_vol = info.get("averageVolume") or info.get("averageDailyVolume10Day") or 0
        avg_value_cr = round(avg_vol * price / 1e7, 1) if avg_vol else None

        # 5-year revenue + profit CAGR
        sales_5y_cagr = None
        profit_5y_cagr = None
        roe_3y_avg = None
        fin = None
        try:
            fin = t.financials
            if fin is not None and not fin.empty:
                for label in ["Total Revenue", "Operating Revenue"]:
                    if label in fin.index:
                        rev_row = fin.loc[label].dropna()
                        if len(rev_row) >= 4:
                            n = len(rev_row) - 1
                            if rev_row.iloc[-1] > 0 and rev_row.iloc[0] > 0:
                                sales_5y_cagr = round(((rev_row.iloc[0] / rev_row.iloc[-1]) ** (1 / n) - 1) * 100, 1)
                        break
                for label in ["Net Income", "Net Income Common Stockholders"]:
                    if label in fin.index:
                        prof_row = fin.loc[label].dropna()
                        if len(prof_row) >= 4:
                            n = len(prof_row) - 1
                            if prof_row.iloc[-1] > 0 and prof_row.iloc[0] > 0:
                                profit_5y_cagr = round(((prof_row.iloc[0] / prof_row.iloc[-1]) ** (1 / n) - 1) * 100, 1)
                        break
                # 3-year average ROE from balance sheet
                bs = t.balance_sheet
                if bs is not None and not bs.empty:
                    ni_row = eq_row = None
                    for lbl in ["Net Income", "Net Income Common Stockholders"]:
                        if lbl in fin.index:
                            ni_row = fin.loc[lbl].dropna()
                            break
                    for lbl in ["Stockholders Equity", "Total Stockholder Equity", "Common Stock Equity"]:
                        if lbl in bs.index:
                            eq_row = bs.loc[lbl].dropna()
                            break
                    if ni_row is not None and eq_row is not None:
                        years = min(3, len(ni_row), len(eq_row))
                        roes = [
                            (ni_row.iloc[i] / eq_row.iloc[i]) * 100
                            for i in range(years)
                            if eq_row.iloc[i] and eq_row.iloc[i] > 0 and ni_row.iloc[i]
                        ]
                        if roes:
                            roe_3y_avg = round(sum(roes) / len(roes), 1)
        except Exception:
            pass

        # Interest Coverage Ratio = EBIT / Interest Expense
        interest_coverage = None
        try:
            if fin is not None and not fin.empty:
                ebit_val = int_val = None
                for label in ["EBIT", "Operating Income"]:
                    if label in fin.index:
                        s = fin.loc[label].dropna()
                        if len(s) > 0:
                            ebit_val = s.iloc[0]
                        break
                for label in ["Interest Expense"]:
                    if label in fin.index:
                        s = fin.loc[label].dropna()
                        if len(s) > 0:
                            int_val = s.iloc[0]
                        break
                if ebit_val and int_val and abs(int_val) > 0:
                    interest_coverage = round(ebit_val / abs(int_val), 1)
        except Exception:
            pass

        result = {
            "symbol": symbol,
            "name": info.get("shortName", symbol),
            "sector": info.get("sector", "—"),
            "industry": info.get("industry", "—"),
            "price": round(price, 2),
            "marketCap": mcap,
            "marketCapCr": round(mcap / 1e7, 0),
            "pe": round(info.get("trailingPE") or 0, 1),
            "pb": round(info.get("priceToBook") or 0, 1),
            "roe": roe,
            "roe3yAvg": roe_3y_avg,
            "avgValueCr": avg_value_cr,
            "roce": None,
            "debtToEquity": round(de, 2) if de else None,
            "currentRatio": round(info.get("currentRatio") or 0, 2),
            "revenueGrowth": rev_growth,
            "earningsGrowth": earn_growth,
            "pegRatio": round(info.get("pegRatio") or 0, 2) if info.get("pegRatio") else None,
            "beta": round(info.get("beta") or 0, 2) if info.get("beta") else None,
            "dividendYield": round(dy_raw * 100 if (dy_raw := info.get("dividendYield") or 0) < 1 else dy_raw, 2),
            "week52High": round(w52h, 2),
            "week52Low": round(info.get("fiftyTwoWeekLow") or 0, 2),
            "dipFrom52wHigh": dip_pct,
            "promoterHolding": round(prom * 100, 1) if prom else None,
            "institutionalHolding": round(inst * 100, 1) if inst else None,
            "qtrProfitGrowth": qtr_profit_growth,
            "sales5yCagr": sales_5y_cagr,
            "profit5yCagr": profit_5y_cagr,
            "interestCoverage": interest_coverage,
            "pledgedPct": None,
            "isPSU": symbol in PSU_SYMBOLS,
            "tags": {
                "aiBeneficiary": False,
                "lowCrudeSensitivity": True,
                "diiIncreasing": False,
                "growthCatalyst": False,
                "sentimentDip": False,
            },
        }
        return _clean(result)
    except Exception:
        return None


def run_scan():
    """Background scanner — populates scan_state['results'] using a thread pool."""
    total = len(NSE_SYMBOLS)
    results = []
    errors = 0

    with scan_state["lock"]:
        scan_state.update(running=True, progress=0, total=total, results=[], errors=0)

    done = 0
    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        futures = {pool.submit(fetch_one, s): s for s in NSE_SYMBOLS}
        for fut in as_completed(futures):
            done += 1
            try:
                data = fut.result()
                if data:
                    results.append(data)
            except Exception:
                errors += 1
            with scan_state["lock"]:
                scan_state["progress"] = done
                scan_state["results"] = list(results)
                scan_state["errors"] = errors

    with scan_state["lock"]:
        scan_state["running"] = False
