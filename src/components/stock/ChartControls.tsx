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
            period === item ? 'glass-btn-primary text-white' : 'border border-white/5 bg-white/[0.03] text-text-secondary hover:text-text-primary hover:bg-white/[0.08]'
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
