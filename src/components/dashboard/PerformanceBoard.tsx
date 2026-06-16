'use client'

import { useEffect, useState, useRef } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatINR } from '@/lib/format'
import type { StockQuote } from '@/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PerformanceBoard({ symbols }: { symbols: string[] }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const isInitialLoad = useRef(true)

  // Fetch all quotes in a single request
  const { data: quotesData, isLoading: quotesLoading } = useSWR<{ quotes: Record<string, StockQuote> }>(
    symbols.length ? `/api/stocks/quotes?symbols=${symbols.join(',')}` : null,
    fetcher
  )

  // Fetch dashboard notes
  const { data: notesData, isLoading: notesLoading } = useSWR<{ notes: string }>(
    '/api/notes/_DASHBOARD',
    fetcher
  )

  // Load initial notes
  useEffect(() => {
    if (notesData) {
      setNotes(notesData.notes)
    }
  }, [notesData])

  // Debounced auto-save notes
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    const timer = setTimeout(async () => {
      setSaving(true)
      try {
        await fetch('/api/notes/_DASHBOARD', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        })
      } catch (err) {
        console.error('Failed to save dashboard notes', err)
      } finally {
        setSaving(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [notes])

  if (!symbols.length) return null

  const quotes = Object.values(quotesData?.quotes ?? {})

  // Calculate gainers and losers
  const gainers = [...quotes]
    .filter((q) => q.changePercent >= 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3)

  const losers = [...quotes]
    .filter((q) => q.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 3)

  return (
    <section className="grid gap-4 md:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-background-border bg-background-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Watchlist Pulse</h2>
        {quotesLoading ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </div>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {/* Gainers */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-market-up">Top Gainers</h3>
              {gainers.length === 0 ? (
                <p className="text-xs text-text-muted py-2">No gainers today</p>
              ) : (
                gainers.map((g) => (
                  <Link
                    key={g.symbol}
                    href={`/stock/${encodeURIComponent(g.symbol)}`}
                    className="flex items-center justify-between rounded-md border border-background-border bg-background-primary px-3 py-2 transition hover:border-market-up/50"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="block font-mono text-sm font-medium text-text-primary truncate">{g.symbol}</span>
                      <span className="block text-xs text-text-secondary">{formatINR(g.price)}</span>
                    </div>
                    <Badge value={g.changePercent} />
                  </Link>
                ))
              )}
            </div>

            {/* Losers */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-market-down">Top Losers</h3>
              {losers.length === 0 ? (
                <p className="text-xs text-text-muted py-2">No losers today</p>
              ) : (
                losers.map((l) => (
                  <Link
                    key={l.symbol}
                    href={`/stock/${encodeURIComponent(l.symbol)}`}
                    className="flex items-center justify-between rounded-md border border-background-border bg-background-primary px-3 py-2 transition hover:border-market-down/50"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="block font-mono text-sm font-medium text-text-primary truncate">{l.symbol}</span>
                      <span className="block text-xs text-text-secondary">{formatINR(l.price)}</span>
                    </div>
                    <Badge value={l.changePercent} />
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col rounded-lg border border-background-border bg-background-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Session Notes</h2>
          {saving ? (
            <span className="text-xs text-accent">Saving...</span>
          ) : notes && !notesLoading ? (
            <span className="text-xs text-text-muted">Saved</span>
          ) : null}
        </div>
        {notesLoading ? (
          <Skeleton className="mt-3 flex-1 min-h-[120px]" />
        ) : (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down observations, target prices, or market updates..."
            className="mt-3 flex-1 min-h-[120px] rounded-md border border-background-border bg-background-primary p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent outline-none resize-none"
          />
        )}
      </div>
    </section>
  )
}
