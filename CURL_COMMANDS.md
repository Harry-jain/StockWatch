# CURL_COMMANDS.md — StockWatch API Reference

Every endpoint in the app, as a copy-paste-ready `curl` command. Replace
`stockswatch.vercel.app` if your domain differs, and fill in your own
`CRON_SECRET` / password where marked.

---

## 0. Setup — one-time variables

Run this first in your terminal. Everything below reuses `$BASE` and the
`cookies.txt` jar it creates.

```bash
export BASE="https://stockswatch.vercel.app"
export CRON_SECRET="paste-your-cron-secret-here"
```

Most routes require a logged-in session. Curl can hold that session in a
cookie jar file (this works even though the cookie is `HttpOnly` — that
flag only blocks JavaScript from reading it, not curl):

```bash
curl -c cookies.txt -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"your-actual-password"}'
```

After that, every authenticated command below adds `-b cookies.txt` to send
the saved session cookie back.

---

## 1. Auth

**Login** (creates `cookies.txt`)
```bash
curl -c cookies.txt -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"your-actual-password"}'
```

**Check session is valid**
```bash
curl -b cookies.txt "$BASE/api/auth/check"
```

**Logout** (clears the server-side cookie)
```bash
curl -b cookies.txt -X POST "$BASE/api/auth/logout"
```

---

## 2. Watchlist

**Get full watchlist**
```bash
curl -b cookies.txt "$BASE/api/watchlist"
```

**Add a stock** (NSE — `.NS` is added automatically if omitted)
```bash
curl -b cookies.txt -X POST "$BASE/api/watchlist" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"RELIANCE.NS"}'
```

**Add a BSE stock**
```bash
curl -b cookies.txt -X POST "$BASE/api/watchlist" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"500325.BO"}'
```

**Remove a stock**
```bash
curl -b cookies.txt -X DELETE "$BASE/api/watchlist/RELIANCE.NS"
```

---

## 3. Stocks & Charts

**Search for a stock by name or symbol**
```bash
curl -b cookies.txt "$BASE/api/stocks/search?q=reliance"
```

**Get a single quote**
```bash
curl -b cookies.txt "$BASE/api/stocks/TCS.NS"
```

**Get an index quote** (Nifty 50 / Sensex / Bank Nifty)
```bash
curl -b cookies.txt "$BASE/api/stocks/%5ENSEI"     # ^NSEI, URL-encoded
curl -b cookies.txt "$BASE/api/stocks/%5EBSESN"    # ^BSESN
curl -b cookies.txt "$BASE/api/stocks/%5ENSEBANK"  # ^NSEBANK
```

**Get historical chart data** — `period` is one of `1d 5d 1mo 3mo 6mo 1y 5y`
```bash
curl -b cookies.txt "$BASE/api/stocks/TCS.NS/chart?period=1mo"
```

**Batch quotes** (comma-separated, capped at 100 symbols server-side)
```bash
curl -b cookies.txt "$BASE/api/stocks/quotes?symbols=RELIANCE.NS,TCS.NS,INFY.NS"
```

---

## 4. Portfolio

**Get your position in a stock**
```bash
curl -b cookies.txt "$BASE/api/portfolio/RELIANCE.NS"
```

**Set/update your position** (qty + average buy price)
```bash
curl -b cookies.txt -X POST "$BASE/api/portfolio/RELIANCE.NS" \
  -H "Content-Type: application/json" \
  -d '{"qty":10,"avgBuyPrice":2450.50}'
```

---

## 5. Notes

**Get notes for a stock**
```bash
curl -b cookies.txt "$BASE/api/notes/RELIANCE.NS"
```

**Save notes for a stock**
```bash
curl -b cookies.txt -X PUT "$BASE/api/notes/RELIANCE.NS" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Watching for a breakout above 2500."}'
```

---

## 6. Custom Price Alerts

**Get all alerts for a stock**
```bash
curl -b cookies.txt "$BASE/api/alerts/RELIANCE.NS"
```

**Create an alert** — `direction` is `"above"` or `"below"`
```bash
curl -b cookies.txt -X POST "$BASE/api/alerts/RELIANCE.NS" \
  -H "Content-Type: application/json" \
  -d '{"threshold":2500,"direction":"above"}'
```

**Delete an alert** (use the `id` returned when you created it)
```bash
curl -b cookies.txt -X DELETE "$BASE/api/alerts/RELIANCE.NS?id=PASTE_ALERT_ID_HERE"
```

---

## 7. Cron Jobs (notifications)

These don't use the cookie jar — they're protected by `CRON_SECRET` instead,
since QStash calls these automatically and isn't logged in as you.

**Morning open** — opening prices, sent ~09:15 IST on trading days
```bash
curl -i -X POST "$BASE/api/cron/morning-open" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Hourly update** — price digest + 5%/custom alerts, sent hourly 10:00–15:00 IST
```bash
curl -i -X POST "$BASE/api/cron/hourly-update" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**EOD summary** — best/worst performers, sent ~15:35 IST on trading days
```bash
curl -i -X POST "$BASE/api/cron/eod-summary" \
  -H "Authorization: Bearer $CRON_SECRET"
```

> Outside trading hours (or on a weekend/holiday), all three now send a
> **Market Closed** notice on Telegram/Gmail/WhatsApp instead of doing
> nothing — see the response body's `skipped` field for the reason
> (`weekend`, `holiday`, `before-hours`, `after-hours`).

---

## Reading the results

| Result | Meaning |
| --- | --- |
| `200` + JSON body | Request succeeded — for cron routes, also check that a message actually landed in Telegram/Gmail/WhatsApp |
| `401 {"error":"Unauthorized"}` | Missing/expired session cookie (re-run the login command), or wrong `CRON_SECRET` |
| `400 {"error":"..."}` | Bad input — check the symbol format or request body against the examples above |
| `404 {"error":"..."}` | Symbol not found / not in watchlist / alert ID doesn't exist |
| `409 {"error":"Already in watchlist"}` | You tried to add a symbol that's already there |
| `429 {"error":"..."}` | Rate limited — you're sending requests faster than the configured limit |
| Connection refused / timeout | Check `$BASE` is correct and the deployment is live |

---

*End of CURL_COMMANDS.md*
