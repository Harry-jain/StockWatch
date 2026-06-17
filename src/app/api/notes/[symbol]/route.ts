import { NextRequest, NextResponse } from 'next/server'
import { getNotes, saveNotes } from '@/lib/redis'
import { withinRateLimit } from '@/lib/ratelimit'
import { clampNotes } from '@/lib/validate'
import { normalizeSymbol } from '@/lib/yahoo-finance'

// Notes are keyed by either a real stock symbol or the "_DASHBOARD" sentinel
// used for session-wide notes, so we only cap length here — not a strict
// symbol-format check like the other routes.
const MAX_SYMBOL_PARAM_LENGTH = 32

export async function GET(_request: Request, { params }: { params: { symbol: string } }) {
  const raw = decodeURIComponent(params.symbol).slice(0, MAX_SYMBOL_PARAM_LENGTH)
  const symbol = normalizeSymbol(raw)
  const notes = await getNotes(symbol)
  return NextResponse.json({ symbol, notes })
}

export async function PUT(request: NextRequest, { params }: { params: { symbol: string } }) {
  if (!(await withinRateLimit(request))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const raw = decodeURIComponent(params.symbol).slice(0, MAX_SYMBOL_PARAM_LENGTH)
  const symbol = normalizeSymbol(raw)
  const body = (await request.json().catch(() => null)) as { notes?: string } | null
  await saveNotes(symbol, clampNotes(body?.notes ?? ''))
  return NextResponse.json({ success: true })
}
