export function formatINR(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatVolume(value?: number | null): string {
  if (!value) return '-'
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}

export function formatCap(value?: number | null): string {
  if (!value) return '-'
  if (value >= 1e7) return `${formatINR(value / 1e7)} Cr`
  return formatINR(value)
}
