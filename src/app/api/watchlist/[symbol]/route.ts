import { NextResponse } from 'next/server'
import { getWatchlist, removeFromWatchlist } from '@/lib/redis'
import { normalizeSymbol } from '@/lib/yahoo-finance'

export async function DELETE(_request: Request, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  const watchlist = await getWatchlist()
  if (!watchlist.includes(symbol)) {
    return NextResponse.json({ error: 'Not in watchlist' }, { status: 404 })
  }
  await removeFromWatchlist(symbol)
  return NextResponse.json({ symbol, removed: true })
}
