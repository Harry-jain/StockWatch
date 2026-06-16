import { NextRequest, NextResponse } from 'next/server'
import { formatISTTime, isMarketOpen } from '@/lib/market'
import { broadcastNotification } from '@/lib/notifications/notifier'
import { checkAndStorePrice, checkCustomAlerts } from '@/lib/price-alert'
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
  if (!isMarketOpen()) return NextResponse.json({ alerts: 0, total: 0, skipped: 'Market closed' })

  const watchlist = await getWatchlist()
  const quotes = await getMultipleQuotes(watchlist)
  const time = formatISTTime()
  let alerts = 0

  const hourlyRows = []
  for (const symbol of watchlist) {
    const quote = quotes[symbol]
    if (!quote) continue
    
    // Evaluate standard 5% movement alert
    const result = await checkAndStorePrice(symbol, quote.price)
    if (result.isAlert) {
      alerts += 1
      await broadcastNotification('PRICE_ALERT', {
        symbol,
        shortName: quote.shortName,
        currentPrice: result.currentPrice,
        previousPrice: result.previousPrice,
        changePercent: result.changePercent,
        direction: result.direction,
        time,
      })
    }

    // Evaluate custom threshold alerts
    const triggeredCustom = await checkCustomAlerts(symbol, quote.price)
    for (const customAlert of triggeredCustom) {
      alerts += 1
      await broadcastNotification('CUSTOM_ALERT', {
        symbol,
        shortName: quote.shortName,
        currentPrice: quote.price,
        threshold: customAlert.threshold,
        direction: customAlert.direction,
        time,
      })
    }

    hourlyRows.push({
      symbol,
      shortName: quote.shortName,
      price: quote.price,
      changeFromOpen: quote.open ? ((quote.price - quote.open) / quote.open) * 100 : quote.changePercent,
      changeFromLastHour: result.changePercent,
    })
  }

  if (hourlyRows.length) {
    await broadcastNotification('HOURLY_UPDATE', { time, quotes: hourlyRows })
  }

  return NextResponse.json({ alerts, total: hourlyRows.length })
}
