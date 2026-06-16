'use client'

import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MiniSparkline } from '@/components/dashboard/MiniSparkline'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatINR, formatVolume } from '@/lib/format'
import type { StockQuote } from '@/types'

export function StockCard({
  symbol,
  quote,
  isLoading,
  onRemove,
}: {
  symbol: string
  quote?: StockQuote
  isLoading?: boolean
  onRemove: (symbol: string) => void
}) {
  if (isLoading && !quote) {
    return <Skeleton className="h-44" />
  }

  const change = quote?.changePercent ?? 0

  return (
    <article className="glass-panel p-4 transition duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/stock/${encodeURIComponent(symbol)}`} className="min-w-0">
          <h3 className="truncate font-mono text-base font-semibold text-text-primary">{symbol}</h3>
          <p className="mt-1 truncate text-sm text-text-secondary">{quote?.shortName ?? 'Loading quote'}</p>
        </Link>
        <Button variant="ghost" className="h-8 w-8 shrink-0 px-0" aria-label={`Remove ${symbol}`} onClick={() => onRemove(symbol)}>
          <Trash2 size={15} />
        </Button>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-2xl font-semibold text-text-primary">{formatINR(quote?.price)}</p>
          <div className="mt-2">
            <Badge value={change} />
          </div>
        </div>
        <MiniSparkline values={quote?.sparkline} positive={change >= 0} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-text-muted">Volume</dt>
          <dd className="mt-1 font-mono text-text-secondary">{formatVolume(quote?.volume)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">52W Range</dt>
          <dd className="mt-1 font-mono text-text-secondary">
            {formatINR(quote?.fiftyTwoWeekLow)} - {formatINR(quote?.fiftyTwoWeekHigh)}
          </dd>
        </div>
      </dl>
    </article>
  )
}
