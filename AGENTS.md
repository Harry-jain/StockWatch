# AGENTS.md — StockWatch

> **Target Agent**: Antigravity
> **Project**: StockWatch — Personal Stock Watchlist + Alert System
> **Deploy Target**: Vercel (serverless, Edge middleware)
> **Owner**: Single user, password-protected, zero public access

---

## §1 PROJECT IDENTITY

**Name**: StockWatch
**Type**: Full-stack Next.js 14 web application
**Purpose**: Personal stock watchlist dashboard for NSE/BSE Indian stocks with
real-time price viewing, interactive charts, portfolio tracking, and automated
notifications (morning open, hourly updates, 5% movement alerts) sent to
Telegram (personal + family group), Gmail, and WhatsApp (via Twilio).
**Scale**: Single-user, private, hardened against all unauthenticated access.
**Constraints**:
- Must deploy to Vercel (serverless, no persistent Node.js process)
- Must work with Indian market stocks (NSE `.NS`, BSE `.BO` Yahoo Finance suffixes)
- No public access — all routes gate-kept at Edge middleware
- Password must never be stored in plain text anywhere
- All cron endpoints must reject requests missing the correct `Authorization: Bearer <CRON_SECRET>` header
- NSE market hours: Mon–Fri, 09:15–15:30 IST (UTC+5:30)

---

## §2 TECH STACK MANIFEST

All versions are pinned. Do not upgrade without explicit instruction.

### Runtime & Framework
```
next@14.2.15
react@18.3.1
react-dom@18.3.1
typescript@5.5.4
```

### Styling
```
tailwindcss@3.4.10
postcss@8.4.44
autoprefixer@10.4.19
```

### Data & State
```
yahoo-finance2@2.11.3          # NSE/BSE stock data — NO API KEY needed
swr@2.2.5                      # client-side data fetching + polling
```

### Database (KV Store)
```
@upstash/redis@1.34.3          # Upstash Redis — watchlist + price snapshots + notes
```

### Scheduling (Cron — replaces Vercel Cron for hourly granularity)
```
@upstash/qstash@2.7.10         # HTTP-based job scheduler, free tier 200 msg/day
```

### Auth & Security
```
jose@5.8.0                     # JWT sign/verify, Edge-compatible (no Node.js APIs)
bcryptjs@2.4.3                 # password hashing, pure JS — works on all Vercel runtimes
@upstash/ratelimit@2.0.4       # rate limiting login endpoint (uses same Redis)
```

### Charts
```
lightweight-charts@4.2.0       # TradingView chart library — candlestick + area + line
```

### Notifications
```
nodemailer@6.9.14              # Gmail via SMTP App Password
```
> Telegram: native `fetch` to Bot API — no package needed
> WhatsApp: Twilio REST API via native `fetch` — no package needed

### UI Utilities
```
clsx@2.1.1
date-fns@3.6.0                 # date formatting, IST timezone ops
lucide-react@0.400.0           # icons
```

### Dev
```
@types/node@22.5.0
@types/react@18.3.5
@types/react-dom@18.3.0
@types/bcryptjs@2.4.6
eslint@8.57.0
eslint-config-next@14.2.15
```

---

