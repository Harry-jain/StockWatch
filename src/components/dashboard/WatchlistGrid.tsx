'use client'

import { useState } from 'react'
import { Grid2X2, Layers, Plus } from 'lucide-react'
import { AddStockModal } from '@/components/dashboard/AddStockModal'
import { PerformanceBoard } from '@/components/dashboard/PerformanceBoard'
import { SectorGroupView } from '@/components/dashboard/SectorGroupView'
import { StockCard } from '@/components/dashboard/StockCard'
import { StockSearch } from '@/components/dashboard/StockSearch'
import { Button } from '@/components/ui/Button'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useStockQuotes } from '@/hooks/useStockPrice'

export function WatchlistGrid({ initialSymbols }: { initialSymbols: string[] }) {
  const { symbols, add, remove } = useWatchlist()
  const activeSymbols = symbols.length ? symbols : initialSymbols
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<'grid' | 'sector'>('grid')

  const { data: quotesData, isLoading } = useStockQuotes(activeSymbols)
  const quotes = quotesData?.quotes ?? {}

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">{activeSymbols.length} watched symbols</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === 'grid' ? 'primary' : 'ghost'} className="h-9 w-9 px-0" onClick={() => setView('grid')} aria-label="Grid view">
            <Grid2X2 size={16} />
          </Button>
          <Button variant={view === 'sector' ? 'primary' : 'ghost'} className="h-9 w-9 px-0" onClick={() => setView('sector')} aria-label="Sector view">
            <Layers size={16} />
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Add
          </Button>
        </div>
      </div>

      <div className="max-w-md glass-panel p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">Quick Search & Add Stock</h2>
        <StockSearch onSelect={add} />
      </div>

      <PerformanceBoard symbols={activeSymbols} />

      {activeSymbols.length === 0 ? (
        <div className="rounded-lg border border-dashed border-background-border p-10 text-center text-text-secondary">
          Add an NSE or BSE stock to start tracking prices.
        </div>
      ) : view === 'grid' ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeSymbols.map((symbol) => (
            <StockCard
              key={symbol}
              symbol={symbol}
              quote={quotes[symbol]}
              isLoading={isLoading}
              onRemove={remove}
            />
          ))}
        </section>
      ) : (
        <SectorGroupView symbols={activeSymbols} />
      )}

      <AddStockModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={add} />
    </div>
  )
}
