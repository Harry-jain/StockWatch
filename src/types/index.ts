export type ChartPeriod = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y'

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  previousClose: number
  open?: number
  dayHigh?: number
  dayLow?: number
  volume?: number
  avgVolume?: number
  marketCap?: number
  pe?: number
  eps?: number
  dividendYield?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  shortName: string
  longName: string
  exchange: string
  currency: string
  sparkline?: number[]
}

export interface OHLCV {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface SearchResult {
  symbol: string
  shortname?: string
  longname?: string
  exchange?: string
  quoteType?: string
}

export interface NewsItem {
  title: string
  publisher: string
  link: string
  providerPublishTime: number
  summary?: string
}

export interface PortfolioEntry {
  symbol: string
  qty: number
  avgBuyPrice: number
  updatedAt: string
}

export interface PriceSnapshot {
  symbol: string
  price: number
  timestamp: string
  changePercent: number
}

export interface CustomAlert {
  id: string
  threshold: number
  direction: 'above' | 'below'
  triggered: boolean
  createdAt: string
}

export interface WatchlistItem {
  symbol: string
  quote?: StockQuote | null
  sector?: string
}

export interface MorningOpenData {
  date: string
  nifty: StockQuote | null
  sensex: StockQuote | null
  watchlist: StockQuote[]
}

export interface HourlyUpdateData {
  time: string
  quotes: Array<{
    symbol: string
    shortName: string
    price: number
    changeFromOpen: number
    changeFromLastHour: number
  }>
}

export interface PriceAlertData {
  symbol: string
  shortName: string
  currentPrice: number
  previousPrice: number
  changePercent: number
  direction: 'up' | 'down'
  time: string
}

export interface CustomAlertData {
  symbol: string
  shortName: string
  currentPrice: number
  threshold: number
  direction: 'above' | 'below'
  time: string
}

export interface EODSummaryData {
  date: string
  nifty: StockQuote | null
  sensex: StockQuote | null
  bankNifty: StockQuote | null
  performers: Array<{
    symbol: string
    shortName: string
    price: number
    dayChangePercent: number
  }>
}

export interface ApiError {
  error: string
}