## §3 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                              │
│                                                                     │
│  middleware.ts  ←──── ALL requests pass through here first         │
│  (Edge Runtime)       Validates JWT cookie; redirects unauthenticated│
│       │               Blocks all requests missing valid session      │
└───────┼─────────────────────────────────────────────────────────────┘
        │
        ├──→ /login              Public (exempt from auth middleware)
        ├──→ /api/auth/login     Public (rate-limited 5 req/15min/IP)
        │
        ├──→ /dashboard          Protected — main watchlist UI
        ├──→ /stock/[symbol]     Protected — single stock detail
        │
        ├──→ /api/watchlist      Protected REST
        ├──→ /api/stocks/*       Protected REST
        ├──→ /api/portfolio/*    Protected REST
        ├──→ /api/notes/*        Protected REST
        │
        └──→ /api/cron/*         Cron-secret protected (Bearer token header)
                                  Called by Upstash QStash on schedule

┌──────────────────────┐     ┌─────────────────────────────────────┐
│   Upstash Redis KV   │     │   yahoo-finance2 (external)         │
│                      │     │   Fetches from Yahoo Finance API    │
│  watchlist           │     │   NSE: RELIANCE.NS, TCS.NS etc.     │
│  price_snap:{sym}    │     │   BSE: 500325.BO etc.               │
│  portfolio:{sym}     │     │   — quotes, historical, search      │
│  notes:{sym}         │     └─────────────────────────────────────┘
│  alerts:{sym}        │
│  ratelimit:*         │     ┌─────────────────────────────────────┐
└──────────────────────┘     │   Upstash QStash (cron scheduler)  │
                             │   Calls /api/cron/* endpoints       │
                             │   Verifies signature on each call   │
                             └─────────────────────────────────────┘

NOTIFICATION FLOW (all server-side, triggered by cron endpoints):
  /api/cron/morning-open  →  Telegram personal + family group
                          →  Gmail
                          →  WhatsApp (Twilio, if configured)

  /api/cron/hourly-update →  Fetch current price for each watched stock
                          →  Compare to last snapshot in Redis
                          →  If |change| >= 5%: send ALERT to all channels
                          →  Store new snapshot
                          →  Send regular hourly digest to all channels

  /api/cron/eod-summary   →  End of day performance digest at 15:30 IST
                          →  Best/worst performers in watchlist
```

### Key Design Decisions

1. **Edge Middleware Auth**: JWT verified at the Vercel Edge before any function executes. No unauthenticated request ever reaches application code.
2. **No Database for Users**: Single user. Password hash stored in `APP_PASSWORD_HASH` env var. No user table needed.
3. **Upstash Redis over Vercel KV**: Same product, better SDK, free tier (10k cmds/day) sufficient for single user.
4. **QStash over Vercel Cron**: Vercel Hobby cron = daily only. QStash free tier handles 200 messages/day, supports 5-minute granularity, and verifies request signatures.
5. **yahoo-finance2**: No API key, no rate limit issues for single-user usage. Falls back gracefully when market is closed.
6. **WhatsApp via Twilio**: Requires Twilio account + WhatsApp Business approval OR use Twilio Sandbox for testing. Flag as `WHATSAPP_ENABLED=false` to disable if not configured.
7. **lightweight-charts**: TradingView's official open-source library. Client-side only (dynamic import with `ssr: false`).

---

## §4 COMPLETE FILE TREE

Every file must be created exactly as named. No placeholders.

```
stockwatch/
├── AGENTS.md                          # this file — agent instructions
├── README.md                          # setup, env vars, deployment guide
├── .gitignore
├── .env.example                       # all required env vars with comments
├── .eslintrc.json
├── next.config.ts                     # security headers, image domains
├── tailwind.config.ts                 # dark theme colors, font config
├── tsconfig.json
├── postcss.config.js
├── vercel.json                        # ONLY security headers + function config (no cron — QStash handles that)
├── package.json
│
├── middleware.ts                      # Edge auth guard — validates JWT on every non-public route
│
└── src/
    ├── app/
    │   ├── layout.tsx                 # root layout — dark theme, metadata, font (Geist Mono)
    │   ├── page.tsx                   # redirects to /dashboard
    │   ├── globals.css                # Tailwind base + custom scrollbar, chart overrides
    │   │
    │   ├── login/
    │   │   └── page.tsx               # password form (single field, centered, dark)
    │   │
    │   ├── dashboard/
    │   │   ├── page.tsx               # server component: fetches watchlist, passes to client
    │   │   └── loading.tsx            # skeleton loading state
    │   │
    │   └── stock/
    │       └── [symbol]/
    │           ├── page.tsx           # server component: stock detail page
    │           └── loading.tsx        # skeleton for chart loading
    │
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx             # base button with variant props (primary/danger/ghost)
    │   │   ├── Input.tsx              # styled dark input field
    │   │   ├── Badge.tsx              # green/red price change badge
    │   │   ├── Modal.tsx              # generic overlay modal
    │   │   ├── Skeleton.tsx           # loading skeleton base component
    │   │   ├── Tooltip.tsx            # hover tooltip for metrics
    │   │   └── Spinner.tsx            # loading spinner
    │   │
    │   ├── auth/
    │   │   └── LoginForm.tsx          # password input + submit, handles /api/auth/login
    │   │
    │   ├── layout/
    │   │   ├── Navbar.tsx             # top bar with logo, market status badge, logout button
    │   │   └── MarketStatusBar.tsx    # Nifty50 + Sensex + BankNifty live indices always visible
    │   │
    │   ├── dashboard/
    │   │   ├── WatchlistGrid.tsx      # responsive grid of StockCards, handles add/remove
    │   │   ├── StockCard.tsx          # single stock tile: price, %change, mini sparkline, actions
    │   │   ├── MiniSparkline.tsx      # tiny SVG price line for StockCard (no lib, hand-drawn)
    │   │   ├── AddStockModal.tsx      # modal with StockSearch inside
    │   │   ├── StockSearch.tsx        # debounced search input → /api/stocks/search
    │   │   ├── PerformanceBoard.tsx   # top 3 gainers + losers from watchlist today
    │   │   └── SectorGroupView.tsx    # groups stocks by sector tag (toggle with grid view)
    │   │
    │   └── stock/
    │       ├── StockHeader.tsx        # company name, symbol, exchange, LTP, %change
    │       ├── StockChart.tsx         # lightweight-charts component (candlestick + area toggle)
    │       │                          # dynamic import with ssr: false
    │       ├── ChartControls.tsx      # timeframe selector: 1D, 5D, 1M, 3M, 6M, 1Y, 5Y
    │       ├── StockMetrics.tsx       # 52w high/low bar, volume, P/E, market cap, dividend yield
    │       ├── StockPortfolioPanel.tsx# qty + avg buy price → P&L display + edit form
    │       ├── StockAlertPanel.tsx    # custom alert thresholds for this stock
    │       ├── StockNotes.tsx         # personal notes textarea, auto-saves to /api/notes/[symbol]
    │       └── StockNewsPanel.tsx     # news items from yahoo-finance2 quoteSummary().news
    │
    ├── lib/
    │   ├── auth.ts                    # signJwt(), verifyJwt(), hashPassword(), comparePassword()
    │   ├── redis.ts                   # Upstash client + typed CRUD helpers for all key patterns
    │   ├── yahoo-finance.ts           # wrapper around yahoo-finance2 — quote, historical, search
    │   ├── market.ts                  # isMarketOpen(), getISTTime(), NSE holiday list 2025-2026
    │   ├── price-alert.ts             # checkPriceChange(symbol, currentPrice) → alert if >=5%
    │   ├── format.ts                  # formatINR(), formatPercent(), formatVolume(), formatCap()
    │   ├── constants.ts               # MARKET_OPEN_IST, MARKET_CLOSE_IST, INDEX_SYMBOLS, etc.
    │   └── notifications/
    │       ├── telegram.ts            # sendTelegram(chatId, message) — personal + group chat
    │       ├── gmail.ts               # sendGmail(subject, htmlBody) via nodemailer SMTP
    │       ├── whatsapp.ts            # sendWhatsApp(to, message) via Twilio REST — optional
    │       └── notifier.ts            # broadcastAlert(type, data) → calls all enabled channels
    │
    ├── hooks/
    │   ├── useWatchlist.ts            # SWR hook — GET /api/watchlist, add, remove mutations
    │   ├── useStockPrice.ts           # SWR hook — polls /api/stocks/[symbol] every 60s during market hours
    │   ├── useStockChart.ts           # SWR hook — GET /api/stocks/[symbol]/chart?period=X
    │   └── usePortfolio.ts            # SWR hook — GET/POST /api/portfolio/[symbol]
    │
    ├── types/
    │   └── index.ts                   # all shared TypeScript interfaces and types
    │
    └── app/
        └── api/
            ├── auth/
            │   ├── login/
            │   │   └── route.ts       # POST — rate-limited, bcrypt compare, set JWT cookie
            │   ├── logout/
            │   │   └── route.ts       # POST — clears auth cookie
            │   └── check/
            │       └── route.ts       # GET — verify cookie, returns 200 or 401
            │
            ├── watchlist/
            │   ├── route.ts           # GET: list watchlist | POST: add symbol
            │   └── [symbol]/
            │       └── route.ts       # DELETE: remove from watchlist
            │
            ├── stocks/
            │   ├── search/
            │   │   └── route.ts       # GET ?q=reliance — returns matching NSE/BSE symbols
            │   └── [symbol]/
            │       ├── route.ts       # GET: quote data (price, change, vol, 52w, etc.)
            │       └── chart/
            │           └── route.ts   # GET ?period=1d|5d|1mo|3mo|6mo|1y|5y — OHLCV data
            │
            ├── portfolio/
            │   └── [symbol]/
            │       └── route.ts       # GET: get entry | POST: upsert {qty, avgBuyPrice}
            │
            ├── notes/
            │   └── [symbol]/
            │       └── route.ts       # GET: get note | PUT: save note text
            │
            ├── alerts/
            │   └── [symbol]/
            │       └── route.ts       # GET: custom alerts | POST: add | DELETE: remove
            │
            └── cron/
                ├── morning-open/
                │   └── route.ts       # POST — 09:15 IST — opening prices for all watchlist
                ├── hourly-update/
                │   └── route.ts       # POST — every hour 10:00–15:00 IST — price check + 5% alert
                └── eod-summary/
                    └── route.ts       # POST — 15:35 IST — end of day performance digest
```

---

## §5 MODULE SPECIFICATIONS

---

### Module: middleware.ts
**Purpose**: Gate ALL requests at Vercel Edge — no unauthenticated traffic reaches any route.
**Runtime**: Edge Runtime (Vercel Edge Network — runs before any serverless function)
**Location**: `middleware.ts` (project root — Next.js requirement)
**Dependencies**: `jose@5.x` (Edge-compatible JWT)

**Logic**:
```
On every incoming request:
  1. If path is /login OR /api/auth/login → allow (no auth check)
  2. Extract cookie named `stockwatch_session`
  3. If cookie missing → redirect to /login
  4. Verify JWT with jose verifyJwt() using JWT_SECRET env var
  5. If invalid/expired → redirect to /login with ?expired=1 query param
  6. If valid → allow request through (set x-user header for API routes)

For /api/cron/* routes:
  1. Check Authorization header: `Bearer <CRON_SECRET>`
  2. If header missing or wrong → return 401 JSON immediately
  3. Never redirect cron routes (they're machine-called)

Security headers applied in middleware (and in next.config.ts):
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: strict (self only, no unsafe-inline, no unsafe-eval)
```

**Acceptance Criteria**:
- [ ] Request to /dashboard without cookie → redirects to /login (not 404, not blank)
- [ ] Request to /api/watchlist without cookie → returns 401 JSON (not redirect)
- [ ] Request to /api/cron/morning-open without Bearer header → returns 401
- [ ] Expired JWT cookie → redirects to /login?expired=1
- [ ] Tampered JWT → redirects to /login
- [ ] curl -v http://[app-url]/dashboard without auth → 302 to /login

---

### Module: lib/auth.ts
**Purpose**: All authentication primitives — password hashing, JWT signing/verification.
**Runtime**: Node.js (not Edge) — bcryptjs requires Node.js
**Dependencies**: `bcryptjs@2.4.3`, `jose@5.x`

**Exports**:
```typescript
export async function hashPassword(plain: string): Promise<string>
export async function comparePassword(plain: string, hash: string): Promise<boolean>
export async function signJwt(payload: Record<string, unknown>): Promise<string>
export async function verifyJwt(token: string): Promise<Record<string, unknown> | null>
```

**JWT Config**:
- Algorithm: HS256
- Issuer: `stockwatch`
- Audience: `stockwatch-user`
- Expiry: 24h (configurable via `JWT_EXPIRY_HOURS` env var, default 24)
- Cookie name: `stockwatch_session`
- Cookie flags: `HttpOnly; Secure; SameSite=Strict; Path=/`

**Password Config**:
- bcrypt salt rounds: 12
- Password hash stored in `APP_PASSWORD_HASH` env var (never the plain password)
- To generate the hash: provide a one-time script `scripts/hash-password.ts` that
  reads `PLAIN_PASSWORD` from args, hashes with bcrypt, prints the hash, then exits.
  Agent must include this script.

**Acceptance Criteria**:
- [ ] comparePassword with wrong password returns false
- [ ] signJwt + verifyJwt round-trip returns original payload
- [ ] JWT signed with wrong secret → verifyJwt returns null (no throw)
- [ ] hash-password script produces a hash that comparePassword accepts

---

### Module: lib/redis.ts
**Purpose**: Typed Upstash Redis client with all key patterns and CRUD helpers.
**Dependencies**: `@upstash/redis@1.34.3`

**Key Schema**:
```
stockwatch:watchlist            → JSON.stringify(string[])          array of symbols
stockwatch:portfolio:{SYMBOL}   → JSON.stringify(PortfolioEntry)    qty + avgBuyPrice
stockwatch:notes:{SYMBOL}       → string                            plain text notes
stockwatch:price_snap:{SYMBOL}  → JSON.stringify(PriceSnapshot)     {price, timestamp, change%}
stockwatch:alerts:{SYMBOL}      → JSON.stringify(CustomAlert[])     [{threshold, direction, triggered}]
stockwatch:sector:{SYMBOL}      → string                            sector tag
```

**Exports**:
```typescript
export const redis: Redis  // Upstash client singleton

// Watchlist
export async function getWatchlist(): Promise<string[]>
export async function addToWatchlist(symbol: string): Promise<void>
export async function removeFromWatchlist(symbol: string): Promise<void>

// Portfolio
export async function getPortfolioEntry(symbol: string): Promise<PortfolioEntry | null>
export async function upsertPortfolioEntry(symbol: string, entry: PortfolioEntry): Promise<void>

// Notes
export async function getNotes(symbol: string): Promise<string>
export async function saveNotes(symbol: string, text: string): Promise<void>

// Price snapshots (for hourly comparison)
export async function getPriceSnapshot(symbol: string): Promise<PriceSnapshot | null>
export async function savePriceSnapshot(symbol: string, snap: PriceSnapshot): Promise<void>

// Custom alerts
export async function getCustomAlerts(symbol: string): Promise<CustomAlert[]>
export async function saveCustomAlerts(symbol: string, alerts: CustomAlert[]): Promise<void>

// Sector
export async function getSector(symbol: string): Promise<string>
export async function setSector(symbol: string, sector: string): Promise<void>
```

**Acceptance Criteria**:
- [ ] getWatchlist returns [] when key doesn't exist (not null/error)
- [ ] addToWatchlist is idempotent (adding same symbol twice → only one entry)
- [ ] All functions handle Redis connection errors gracefully (return null/[], log error)

---

### Module: lib/yahoo-finance.ts
**Purpose**: Wrapper around yahoo-finance2 for all stock data operations.
**Dependencies**: `yahoo-finance2@2.11.3`

**Symbol Convention**:
- NSE stocks: append `.NS` (e.g., `RELIANCE` → `RELIANCE.NS`)
- BSE stocks: append `.BO`
- Indices: `^NSEI` (Nifty 50), `^BSESN` (Sensex), `^NSEBANK` (Bank Nifty)
- The `normalizeSymbol(input: string)` function handles auto-appending `.NS` if no suffix given

**Exports**:
```typescript
export function normalizeSymbol(input: string): string
// adds .NS if no exchange suffix present

export async function getQuote(symbol: string): Promise<StockQuote>
// Returns: price, change, changePercent, volume, avgVolume, marketCap,
//          pe, eps, dividendYield, fiftyTwoWeekHigh, fiftyTwoWeekLow,
//          shortName, longName, exchange, currency

export async function getHistorical(symbol: string, period: ChartPeriod): Promise<OHLCV[]>
// period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y'
// Returns array of {time, open, high, low, close, volume}
// 'time' is Unix timestamp (seconds) for lightweight-charts

export async function searchStocks(query: string): Promise<SearchResult[]>
// Returns: [{symbol, shortname, longname, exchange, quoteType}]
// Filters to only EQUITY type results

export async function getQuoteSummaryNews(symbol: string): Promise<NewsItem[]>
// Returns: [{title, publisher, link, providerPublishTime, summary}]

export async function getMultipleQuotes(symbols: string[]): Promise<Record<string, StockQuote>>
// Batch fetch — used by cron jobs to fetch all watchlist prices in one pass
```

**Error Handling**:
- All functions catch errors from yahoo-finance2 and return null/empty array
- Log error with symbol name for debugging
- Never throw — cron jobs must continue even if one symbol fails

---

### Module: lib/notifications/telegram.ts
**Purpose**: Send messages to Telegram via Bot API — both personal chat and family group.
**Dependencies**: none (native fetch)

**Config (env vars)**:
```
TELEGRAM_BOT_TOKEN          # from @BotFather
TELEGRAM_PERSONAL_CHAT_ID   # your personal chat ID
TELEGRAM_GROUP_CHAT_ID      # family group chat ID (negative number for groups)
```

**Exports**:
```typescript
export async function sendTelegramPersonal(message: string): Promise<void>
export async function sendTelegramGroup(message: string): Promise<void>
export async function sendTelegramBoth(message: string): Promise<void>
// sendTelegramBoth fires both in parallel (Promise.allSettled)
```

**Message Formatting**:
- Use Telegram MarkdownV2 or HTML parse mode
- Format: `parse_mode: 'HTML'`
- Price increases: `<b>🟢 +2.34%</b>`
- Price decreases: `<b>🔴 -1.87%</b>`
- Alert: `⚠️ <b>ALERT</b>: TCS.NS moved <b>-5.82%</b> in last hour`

**Acceptance Criteria**:
- [ ] If TELEGRAM_GROUP_CHAT_ID not set → skip group message, still send personal
- [ ] Network errors don't throw — log and return
- [ ] Both sends run in parallel (Promise.allSettled, not sequential await)

---

### Module: lib/notifications/gmail.ts
**Purpose**: Send HTML email via nodemailer with Gmail SMTP App Password.
**Dependencies**: `nodemailer@6.x`

**Config (env vars)**:
```
GMAIL_USER          # your Gmail address (e.g., harsh@gmail.com)
GMAIL_APP_PASSWORD  # 16-char Google App Password (NOT your account password)
GMAIL_TO            # recipient (can be same as GMAIL_USER for self-email)
```

**Exports**:
```typescript
export async function sendGmail(subject: string, htmlBody: string): Promise<void>
```

**HTML Email Templates**:
- Morning open email: styled table with stock name, opening price, 52w position
- Hourly update: styled table with current price, change since open, change since last hour
- Alert email: red banner at top, prominent % change, current vs last-hour price
- EOD summary: table sorted by day performance (best to worst)
- All emails use inline CSS (no external stylesheets — email client compatibility)
- Dark color scheme: background `#0f0f0f`, text `#e5e5e5`, green `#22c55e`, red `#ef4444`

---

### Module: lib/notifications/whatsapp.ts
**Purpose**: Send WhatsApp messages via Twilio REST API (optional).
**Dependencies**: none (native fetch)

**Config (env vars)**:
```
WHATSAPP_ENABLED              # 'true' or 'false' — if false, all functions are no-ops
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM          # format: whatsapp:+14155238886 (Twilio sandbox number)
WHATSAPP_PERSONAL_TO          # format: whatsapp:+919820083781
WHATSAPP_GROUP_TO             # optional: individual family members, comma-separated
                              # e.g., whatsapp:+91XXXXXXXXXX,whatsapp:+91XXXXXXXXXX
                              # (WhatsApp Business API does not support group message blasting;
                              #  send to individual family members instead)
```

**Important Note for Agent**: Document in README that WhatsApp requires:
1. A Twilio account (twilio.com) with WhatsApp Sandbox activated OR WhatsApp Business account approved
2. Each recipient must opt-in to the Twilio sandbox (send "join <word>" to sandbox number)
3. For production: Submit WhatsApp Business account for Meta approval (takes 1–7 days)
4. Cost: ~$0.005 per message (very cheap for personal use)
5. Alternative: Use only Telegram + Gmail if WhatsApp approval is pending

**Exports**:
```typescript
export async function sendWhatsAppPersonal(message: string): Promise<void>
export async function sendWhatsAppFamily(message: string): Promise<void>
// If WHATSAPP_ENABLED !== 'true', both are silent no-ops
```

---

### Module: lib/notifications/notifier.ts
**Purpose**: Unified broadcast function — called by all cron endpoints.
**Dependencies**: telegram.ts, gmail.ts, whatsapp.ts

**Exports**:
```typescript
export type NotificationType =
  | 'MORNING_OPEN'
  | 'HOURLY_UPDATE'
  | 'PRICE_ALERT'
  | 'EOD_SUMMARY'

export async function broadcastNotification(
  type: NotificationType,
  data: MorningOpenData | HourlyUpdateData | PriceAlertData | EODSummaryData
): Promise<void>
// Composes message text/HTML for each channel from data
// Sends to: Telegram personal, Telegram group, Gmail, WhatsApp (if enabled)
// All sends run in parallel (Promise.allSettled)
// Logs success/failure per channel
```

**Message Content per Type**:

`MORNING_OPEN`:
```
🌅 Market Open — 09:15 IST — {date}
──────────────────────────────
📈 NIFTY 50: {price} ({change}%)
📈 SENSEX: {price} ({change}%)
──────────────────────────────
Your Watchlist Opening Prices:
• RELIANCE.NS — ₹2,456.30 (prev close: ₹2,441.00)
• TCS.NS      — ₹3,901.45 (prev close: ₹3,888.20)
• ...
```

`HOURLY_UPDATE`:
```
🕐 Hourly Update — {time} IST
• RELIANCE.NS — ₹2,461.80 (🟢 +0.22% since open | 🟢 +0.08% last hr)
• TCS.NS      — ₹3,889.10 (🔴 -0.31% since open | 🔴 -0.31% last hr)
```

`PRICE_ALERT`:
```
⚠️ PRICE ALERT — {time} IST
{symbol} has moved {direction}{change}% in the last hour
Current Price: ₹{current}
Last Hour Price: ₹{previous}
Change: ₹{diff}

This alert triggered because the threshold of ±5% was breached.
```

`EOD_SUMMARY`:
```
📊 Market Close — 15:30 IST — {date}
Today's Performance in Your Watchlist:

🏆 Best Performers:
  1. SYMBOL.NS  +3.45%  ₹2,501.00
  2. SYMBOL.NS  +1.22%  ₹1,234.50

💔 Worst Performers:
  1. SYMBOL.NS  -2.11%  ₹456.00
  2. SYMBOL.NS  -0.88%  ₹789.00

📦 Market Indices at Close:
  NIFTY 50:    {price} ({change}%)
  SENSEX:      {price} ({change}%)
  BANK NIFTY:  {price} ({change}%)
```

---

### Module: lib/price-alert.ts
**Purpose**: Compare current price to last stored snapshot, detect ≥5% moves.
**Dependencies**: redis.ts

**Exports**:
```typescript
export interface PriceChangeResult {
  symbol: string
  currentPrice: number
  previousPrice: number
  changePercent: number
  isAlert: boolean          // true if |changePercent| >= ALERT_THRESHOLD (default 5%)
  direction: 'up' | 'down'
}

export async function checkAndStorePrice(
  symbol: string,
  currentPrice: number
): Promise<PriceChangeResult>
// 1. Fetch previous snapshot from Redis
// 2. Calculate % change
// 3. Store new snapshot
// 4. Return result with isAlert flag

export const ALERT_THRESHOLD_PERCENT = Number(process.env.ALERT_THRESHOLD ?? '5')
```

---

### Module: lib/market.ts
**Purpose**: Market hours detection and IST datetime utilities.
**Dependencies**: `date-fns@3.x`

**Exports**:
```typescript
export function isMarketOpen(): boolean
// Returns true if current IST time is Mon-Fri, 09:15-15:30
// AND today is not an NSE trading holiday

export function getCurrentISTTime(): Date
// Returns current time as IST Date object

export function formatISTTime(date?: Date): string
// Returns "09:15 IST" formatted string

export function isWeekday(): boolean

// NSE Trading Holidays 2025-2026 (hardcoded list)
// Source: https://www.nseindia.com/national-stock-exchange/holiday-calendar
export const NSE_HOLIDAYS_2025_2026: string[]
// Array of "YYYY-MM-DD" strings for NSE trading holidays
```

**NSE Trading Holidays to hardcode (2025–2026)**:
Look up and hardcode the official NSE holiday list. Include at minimum:
Republic Day, Holi, Good Friday, Ambedkar Jayanti, Maharashtra Day,
Eid-ul-Fitr, Muharram, Independence Day, Ganesh Chaturthi, Gandhi Jayanti,
Dussehra, Diwali (Laxmi Puja), Diwali Balipratipada, Gurunanak Jayanti,
Christmas. Exact dates vary year to year — fetch from NSE website during build.

---

### Module: API Routes — /api/auth/login/route.ts
**Purpose**: Validate password, issue JWT cookie.
**Runtime**: Node.js serverless function
**Dependencies**: lib/auth.ts, @upstash/ratelimit

**Rate Limiting**:
```typescript
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'ratelimit:login',
})
// Key by IP: request.headers.get('x-forwarded-for') ?? 'unknown'
// If limit exceeded → return 429 JSON { error: 'Too many attempts. Wait 15 minutes.' }
```

**Logic**:
```
POST /api/auth/login
Body: { password: string }

1. Rate limit check by IP
2. Get APP_PASSWORD_HASH from process.env
3. comparePassword(body.password, APP_PASSWORD_HASH)
4. If false → 401 { error: 'Invalid password' }  (same error for all failures — no info leak)
5. If true → signJwt({ sub: 'admin', iat: Date.now() })
6. Set cookie: stockwatch_session={token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
7. Return 200 { success: true }
```

**Response on failure**: Always `{ error: 'Invalid password' }` — never reveal whether
the account exists, never reveal the hash, never reveal rate limit count until 429.

---

### Module: API Routes — /api/cron/* 
**Purpose**: Scheduled jobs called by Upstash QStash.

**Security Pattern (apply to ALL three cron routes)**:
```typescript
// Every cron route must start with:
const cronSecret = process.env.CRON_SECRET
const authHeader = request.headers.get('authorization')
if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

#### morning-open/route.ts
```
POST /api/cron/morning-open
Schedule (QStash): 45 3 * * 1-5 (UTC) = 09:15 IST Mon-Fri

1. Check isMarketOpen() (skip if NSE holiday)
2. getWatchlist() from Redis
3. getMultipleQuotes(watchlist) — fetch all opening prices
4. getQuote('^NSEI') + getQuote('^BSESN') — index prices
5. For each stock, savePriceSnapshot(symbol, {price, timestamp})
6. broadcastNotification('MORNING_OPEN', data)
7. Return 200 { sent: true, count: watchlist.length }
```

#### hourly-update/route.ts
```
POST /api/cron/hourly-update
Schedule (QStash): 30 4,5,6,7,8,9 * * 1-5 (UTC) = 10:00,11:00,12:00,13:00,14:00,15:00 IST

1. Check isMarketOpen()
2. getWatchlist() from Redis
3. getMultipleQuotes(watchlist)
4. For each symbol:
   a. checkAndStorePrice(symbol, currentPrice)
   b. If result.isAlert → broadcastNotification('PRICE_ALERT', alertData) IMMEDIATELY
5. broadcastNotification('HOURLY_UPDATE', allPricesData) — regular digest
6. Return 200 { alerts: alertCount, total: watchlist.length }
```

#### eod-summary/route.ts
```
POST /api/cron/eod-summary
Schedule (QStash): 5 10 * * 1-5 (UTC) = 15:35 IST Mon-Fri

1. Check isWeekday() + not NSE holiday
2. getWatchlist()
3. getMultipleQuotes(watchlist)
4. Calculate day performance (current vs morning snapshot in Redis)
5. Sort: best performers, worst performers
6. getQuote for indices
7. broadcastNotification('EOD_SUMMARY', data)
8. Clear all price snapshots for the day (optional, they expire via TTL)
```

---

### Module: UI — StockChart.tsx
**Purpose**: Render interactive OHLCV chart using lightweight-charts.
**Import**: `dynamic(() => import('./StockChartInner'), { ssr: false })`
(lightweight-charts uses `window` — must be client-side only)

**Chart Types**:
- Default: `AreaSeries` for clean line view
- Toggle: `CandlestickSeries` for OHLC view
- Volume bars as histogram at bottom (separate pane)

**Timeframe options**: 1D, 5D, 1M, 3M, 6M, 1Y, 5Y
- Each change triggers re-fetch from `/api/stocks/[symbol]/chart?period=X`

**Styling**:
- Background: `#0a0a0a` (matches app dark theme)
- Grid: `#1a1a1a`
- Up candle: `#22c55e` (Tailwind green-500)
- Down candle: `#ef4444` (Tailwind red-500)
- Crosshair: `#525252`
- Axis text: `#a3a3a3`

---

### Module: UI — StockCard.tsx
**Purpose**: Tile in the watchlist grid showing key stock data at a glance.

**Layout**:
```
┌─────────────────────────────────────────┐
│ TCS.NS          NSE    [Remove] [View]  │
│ Tata Consultancy Services               │
│                                         │
│ ₹3,901.45      ▲ +0.34%  ▲ +13.20      │
│                                         │
│ [sparkline 80×30px]                     │
│                                         │
│ Vol: 1.2M  52w: ████▓░░░░░ 78%         │
└─────────────────────────────────────────┘
```

**52-week position bar**: Visual progress bar from 52w low to 52w high,
with a marker showing where current price sits. Shows percentage:
`(current - low) / (high - low) * 100`

**Polling**: useStockPrice hook polls every 60 seconds. During non-market
hours, poll every 300 seconds (5 min) for prev close data.

---

### Module: UI — Dashboard Page
**Purpose**: Main watchlist view with grid of StockCards + controls.

**Features**:
- Add Stock button → opens AddStockModal with search
- View toggle: Grid (default) | Sector Groups
- Sort controls: A-Z, Price Change %, Volume, 52w Position
- PerformanceBoard (top 3 gainers + losers) shown above grid
- MarketStatusBar (Nifty50, Sensex, BankNifty) always visible at top
- Market status indicator: `🟢 Market Open` / `🔴 Market Closed`

**Empty state**: When watchlist is empty, show:
"Your watchlist is empty. Search for NSE/BSE stocks to add them."
with a prominent Add Stock button.

---

## §6 DATA MODELS & SCHEMAS

```typescript
// src/types/index.ts — define ALL of these

export interface StockQuote {
  symbol: string
  shortName: string
  longName: string
  exchange: string            // 'NSE' | 'BSE' etc.
  currency: string            // 'INR'
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  averageDailyVolume3Month: number
  marketCap: number
  trailingPE: number | null
  trailingEps: number | null
  dividendYield: number | null
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  previousClose: number
  regularMarketOpen: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
}

export interface OHLCV {
  time: number               // Unix timestamp in seconds (lightweight-charts format)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface SearchResult {
  symbol: string             // e.g., "RELIANCE.NS"
  shortname: string          // e.g., "Reliance Industries Limited"
  longname: string
  exchange: string
  quoteType: string          // filter to 'EQUITY' only
}

export interface PriceSnapshot {
  price: number
  timestamp: number          // Unix ms
  changePercentSinceOpen: number
}

export interface PortfolioEntry {
  symbol: string
  qty: number
  avgBuyPrice: number
  // computed client-side:
  // currentPrice — from StockQuote
  // currentValue = qty * currentPrice
  // investedValue = qty * avgBuyPrice
  // pnl = currentValue - investedValue
  // pnlPercent = (pnl / investedValue) * 100
}

export interface CustomAlert {
  id: string                 // nanoid
  threshold: number          // e.g., 3400.00
  direction: 'above' | 'below'
  triggered: boolean
  createdAt: number
}

export interface NewsItem {
  title: string
  publisher: string
  link: string
  providerPublishTime: number
  summary?: string
}

export type ChartPeriod = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y'
export type NotificationType = 'MORNING_OPEN' | 'HOURLY_UPDATE' | 'PRICE_ALERT' | 'EOD_SUMMARY'

export interface MorningOpenData {
  date: string
  nifty: StockQuote
  sensex: StockQuote
  stocks: Array<{ quote: StockQuote; prevClose: number }>
}

export interface HourlyUpdateData {
  time: string
  stocks: Array<{ symbol: string; price: number; changeFromOpen: number; changeFromLastHour: number }>
}

export interface PriceAlertData {
  symbol: string
  shortName: string
  currentPrice: number
  previousPrice: number
  changePercent: number
  direction: 'up' | 'down'
  time: string
}

export interface EODSummaryData {
  date: string
  nifty: StockQuote
  sensex: StockQuote
  bankNifty: StockQuote
  performers: Array<{
    symbol: string
    shortName: string
    price: number
    dayChangePercent: number
  }>
}
```

---

## §7 API CONTRACTS

All API routes return `Content-Type: application/json`.
All protected routes return `401 { error: 'Unauthorized' }` if session is invalid
(this is handled by middleware, not individual routes, but double-check in routes too).

```
POST /api/auth/login
  Body:     { password: string }
  200:      { success: true }
  401:      { error: 'Invalid password' }
  429:      { error: 'Too many attempts. Wait 15 minutes.' }

POST /api/auth/logout
  200:      { success: true }  + clears cookie

GET /api/auth/check
  200:      { authenticated: true }
  401:      { authenticated: false }

GET /api/watchlist
  200:      { symbols: string[] }

POST /api/watchlist
  Body:     { symbol: string }              e.g. "RELIANCE.NS"
  200:      { symbol: string, added: true }
  400:      { error: 'Symbol required' }
  409:      { error: 'Already in watchlist' }

DELETE /api/watchlist/[symbol]
  200:      { symbol: string, removed: true }
  404:      { error: 'Not in watchlist' }

GET /api/stocks/search?q={query}
  200:      { results: SearchResult[] }     max 8 results, EQUITY only

GET /api/stocks/[symbol]
  200:      StockQuote
  404:      { error: 'Symbol not found' }

GET /api/stocks/[symbol]/chart?period={period}
  period:   '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y'
  200:      { symbol: string, period: string, data: OHLCV[] }

GET /api/portfolio/[symbol]
  200:      PortfolioEntry | null

POST /api/portfolio/[symbol]
  Body:     { qty: number, avgBuyPrice: number }
  200:      { success: true, entry: PortfolioEntry }

GET /api/notes/[symbol]
  200:      { symbol: string, notes: string }

PUT /api/notes/[symbol]
  Body:     { notes: string }
  200:      { success: true }

GET /api/alerts/[symbol]
  200:      { symbol: string, alerts: CustomAlert[] }

POST /api/alerts/[symbol]
  Body:     { threshold: number, direction: 'above' | 'below' }
  200:      { success: true, alert: CustomAlert }

DELETE /api/alerts/[symbol]?id={alertId}
  200:      { success: true }

POST /api/cron/morning-open
  Header:   Authorization: Bearer {CRON_SECRET}
  200:      { sent: true, count: number }
  401:      { error: 'Unauthorized' }

POST /api/cron/hourly-update
  Header:   Authorization: Bearer {CRON_SECRET}
  200:      { alerts: number, total: number }

POST /api/cron/eod-summary
  Header:   Authorization: Bearer {CRON_SECRET}
  200:      { sent: true }
```

---

## §8 CONFIGURATION SYSTEM

### .env.example (copy to .env.local for development)
```bash
# ═══════════════════════════════════════════
# AUTH — REQUIRED
# ═══════════════════════════════════════════

# Run: npx ts-node scripts/hash-password.ts <yourpassword>
# Paste the output hash here
APP_PASSWORD_HASH=

# Random 64-char hex string: openssl rand -hex 32
JWT_SECRET=

# Session duration in hours (default 24)
JWT_EXPIRY_HOURS=24

# ═══════════════════════════════════════════
# DATABASE (Upstash Redis) — REQUIRED
# ═══════════════════════════════════════════
# From https://console.upstash.com/ → Create Database → REST API tab

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ═══════════════════════════════════════════
# CRON SECURITY — REQUIRED
# ═══════════════════════════════════════════
# Random secret that QStash will include in its Bearer header
# Generate: openssl rand -hex 32
CRON_SECRET=

# ═══════════════════════════════════════════
# UPSTASH QSTASH (Scheduler) — REQUIRED for cron
# ═══════════════════════════════════════════
# From https://console.upstash.com/ → QStash → API Keys

QSTASH_TOKEN=
# The URL of your deployed Vercel app (used to schedule cron calls)
APP_URL=https://yourapp.vercel.app

# ═══════════════════════════════════════════
# ALERT SETTINGS — OPTIONAL (defaults shown)
# ═══════════════════════════════════════════
ALERT_THRESHOLD=5            # percent change to trigger alert (default 5)

# ═══════════════════════════════════════════
# TELEGRAM — REQUIRED for Telegram notifications
# ═══════════════════════════════════════════
# Create bot: message @BotFather on Telegram
# Get chat ID: message @userinfobot or @getidsbot

TELEGRAM_BOT_TOKEN=
TELEGRAM_PERSONAL_CHAT_ID=
TELEGRAM_GROUP_CHAT_ID=      # optional: family group (negative number for groups)

# ═══════════════════════════════════════════
# GMAIL — REQUIRED for email notifications
# ═══════════════════════════════════════════
# Use Gmail App Password (not your Gmail password)
# Enable at: myaccount.google.com/apppasswords (requires 2FA)

GMAIL_USER=
GMAIL_APP_PASSWORD=
GMAIL_TO=

# ═══════════════════════════════════════════
# WHATSAPP (Twilio) — OPTIONAL
# ═══════════════════════════════════════════
WHATSAPP_ENABLED=false       # set to 'true' once Twilio is configured

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_PERSONAL_TO=whatsapp:+91XXXXXXXXXX
# Comma-separated for family members (no group message support via API):
WHATSAPP_FAMILY_TO=whatsapp:+91XXXXXXXXXX,whatsapp:+91XXXXXXXXXX
```

### next.config.ts
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval'",  // Next.js needs unsafe-eval in dev
            "style-src 'self' 'unsafe-inline'",  // Tailwind inline styles
            "img-src 'self' data: https:",
            "connect-src 'self' https://*.upstash.io",
            "font-src 'self'",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    },
  ],
}

export default nextConfig
```

### vercel.json
```json
{
  "functions": {
    "src/app/api/**/*": {
      "maxDuration": 30
    }
  }
}
```
> Note: Cron scheduling is handled by Upstash QStash, NOT vercel.json crons.
> QStash schedule is set up once via a setup script (see §10 BUILD & RUN COMMANDS).

---

## §9 DESIGN SYSTEM

**Theme**: Dark-only. No light mode. Bloomberg-terminal aesthetic.

**Color palette** (add to tailwind.config.ts):
```typescript
colors: {
  background: {
    primary:   '#0a0a0a',    // page background
    card:      '#111111',    // stock cards, panels
    elevated:  '#1a1a1a',    // modals, dropdowns
    border:    '#262626',    // borders
  },
  text: {
    primary:   '#f5f5f5',
    secondary: '#a3a3a3',
    muted:     '#525252',
  },
  market: {
    up:        '#22c55e',    // green-500
    upBg:      '#052e16',    // green-950
    down:      '#ef4444',    // red-500
    downBg:    '#450a0a',    // red-950
    neutral:   '#a3a3a3',
  },
  accent:      '#3b82f6',    // blue-500 — buttons, active states
}
```

**Font**: Geist Mono for prices and symbols; Geist Sans for everything else.
Import from `next/font/google` (or use `@vercel/next` fonts).

**Spacing**: 4px base unit. Cards: `p-4`, gaps: `gap-4`, border-radius: `rounded-lg`.

---

## §10 TESTING REQUIREMENTS

Write a test suite using Node.js built-in `node:test` (no external test framework):

**File**: `src/__tests__/auth.test.ts`
- hashPassword + comparePassword round-trip
- Wrong password returns false
- signJwt + verifyJwt round-trip
- Tampered token returns null

**File**: `src/__tests__/price-alert.test.ts`
- 6% increase → isAlert: true
- 4.9% increase → isAlert: false
- 5% exactly → isAlert: true
- Negative change → direction: 'down'

**File**: `src/__tests__/market.test.ts`
- isMarketOpen() returns false on a Sunday
- isMarketOpen() returns false before 09:15 IST
- isMarketOpen() returns false after 15:30 IST
- isMarketOpen() returns false on NSE holiday

**File**: `src/__tests__/format.test.ts`
- formatINR(2456.3) → '₹2,456.30'
- formatPercent(3.456) → '+3.46%'
- formatPercent(-1.2) → '-1.20%'

---

## §11 BUILD & RUN COMMANDS

### First-time setup
```bash
# 1. Install dependencies
npm install

