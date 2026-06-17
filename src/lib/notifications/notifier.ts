import { formatINR, formatPercent } from '@/lib/format'
import { sendGmail } from '@/lib/notifications/gmail'
import { sendTelegramBoth } from '@/lib/notifications/telegram'
import { sendWhatsAppFamily, sendWhatsAppPersonal } from '@/lib/notifications/whatsapp'
import type {
  EODSummaryData,
  HourlyUpdateData,
  MarketClosedData,
  MorningOpenData,
  PriceAlertData,
  CustomAlertData,
  StockQuote,
} from '@/types'

export type NotificationType =
  | 'MORNING_OPEN'
  | 'HOURLY_UPDATE'
  | 'PRICE_ALERT'
  | 'CUSTOM_ALERT'
  | 'EOD_SUMMARY'
  | 'MARKET_CLOSED'

type NotificationData =
  | MorningOpenData
  | HourlyUpdateData
  | PriceAlertData
  | CustomAlertData
  | EODSummaryData
  | MarketClosedData

const MARKET_CLOSED_REASON_TEXT: Record<MarketClosedData['reason'], string> = {
  weekend: "It's the weekend — NSE and BSE are closed. Next session opens Monday at 09:15 IST.",
  holiday: 'Today is an NSE/BSE trading holiday. Markets are closed for the day.',
  'before-hours': "Markets haven't opened yet today — NSE/BSE open at 09:15 IST.",
  'after-hours': 'Markets have closed for the day (15:30 IST). See you next session.',
}

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

  if (type === 'MARKET_CLOSED') {
    const payload = data as MarketClosedData
    return [
      `StockWatch — ${payload.job} (${payload.time})`,
      'Nothing to update right now: markets are closed.',
      MARKET_CLOSED_REASON_TEXT[payload.reason],
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

// Composes styled email-client compatible badges for gains/losses
function htmlBadge(value?: number | null): string {
  const num = value ?? 0
  const positive = num >= 0
  const color = positive ? '#22c55e' : '#ef4444'
  const bg = positive ? '#052e16' : '#450a0a'
  return `<span style="display:inline-block;padding:4px 8px;font-family:monospace;font-size:12px;font-weight:bold;color:${color};background-color:${bg};border-radius:4px">${formatPercent(num)}</span>`
}

function composeHtmlTemplate(type: NotificationType, data: NotificationData): string {
  const containerStyle = "background-color:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto;border:1px solid #262626;border-radius:8px;"
  
  if (type === 'MORNING_OPEN') {
    const payload = data as MorningOpenData
    const rows = payload.watchlist.map((quote) => `
      <tr style="border-bottom:1px solid #262626">
        <td style="padding:12px;font-family:monospace;font-weight:bold;color:#3b82f6">${quote.symbol}</td>
        <td style="padding:12px;color:#e5e5e5">${quote.shortName}</td>
        <td style="padding:12px;text-align:right;font-family:monospace;color:#f5f5f5">${formatINR(quote.price)}</td>
        <td style="padding:12px;text-align:right;font-family:monospace;color:#a3a3a3">${formatINR(quote.previousClose)}</td>
      </tr>
    `).join('')

    return `
      <div style="${containerStyle}">
        <h1 style="font-size:20px;margin-top:0;margin-bottom:4px;color:#f5f5f5;border-bottom:1px solid #262626;padding-bottom:12px">☀️ StockWatch - Morning Open</h1>
        <p style="font-size:13px;color:#a3a3a3;margin-bottom:16px;margin-top:4px">Market Open Details for ${payload.date} (09:15 IST)</p>
        
        <!-- Index Tables -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px">
          <tr>
            ${payload.nifty ? `
            <td width="50%" style="padding-right:8px">
              <div style="background:#111111;border:1px solid #262626;padding:12px;border-radius:6px">
                <span style="display:block;font-size:11px;color:#a3a3a3;text-transform:uppercase">NIFTY 50</span>
                <span style="display:block;font-size:18px;font-weight:bold;color:#f5f5f5;margin:4px 0">${formatINR(payload.nifty.price)}</span>
                <span style="font-size:12px;font-weight:bold;color:${payload.nifty.changePercent >= 0 ? '#22c55e' : '#ef4444'}">${payload.nifty.changePercent >= 0 ? '+' : ''}${formatPercent(payload.nifty.changePercent)}</span>
              </div>
            </td>` : ''}
            ${payload.sensex ? `
            <td width="50%" style="padding-left:8px">
              <div style="background:#111111;border:1px solid #262626;padding:12px;border-radius:6px">
                <span style="display:block;font-size:11px;color:#a3a3a3;text-transform:uppercase">SENSEX</span>
                <span style="display:block;font-size:18px;font-weight:bold;color:#f5f5f5;margin:4px 0">${formatINR(payload.sensex.price)}</span>
                <span style="font-size:12px;font-weight:bold;color:${payload.sensex.changePercent >= 0 ? '#22c55e' : '#ef4444'}">${payload.sensex.changePercent >= 0 ? '+' : ''}${formatPercent(payload.sensex.changePercent)}</span>
              </div>
            </td>` : ''}
          </tr>
        </table>

        <!-- Watchlist Table -->
        <h3 style="font-size:14px;color:#a3a3a3;text-transform:uppercase;margin-bottom:8px">Your Watchlist</h3>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#111111;border:1px solid #262626;border-radius:6px;overflow:hidden">
          <thead>
            <tr style="background:#1a1a1a;border-bottom:1px solid #262626">
              <th style="padding:10px;text-align:left;font-size:12px;color:#a3a3a3">Symbol</th>
              <th style="padding:10px;text-align:left;font-size:12px;color:#a3a3a3">Company</th>
              <th style="padding:10px;text-align:right;font-size:12px;color:#a3a3a3">Open</th>
              <th style="padding:10px;text-align:right;font-size:12px;color:#a3a3a3">Prev Close</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#a3a3a3">No stocks in watchlist</td></tr>`}
          </tbody>
        </table>
      </div>
    `
  }

  if (type === 'HOURLY_UPDATE') {
    const payload = data as HourlyUpdateData
    const rows = payload.quotes.map((quote) => `
      <tr style="border-bottom:1px solid #262626">
        <td style="padding:12px;font-family:monospace;font-weight:bold;color:#3b82f6">${quote.symbol}</td>
        <td style="padding:12px;text-align:right;font-family:monospace;color:#f5f5f5">${formatINR(quote.price)}</td>
        <td style="padding:12px;text-align:right">${htmlBadge(quote.changeFromOpen)}</td>
        <td style="padding:12px;text-align:right">${htmlBadge(quote.changeFromLastHour)}</td>
      </tr>
    `).join('')

    return `
      <div style="${containerStyle}">
        <h1 style="font-size:20px;margin-top:0;margin-bottom:4px;color:#f5f5f5;border-bottom:1px solid #262626;padding-bottom:12px">⏰ StockWatch - Hourly Update</h1>
        <p style="font-size:13px;color:#a3a3a3;margin-bottom:16px;margin-top:4px">Hourly digest at ${payload.time}</p>
        
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#111111;border:1px solid #262626;border-radius:6px;overflow:hidden">
          <thead>
            <tr style="background:#1a1a1a;border-bottom:1px solid #262626">
              <th style="padding:10px;text-align:left;font-size:12px;color:#a3a3a3">Symbol</th>
              <th style="padding:10px;text-align:right;font-size:12px;color:#a3a3a3">Price</th>
              <th style="padding:10px;text-align:right;font-size:12px;color:#a3a3a3">Since Open</th>
              <th style="padding:10px;text-align:right;font-size:12px;color:#a3a3a3">Last Hour</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `
  }

  if (type === 'PRICE_ALERT') {
    const payload = data as PriceAlertData
    const diff = payload.currentPrice - payload.previousPrice
    const color = payload.changePercent >= 0 ? '#22c55e' : '#ef4444'
    const bg = payload.changePercent >= 0 ? '#052e16' : '#450a0a'
    const border = payload.changePercent >= 0 ? '#15803d' : '#b91c1c'
    
    return `
      <div style="${containerStyle}">
        <div style="background-color:${bg};border:1px solid ${border};border-radius:6px;padding:16px;text-align:center;margin-bottom:20px">
          <h2 style="color:${color};margin:0;font-size:18px;text-transform:uppercase;letter-spacing:1px">⚠️ Price Alert</h2>
          <p style="color:#e5e5e5;font-size:14px;margin:8px 0 0 0">${payload.symbol} moved ${formatPercent(payload.changePercent)} in the last hour</p>
        </div>

        <div style="background-color:#111111;border:1px solid #262626;border-radius:6px;padding:20px">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:14px;color:#e5e5e5">
            <tr>
              <td style="padding:8px 0;color:#a3a3a3">Company</td>
              <td style="padding:8px 0;text-align:right;font-weight:bold">${payload.shortName}</td>
            </tr>
            <tr style="border-top:1px solid #262626">
              <td style="padding:8px 0;color:#a3a3a3">Current Price</td>
              <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:16px;color:#f5f5f5;font-weight:bold">${formatINR(payload.currentPrice)}</td>
            </tr>
            <tr style="border-top:1px solid #262626">
              <td style="padding:8px 0;color:#a3a3a3">Previous Price</td>
              <td style="padding:8px 0;text-align:right;font-family:monospace">${formatINR(payload.previousPrice)}</td>
            </tr>
            <tr style="border-top:1px solid #262626">
              <td style="padding:8px 0;color:#a3a3a3">Change Amount</td>
              <td style="padding:8px 0;text-align:right;font-family:monospace;color:${color}">${diff >= 0 ? '+' : ''}${formatINR(diff)}</td>
            </tr>
            <tr style="border-top:1px solid #262626">
              <td style="padding:8px 0;color:#a3a3a3">Triggered Time</td>
              <td style="padding:8px 0;text-align:right">${payload.time}</td>
            </tr>
          </table>
        </div>
      </div>
    `
  }

  if (type === 'CUSTOM_ALERT') {
    const payload = data as CustomAlertData
    const directionLabel = payload.direction === 'above' ? 'crossed ABOVE' : 'dropped BELOW'
    
    return `
      <div style="${containerStyle}">
        <div style="background-color:#1e3a8a;border:1px solid #3b82f6;border-radius:6px;padding:16px;text-align:center;margin-bottom:20px">
          <h2 style="color:#3b82f6;margin:0;font-size:18px;text-transform:uppercase;letter-spacing:1px">🔔 Custom Alert</h2>
          <p style="color:#e5e5e5;font-size:14px;margin:8px 0 0 0">${payload.symbol} ${directionLabel} your threshold!</p>
        </div>

        <div style="background-color:#111111;border:1px solid #262626;border-radius:6px;padding:20px">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:14px;color:#e5e5e5">
            <tr>
              <td style="padding:8px 0;color:#a3a3a3">Company</td>
              <td style="padding:8px 0;text-align:right;font-weight:bold">${payload.shortName}</td>
            </tr>
            <tr style="border-top:1px solid #262626">
              <td style="padding:8px 0;color:#a3a3a3">Current Price</td>
              <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:16px;color:#3b82f6;font-weight:bold">${formatINR(payload.currentPrice)}</td>
            </tr>
            <tr style="border-top:1px solid #262626">
              <td style="padding:8px 0;color:#a3a3a3">Alert Threshold</td>
              <td style="padding:8px 0;text-align:right;font-family:monospace;color:#f5f5f5">${formatINR(payload.threshold)} (${payload.direction.toUpperCase()})</td>
            </tr>
            <tr style="border-top:1px solid #262626">
              <td style="padding:8px 0;color:#a3a3a3">Triggered Time</td>
              <td style="padding:8px 0;text-align:right">${payload.time}</td>
            </tr>
          </table>
        </div>
      </div>
    `
  }

  if (type === 'MARKET_CLOSED') {
    const payload = data as MarketClosedData
    return `
      <div style="${containerStyle}">
        <div style="background-color:#111111;border:1px solid #262626;border-radius:6px;padding:24px;text-align:center">
          <h2 style="color:#a3a3a3;margin:0 0 8px 0;font-size:16px;text-transform:uppercase;letter-spacing:1px">🌙 ${payload.job}</h2>
          <p style="color:#f5f5f5;font-size:15px;margin:0 0 4px 0;font-weight:bold">Nothing to update — markets are closed</p>
          <p style="color:#a3a3a3;font-size:13px;margin:8px 0 0 0">${MARKET_CLOSED_REASON_TEXT[payload.reason]}</p>
          <p style="color:#525252;font-size:11px;margin:16px 0 0 0">${payload.date} · ${payload.time}</p>
        </div>
      </div>
    `
  }

  const payload = data as EODSummaryData
  const sorted = [...payload.performers].sort((a, b) => b.dayChangePercent - a.dayChangePercent)
  
  const gRows = sorted.slice(0, 3).map((item, index) => `
    <tr style="border-bottom:1px solid #262626">
      <td style="padding:8px;font-size:13px;color:#a3a3a3">${index + 1}</td>
      <td style="padding:8px;font-family:monospace;font-weight:bold;color:#f5f5f5">${item.symbol}</td>
      <td style="padding:8px;text-align:right;font-family:monospace;color:#e5e5e5">${formatINR(item.price)}</td>
      <td style="padding:8px;text-align:right">${htmlBadge(item.dayChangePercent)}</td>
    </tr>
  `).join('')

  const lRows = sorted.slice(-3).reverse().map((item, index) => `
    <tr style="border-bottom:1px solid #262626">
      <td style="padding:8px;font-size:13px;color:#a3a3a3">${index + 1}</td>
      <td style="padding:8px;font-family:monospace;font-weight:bold;color:#f5f5f5">${item.symbol}</td>
      <td style="padding:8px;text-align:right;font-family:monospace;color:#e5e5e5">${formatINR(item.price)}</td>
      <td style="padding:8px;text-align:right">${htmlBadge(item.dayChangePercent)}</td>
    </tr>
  `).join('')

  return `
    <div style="${containerStyle}">
      <h1 style="font-size:20px;margin-top:0;margin-bottom:4px;color:#f5f5f5;border-bottom:1px solid #262626;padding-bottom:12px">🌙 StockWatch - EOD Summary</h1>
      <p style="font-size:13px;color:#a3a3a3;margin-bottom:16px;margin-top:4px">Market Close Details for ${payload.date} (15:30 IST)</p>
      
      <!-- Index Tables -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px">
        <tr>
          ${payload.nifty ? `
          <td width="33%" style="padding-right:4px">
            <div style="background:#111111;border:1px solid #262626;padding:10px;border-radius:6px;text-align:center">
              <span style="display:block;font-size:10px;color:#a3a3a3">NIFTY 50</span>
              <span style="display:block;font-size:15px;font-weight:bold;color:#f5f5f5;margin:4px 0">${formatINR(payload.nifty.price)}</span>
              <span style="font-size:11px;font-weight:bold;color:${payload.nifty.changePercent >= 0 ? '#22c55e' : '#ef4444'}">${payload.nifty.changePercent >= 0 ? '+' : ''}${formatPercent(payload.nifty.changePercent)}</span>
            </div>
          </td>` : ''}
          ${payload.sensex ? `
          <td width="33%" style="padding:0 4px">
            <div style="background:#111111;border:1px solid #262626;padding:10px;border-radius:6px;text-align:center">
              <span style="display:block;font-size:10px;color:#a3a3a3">SENSEX</span>
              <span style="display:block;font-size:15px;font-weight:bold;color:#f5f5f5;margin:4px 0">${formatINR(payload.sensex.price)}</span>
              <span style="font-size:11px;font-weight:bold;color:${payload.sensex.changePercent >= 0 ? '#22c55e' : '#ef4444'}">${payload.sensex.changePercent >= 0 ? '+' : ''}${formatPercent(payload.sensex.changePercent)}</span>
            </div>
          </td>` : ''}
          ${payload.bankNifty ? `
          <td width="33%" style="padding-left:4px">
            <div style="background:#111111;border:1px solid #262626;padding:10px;border-radius:6px;text-align:center">
              <span style="display:block;font-size:10px;color:#a3a3a3">BANK NIFTY</span>
              <span style="display:block;font-size:15px;font-weight:bold;color:#f5f5f5;margin:4px 0">${formatINR(payload.bankNifty.price)}</span>
              <span style="font-size:11px;font-weight:bold;color:${payload.bankNifty.changePercent >= 0 ? '#22c55e' : '#ef4444'}">${payload.bankNifty.changePercent >= 0 ? '+' : ''}${formatPercent(payload.bankNifty.changePercent)}</span>
            </div>
          </td>` : ''}
        </tr>
      </table>

      <!-- Top Gainers -->
      <h3 style="font-size:13px;color:#22c55e;text-transform:uppercase;margin:16px 0 8px 0;letter-spacing:0.5px">Top Performers</h3>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#111111;border:1px solid #262626;border-radius:6px;margin-bottom:20px;overflow:hidden">
        <tbody>
          ${gRows.length ? gRows : '<tr><td colspan="4" style="padding:12px;text-align:center;color:#a3a3a3">No data available</td></tr>'}
        </tbody>
      </table>

      <!-- Top Losers -->
      <h3 style="font-size:13px;color:#ef4444;text-transform:uppercase;margin:16px 0 8px 0;letter-spacing:0.5px">Worst Performers</h3>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#111111;border:1px solid #262626;border-radius:6px;overflow:hidden">
        <tbody>
          ${lRows.length ? lRows : '<tr><td colspan="4" style="padding:12px;text-align:center;color:#a3a3a3">No data available</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

export async function broadcastNotification(type: NotificationType, data: NotificationData): Promise<void> {
  const text = composeText(type, data)
  const subject = `StockWatch ${type.replaceAll('_', ' ')}`
  const results = await Promise.allSettled([
    sendTelegramBoth(text),
    sendGmail(subject, composeHtmlTemplate(type, data)),
    sendWhatsAppPersonal(text),
    sendWhatsAppFamily(text),
  ])
  results.forEach((result, index) => {
    if (result.status === 'rejected') console.error(`Notification channel ${index} failed`, result.reason)
  })
}
