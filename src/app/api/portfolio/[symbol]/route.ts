import { NextRequest, NextResponse } from 'next/server'
import { deletePortfolioEntry, getPortfolioEntry, upsertPortfolioEntry } from '@/lib/redis'
import { withinRateLimit } from '@/lib/ratelimit'
import { MAX_PORTFOLIO_VALUE, isFiniteNonNegative, isValidSymbol } from '@/lib/validate'
import { normalizeSymbol } from '@/lib/yahoo-finance'

export async function GET(_request: Request, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 })
  }
  return NextResponse.json(await getPortfolioEntry(symbol))
}

export async function POST(request: NextRequest, { params }: { params: { symbol: string } }) {
  if (!(await withinRateLimit(request))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 })
  }
  const body = (await request.json().catch(() => null)) as { qty?: number; avgBuyPrice?: number } | null
  if (
    !body ||
    !isFiniteNonNegative(body.qty, MAX_PORTFOLIO_VALUE) ||
    !isFiniteNonNegative(body.avgBuyPrice, MAX_PORTFOLIO_VALUE)
  ) {
    return NextResponse.json({ error: 'Invalid portfolio entry' }, { status: 400 })
  }
  const entry = { symbol, qty: body.qty, avgBuyPrice: body.avgBuyPrice, updatedAt: new Date().toISOString() }
  await upsertPortfolioEntry(symbol, entry)
  return NextResponse.json({ success: true, entry })
}

export async function DELETE(request: NextRequest, { params }: { params: { symbol: string } }) {
  if (!(await withinRateLimit(request))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 })
  }
  await deletePortfolioEntry(symbol)
  return NextResponse.json({ success: true })
}
