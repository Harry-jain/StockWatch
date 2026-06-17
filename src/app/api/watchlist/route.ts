import { NextRequest, NextResponse } from 'next/server'
import { addToWatchlist, getWatchlist } from '@/lib/redis'
import { withinRateLimit } from '@/lib/ratelimit'
import { isValidSymbol } from '@/lib/validate'
import { normalizeSymbol } from '@/lib/yahoo-finance'

export async function GET() {
  const symbols = await getWatchlist()
  return NextResponse.json({ symbols })
}

export async function POST(request: NextRequest) {
  if (!(await withinRateLimit(request))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as { symbol?: string } | null
  if (!body?.symbol || typeof body.symbol !== 'string') {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }
  const symbol = normalizeSymbol(body.symbol)
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 })
  }
  const watchlist = await getWatchlist()
  if (watchlist.includes(symbol)) {
    return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 })
  }
  await addToWatchlist(symbol)
  return NextResponse.json({ symbol, added: true })
}
