import { NextRequest, NextResponse } from 'next/server'
import { MAX_BATCH_SYMBOLS, isValidSymbol } from '@/lib/validate'
import { getMultipleQuotes, normalizeSymbol } from '@/lib/yahoo-finance'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const symbolsParam = searchParams.get('symbols')
  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols query parameter is required' }, { status: 400 })
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => normalizeSymbol(s.trim()))
    .filter((s) => s && isValidSymbol(s))
    .slice(0, MAX_BATCH_SYMBOLS)

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} })
  }

  try {
    const quotes = await getMultipleQuotes(symbols)
    return NextResponse.json({ quotes })
  } catch (error) {
    console.error('Batch quotes route failed', error)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}
