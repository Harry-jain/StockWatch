'use client'

import { CHART_PERIODS } from '@/lib/constants'
import type { ChartPeriod } from '@/types'

export function ChartControls({ period, onPeriodChange }: { period: ChartPeriod; onPeriodChange: (period: ChartPeriod) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHART_PERIODS.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPeriodChange(item)}
          className={`h-8 rounded-md px-3 font-mono text-xs transition ${
            period === item ? 'bg-accent text-white' : 'border border-background-border text-text-secondary hover:bg-background-elevated'
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
