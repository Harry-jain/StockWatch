'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CustomAlert } from '@/types'

export function StockAlertPanel({ symbol }: { symbol: string }) {
  const [alerts, setAlerts] = useState<CustomAlert[]>([])
  const [threshold, setThreshold] = useState('')
  const [direction, setDirection] = useState<'above' | 'below'>('above')

  const load = useCallback(async () => {
    const res = await fetch(`/api/alerts/${encodeURIComponent(symbol)}`)
    const payload = await res.json()
    setAlerts(payload.alerts ?? [])
  }, [symbol])

  useEffect(() => {
    load()
  }, [load])

  async function add() {
    const res = await fetch(`/api/alerts/${encodeURIComponent(symbol)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: Number(threshold), direction }),
    })
    if (res.ok) {
      setThreshold('')
      await load()
    }
  }

  async function remove(id: string) {
    await fetch(`/api/alerts/${encodeURIComponent(symbol)}?id=${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <section className="glass-panel p-4">
      <h2 className="text-sm font-semibold text-text-primary">Alerts</h2>
      <div className="mt-4 flex gap-2">
        <Input type="number" value={threshold} onChange={(event) => setThreshold(event.target.value)} placeholder="Threshold" />
        <select
          value={direction}
          onChange={(event) => setDirection(event.target.value as 'above' | 'below')}
          className="h-10 px-3 text-sm text-text-primary outline-none transition glass-input"
        >
          <option value="above" className="bg-[#1a1a1c]">Above</option>
          <option value="below" className="bg-[#1a1a1c]">Below</option>
        </select>
        <Button className="h-10 w-10 px-0" onClick={add} aria-label="Add alert">
          <Bell size={16} />
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
            <span className="font-mono text-text-secondary">
              {alert.direction} {alert.threshold}
            </span>
            <Button variant="ghost" className="h-8 w-8 px-0" onClick={() => remove(alert.id)} aria-label="Remove alert">
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
