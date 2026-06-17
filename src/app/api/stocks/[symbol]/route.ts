import { NextResponse } from 'next/server'
import { getQuote, normalizeSymbol } from '@/lib/yahoo-finance'
import { isValidSymbol } from '@/lib/validate'

export async function GET(_request: Request, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 })
  }
  const quote = await getQuote(symbol)
  if (!quote) {
    return NextResponse.json({ error: 'Symbol not found' }, { status: 404 })
  }
  return NextResponse.json(quote)
}
