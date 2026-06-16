import { NextResponse } from 'next/server'
import { getQuote } from '@/lib/yahoo-finance'

export async function GET(_request: Request, { params }: { params: { symbol: string } }) {
  const quote = await getQuote(decodeURIComponent(params.symbol))
  if (!quote) {
    return NextResponse.json({ error: 'Symbol not found' }, { status: 404 })
  }
  return NextResponse.json(quote)
}
