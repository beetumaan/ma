"""
Standalone scan script — run by GitHub Actions daily.
Saves results to data/stocks.json relative to the repo root.

Usage:
    python scripts/run_scan.py
"""

import json
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

# Allow importing core/ from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import NSE_SYMBOLS, PSU_SYMBOLS
from core.scanner import fetch_one

OUTPUT = Path(__file__).parent.parent / "data" / "stocks.json"
WORKERS = 20


def main():
    total = len(NSE_SYMBOLS)
    results = []
    errors = 0
    done = 0

    print(f"Scanning {total} symbols with {WORKERS} workers...")

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(fetch_one, s): s for s in NSE_SYMBOLS}
        for fut in as_completed(futures):
            done += 1
            sym = futures[fut]
            try:
                data = fut.result()
                if data:
                    results.append(data)
                    status = "OK"
                else:
                    status = "no data"
                    errors += 1
            except Exception as exc:
                status = f"error: {exc}"
                errors += 1

            if done % 50 == 0 or done == total:
                print(f"  {done}/{total}  fetched={len(results)}  errors={errors}")

    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "total_symbols": total,
        "total_fetched": len(results),
        "errors": errors,
        "stocks": results,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(payload, f, separators=(",", ":"))

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\nSaved {len(results)} stocks → {OUTPUT}  ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