# 2. Generate password hash
npx ts-node scripts/hash-password.ts <yourpassword>
# Copy the output into APP_PASSWORD_HASH in .env.local

# 3. Copy env
cp .env.example .env.local
# Fill in all required values

# 4. Development server
npm run dev

# 5. Type check
npm run type-check   # "tsc --noEmit"

# 6. Lint
npm run lint

# 7. Test
npm run test         # "node --experimental-vm-modules node:test src/__tests__/**/*.test.ts"
```

### Deploying to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set all environment variables in Vercel dashboard:
# Project Settings → Environment Variables
# Add EVERY variable from .env.example
# Set for: Production + Preview + Development

# After first deploy, set up QStash schedules:
# (this script reads APP_URL and QSTASH_TOKEN from environment)
npm run setup-cron
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "node --experimental-vm-modules --require ts-node/register node:test src/__tests__/**/*.test.ts",
    "setup-cron": "npx ts-node scripts/setup-qstash.ts"
  }
}
```

### scripts/hash-password.ts
```typescript
// Run: npx ts-node scripts/hash-password.ts <password>
import bcryptjs from 'bcryptjs'
const password = process.argv[2]
if (!password) { console.error('Usage: npx ts-node scripts/hash-password.ts <password>'); process.exit(1) }
bcryptjs.hash(password, 12).then(hash => { console.log('\nPaste this into APP_PASSWORD_HASH:\n'); console.log(hash) })
```

