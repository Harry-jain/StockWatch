import yahooFinance from 'yahoo-finance2'
import { subDays, subMonths, subYears } from 'date-fns'
import type { ChartPeriod, NewsItem, OHLCV, SearchResult, StockQuote } from '@/types'
import { getSparkline, saveSparkline } from '@/lib/redis'

export function normalizeSymbol(input: string): string {
  const symbol = input.trim().toUpperCase()
  if (!symbol) return symbol
  if (symbol.startsWith('^') || symbol.endsWith('.NS') || symbol.endsWith('.BO')) return symbol
  return `${symbol}.NS`
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function mapQuote(raw: Record<string, unknown>, requestedSymbol: string): StockQuote {
  const price = numberOrZero(raw.regularMarketPrice)
  const previousClose = numberOrZero(raw.regularMarketPreviousClose)
  const change = numberOrZero(raw.regularMarketChange) || price - previousClose
  const changePercent =
    numberOrZero(raw.regularMarketChangePercent) || (previousClose ? ((price - previousClose) / previousClose) * 100 : 0)

  return {
    symbol: String(raw.symbol ?? requestedSymbol),
    price,
    change,
    changePercent,
    previousClose,
    open: numberOrZero(raw.regularMarketOpen),
    dayHigh: numberOrZero(raw.regularMarketDayHigh),
    dayLow: numberOrZero(raw.regularMarketDayLow),
    volume: numberOrZero(raw.regularMarketVolume),
    avgVolume: numberOrZero(raw.averageDailyVolume3Month),
    marketCap: numberOrZero(raw.marketCap),
    pe: numberOrZero(raw.trailingPE),
    eps: numberOrZero(raw.epsTrailingTwelveMonths),
    dividendYield: numberOrZero(raw.trailingAnnualDividendYield) * 100,
    fiftyTwoWeekHigh: numberOrZero(raw.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: numberOrZero(raw.fiftyTwoWeekLow),
    shortName: String(raw.shortName ?? raw.displayName ?? requestedSymbol),
    longName: String(raw.longName ?? raw.shortName ?? requestedSymbol),
    exchange: String(raw.fullExchangeName ?? raw.exchange ?? ''),
    currency: String(raw.currency ?? 'INR'),
  }
}

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  const normalized = normalizeSymbol(symbol)
  try {
    const quote = (await yahooFinance.quote(normalized)) as unknown as Record<string, unknown>
    const mapped = mapQuote(quote, normalized)
    mapped.sparkline = await getSparklineData(normalized)
    return mapped
  } catch (error) {
    console.error(`Yahoo quote failed for ${normalized}`, error)
    return null
  }
}

function rangeForPeriod(period: ChartPeriod): { period1: Date; interval: '1d' | '1wk' } {
  const now = new Date()
  switch (period) {
    case '1d':
      return { period1: subDays(now, 1), interval: '1d' }
    case '5d':
      return { period1: subDays(now, 7), interval: '1d' }
    case '1mo':
      return { period1: subMonths(now, 1), interval: '1d' }
    case '3mo':
      return { period1: subMonths(now, 3), interval: '1d' }
    case '6mo':
      return { period1: subMonths(now, 6), interval: '1d' }
    case '1y':
      return { period1: subYears(now, 1), interval: '1d' }
    case '5y':
      return { period1: subYears(now, 5), interval: '1wk' }
  }
}

export async function getHistorical(symbol: string, period: ChartPeriod): Promise<OHLCV[]> {
  const normalized = normalizeSymbol(symbol)
  const range = rangeForPeriod(period)
  try {
    const rows = (await yahooFinance.historical(normalized, {
      period1: range.period1,
      period2: new Date(),
      interval: range.interval,
    })) as Array<Record<string, unknown>>

    return rows
      .filter((row) => row.date && row.open && row.high && row.low && row.close)
      .map((row) => ({
        time: Math.floor(new Date(row.date as Date).getTime() / 1000),
        open: numberOrZero(row.open),
        high: numberOrZero(row.high),
        low: numberOrZero(row.low),
        close: numberOrZero(row.close),
        volume: numberOrZero(row.volume),
      }))
  } catch (error) {
    console.error(`Yahoo historical failed for ${normalized}`, error)
    return []
  }
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (query.trim().length < 2) return []
  try {
    const result = (await yahooFinance.search(query, { quotesCount: 10, newsCount: 0 })) as {
      quotes?: Array<Record<string, unknown>>
    }
    return (result.quotes ?? [])
      .filter((item) => item.quoteType === 'EQUITY')
      .filter((item) => String(item.symbol ?? '').endsWith('.NS') || String(item.symbol ?? '').endsWith('.BO'))
      .slice(0, 8)
      .map((item) => ({
        symbol: String(item.symbol),
        shortname: item.shortname ? String(item.shortname) : undefined,
        longname: item.longname ? String(item.longname) : undefined,
        exchange: item.exchange ? String(item.exchange) : undefined,
        quoteType: item.quoteType ? String(item.quoteType) : undefined,
      }))
  } catch (error) {
    console.error(`Yahoo search failed for ${query}`, error)
    return []
  }
}

export async function getQuoteSummaryNews(symbol: string): Promise<NewsItem[]> {
  const normalized = normalizeSymbol(symbol)
  try {
    const summary = (await yahooFinance.quoteSummary(normalized, { modules: ['summaryDetail'] })) as unknown
    void summary
    const search = (await yahooFinance.search(normalized, { quotesCount: 0, newsCount: 8 })) as {
      news?: Array<Record<string, unknown>>
    }
    return (search.news ?? []).map((item) => ({
      title: String(item.title ?? ''),
      publisher: String(item.publisher ?? 'Yahoo Finance'),
      link: String(item.link ?? ''),
      providerPublishTime: numberOrZero(item.providerPublishTime),
      summary: item.summary ? String(item.summary) : undefined,
    }))
  } catch (error) {
    console.error(`Yahoo news failed for ${normalized}`, error)
    return []
  }
}

export async function getMultipleQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  const uniqueSymbols = [...new Set(symbols.map(normalizeSymbol))]
  if (!uniqueSymbols.length) return {}
  try {
    const quotes = (await yahooFinance.quote(uniqueSymbols)) as unknown
    const rows = Array.isArray(quotes) ? quotes : [quotes]
    const quotesMap = rows.reduce<Record<string, StockQuote>>((acc, row) => {
      const quote = mapQuote(row as Record<string, unknown>, String((row as Record<string, unknown>).symbol ?? ''))
      acc[quote.symbol] = quote
      return acc
    }, {})

    // Fetch and append sparklines in parallel
    await Promise.all(
      Object.keys(quotesMap).map(async (sym) => {
        quotesMap[sym].sparkline = await getSparklineData(sym)
      })
    )
    return quotesMap
  } catch (error) {
    console.error('Yahoo batch quote failed', error)
    const settled = await Promise.allSettled(uniqueSymbols.map((symbol) => getQuote(symbol)))
    return settled.reduce<Record<string, StockQuote>>((acc, item) => {
      if (item.status === 'fulfilled' && item.value) acc[item.value.symbol] = item.value
      return acc
    }, {})
  }
}

export async function getSparklineData(symbol: string): Promise<number[]> {
  const normalized = normalizeSymbol(symbol)
  try {
    const cached = await getSparkline(normalized)
    if (cached && cached.length) {
      return cached
    }

    const history = await getHistorical(normalized, '5d')
    const values = history.map((h) => h.close).filter((v) => typeof v === 'number')

    if (values.length > 0) {
      await saveSparkline(normalized, values)
      return values
    }
  } catch (error) {
    console.error(`Failed to get sparkline data for ${normalized}`, error)
  }
  return []
}
