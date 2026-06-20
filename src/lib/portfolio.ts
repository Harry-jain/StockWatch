import { getAllPortfolioEntries } from '@/lib/redis'
import { getMultipleQuotes } from '@/lib/yahoo-finance'
import type { PortfolioHolding, PortfolioSummary } from '@/types'

export async function computePortfolioSummary(): Promise<PortfolioSummary> {
  const entries = await getAllPortfolioEntries()
  if (entries.length === 0) {
    return { holdings: [], totalInvested: 0, totalCurrent: 0, totalPnl: 0, totalPnlPercent: 0 }
  }

  const quotes = await getMultipleQuotes(entries.map((entry) => entry.symbol))

  let totalInvested = 0
  let totalCurrent = 0

  const rawHoldings = entries.map((entry) => {
    const quote = quotes[entry.symbol]
    const currentPrice = quote?.price ?? entry.avgBuyPrice
    const investedValue = entry.qty * entry.avgBuyPrice
    const currentValue = entry.qty * currentPrice
    totalInvested += investedValue
    totalCurrent += currentValue
    return {
      symbol: entry.symbol,
      shortName: quote?.shortName ?? entry.symbol,
      qty: entry.qty,
      avgBuyPrice: entry.avgBuyPrice,
      currentPrice,
      investedValue,
      currentValue,
    }
  })

  const holdings: PortfolioHolding[] = rawHoldings
    .map((holding) => ({
      ...holding,
      pnl: holding.currentValue - holding.investedValue,
      pnlPercent: holding.investedValue > 0 ? ((holding.currentValue - holding.investedValue) / holding.investedValue) * 100 : 0,
      allocationPercent: totalCurrent > 0 ? (holding.currentValue / totalCurrent) * 100 : 0,
    }))
    .sort((a, b) => b.currentValue - a.currentValue)

  const totalPnl = totalCurrent - totalInvested

  return {
    holdings,
    totalInvested,
    totalCurrent,
    totalPnl,
    totalPnlPercent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
  }
}
