# StockWatch

StockWatch is a private Next.js dashboard for tracking NSE/BSE watchlists, prices, charts, portfolio notes, and alerts. It is built for one password-protected owner and blocks unauthenticated access at the Edge.

## Features

- Private password login with HttpOnly JWT session cookie
- NSE/BSE symbol search using Yahoo Finance, with `.NS` and `.BO` suffix support
- Watchlist dashboard with live quote polling, index strip, sparklines, and stock cards
- Stock detail pages with chart timeframes, metrics, portfolio P&L, alerts, notes, and news
- Cron endpoints for market open, hourly updates, 5% movement alerts, and end-of-day summaries
- Notifications through Telegram, Gmail, and optional Twilio WhatsApp
- Upstash Redis persistence for watchlist, snapshots, portfolio, notes, and alerts

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS |
| Market data | yahoo-finance2, no API key |
| Storage | Upstash Redis free tier |
| Scheduler | Upstash QStash free tier |
| Auth | jose, bcryptjs, Upstash Ratelimit |
| Charts | lightweight-charts |
| Notifications | Telegram Bot API, Gmail SMTP, optional Twilio WhatsApp |

## Prerequisites

- Node.js 20+
- Upstash account for Redis and QStash free tiers
- Telegram bot token from BotFather
- Gmail account with 2FA and an App Password
- Optional Twilio account for WhatsApp Sandbox or WhatsApp Business

## First-Time Setup & Installation

1. Clone the repository and enter the directory:
   ```bash
   cd StockWatch
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Generate a secure bcrypt password hash for authentication:
   ```bash
   npx ts-node scripts/hash-password.ts "yourpassword"
   ```
   *(Copy the generated hash output and paste it into `APP_PASSWORD_HASH` inside your `.env.local`)*
4. Copy the environment template to create your local configuration:
   ```bash
   cp .env.example .env.local
   ```
   *(Open `.env.local` and fill in your Upstash Redis, QStash, Telegram, and Gmail credentials)*

## Running the Application

Use the following commands in your terminal depending on your task:

### 🚀 Running Locally
* **Development Mode** (starts local server with hot-reloading):
  ```bash
  npm run dev
  ```
  Open [http://localhost:3000](http://localhost:3000) in your browser.

* **Production Mode** (compiles, builds, and launches the optimized bundle):
  ```bash
  npm run build
  npm start
  ```

### 🧪 Code Verification & Testing
* **Run Test Suite** (runs authentication, formatting, and alert tests):
  ```bash
  npm test
  ```
* **Run Linter** (verifies code formatting and quality standards):
  ```bash
  npm run lint
  ```
* **Run Type Check** (verifies strict TypeScript types):
  ```bash
  npm run type-check
  ```

## Environment Variables Reference

| Variable | Required | Description |
| --- | --- | --- |
| `APP_PASSWORD_HASH` | Yes | bcrypt hash for the single app password |
| `JWT_SECRET` | Yes | 64-char random secret for JWT signing |
| `JWT_EXPIRY_HOURS` | No | Session length, defaults to 24 |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |
| `CRON_SECRET` | Yes | Bearer token required by cron endpoints |
| `QSTASH_TOKEN` | Yes | Upstash QStash token for scheduling |
| `APP_URL` | Yes | Deployed Vercel URL |
| `ALERT_THRESHOLD` | No | Hourly movement threshold, default 5 |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram bot token |
| `TELEGRAM_PERSONAL_CHAT_ID` | Yes | Personal Telegram chat ID |
| `TELEGRAM_GROUP_CHAT_ID` | No | Family group chat ID |
| `GMAIL_USER` | Yes | Gmail sender account |
| `GMAIL_APP_PASSWORD` | Yes | Gmail 16-character app password |
| `GMAIL_TO` | Yes | Notification recipient |
| `WHATSAPP_ENABLED` | No | Set `true` only after Twilio is configured |
| `TWILIO_ACCOUNT_SID` | WhatsApp only | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | WhatsApp only | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | WhatsApp only | Twilio WhatsApp sender |
| `WHATSAPP_PERSONAL_TO` | WhatsApp only | Personal WhatsApp recipient |
| `WHATSAPP_FAMILY_TO` | WhatsApp only | Comma-separated family recipients |

## Setting Up Telegram Bot

1. Message `@BotFather` on Telegram.
2. Run `/newbot`, choose a name, and copy the token.
3. Message your bot once.
4. Get your chat ID using `@userinfobot` or `@getidsbot`.
5. For family alerts, add the bot to the group and get the negative group chat ID.

## Setting Up Gmail

1. Enable 2FA on your Google account.
2. Visit Google App Passwords.
3. Choose Mail and generate a 16-character password.
4. Use that password in `GMAIL_APP_PASSWORD`, not your normal account password.

## Setting Up WhatsApp (Optional)

1. Create a Twilio account.
2. Activate the WhatsApp Sandbox or use an approved WhatsApp Business account.
3. Each recipient must opt in to the sandbox by sending the join phrase to Twilio.
4. Production WhatsApp requires Meta approval and can take 1-7 days.
5. Keep `WHATSAPP_ENABLED=false` until it is ready; Telegram and Gmail work without it.

## Deploying to Vercel

1. Deploy: `vercel --prod`
2. Add every required environment variable in Vercel Project Settings.
3. Set variables for Production, Preview, and Development as needed.
4. After the first deploy, run `npm run setup-cron` with `APP_URL`, `QSTASH_TOKEN`, and `CRON_SECRET` loaded.

## Cron Schedule Reference

| Job | Schedule (IST) | Purpose |
| --- | --- | --- |
| Morning Open | 09:15 Mon-Fri | Opening prices and indices |
| Hourly Update | 10:00-15:00 Mon-Fri | Hourly digest and 5% alerts |
| EOD Summary | 15:35 Mon-Fri | End-of-day performance ranking |

## Adding Stocks

Search by company name or symbol. NSE symbols use `.NS` such as `RELIANCE.NS`; BSE symbols use `.BO` such as `500325.BO`. If no suffix is provided, StockWatch assumes NSE and appends `.NS`.

## Security Notes

All non-public routes are guarded by `middleware.ts` before application code runs. Protected API routes return JSON `401`, browser pages redirect to `/login`, login attempts are rate-limited, cron endpoints require `Authorization: Bearer <CRON_SECRET>`, cookies are HttpOnly and SameSite Strict, and security headers are set globally.
