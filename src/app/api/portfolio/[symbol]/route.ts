import { NextRequest, NextResponse } from 'next/server'
import { getPortfolioEntry, upsertPortfolioEntry } from '@/lib/redis'
import { normalizeSymbol } from '@/lib/yahoo-finance'

export async function GET(_request: Request, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  return NextResponse.json(await getPortfolioEntry(symbol))
}

export async function POST(request: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  const body = (await request.json().catch(() => null)) as { qty?: number; avgBuyPrice?: number } | null
  if (!body || typeof body.qty !== 'number' || typeof body.avgBuyPrice !== 'number') {
    return NextResponse.json({ error: 'Invalid portfolio entry' }, { status: 400 })
  }
  const entry = { symbol, qty: body.qty, avgBuyPrice: body.avgBuyPrice, updatedAt: new Date().toISOString() }
  await upsertPortfolioEntry(symbol, entry)
  return NextResponse.json({ success: true, entry })
}
