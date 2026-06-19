'use client'

import useSWR from 'swr'
import { formatPercent } from '@/lib/format'
import { TICKER_REFRESH_SECONDS, TOP_100_NSE_SYMBOLS } from '@/lib/constants'
import type { StockQuote } from '@/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function TickerItem({ quote }: { quote: StockQuote }) {
  const up = quote.changePercent >= 0
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-4 text-xs">
      <span className="font-mono font-medium text-text-primary">{quote.symbol.replace(/\.(NS|BO)$/, '')}</span>
      <span className="font-mono text-text-secondary">₹{quote.price.toFixed(2)}</span>
      <span className={`font-mono ${up ? 'text-market-up' : 'text-market-down'}`}>
        {up ? '▲' : '▼'} {formatPercent(quote.changePercent)}
      </span>
    </span>
  )
}

export function TickerMarquee() {
  const symbols = TOP_100_NSE_SYMBOLS.join(',')
  const { data } = useSWR<{ quotes: Record<string, StockQuote> }>(
    `/api/stocks/quotes?symbols=${encodeURIComponent(symbols)}`,
    fetcher,
    { refreshInterval: TICKER_REFRESH_SECONDS * 1000, revalidateOnFocus: false },
  )

  const quotes = Object.values(data?.quotes ?? {}).filter((q) => q && q.price > 0)
  if (quotes.length === 0) return null

  return (
    <div className="relative w-full overflow-hidden border-b border-white/5 bg-black/30 py-2">
      <div className="ticker-track flex w-max">
        {/* Render the list twice back-to-back so the -50% translateX loop is seamless */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex w-max items-center" aria-hidden={copy === 1}>
            {quotes.map((quote) => (
              <TickerItem key={`${copy}-${quote.symbol}`} quote={quote} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
