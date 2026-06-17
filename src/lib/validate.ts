/**
 * validate.ts — shared input validation for API routes.
 *
 * This is a single-user app gated by middleware auth, so these checks are
 * defense-in-depth rather than the primary security boundary: they stop a
 * leaked/stolen session cookie (or a buggy client) from writing oversized or
 * malformed data into Redis, and keep symbols clean before they're sent to
 * NSE/Yahoo or interpolated into notification text.
 */

// NSE/BSE equities after normalizeSymbol(): e.g. RELIANCE.NS, M&M.NS, 500325.BO
// Indices: ^NSEI, ^BSESN, ^NSEBANK
const SYMBOL_PATTERN = /^(\^[A-Z]{2,15}|[A-Z0-9&-]{1,20}\.(NS|BO))$/

export function isValidSymbol(symbol: string): boolean {
  return SYMBOL_PATTERN.test(symbol)
}

export const MAX_NOTES_LENGTH = 10_000
export const MAX_BATCH_SYMBOLS = 100
export const MAX_PORTFOLIO_VALUE = 1_000_000_000 // 100 crore — generous sanity ceiling
export const MAX_ALERT_THRESHOLD = 10_000_000 // ₹1 crore per share — generous sanity ceiling

export function clampNotes(notes: string): string {
  return notes.slice(0, MAX_NOTES_LENGTH)
}

export function isFiniteNonNegative(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max
}

export function isFinitePositive(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max
}