### scripts/setup-qstash.ts
```typescript
// Registers all 3 cron schedules with Upstash QStash
// Run ONCE after first deploy, then whenever APP_URL changes
// QStash will call these endpoints with Bearer CRON_SECRET header

const APP_URL = process.env.APP_URL!
const QSTASH_TOKEN = process.env.QSTASH_TOKEN!

const schedules = [
  // 09:15 IST Mon-Fri = 03:45 UTC
  { path: '/api/cron/morning-open', cron: '45 3 * * 1-5', name: 'Morning Open' },
  // 10:00-15:00 IST Mon-Fri = 04:30-09:30 UTC (at :30 of each hour)
  { path: '/api/cron/hourly-update', cron: '30 4-9 * * 1-5', name: 'Hourly Update' },
  // 15:35 IST Mon-Fri = 10:05 UTC
  { path: '/api/cron/eod-summary', cron: '5 10 * * 1-5', name: 'EOD Summary' },
]

async function createSchedule(path: string, cron: string, name: string) {
  const res = await fetch('https://qstash.upstash.io/v2/schedules', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destination: `${APP_URL}${path}`,
      cron,
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    }),
  })
  const data = await res.json()
  console.log(`✅ ${name}: ${cron}`, data)
}

Promise.all(schedules.map(s => createSchedule(s.path, s.cron, s.name)))
  .then(() => console.log('\nAll QStash schedules registered.'))
  .catch(console.error)
```

