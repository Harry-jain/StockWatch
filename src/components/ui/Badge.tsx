import clsx from 'clsx'
import { formatPercent } from '@/lib/format'

export function Badge({ value, children }: { value?: number | null; children?: React.ReactNode }) {
  const positive = (value ?? 0) >= 0
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center rounded-md px-2 font-mono text-xs font-semibold',
        positive ? 'bg-market-upBg text-market-up' : 'bg-market-downBg text-market-down',
      )}
    >
      {children ?? formatPercent(value)}
    </span>
  )
}
