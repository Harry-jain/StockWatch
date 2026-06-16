import { Tooltip } from '@/components/ui/Tooltip'
import { formatCap, formatINR, formatVolume } from '@/lib/format'
import type { StockQuote } from '@/types'

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel p-4">
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-2 font-mono text-lg text-text-primary">{value}</dd>
    </div>
  )
}

export function StockMetrics({ quote }: { quote: StockQuote | null }) {
  const low = quote?.fiftyTwoWeekLow ?? 0
  const high = quote?.fiftyTwoWeekHigh ?? 0
  const price = quote?.price ?? 0
  const position = high > low ? Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100)) : 0

  return (
    <section className="space-y-4">
      <div className="glass-panel p-4">
        <Tooltip label="Current price position inside the 52-week range">
          <p className="text-sm font-semibold text-text-primary">52-week position</p>
        </Tooltip>
        <div className="mt-4 h-2 rounded-full bg-white/[0.06] border border-white/5">
          <div className="h-2 rounded-full bg-accent" style={{ width: `${position}%` }} />
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs text-text-muted">
          <span>{formatINR(low)}</span>
          <span>{formatINR(high)}</span>
        </div>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Volume" value={formatVolume(quote?.volume)} />
        <Metric label="Avg Volume" value={formatVolume(quote?.avgVolume)} />
        <Metric label="P/E" value={quote?.pe ? quote.pe.toFixed(2) : '-'} />
        <Metric label="Market Cap" value={formatCap(quote?.marketCap)} />
      </dl>
    </section>
  )
}