---

## §12 ACCEPTANCE CRITERIA

**Authentication & Security**
- [ ] Visiting any page without login redirects to /login
- [ ] `curl https://app.vercel.app/dashboard` without cookie → 302 /login (or 401 for API)
- [ ] `curl https://app.vercel.app/api/watchlist` → `{"error":"Unauthorized"}` 401
- [ ] `curl https://app.vercel.app/api/cron/morning-open` → 401 (no Bearer header)
- [ ] Login with wrong password → 401, same message regardless of attempt
- [ ] 6th login attempt in 15 min → 429 rate limit response
- [ ] JWT cookie is HttpOnly (not readable by JavaScript)
- [ ] JWT cookie is SameSite=Strict (CSRF protection)
- [ ] All X-Frame, CSP, X-Content-Type headers present in every response

**Watchlist**
- [ ] Can add NSE stock by typing name or symbol (e.g., "Reliance", "RELIANCE.NS")
- [ ] Can add BSE stock with .BO suffix
- [ ] Can remove any stock
- [ ] Adding same symbol twice → shows "Already in watchlist" toast, no duplicate
- [ ] Watchlist persists across browser sessions (stored in Redis, not localStorage)
- [ ] Empty watchlist shows correct empty state

**Stock Data & Charts**
- [ ] Each StockCard shows: current price, day change %, volume, 52w bar
- [ ] Prices auto-refresh every 60s during market hours
- [ ] Stock detail page shows full lightweight-charts with candlestick/area toggle
- [ ] All timeframes (1D to 5Y) load correctly
- [ ] Portfolio panel shows P&L with correct math (qty × (current − avg) = P&L)
- [ ] 52-week position bar renders at correct percentage

