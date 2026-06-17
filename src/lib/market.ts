import { format } from 'date-fns'

export const NSE_HOLIDAYS_2025_2026 = [
  '2025-02-26',
  '2025-03-14',
  '2025-03-31',
  '2025-04-10',
  '2025-04-14',
  '2025-04-18',
  '2025-05-01',
  '2025-08-15',
  '2025-08-27',
  '2025-10-02',
  '2025-10-21',
  '2025-10-22',
  '2025-11-05',
  '2025-12-25',
  '2026-01-26',
  '2026-03-03',
  '2026-03-26',
  '2026-03-31',
  '2026-04-03',
  '2026-04-14',
  '2026-05-01',
  '2026-05-28',
  '2026-06-26',
  '2026-09-14',
  '2026-10-02',
  '2026-10-20',
  '2026-11-10',
  '2026-11-24',
  '2026-12-25',
]

function getISTParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date)

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    hour: Number(byType.hour),
    minute: Number(byType.minute),
    weekday: byType.weekday,
  }
}

export function getCurrentISTTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
}

export function formatISTTime(date = new Date()): string {
  return `${new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)} IST`
}

export function isWeekday(date = new Date()): boolean {
  const weekday = getISTParts(date).weekday
  return weekday !== 'Sat' && weekday !== 'Sun'
}

export function isMarketOpen(date = new Date()): boolean {
  const parts = getISTParts(date)
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return false
  if (NSE_HOLIDAYS_2025_2026.includes(parts.date)) return false

  const minutes = parts.hour * 60 + parts.minute
  const open = 9 * 60 + 15
  const close = 15 * 60 + 30
  return minutes >= open && minutes <= close
}

export type MarketClosedReason = 'weekend' | 'holiday' | 'before-hours' | 'after-hours'

/** Returns null if the market is currently open, otherwise why it's closed. */
export function getMarketClosedReason(date = new Date()): MarketClosedReason | null {
  const parts = getISTParts(date)
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return 'weekend'
  if (NSE_HOLIDAYS_2025_2026.includes(parts.date)) return 'holiday'

  const minutes = parts.hour * 60 + parts.minute
  const open = 9 * 60 + 15
  const close = 15 * 60 + 30
  if (minutes < open) return 'before-hours'
  if (minutes > close) return 'after-hours'
  return null
}

export function formatISTDate(date = new Date()): string {
  return format(getCurrentISTTimeFrom(date), 'dd MMM yyyy')
}

function getCurrentISTTimeFrom(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
}
