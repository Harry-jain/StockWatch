import { Badge } from '@/components/ui/Badge'
import { formatINR } from '@/lib/format'
import type { StockQuote } from '@/types'

export function StockHeader({ quote }: { quote: StockQuote | null }) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="font-mono text-sm text-accent">{quote?.symbol ?? 'Stock'}</p>
        <h1 className="mt-1 truncate text-3xl font-semibold text-text-primary">{quote?.longName ?? quote?.shortName ?? 'Quote unavailable'}</h1>
        <p className="mt-2 text-sm text-text-secondary">{quote?.exchange ?? 'NSE/BSE'} · {quote?.currency ?? 'INR'}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-3xl font-semibold text-text-primary">{formatINR(quote?.price)}</p>
        <div className="mt-2 flex justify-end">
          <Badge value={quote?.changePercent} />
        </div>
      </div>
    </section>
  )
}