**Notifications**
- [ ] Telegram personal message sends successfully on morning open cron
- [ ] Telegram group message sends to family group chat
- [ ] Gmail arrives with correctly formatted HTML
- [ ] Hourly update sends to all channels each hour during market
- [ ] Stock that moves ≥5% in an hour → immediate PRICE_ALERT notification (before regular digest)
- [ ] Stock that moves 4.9% → no alert, only regular hourly update
- [ ] EOD summary sends after market close with performance ranking

**Cron Security**
- [ ] Cron endpoints return 401 without correct CRON_SECRET header
- [ ] QStash setup script registers all 3 schedules

**General**
- [ ] `next build` completes without errors
- [ ] `npm run type-check` passes with 0 errors
- [ ] `npm run test` passes all test suites
- [ ] Deployed Vercel URL loads dashboard after login within 2 seconds

---

## §13 FEATURE EXPANSION (implement after core, in order)

These are bonus features to add after all §12 criteria pass:

1. **Portfolio P&L Dashboard** — Overall invested value, current value, total P&L in ₹ and % at top of dashboard
2. **Custom Price Alerts** — Per-stock threshold alerts (e.g., "alert me when TCS crosses ₹4,000") stored in Redis, checked in hourly cron
3. **Volume Spike Detection** — In hourly cron: if volume > 2× average daily volume, include a 🔥 spike warning in the notification
4. **Weekly Summary** — Add a 4th QStash schedule: every Friday at 15:35 IST → send weekly performance digest (% change for each stock over the week)
5. **Nifty 50 Constituent Membership** — Flag which of your stocks are Nifty 50 constituents
6. **Export to CSV** — `/api/export` endpoint → returns CSV of watchlist with latest prices, P&L, sector
7. **News Feed** — StockNewsPanel on each stock's detail page (already in file tree — implement content)
8. **Sector Auto-tagging** — On add stock, fetch `quoteSummary().assetProfile.sector` from Yahoo Finance, auto-set sector in Redis
9. **Dark/Light Mode Toggle** — Add to Navbar, persist preference to localStorage
10. **PWA Support** — Add `manifest.json` and service worker so it installs as a home screen app

