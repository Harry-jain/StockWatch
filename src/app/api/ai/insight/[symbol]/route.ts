export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getStockInsight } from '@/lib/ai'
import { withinRateLimit } from '@/lib/ratelimit'
import { isValidSymbol } from '@/lib/validate'
import { getNotes, getPortfolioEntry } from '@/lib/redis'
import { getQuote, normalizeSymbol } from '@/lib/yahoo-finance'

export async function POST(request: NextRequest, { params }: { params: { symbol: string } }) {
  if (!(await withinRateLimit(request))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'AI insight is not configured — set GEMINI_API_KEY in Vercel env vars' },
      { status: 501 },
    )
  }

  const [quote, portfolio, notes] = await Promise.all([
    getQuote(symbol),
    getPortfolioEntry(symbol),
    getNotes(symbol),
  ])

  if (!quote) {
    return NextResponse.json({ error: 'Symbol not found' }, { status: 404 })
  }

  const insight = await getStockInsight({
    symbol: quote.symbol,
    shortName: quote.shortName,
    price: quote.price,
    changePercent: quote.changePercent,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
    pe: quote.pe || null,
    portfolioQty: portfolio?.qty,
    portfolioAvgPrice: portfolio?.avgBuyPrice,
    notes,
  })

  if (!insight) {
    return NextResponse.json({ error: 'AI insight unavailable right now — try again shortly' }, { status: 502 })
  }

  return NextResponse.json({ insight })
}
