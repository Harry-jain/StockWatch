import { NextRequest, NextResponse } from 'next/server'
import { getWatchlist, removeFromWatchlist } from '@/lib/redis'
import { withinRateLimit } from '@/lib/ratelimit'
import { isValidSymbol } from '@/lib/validate'
import { normalizeSymbol } from '@/lib/yahoo-finance'

export async function DELETE(request: NextRequest, { params }: { params: { symbol: string } }) {
  if (!(await withinRateLimit(request))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 })
  }
  const watchlist = await getWatchlist()
  if (!watchlist.includes(symbol)) {
    return NextResponse.json({ error: 'Not in watchlist' }, { status: 404 })
  }
  await removeFromWatchlist(symbol)
  return NextResponse.json({ symbol, removed: true })
}
