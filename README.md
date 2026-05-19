# NSE Stock Screener — GitHub Pages Edition

Static version of the NSE Stock Screener. No server required.

- **Frontend**: GitHub Pages (pure HTML/CSS/JS)
- **Data**: GitHub Actions runs a daily Python scan and commits `data/stocks.json`
- **Filters**: 30 client-side filters, all instant
- **Charts**: Yahoo Finance API called directly from the browser

## Deploy

1. Fork / push this repo to GitHub
2. Settings → Pages → Source: `main` branch, root `/`
3. Actions tab → "Daily Stock Scan" → Run workflow (first data load)
4. Your live URL: `https://<username>.github.io/github-market-analyzer/`

## Refresh data manually

```bash
python scripts/run_scan.py
```

## Update Nifty 500 list (bi-monthly)

```bash
python scripts/refresh_nifty500.py
```
