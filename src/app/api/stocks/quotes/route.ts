import { NextRequest, NextResponse } from 'next/server'
import { getMultipleQuotes } from '@/lib/yahoo-finance'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const symbolsParam = searchParams.get('symbols')
  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols query parameter is required' }, { status: 400 })
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

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
