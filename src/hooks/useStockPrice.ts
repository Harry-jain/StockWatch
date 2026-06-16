'use client'

import useSWR from 'swr'
import type { StockQuote } from '@/types'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to load stock')
  return res.json()
})

export function useStockPrice(symbol: string, refresh = true) {
  return useSWR<StockQuote>(symbol ? `/api/stocks/${encodeURIComponent(symbol)}` : null, fetcher, {
    refreshInterval: refresh ? 60_000 : 0,
  })
}

export function useStockQuotes(symbols: string[], refresh = true) {
  const querySymbols = symbols.map((s) => s.trim()).filter(Boolean)
  const key = querySymbols.length
    ? `/api/stocks/quotes?symbols=${querySymbols.map(encodeURIComponent).join(',')}`
    : null

  return useSWR<{ quotes: Record<string, StockQuote> }>(key, fetcher, {
    refreshInterval: refresh ? 60_000 : 0,
    keepPreviousData: true,
  })
}
