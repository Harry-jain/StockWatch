'use client'

import useSWR from 'swr'
import type { PortfolioEntry } from '@/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function usePortfolio(symbol: string) {
  const { data, isLoading, mutate } = useSWR<PortfolioEntry | null>(symbol ? `/api/portfolio/${encodeURIComponent(symbol)}` : null, fetcher)

  async function save(qty: number, avgBuyPrice: number) {
    const res = await fetch(`/api/portfolio/${encodeURIComponent(symbol)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty, avgBuyPrice }),
    })
    const payload = await res.json()
    if (!res.ok) throw new Error(payload.error ?? 'Unable to save portfolio')
    await mutate(payload.entry)
    return payload.entry as PortfolioEntry
  }

  return { entry: data ?? null, isLoading, save, mutate }
}
