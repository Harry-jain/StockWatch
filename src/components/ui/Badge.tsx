import clsx from 'clsx'
import { formatPercent } from '@/lib/format'

export function Badge({ value, children }: { value?: number | null; children?: React.ReactNode }) {
  const positive = (value ?? 0) >= 0
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center px-2.5 font-mono text-xs font-semibold glass-badge border shadow-[0_2px_8px_0_rgba(0,0,0,0.15)] shadow-black/20',
        positive ? 'text-market-up bg-market-up/10 border-market-up/25 shadow-market-up/5' : 'text-market-down bg-market-down/10 border-market-down/25 shadow-market-down/5',
      )}
    >
      {children ?? formatPercent(value)}
    </span>
  )
}
