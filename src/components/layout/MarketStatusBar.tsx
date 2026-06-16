'use client'

import { Badge } from '@/components/ui/Badge'
import { INDEX_SYMBOLS } from '@/lib/constants'
import { formatINR } from '@/lib/format'
import { useStockQuotes } from '@/hooks/useStockPrice'
import type { StockQuote } from '@/types'

function IndexQuote({ label, quote }: { label: string; quote?: StockQuote }) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-r border-white/5 px-3 last:border-r-0">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="font-mono text-xs text-text-primary">{formatINR(quote?.price)}</span>
      <Badge value={quote?.changePercent} />
    </div>
  )
}

export function MarketStatusBar() {
  const symbols = [INDEX_SYMBOLS.nifty, INDEX_SYMBOLS.sensex, INDEX_SYMBOLS.bankNifty]
  const { data } = useStockQuotes(symbols)
  const quotes = data?.quotes ?? {}

  return (
    <div className="flex h-11 overflow-x-auto border-b border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <IndexQuote label="NIFTY 50" quote={quotes[INDEX_SYMBOLS.nifty]} />
      <IndexQuote label="SENSEX" quote={quotes[INDEX_SYMBOLS.sensex]} />
      <IndexQuote label="BANK NIFTY" quote={quotes[INDEX_SYMBOLS.bankNifty]} />
    </div>
  )
}
