'use client'

import useSWR from 'swr'
import type { ChartPeriod, OHLCV } from '@/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useStockChart(symbol: string, period: ChartPeriod) {
  return useSWR<{ symbol: string; period: ChartPeriod; data: OHLCV[] }>(
    symbol ? `/api/stocks/${encodeURIComponent(symbol)}/chart?period=${period}` : null,
    fetcher,
  )
}
