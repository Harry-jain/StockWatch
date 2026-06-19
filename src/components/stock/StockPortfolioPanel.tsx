'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatINR } from '@/lib/format'
import { usePortfolio } from '@/hooks/usePortfolio'

export function StockPortfolioPanel({ symbol, currentPrice }: { symbol: string; currentPrice: number }) {
  const { entry, save, remove } = usePortfolio(symbol)
  const [qty, setQty] = useState('')
  const [avg, setAvg] = useState('')
  const [removing, setRemoving] = useState(false)

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

  async function handleRemove() {
    setRemoving(true)
    try {
      await remove()
      setQty('')
      setAvg('')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <section className="glass-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Portfolio</h2>
        {entry ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="flex items-center gap-1 text-xs text-text-muted transition hover:text-market-down disabled:opacity-50"
          >
            <Trash2 size={13} />
            Remove
          </button>
        ) : null}
      </div>
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
