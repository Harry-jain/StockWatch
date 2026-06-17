'use client'

import { useEffect, useRef, useState } from 'react'

export function StockNotes({ symbol }: { symbol: string }) {
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('')
  const skipNextSave = useRef(true)

  useEffect(() => {
    skipNextSave.current = true
    fetch(`/api/notes/${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((payload) => setNotes(payload.notes ?? ''))
  }, [symbol])

  useEffect(() => {
    // Skip the save that the initial-load setNotes() above would otherwise trigger.
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    const timer = window.setTimeout(async () => {
      setStatus('Saving')
      await fetch(`/api/notes/${encodeURIComponent(symbol)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      setStatus('Saved')
    }, 700)
    return () => window.clearTimeout(timer)
  }, [notes, symbol])

  return (
    <section className="glass-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Notes</h2>
        <span className="text-xs text-text-muted">{status}</span>
      </div>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        className="min-h-36 w-full resize-y glass-input p-3 text-sm text-text-primary outline-none focus:border-accent"
        placeholder="Trade thesis, levels, earnings notes..."
      />
    </section>
  )
}