---

## §14 README CONTENT REQUIREMENTS

The `README.md` must include these sections (in order):

1. **What is StockWatch** — 2-sentence description
2. **Features** — bullet list
3. **Stack** — table: Layer | Technology
4. **Prerequisites** — Node.js 20+, Upstash account, Telegram bot, Gmail App Password, optional Twilio
5. **First-Time Setup** — numbered steps: clone → install → hash password → fill .env.local → npm run dev
6. **Environment Variables Reference** — table: Variable | Required | Description
7. **Setting Up Telegram Bot** — numbered steps: @BotFather → /newbot → get token → get chat ID
8. **Setting Up Gmail** — numbered steps: enable 2FA → App Passwords → select Mail → copy 16-char password
9. **Setting Up WhatsApp (Optional)** — Twilio signup → sandbox → opt-in URL
10. **Deploying to Vercel** — numbered steps: vercel --prod → set env vars in dashboard → npm run setup-cron
11. **Cron Schedule Reference** — table: Job | Schedule (IST) | Purpose
12. **Adding Stocks** — how NSE `.NS` and BSE `.BO` suffixes work, how to search
13. **Security Notes** — what protections are in place (middleware, rate limit, CORS, CSP, cron secret)

---

## §15 AGENT EXECUTION ORDER

Build in this exact order. Do not skip ahead.

