/**
 * yahoo-finance.ts — Data fetching facade
 *
 * Routes:
 *   .NS equities    → NSE India API  (primary) → Yahoo Finance v8 REST (fallback)
 *   NSE indices     → NSE India API  (primary) → Yahoo Finance v8 REST (fallback)
 *   .BO / Sensex    → Yahoo Finance v8 REST (only)
 *
 * NO yahoo-finance2 npm package — direct REST calls are faster and don't get
 * rate-limited the same way the package does.
 */

import type { ChartPeriod, NewsItem, OHLCV, SearchResult, StockQuote } from '@/types'
import { getSparkline, saveSparkline, redis } from '@/lib/redis'
import { getNSEQuote, getNSEIndexQuote, NSE_INDEX_SYMBOLS } from '@/lib/nse'

const QUOTE_CACHE_TTL = 60   // seconds
const CHART_CACHE_TTL = 300  // seconds
const SEARCH_CACHE_TTL = 600 // seconds — symbol search results barely change

// Alternate between the two Yahoo hosts to spread rate-limit risk
const YAHOO_HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
]
let _hostIdx = 0
const yahooHost = () => YAHOO_HOSTS[(_hostIdx = (_hostIdx + 1) % 2)]

const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://finance.yahoo.com',
  Referer: 'https://finance.yahoo.com/',
}

// ── Core Yahoo REST fetch ─────────────────────────────────────────────────────

async function yahooFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${yahooHost()}${path}`, {
      headers: YAHOO_HEADERS,
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn(`[Yahoo] ${path} → HTTP ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`[Yahoo] fetch error for ${path}:`, err)
    return null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0
}

export function normalizeSymbol(input: string): string {
  const s = input.trim().toUpperCase()
  if (!s) return s
  if (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) return s
  return `${s}.NS`
}

// ── Yahoo v8 chart response types ─────────────────────────────────────────────

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: Record<string, unknown>
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          open?: (number | null)[]
          high?: (number | null)[]
          low?: (number | null)[]
          close?: (number | null)[]
          volume?: (number | null)[]
        }>
      }
    }>
  }
}

/** Build StockQuote from Yahoo v8 chart meta object */
function metaToQuote(meta: Record<string, unknown>, symbol: string): StockQuote {
  const price = num(meta.regularMarketPrice)
  const prevClose = num(meta.previousClose ?? meta.chartPreviousClose)
  return {
    symbol,
    price,
    change: price - prevClose,
    changePercent:
      num(meta.regularMarketChangePercent) ||
      (prevClose ? ((price - prevClose) / prevClose) * 100 : 0),
    previousClose: prevClose,
    open: num(meta.regularMarketOpen),
    dayHigh: num(meta.regularMarketDayHigh),
    dayLow: num(meta.regularMarketDayLow),
    volume: num(meta.regularMarketVolume),
    avgVolume: num(meta.averageDailyVolume3Month),
    marketCap: num(meta.marketCap),
    pe: num(meta.trailingPE),
    eps: num(meta.epsTrailingTwelveMonths),
    dividendYield: num(meta.trailingAnnualDividendYield) * 100,
    fiftyTwoWeekHigh: num(meta['52WeekHigh'] ?? meta.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(meta['52WeekLow'] ?? meta.fiftyTwoWeekLow),
    shortName: String(meta.shortName ?? meta.symbol ?? symbol),
    longName: String(meta.longName ?? meta.shortName ?? symbol),
    exchange: String(meta.exchangeName ?? meta.fullExchangeName ?? ''),
    currency: String(meta.currency ?? 'INR'),
  }
}

/** Fetch a single quote from Yahoo Finance v8 chart endpoint */
async function getYahooQuote(symbol: string): Promise<StockQuote | null> {
  const data = await yahooFetch<YahooChartResponse>(
    `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`
  )
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta || !meta.regularMarketPrice) return null
  return metaToQuote(meta, symbol)
}

// ── Yahoo Chart — period mapping ──────────────────────────────────────────────

function periodToParams(period: ChartPeriod): string {
  switch (period) {
    case '1d':  return 'interval=5m&range=1d'
    case '5d':  return 'interval=15m&range=5d'
    case '1mo': return 'interval=1d&range=1mo'
    case '3mo': return 'interval=1d&range=3mo'
    case '6mo': return 'interval=1d&range=6mo'
    case '1y':  return 'interval=1d&range=1y'
    case '5y':  return 'interval=1wk&range=5y'
  }
}

