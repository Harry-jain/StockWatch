export const MARKET_OPEN_IST = '09:15'
export const MARKET_CLOSE_IST = '15:30'

export const INDEX_SYMBOLS = {
  nifty: '^NSEI',
  sensex: '^BSESN',
  bankNifty: '^NSEBANK',
} as const

export const CHART_PERIODS = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'] as const

export const DEFAULT_WATCHLIST = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS']
