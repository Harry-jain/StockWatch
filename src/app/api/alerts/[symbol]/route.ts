import { NextRequest, NextResponse } from 'next/server'
import { getCustomAlerts, saveCustomAlerts } from '@/lib/redis'
import { normalizeSymbol } from '@/lib/yahoo-finance'
import type { CustomAlert } from '@/types'

export async function GET(_request: Request, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  const alerts = await getCustomAlerts(symbol)
  return NextResponse.json({ symbol, alerts })
}

export async function POST(request: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  const body = (await request.json().catch(() => null)) as { threshold?: number; direction?: 'above' | 'below' } | null
  if (!body || typeof body.threshold !== 'number' || (body.direction !== 'above' && body.direction !== 'below')) {
    return NextResponse.json({ error: 'Invalid alert' }, { status: 400 })
  }
  const alerts = await getCustomAlerts(symbol)
  const alert: CustomAlert = {
    id: crypto.randomUUID(),
    threshold: body.threshold,
    direction: body.direction,
    triggered: false,
    createdAt: new Date().toISOString(),
  }
  await saveCustomAlerts(symbol, [...alerts, alert])
  return NextResponse.json({ success: true, alert })
}

export async function DELETE(request: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  const id = request.nextUrl.searchParams.get('id')
  const alerts = await getCustomAlerts(symbol)
  await saveCustomAlerts(symbol, id ? alerts.filter((alert) => alert.id !== id) : [])
  return NextResponse.json({ success: true })
}
