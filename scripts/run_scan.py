"""
Standalone scan script — run by GitHub Actions daily.
Saves results to data/stocks.json relative to the repo root.

Each stock entry includes:
  - All fundamental fields (from core/scanner.py)
  - h5y: 5Y weekly price history (for offline charts)
  - news: up to 8 recent headlines (for offline news panel)

Usage:
    python scripts/run_scan.py
"""

import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import NSE_SYMBOLS
from core.scanner import fetch_one

OUTPUT  = Path(__file__).parent.parent / "data" / "stocks.json"
WORKERS = 8


def _warmup():
    """Establish Yahoo Finance crumb before parallel requests start."""
    print("Warming up Yahoo Finance session...")
    for attempt in range(5):
        for sym in ["RELIANCE", "TCS", "INFY"]:
            try:
                info = yf.Ticker(f"{sym}.NS").info
                if info and info.get("regularMarketPrice"):
                    print(f"  Session ready (via {sym}, attempt {attempt + 1})")
                    return
            except Exception:
                pass
        wait = 3 * (attempt + 1)
        print(f"  Attempt {attempt + 1} failed — retrying in {wait}s...")
        time.sleep(wait)
    print("  Warm-up failed after 5 attempts — continuing anyway")


def _fetch_history(symbol: str) -> list:
    """Fetch 5Y weekly close prices. Returns [{d, c}, ...]."""
    try:
        hist = yf.Ticker(f"{symbol}.NS").history(period="5y", interval="1wk")
        result = []
        for date, row in hist.iterrows():
            close = row.get("Close")
            if close is not None and close == close:  # NaN check
                result.append({"d": date.strftime("%Y-%m-%d"), "c": round(float(close), 2)})
        return result
    except Exception:
        return []


def _fetch_news(symbol: str) -> list:
    """Fetch recent news headlines. Returns [{t, u, p, d}, ...]."""
    try:
        items = []
        for a in (yf.Ticker(f"{symbol}.NS").news or [])[:8]:
            content = a.get("content", {}) or {}
            title   = content.get("title") or a.get("title", "")
            url     = (content.get("canonicalUrl") or {}).get("url") or a.get("link", "")
            pub     = (content.get("provider") or {}).get("displayName") or a.get("publisher", "")
            ts      = content.get("pubDate") or ""
            if title and url:
                items.append({"t": title, "u": url, "p": pub, "d": ts})
        return items
    except Exception:
        return []


def _fetch_all(symbol: str, retries: int = 2) -> dict | None:
    """Fetch fundamentals + history + news with retry."""
    for attempt in range(retries + 1):
        result = fetch_one(symbol)
        if result is not None:
            result["h5y"]  = _fetch_history(symbol)
            result["news"] = _fetch_news(symbol)
            return result
        if attempt < retries:
            time.sleep(1.5 * (attempt + 1))
    return None


def main():
    _warmup()

    total   = len(NSE_SYMBOLS)
    results = []
    errors  = 0
    done    = 0

    print(f"Scanning {total} symbols with {WORKERS} workers...")

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(_fetch_all, s): s for s in NSE_SYMBOLS}
        for fut in as_completed(futures):
            done += 1
            try:
                data = fut.result()
                if data:
                    results.append(data)
                else:
                    errors += 1
            except Exception:
                errors += 1

            if done % 50 == 0 or done == total:
                print(f"  {done}/{total}  fetched={len(results)}  errors={errors}")

    payload = {
        "updated_at":    datetime.now(timezone.utc).isoformat(),
        "total_symbols": total,
        "total_fetched": len(results),
        "errors":        errors,
        "stocks":        results,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(payload, f, separators=(",", ":"))

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\nSaved {len(results)} stocks → {OUTPUT}  ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
