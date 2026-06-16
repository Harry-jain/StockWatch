import { NextRequest, NextResponse } from 'next/server'
import { INDEX_SYMBOLS } from '@/lib/constants'
import { formatISTDate, isMarketOpen } from '@/lib/market'
import { broadcastNotification } from '@/lib/notifications/notifier'
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

export async function POST(request: NextRequest) {
  const unauthorized = verifyCron(request)
  if (unauthorized) return unauthorized
  if (!isMarketOpen()) return NextResponse.json({ sent: false, count: 0, skipped: 'Market closed' })

  const watchlist = await getWatchlist()
  const quotes = await getMultipleQuotes([INDEX_SYMBOLS.nifty, INDEX_SYMBOLS.sensex, ...watchlist])
  const watchlistQuotes = watchlist.map((symbol) => quotes[symbol]).filter(Boolean)

  await broadcastNotification('MORNING_OPEN', {
    date: formatISTDate(),
    nifty: quotes[INDEX_SYMBOLS.nifty] ?? null,
    sensex: quotes[INDEX_SYMBOLS.sensex] ?? null,
    watchlist: watchlistQuotes,
  })

  return NextResponse.json({ sent: true, count: watchlistQuotes.length })
}
