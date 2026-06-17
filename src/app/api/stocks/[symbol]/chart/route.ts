import { NextRequest, NextResponse } from 'next/server'
import { CHART_PERIODS } from '@/lib/constants'
import { isValidSymbol } from '@/lib/validate'
import { getHistorical, normalizeSymbol } from '@/lib/yahoo-finance'
import type { ChartPeriod } from '@/types'

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  const periodParam = request.nextUrl.searchParams.get('period') ?? '1mo'
  const period: ChartPeriod = CHART_PERIODS.includes(periodParam as ChartPeriod) ? (periodParam as ChartPeriod) : '1mo'
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 })
  }
  const data = await getHistorical(symbol, period)
  return NextResponse.json({ symbol, period, data })
}
