export const MARKET_OPEN_IST = '09:15'
export const MARKET_CLOSE_IST = '15:30'

export const INDEX_SYMBOLS = {
  nifty: '^NSEI',
  sensex: '^BSESN',
  bankNifty: '^NSEBANK',
} as const

export const CHART_PERIODS = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'] as const

export const DEFAULT_WATCHLIST = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS']

// A representative basket of ~100 of the largest, most liquid NSE-listed
// companies across sectors, for the scrolling ticker marquee. This is not
// pulled from a live index-constituent feed (NIFTY 100 membership changes
// periodically), so treat it as "major large/mid caps" rather than an
// official, always-current index list.
export const TOP_100_NSE_SYMBOLS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
  'BHARTIARTL.NS', 'SBIN.NS', 'LICI.NS', 'HINDUNILVR.NS', 'ITC.NS',
  'LT.NS', 'BAJFINANCE.NS', 'HCLTECH.NS', 'MARUTI.NS', 'SUNPHARMA.NS',
  'KOTAKBANK.NS', 'AXISBANK.NS', 'M&M.NS', 'NTPC.NS', 'ULTRACEMCO.NS',
  'TITAN.NS', 'ADANIENT.NS', 'ADANIPORTS.NS', 'ASIANPAINT.NS', 'BAJAJFINSV.NS',
  'WIPRO.NS', 'ONGC.NS', 'NESTLEIND.NS', 'POWERGRID.NS', 'COALINDIA.NS',
  'JSWSTEEL.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS', 'BAJAJ-AUTO.NS', 'GRASIM.NS',
  'HINDALCO.NS', 'TECHM.NS', 'DRREDDY.NS', 'CIPLA.NS', 'SBILIFE.NS',
  'HDFCLIFE.NS', 'BRITANNIA.NS', 'EICHERMOT.NS', 'INDUSINDBK.NS', 'APOLLOHOSP.NS',
  'DIVISLAB.NS', 'TATACONSUM.NS', 'PIDILITIND.NS', 'GODREJCP.NS', 'DABUR.NS',
  'HAVELLS.NS', 'SHREECEM.NS', 'AMBUJACEM.NS', 'VEDL.NS', 'GAIL.NS',
  'BPCL.NS', 'IOC.NS', 'SIEMENS.NS', 'ABB.NS', 'PNB.NS',
  'BANKBARODA.NS', 'CANBK.NS', 'IDFCFIRSTB.NS', 'AUBANK.NS', 'FEDERALBNK.NS',
  'BANDHANBNK.NS', 'CHOLAFIN.NS', 'MUTHOOTFIN.NS', 'LTIM.NS', 'MPHASIS.NS',
  'PERSISTENT.NS', 'COFORGE.NS', 'LTTS.NS', 'OFSS.NS', 'NAUKRI.NS',
  'ZOMATO.NS', 'NYKAA.NS', 'PAYTM.NS', 'POLICYBZR.NS', 'DMART.NS',
  'TRENT.NS', 'PAGEIND.NS', 'COLPAL.NS', 'MARICO.NS', 'BERGEPAINT.NS',
  'VOLTAS.NS', 'BLUESTARCO.NS', 'CUMMINSIND.NS', 'BOSCHLTD.NS', 'MOTHERSON.NS',
  'BHARATFORG.NS', 'ASHOKLEY.NS', 'TVSMOTOR.NS', 'HEROMOTOCO.NS', 'MRF.NS',
  'PIIND.NS', 'SRF.NS', 'AARTIIND.NS', 'UPL.NS', 'DEEPAKNTR.NS',
] as const

export const TICKER_REFRESH_SECONDS = 60
