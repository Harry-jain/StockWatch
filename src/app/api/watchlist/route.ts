import { NextRequest, NextResponse } from 'next/server'
import { addToWatchlist, getWatchlist } from '@/lib/redis'
import { normalizeSymbol } from '@/lib/yahoo-finance'

export async function GET() {
  const symbols = await getWatchlist()
  return NextResponse.json({ symbols })
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { symbol?: string } | null
  if (!body?.symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }
  const symbol = normalizeSymbol(body.symbol)
  const watchlist = await getWatchlist()
  if (watchlist.includes(symbol)) {
    return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 })
  }
  await addToWatchlist(symbol)
  return NextResponse.json({ symbol, added: true })
}
