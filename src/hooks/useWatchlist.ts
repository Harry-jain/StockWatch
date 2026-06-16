'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useWatchlist() {
  const { data, error, isLoading, mutate } = useSWR<{ symbols: string[] }>('/api/watchlist', fetcher)

  async function add(symbol: string) {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol }),
    })
    const payload = await res.json()
    if (!res.ok) throw new Error(payload.error ?? 'Unable to add stock')
    await mutate()
    return payload
  }

  async function remove(symbol: string) {
    const res = await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' })
    const payload = await res.json()
    if (!res.ok) throw new Error(payload.error ?? 'Unable to remove stock')
    await mutate()
    return payload
  }

  return {
    symbols: data?.symbols ?? [],
    error,
    isLoading,
    add,
    remove,
    mutate,
  }
}
