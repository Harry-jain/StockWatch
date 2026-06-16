'use client'

import { Badge } from '@/components/ui/Badge'
import { INDEX_SYMBOLS } from '@/lib/constants'
import { formatINR } from '@/lib/format'
import { useStockPrice } from '@/hooks/useStockPrice'

function IndexQuote({ label, symbol }: { label: string; symbol: string }) {
  const { data } = useStockPrice(symbol)
  return (
    <div className="flex min-w-0 items-center gap-2 border-r border-background-border px-3 last:border-r-0">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="font-mono text-xs text-text-primary">{formatINR(data?.price)}</span>
      <Badge value={data?.changePercent} />
    </div>
  )
}

export function MarketStatusBar() {
  return (
    <div className="flex h-11 overflow-x-auto border-b border-background-border bg-background-card">
      <IndexQuote label="NIFTY 50" symbol={INDEX_SYMBOLS.nifty} />
      <IndexQuote label="SENSEX" symbol={INDEX_SYMBOLS.sensex} />
      <IndexQuote label="BANK NIFTY" symbol={INDEX_SYMBOLS.bankNifty} />
    </div>
  )
}
