'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'
import { ChartControls } from '@/components/stock/ChartControls'
import { Skeleton } from '@/components/ui/Skeleton'
import { useStockChart } from '@/hooks/useStockChart'
import type { ChartPeriod } from '@/types'

export function StockChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null>(null)
  const [period, setPeriod] = useState<ChartPeriod>('1mo')
  const [mode, setMode] = useState<'area' | 'candles'>('candles')
  const { data, isLoading } = useStockChart(symbol, period)

  // Create the chart exactly once per mount, tear it down exactly once on
  // unmount. This used to be duplicated in the data/mode effect below
  // (destroying + recreating the whole chart on every update), which left
  // this effect's resize listener pointing at an already-disposed chart by
  // the time the component unmounted -- causing "Object is disposed".
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a3a3a3',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' },
      timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)' },
    })
    chartRef.current = chart

    const resize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      seriesRef.current = null
      chartRef.current = null
      chart.remove()
    }
  }, [])

  // Swap the series in place when data or display mode changes. Never
  // recreate the chart object itself -- only the series on it.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !data?.data.length) return

    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current)
      seriesRef.current = null
    }

    if (mode === 'candles') {
      const series = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      })
      series.setData(
        data.data.map((item) => ({ time: item.time as never, open: item.open, high: item.high, low: item.low, close: item.close })),
      )
      seriesRef.current = series
    } else {
      const series = chart.addAreaSeries({
        lineColor: '#3b82f6',
        topColor: 'rgba(59,130,246,0.35)',
        bottomColor: 'rgba(59,130,246,0.02)',
      })
      series.setData(data.data.map((item) => ({ time: item.time as never, value: item.close })))
      seriesRef.current = series
    }
    chart.timeScale().fitContent()
  }, [data, mode])

  return (
    <section className="glass-panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ChartControls period={period} onPeriodChange={setPeriod} />
        <div className="flex rounded-md border border-white/5 bg-white/[0.02] p-1">
          <button className={`h-8 px-3 rounded text-xs transition duration-200 ${mode === 'area' ? 'bg-accent/80 text-white' : 'text-text-secondary hover:text-text-primary'}`} onClick={() => setMode('area')}>
            Area
          </button>
          <button className={`h-8 px-3 rounded text-xs transition duration-200 ${mode === 'candles' ? 'bg-accent/80 text-white' : 'text-text-secondary hover:text-text-primary'}`} onClick={() => setMode('candles')}>
            Candles
          </button>
        </div>
      </div>
      {isLoading ? <Skeleton className="h-[420px]" /> : null}
      <div ref={containerRef} className={isLoading ? 'hidden' : 'h-[420px] w-full'} />
    </section>
  )
}
