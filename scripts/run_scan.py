"""
Standalone scan script — run by GitHub Actions daily.
Saves results to data/stocks.json relative to the repo root.

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

# Allow importing core/ from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import NSE_SYMBOLS
from core.scanner import fetch_one

OUTPUT  = Path(__file__).parent.parent / "data" / "stocks.json"
WORKERS = 8   # lower count avoids Yahoo Finance crumb/session conflicts


def _warmup():
    """Establish a Yahoo Finance session (crumb) before parallel requests."""
    print("Warming up Yahoo Finance session...")
    for sym in ["RELIANCE", "TCS", "INFY"]:
        try:
            yf.Ticker(f"{sym}.NS").info
            print(f"  Session ready (via {sym})")
            return
        except Exception:
            pass
    print("  Warm-up failed — continuing anyway")


def _fetch_with_retry(symbol: str, retries: int = 2) -> dict | None:
    """Wrap fetch_one with simple retry on failure."""
    for attempt in range(retries + 1):
        result = fetch_one(symbol)
        if result is not None:
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
        futures = {pool.submit(_fetch_with_retry, s): s for s in NSE_SYMBOLS}
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
