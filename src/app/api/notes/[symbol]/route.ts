import { NextRequest, NextResponse } from 'next/server'
import { getNotes, saveNotes } from '@/lib/redis'
import { normalizeSymbol } from '@/lib/yahoo-finance'

export async function GET(_request: Request, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  const notes = await getNotes(symbol)
  return NextResponse.json({ symbol, notes })
}

export async function PUT(request: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  const body = (await request.json().catch(() => null)) as { notes?: string } | null
  await saveNotes(symbol, body?.notes ?? '')
  return NextResponse.json({ success: true })
}