```
Step 1:  package.json + tsconfig.json + tailwind.config.ts + postcss.config.js
Step 2:  .gitignore + .env.example
Step 3:  src/types/index.ts — ALL types first, everything imports from here
Step 4:  lib/auth.ts + scripts/hash-password.ts
Step 5:  lib/redis.ts
Step 6:  lib/market.ts (with NSE holiday list for 2025-2026)
Step 7:  lib/yahoo-finance.ts
Step 8:  lib/format.ts + lib/constants.ts + lib/price-alert.ts
Step 9:  lib/notifications/telegram.ts + gmail.ts + whatsapp.ts + notifier.ts
Step 10: middleware.ts — auth guard (validates entire app after this)
Step 11: next.config.ts + vercel.json
Step 12: src/app/layout.tsx + globals.css + page.tsx
Step 13: src/app/login/page.tsx + src/components/auth/LoginForm.tsx
Step 14: API routes: /api/auth/login + /api/auth/logout + /api/auth/check
Step 15: API routes: /api/watchlist + /api/watchlist/[symbol]
Step 16: API routes: /api/stocks/search + /api/stocks/[symbol] + /api/stocks/[symbol]/chart
Step 17: API routes: /api/portfolio + /api/notes + /api/alerts
Step 18: API routes: /api/cron/morning-open + /api/cron/hourly-update + /api/cron/eod-summary
Step 19: src/hooks/ — all 4 SWR hooks
Step 20: src/components/ui/ — Button, Input, Badge, Modal, Skeleton, Spinner, Tooltip
Step 21: src/components/layout/ — Navbar + MarketStatusBar
Step 22: src/components/dashboard/ — all 6 components including MiniSparkline
Step 23: src/components/stock/ — all 7 components including StockChart (with dynamic import)
Step 24: src/app/dashboard/page.tsx + loading.tsx
Step 25: src/app/stock/[symbol]/page.tsx + loading.tsx
Step 26: scripts/setup-qstash.ts
Step 27: src/__tests__/ — all 4 test files
Step 28: README.md
Step 29: Run: npm run type-check → fix all errors before finishing
Step 30: Run: npm run build → fix all build errors before finishing
```

**Do not deliver the project until `npm run build` succeeds with zero errors.**

---

*End of AGENTS.md — StockWatch*
