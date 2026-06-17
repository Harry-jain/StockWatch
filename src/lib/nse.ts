/**
 * nse.ts — NSE India API integration
 *
 * Primary data source for all .NS equities and NSE indices.
 * Manages session cookies in Redis (5-min TTL) to bypass bot protection.
 * Falls back gracefully — all functions return null/[] on any error.
 */

import { redis } from '@/lib/redis'
import type { StockQuote } from '@/types'

const NSE_BASE = 'https://www.nseindia.com'
const COOKIE_KEY = 'stockwatch:nse_cookies'
const COOKIE_TTL = 300 // seconds

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0
}

// ── Cookie Management ─────────────────────────────────────────────────────────

async function refreshCookies(): Promise<string> {
  try {
    const res = await fetch(`${NSE_BASE}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    })
    // getSetCookie() returns string[] — one element per Set-Cookie header
    const parts: string[] = (res.headers as unknown as { getSetCookie?: () => string[] })
      .getSetCookie?.() ?? []
    const cookies = parts.map((c) => c.split(';')[0]).join('; ')
    if (cookies) {
      await redis.set(COOKIE_KEY, cookies, { ex: COOKIE_TTL }).catch(() => null)
    }
    return cookies
  } catch (err) {
    console.error('[NSE] Cookie refresh failed:', err)
    return ''
  }
}

async function getCookies(): Promise<string> {
  try {
    const cached = await redis.get<string>(COOKIE_KEY)
    if (cached) return cached
  } catch { /* miss */ }
  return refreshCookies()
}

// ── Core GET helper (auto-refreshes cookies on 401/403) ───────────────────────

const API_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.nseindia.com/',
  'X-Requested-With': 'XMLHttpRequest',
}

async function nseGet<T>(path: string, isRetry = false): Promise<T | null> {
  try {
    const cookies = await getCookies()
    const res = await fetch(`${NSE_BASE}${path}`, {
      headers: { ...API_HEADERS, Cookie: cookies },
      cache: 'no-store',
    })

    if ((res.status === 401 || res.status === 403) && !isRetry) {
      // Force-refresh cookies and try once more
      await redis.del(COOKIE_KEY).catch(() => null)
      return nseGet<T>(path, true)
    }

    if (!res.ok) {
      console.warn(`[NSE] ${path} → HTTP ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`[NSE] fetch error for ${path}:`, err)
    return null
  }
}

// ── NSE Quote — Individual Equity ─────────────────────────────────────────────

interface NSEQuoteResponse {
  info?: { symbol?: string; companyName?: string }
  priceInfo?: {
    lastPrice?: number
    change?: number
    pChange?: number
    previousClose?: number
    open?: number
    intraDayHighLow?: { min?: number; max?: number }
    weekHighLow?: { min?: number; max?: number }
  }
  marketDeptOrderBook?: {
    tradeInfo?: {
      totalTradedVolume?: number
      totalMarketCap?: number
    }
  }
  metadata?: { pdSymbolPe?: number }
}

export async function getNSEQuote(rawSymbol: string): Promise<StockQuote | null> {
  // NSE API wants bare symbol without exchange suffix
  const symbol = rawSymbol.toUpperCase().replace(/\.NS$/, '')
  const data = await nseGet<NSEQuoteResponse>(
    `/api/quote-equity?symbol=${encodeURIComponent(symbol)}`
  )
  if (!data?.priceInfo) return null

  const p = data.priceInfo
  const trade = data.marketDeptOrderBook?.tradeInfo

  return {
    symbol: `${symbol}.NS`,
    price: num(p.lastPrice),
    change: num(p.change),
    changePercent: num(p.pChange),
    previousClose: num(p.previousClose),
    open: num(p.open),
    dayHigh: num(p.intraDayHighLow?.max),
    dayLow: num(p.intraDayHighLow?.min),
    volume: num(trade?.totalTradedVolume),
    avgVolume: 0,
    // NSE returns market cap in crores — convert to rupees
    marketCap: num(trade?.totalMarketCap) * 10_000_000,
    pe: num(data.metadata?.pdSymbolPe),
    eps: 0,
    dividendYield: 0,
    fiftyTwoWeekHigh: num(p.weekHighLow?.max),
    fiftyTwoWeekLow: num(p.weekHighLow?.min),
    shortName: data.info?.companyName ?? symbol,
    longName: data.info?.companyName ?? symbol,
    exchange: 'NSE',
    currency: 'INR',
  }
}

// ── NSE Indices ───────────────────────────────────────────────────────────────

/** Map Yahoo-style index symbols → NSE index names */
const INDEX_MAP: Record<string, string> = {
  '^NSEI': 'NIFTY 50',
  '^NSEBANK': 'NIFTY BANK',
  '^NSMIDCP': 'NIFTY MIDCAP 100',
}

interface NSEIndexEntry {
  index?: string
  indexSymbol?: string
  last?: number
  variation?: number
  percentChange?: number
  open?: number
  high?: number
  low?: number
  previousClose?: number
  yearHigh?: number
  yearLow?: number
}

interface NSEAllIndicesResponse {
  data?: NSEIndexEntry[]
}

export async function getNSEIndexQuote(symbol: string): Promise<StockQuote | null> {
  const indexName = INDEX_MAP[symbol.toUpperCase()]
  if (!indexName) return null

  const data = await nseGet<NSEAllIndicesResponse>('/api/allIndices')
  if (!data?.data) return null

  const entry = data.data.find(
    (d) => d.index === indexName || d.indexSymbol === indexName
  )
  if (!entry) return null

  return {
    symbol,
    price: num(entry.last),
    change: num(entry.variation),
    changePercent: num(entry.percentChange),
    previousClose: num(entry.previousClose),
    open: num(entry.open),
    dayHigh: num(entry.high),
    dayLow: num(entry.low),
    fiftyTwoWeekHigh: num(entry.yearHigh),
    fiftyTwoWeekLow: num(entry.yearLow),
    shortName: indexName,
    longName: indexName,
    exchange: 'NSE',
    currency: 'INR',
    volume: 0,
    avgVolume: 0,
    marketCap: 0,
    pe: 0,
    eps: 0,
    dividendYield: 0,
  }
}

/** All symbols that this module can serve */
export const NSE_INDEX_SYMBOLS = new Set(Object.keys(INDEX_MAP))
