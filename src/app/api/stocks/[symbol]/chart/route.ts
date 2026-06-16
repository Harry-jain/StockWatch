import { NextRequest, NextResponse } from 'next/server'
import { CHART_PERIODS } from '@/lib/constants'
import { getHistorical } from '@/lib/yahoo-finance'
import type { ChartPeriod } from '@/types'

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  const periodParam = request.nextUrl.searchParams.get('period') ?? '1mo'
  const period: ChartPeriod = CHART_PERIODS.includes(periodParam as ChartPeriod) ? (periodParam as ChartPeriod) : '1mo'
  const symbol = decodeURIComponent(params.symbol)
  const data = await getHistorical(symbol, period)
  return NextResponse.json({ symbol, period, data })
}