async function getYahooHistorical(symbol: string, period: ChartPeriod): Promise<OHLCV[]> {
  const data = await yahooFetch<YahooChartResponse>(
    `/v8/finance/chart/${encodeURIComponent(symbol)}?${periodToParams(period)}&includePrePost=false`
  )
  const result = data?.chart?.result?.[0]
  if (!result?.timestamp || !result.indicators?.quote?.[0]) return []

  const q = result.indicators.quote[0]
  return result.timestamp
    .map((t, i) => ({
      time: t,
      open: num(q.open?.[i]),
      high: num(q.high?.[i]),
      low: num(q.low?.[i]),
      close: num(q.close?.[i]),
      volume: num(q.volume?.[i]),
    }))
    .filter((bar) => bar.close > 0 && bar.open > 0)
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  const normalized = normalizeSymbol(symbol)
  const cacheKey = `stockwatch:quote_cache:${normalized}`

  // Cache check
  try {
    const cached = await redis.get<StockQuote>(cacheKey)
    if (cached) {
      cached.sparkline = await getSparklineData(normalized)
      return cached
    }
  } catch { /* miss */ }

  let quote: StockQuote | null = null

  if (NSE_INDEX_SYMBOLS.has(normalized)) {
    // NSE index (Nifty 50, Bank Nifty …)
    quote = await getNSEIndexQuote(normalized)
    if (!quote) quote = await getYahooQuote(normalized)
  } else if (normalized.endsWith('.NS')) {
    // NSE equity — try NSE API first, Yahoo as fallback
    quote = await getNSEQuote(normalized)
    if (!quote) quote = await getYahooQuote(normalized)
  } else {
    // BSE equity or Sensex — Yahoo only
    quote = await getYahooQuote(normalized)
  }

  if (quote) {
    quote.sparkline = await getSparklineData(normalized)
    try {
      await redis.set(cacheKey, quote, { ex: QUOTE_CACHE_TTL })
    } catch { /* non-fatal */ }
  }

  return quote
}

export async function getHistorical(symbol: string, period: ChartPeriod): Promise<OHLCV[]> {
  const normalized = normalizeSymbol(symbol)
  const cacheKey = `stockwatch:chart_cache:${normalized}:${period}`

  try {
    const cached = await redis.get<OHLCV[]>(cacheKey)
    if (cached?.length) return cached
  } catch { /* miss */ }

  const data = await getYahooHistorical(normalized, period)

  if (data.length > 0) {
    try {
      await redis.set(cacheKey, data, { ex: CHART_CACHE_TTL })
    } catch { /* non-fatal */ }
  }

  return data
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const cacheKey = `stockwatch:search_cache:${trimmed.toLowerCase()}`
  try {
    const cached = await redis.get<SearchResult[]>(cacheKey)
    if (cached) return cached
  } catch { /* miss */ }

  interface YahooSearch {
    quotes?: Array<Record<string, unknown>>
  }

  const data = await yahooFetch<YahooSearch>(
    `/v1/finance/search?q=${encodeURIComponent(trimmed)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`
  )

  const results = (data?.quotes ?? [])
    .filter((item) => item.quoteType === 'EQUITY')
    .filter((item) => {
      const sym = String(item.symbol ?? '')
      return sym.endsWith('.NS') || sym.endsWith('.BO')
    })
    .slice(0, 8)
    .map((item) => ({
      symbol: String(item.symbol),
      shortname: item.shortname ? String(item.shortname) : undefined,
      longname: item.longname ? String(item.longname) : undefined,
      exchange: item.exchange ? String(item.exchange) : undefined,
      quoteType: 'EQUITY',
    }))

  try {
    await redis.set(cacheKey, results, { ex: SEARCH_CACHE_TTL })
  } catch { /* non-fatal */ }

  return results
}

export async function getQuoteSummaryNews(symbol: string): Promise<NewsItem[]> {
  const normalized = normalizeSymbol(symbol)

  interface YahooSearch {
    news?: Array<Record<string, unknown>>
  }

  const data = await yahooFetch<YahooSearch>(
    `/v1/finance/search?q=${encodeURIComponent(normalized)}&quotesCount=0&newsCount=8`
  )

  return (data?.news ?? []).map((item) => ({
    title: String(item.title ?? ''),
    publisher: String(item.publisher ?? 'Yahoo Finance'),
    link: String(item.link ?? ''),
    providerPublishTime: num(item.providerPublishTime),
    summary: item.summary ? String(item.summary) : undefined,
  }))
}

export async function getMultipleQuotes(
  symbols: string[]
): Promise<Record<string, StockQuote>> {
  const unique = [...new Set(symbols.map(normalizeSymbol))]
  if (!unique.length) return {}

  const result: Record<string, StockQuote> = {}
  const uncached: string[] = []

  // Warm from cache
  await Promise.all(
    unique.map(async (sym) => {
      try {
        const cached = await redis.get<StockQuote>(`stockwatch:quote_cache:${sym}`)
        if (cached) result[sym] = cached
        else uncached.push(sym)
      } catch {
        uncached.push(sym)
      }
    })
  )

  // Fetch uncached in parallel
  const settled = await Promise.allSettled(uncached.map(getQuote))
  for (const item of settled) {
    if (item.status === 'fulfilled' && item.value) {
      result[item.value.symbol] = item.value
    }
  }

  // Sparklines
  await Promise.all(
    Object.keys(result).map(async (sym) => {
      result[sym].sparkline = await getSparklineData(sym)
    })
  )

  return result
}

export async function getSparklineData(symbol: string): Promise<number[]> {
  const normalized = normalizeSymbol(symbol)
  try {
    const cached = await getSparkline(normalized)
    if (cached?.length) return cached

    const history = await getHistorical(normalized, '5d')
    const values = history.map((h) => h.close).filter((v) => v > 0)

    if (values.length > 0) {
      await saveSparkline(normalized, values)
      return values
    }
  } catch (err) {
    console.error(`[Yahoo] sparkline failed for ${normalized}:`, err)
  }
  return []
}
