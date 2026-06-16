'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatINR } from '@/lib/format'
import { usePortfolio } from '@/hooks/usePortfolio'

export function StockPortfolioPanel({ symbol, currentPrice }: { symbol: string; currentPrice: number }) {
  const { entry, save } = usePortfolio(symbol)
  const [qty, setQty] = useState('')
  const [avg, setAvg] = useState('')

  // Sync state when entry loads
  useEffect(() => {
    if (entry) {
      setQty(entry.qty?.toString() ?? '')
      setAvg(entry.avgBuyPrice?.toString() ?? '')
    }
  }, [entry])

  const activeQty = Number(qty || entry?.qty || 0)
  const activeAvg = Number(avg || entry?.avgBuyPrice || 0)
  const pnl = activeQty * (currentPrice - activeAvg)

  return (
    <section className="glass-panel p-4">
      <h2 className="text-sm font-semibold text-text-primary">Portfolio</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Input type="number" min="0" value={qty} onChange={(event) => setQty(event.target.value)} placeholder="Qty" />
        <Input type="number" min="0" value={avg} onChange={(event) => setAvg(event.target.value)} placeholder="Avg buy price" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-text-secondary">P&L</span>
        <span className={`font-mono text-lg ${pnl >= 0 ? 'text-market-up' : 'text-market-down'}`}>{formatINR(pnl)}</span>
      </div>
      <Button className="mt-4 w-full" onClick={() => save(Number(qty), Number(avg))}>
        Save
      </Button>
    </section>
  )
}
