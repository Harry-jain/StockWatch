'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export function StockAIPanel({ symbol }: { symbol: string }) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchInsight() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ai/insight/${encodeURIComponent(symbol)}`, { method: 'POST' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? 'Unable to get insight')
      setInsight(payload.insight)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to get insight')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="glass-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          <Sparkles size={14} className="text-accent" />
          AI Insight
        </h2>
        <Button onClick={fetchInsight} disabled={loading} className="h-8 px-3 text-xs">
          {loading ? <Spinner className="h-3.5 w-3.5" /> : insight ? 'Refresh' : 'Get Insight'}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-market-down">{error}</p> : null}

      {insight ? (
        <>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{insight}</p>
          <p className="mt-3 text-xs text-text-muted">
            AI-generated, not financial advice — weigh it alongside your own research.
          </p>
        </>
      ) : !loading && !error ? (
        <p className="mt-3 text-sm text-text-muted">Get a quick AI-generated read on where this stock stands.</p>
      ) : null}
    </section>
  )
}
