import { getCustomAlerts, saveCustomAlerts, getPriceSnapshot, savePriceSnapshot } from './redis'
import type { CustomAlert } from '@/types'

export const ALERT_THRESHOLD_PERCENT = Number(process.env.ALERT_THRESHOLD ?? '5')

export interface PriceChangeResult {
  symbol: string
  currentPrice: number
  previousPrice: number
  changePercent: number
  isAlert: boolean
  direction: 'up' | 'down'
}

export async function checkAndStorePrice(symbol: string, currentPrice: number): Promise<PriceChangeResult> {
  const previous = await getPriceSnapshot(symbol)
  const previousPrice = previous?.price ?? currentPrice
  const changePercent = previousPrice === 0 ? 0 : ((currentPrice - previousPrice) / previousPrice) * 100
  const direction: 'up' | 'down' = changePercent >= 0 ? 'up' : 'down'

  await savePriceSnapshot(symbol, {
    symbol,
    price: currentPrice,
    timestamp: new Date().toISOString(),
    changePercent,
  })

  return {
    symbol,
    currentPrice,
    previousPrice,
    changePercent,
    isAlert: Math.abs(changePercent) >= ALERT_THRESHOLD_PERCENT,
    direction,
  }
}

export async function checkCustomAlerts(symbol: string, currentPrice: number): Promise<CustomAlert[]> {
  const alerts = await getCustomAlerts(symbol)
  const triggeredAlerts: CustomAlert[] = []

  const updatedAlerts = alerts.map((alert) => {
    if (alert.triggered) return alert

    const isTriggered =
      alert.direction === 'above'
        ? currentPrice >= alert.threshold
        : currentPrice <= alert.threshold

    if (isTriggered) {
      const triggered: CustomAlert = { ...alert, triggered: true }
      triggeredAlerts.push(triggered)
      return triggered
    }

    return alert
  })

  if (triggeredAlerts.length > 0) {
    await saveCustomAlerts(symbol, updatedAlerts)
  }

  return triggeredAlerts
}
