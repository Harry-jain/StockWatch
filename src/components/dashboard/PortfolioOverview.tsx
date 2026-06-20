'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { formatINR, formatPercent } from '@/lib/format'
import type { PortfolioSummary } from '@/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PortfolioOverview() {
  const { data, isLoading } = useSWR<PortfolioSummary>('/api/portfolio/summary', fetcher, {
    refreshInterval: 60_000,
  })

  if (isLoading) {
    return <div className="glass-panel h-32 animate-pulse" />
  }

  if (!data || data.holdings.length === 0) {
    return (
      <section className="glass-panel p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Portfolio</h2>
        <p className="mt-3 text-sm text-text-muted">
          No positions tracked yet. Open any stock and add a quantity + average buy price under &ldquo;Portfolio&rdquo; to
          see your totals here.
        </p>
      </section>
    )
  }

  const up = data.totalPnl >= 0

  return (
    <section className="glass-panel p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Portfolio</h2>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <p className="text-xs text-text-muted">Current Value</p>
          <p className="font-mono text-2xl text-text-primary">{formatINR(data.totalCurrent)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Invested</p>
          <p className="font-mono text-lg text-text-secondary">{formatINR(data.totalInvested)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Overall P&amp;L</p>
          <p className={`font-mono text-lg ${up ? 'text-market-up' : 'text-market-down'}`}>
            {formatINR(data.totalPnl)} ({formatPercent(data.totalPnlPercent)})
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {data.holdings.map((holding) => {
          const holdingUp = holding.pnl >= 0
          return (
            <Link
              key={holding.symbol}
              href={`/stock/${encodeURIComponent(holding.symbol)}`}
              className="block rounded-md border border-white/5 bg-white/[0.02] p-2.5 transition hover:border-accent/40 hover:bg-white/[0.05]"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-text-primary">{holding.symbol.replace(/\.(NS|BO)$/, '')}</span>
                <span className={`font-mono text-xs ${holdingUp ? 'text-market-up' : 'text-market-down'}`}>
                  {formatINR(holding.pnl)} ({formatPercent(holding.pnlPercent)})
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.min(holding.allocationPercent, 100)}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-text-muted">
                <span>
                  {holding.qty} @ {formatINR(holding.avgBuyPrice)}
                </span>
                <span>{holding.allocationPercent.toFixed(1)}% of portfolio</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
