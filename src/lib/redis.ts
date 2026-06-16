import { Redis } from '@upstash/redis'
import type { CustomAlert, PortfolioEntry, PriceSnapshot } from '@/types'

const PREFIX = 'stockwatch'
const hasRedisEnv = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://example.com',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'missing-token',
})

const memory = new Map<string, string>()

function key(name: string): string {
  return `${PREFIX}:${name}`
}

async function safeGetString(name: string): Promise<string | null> {
  try {
    if (!hasRedisEnv) {
      return memory.get(name) ?? null
    }
    const value = await redis.get<string>(name)
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return null
    return JSON.stringify(value)
  } catch (error) {
    console.error(`Redis get failed for ${name}`, error)
    return memory.get(name) ?? null
  }
}

async function safeSetString(name: string, value: string): Promise<void> {
  try {
    memory.set(name, value)
    if (hasRedisEnv) {
      await redis.set(name, value)
    }
  } catch (error) {
    console.error(`Redis set failed for ${name}`, error)
  }
}

async function safeDelete(name: string): Promise<void> {
  try {
    memory.delete(name)
    if (hasRedisEnv) {
      await redis.del(name)
    }
  } catch (error) {
    console.error(`Redis delete failed for ${name}`, error)
  }
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function getWatchlist(): Promise<string[]> {
  return parseJson<string[]>(await safeGetString(key('watchlist')), [])
}

export async function addToWatchlist(symbol: string): Promise<void> {
  const normalized = symbol.toUpperCase()
  const watchlist = await getWatchlist()
  if (!watchlist.includes(normalized)) {
    await safeSetString(key('watchlist'), JSON.stringify([...watchlist, normalized]))
  }
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
  const normalized = symbol.toUpperCase()
  const watchlist = await getWatchlist()
  await safeSetString(key('watchlist'), JSON.stringify(watchlist.filter((item) => item !== normalized)))
}

export async function getPortfolioEntry(symbol: string): Promise<PortfolioEntry | null> {
  return parseJson<PortfolioEntry | null>(await safeGetString(key(`portfolio:${symbol.toUpperCase()}`)), null)
}

export async function upsertPortfolioEntry(symbol: string, entry: PortfolioEntry): Promise<void> {
  await safeSetString(key(`portfolio:${symbol.toUpperCase()}`), JSON.stringify(entry))
}

export async function getNotes(symbol: string): Promise<string> {
  return (await safeGetString(key(`notes:${symbol.toUpperCase()}`))) ?? ''
}

export async function saveNotes(symbol: string, text: string): Promise<void> {
  await safeSetString(key(`notes:${symbol.toUpperCase()}`), text)
}

export async function getPriceSnapshot(symbol: string): Promise<PriceSnapshot | null> {
  return parseJson<PriceSnapshot | null>(await safeGetString(key(`price_snap:${symbol.toUpperCase()}`)), null)
}

export async function savePriceSnapshot(symbol: string, snap: PriceSnapshot): Promise<void> {
  await safeSetString(key(`price_snap:${symbol.toUpperCase()}`), JSON.stringify(snap))
}

export async function getCustomAlerts(symbol: string): Promise<CustomAlert[]> {
  return parseJson<CustomAlert[]>(await safeGetString(key(`alerts:${symbol.toUpperCase()}`)), [])
}

export async function saveCustomAlerts(symbol: string, alerts: CustomAlert[]): Promise<void> {
  await safeSetString(key(`alerts:${symbol.toUpperCase()}`), JSON.stringify(alerts))
}

export async function getSector(symbol: string): Promise<string> {
  return (await safeGetString(key(`sector:${symbol.toUpperCase()}`))) ?? 'Unassigned'
}

export async function setSector(symbol: string, sector: string): Promise<void> {
  await safeSetString(key(`sector:${symbol.toUpperCase()}`), sector)
}

export async function deletePortfolioEntry(symbol: string): Promise<void> {
  await safeDelete(key(`portfolio:${symbol.toUpperCase()}`))
}

export async function getSparkline(symbol: string): Promise<number[] | null> {
  return parseJson<number[] | null>(await safeGetString(key(`sparkline:${symbol.toUpperCase()}`)), null)
}

export async function saveSparkline(symbol: string, values: number[]): Promise<void> {
  const k = key(`sparkline:${symbol.toUpperCase()}`)
  try {
    memory.set(k, JSON.stringify(values))
    if (hasRedisEnv) {
      await redis.set(k, JSON.stringify(values), { ex: 3600 })
    }
  } catch (error) {
    console.error(`Redis set failed for sparkline:${symbol}`, error)
  }
}
