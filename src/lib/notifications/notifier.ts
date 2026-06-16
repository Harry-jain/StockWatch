import { formatINR, formatPercent } from '@/lib/format'
import { sendGmail } from '@/lib/notifications/gmail'
import { sendTelegramBoth } from '@/lib/notifications/telegram'
import { sendWhatsAppFamily, sendWhatsAppPersonal } from '@/lib/notifications/whatsapp'
import type { EODSummaryData, HourlyUpdateData, MorningOpenData, PriceAlertData, CustomAlertData } from '@/types'

export type NotificationType = 'MORNING_OPEN' | 'HOURLY_UPDATE' | 'PRICE_ALERT' | 'CUSTOM_ALERT' | 'EOD_SUMMARY'

type NotificationData = MorningOpenData | HourlyUpdateData | PriceAlertData | CustomAlertData | EODSummaryData

function quoteLine(label: string, price?: number, change?: number): string {
  return `${label}: ${formatINR(price)} (${formatPercent(change)})`
}

function composeText(type: NotificationType, data: NotificationData): string {
  if (type === 'MORNING_OPEN') {
    const payload = data as MorningOpenData
    const rows = payload.watchlist.map((quote) => `- ${quote.symbol} - ${formatINR(quote.price)} prev ${formatINR(quote.previousClose)}`)
    return [
      `Market Open - 09:15 IST - ${payload.date}`,
      payload.nifty ? quoteLine('NIFTY 50', payload.nifty.price, payload.nifty.changePercent) : '',
      payload.sensex ? quoteLine('SENSEX', payload.sensex.price, payload.sensex.changePercent) : '',
      'Your Watchlist Opening Prices:',
      ...rows,
    ].filter(Boolean).join('\n')
  }

  if (type === 'HOURLY_UPDATE') {
    const payload = data as HourlyUpdateData
    return [
      `Hourly Update - ${payload.time}`,
      ...payload.quotes.map(
        (quote) =>
          `- ${quote.symbol} - ${formatINR(quote.price)} (${formatPercent(quote.changeFromOpen)} since open | ${formatPercent(
            quote.changeFromLastHour,
          )} last hr)`,
      ),
    ].join('\n')
  }

  if (type === 'PRICE_ALERT') {
    const payload = data as PriceAlertData
    const diff = payload.currentPrice - payload.previousPrice
    return [
      `PRICE ALERT - ${payload.time}`,
      `${payload.symbol} moved ${formatPercent(payload.changePercent)} in the last hour`,
      `Current Price: ${formatINR(payload.currentPrice)}`,
      `Last Hour Price: ${formatINR(payload.previousPrice)}`,
      `Change: ${formatINR(diff)}`,
      'This alert triggered because the threshold was breached.',
    ].join('\n')
  }

  if (type === 'CUSTOM_ALERT') {
    const payload = data as CustomAlertData
    const directionLabel = payload.direction === 'above' ? 'crossed ABOVE' : 'dropped BELOW'
    return [
      `⚠️ CUSTOM ALERT - ${payload.time}`,
      `${payload.symbol} (${payload.shortName}) has ${directionLabel} your threshold of ${formatINR(payload.threshold)}!`,
      `Current Price: ${formatINR(payload.currentPrice)}`,
      `Threshold: ${formatINR(payload.threshold)}`,
    ].join('\n')
  }

  const payload = data as EODSummaryData
  const sorted = [...payload.performers].sort((a, b) => b.dayChangePercent - a.dayChangePercent)
  const best = sorted.slice(0, 3).map((item, index) => `${index + 1}. ${item.symbol} ${formatPercent(item.dayChangePercent)} ${formatINR(item.price)}`)
  const worst = sorted.slice(-3).reverse().map((item, index) => `${index + 1}. ${item.symbol} ${formatPercent(item.dayChangePercent)} ${formatINR(item.price)}`)
  return [
    `Market Close - 15:30 IST - ${payload.date}`,
    "Today's Performance in Your Watchlist:",
    'Best Performers:',
    ...best,
    'Worst Performers:',
    ...worst,
    'Market Indices at Close:',
    payload.nifty ? quoteLine('NIFTY 50', payload.nifty.price, payload.nifty.changePercent) : '',
    payload.sensex ? quoteLine('SENSEX', payload.sensex.price, payload.sensex.changePercent) : '',
    payload.bankNifty ? quoteLine('BANK NIFTY', payload.bankNifty.price, payload.bankNifty.changePercent) : '',
  ].filter(Boolean).join('\n')
}

function composeHtml(text: string): string {
  const rows = text
    .split('\n')
    .map((line) => `<p style="margin:6px 0;color:#e5e5e5;font-family:Arial,sans-serif">${line}</p>`)
    .join('')
  return `<div style="background:#0f0f0f;padding:24px;border-radius:8px">${rows}</div>`
}

export async function broadcastNotification(type: NotificationType, data: NotificationData): Promise<void> {
  const text = composeText(type, data)
  const subject = `StockWatch ${type.replaceAll('_', ' ')}`
  const results = await Promise.allSettled([
    sendTelegramBoth(text),
    sendGmail(subject, composeHtml(text)),
    sendWhatsAppPersonal(text),
    sendWhatsAppFamily(text),
  ])
  results.forEach((result, index) => {
    if (result.status === 'rejected') console.error(`Notification channel ${index} failed`, result.reason)
  })
}
