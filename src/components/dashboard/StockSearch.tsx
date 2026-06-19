'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import type { SearchResult } from '@/types'

// In-memory, per-session cache so retyping/backspacing over an already-seen
// query never has to touch the network again. The server also caches in
// Redis, so the only truly "slow" lookup is the very first time anyone
// searches a given term.
const sessionCache = new Map<string, SearchResult[]>()

export function StockSearch({ onSelect }: { onSelect: (symbol: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim().toLowerCase()
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const cached = sessionCache.get(trimmed)
    if (cached) {
      setResults(cached)
      setLoading(false)
      return
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        const payload = await res.json()
        const items: SearchResult[] = payload.results ?? []
        sessionCache.set(trimmed, items)
        setResults(items)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => window.clearTimeout(timer)
  }, [query])

  async function select(symbol: string) {
    setError('')
    try {
      await onSelect(symbol)
      setQuery('')
      setResults([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add stock')
    }
  }

  return (
    <div className="space-y-3">
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Reliance, TCS, INFY..." />
      {loading ? <Spinner className="text-text-secondary" /> : null}
      {error ? <p className="text-sm text-market-down">{error}</p> : null}
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {results.map((result) => (
          <button
            key={result.symbol}
            type="button"
            onClick={() => select(result.symbol)}
            className="flex w-full items-center justify-between rounded-md border border-white/5 bg-white/[0.03] p-3 text-left hover:border-accent hover:bg-white/[0.06] transition duration-200"
          >
            <span className="min-w-0">
              <span className="block font-mono text-sm text-text-primary">{result.symbol}</span>
              <span className="block truncate text-xs text-text-secondary">{result.longname ?? result.shortname ?? result.exchange}</span>
            </span>
            <Plus size={16} className="text-accent" />
          </button>
        ))}
      </div>
      {query.trim().length >= 2 && !loading && results.length === 0 ? (
        <Button onClick={() => select(query)} className="w-full">
          <Plus size={16} />
          Add {query.toUpperCase()}
        </Button>
      ) : null}
    </div>
  )
}
