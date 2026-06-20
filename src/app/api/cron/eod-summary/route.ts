export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { INDEX_SYMBOLS } from '@/lib/constants'
import { formatISTDate, formatISTTime, isWeekday, NSE_HOLIDAYS_2025_2026 } from '@/lib/market'
import { broadcastNotification } from '@/lib/notifications/notifier'
import { computePortfolioSummary } from '@/lib/portfolio'
import { getWatchlist } from '@/lib/redis'
import { getMultipleQuotes } from '@/lib/yahoo-finance'

function verifyCron(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

function todayIST(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

export async function POST(request: NextRequest) {
  const unauthorized = verifyCron(request)
  if (unauthorized) return unauthorized

  // EOD always fires after market close by design (15:35 IST), so we only
  // treat weekend/holiday as "closed" here -- not the time-of-day check
  // that morning-open/hourly-update use.
  const isHoliday = NSE_HOLIDAYS_2025_2026.includes(todayIST())
  if (!isWeekday() || isHoliday) {
    await broadcastNotification('MARKET_CLOSED', {
      job: 'EOD Summary',
      reason: isHoliday ? 'holiday' : 'weekend',
      time: formatISTTime(),
      date: formatISTDate(),
    })
    return NextResponse.json({ sent: true, skipped: isHoliday ? 'holiday' : 'weekend' })
  }

  const watchlist = await getWatchlist()
  const [quotes, portfolio] = await Promise.all([
    getMultipleQuotes([INDEX_SYMBOLS.nifty, INDEX_SYMBOLS.sensex, INDEX_SYMBOLS.bankNifty, ...watchlist]),
    computePortfolioSummary(),
  ])
  const performers = watchlist
    .map((symbol) => quotes[symbol])
    .filter(Boolean)
    .map((quote) => ({
      symbol: quote.symbol,
      shortName: quote.shortName,
      price: quote.price,
      dayChangePercent: quote.changePercent,
    }))

  await broadcastNotification('EOD_SUMMARY', {
    date: formatISTDate(),
    nifty: quotes[INDEX_SYMBOLS.nifty] ?? null,
    sensex: quotes[INDEX_SYMBOLS.sensex] ?? null,
    bankNifty: quotes[INDEX_SYMBOLS.bankNifty] ?? null,
    portfolio: portfolio.holdings.length > 0 ? portfolio : undefined,
    performers,
  })

  return NextResponse.json({ sent: true })
}
