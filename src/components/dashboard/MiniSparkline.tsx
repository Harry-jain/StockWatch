export function MiniSparkline({ values, positive = true }: { values?: number[]; positive?: boolean }) {
  const data = values?.length ? values : [4, 5, 4.5, 6, 5.8, 7, 6.5]
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 120
      const y = 36 - ((value - min) / span) * 32
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 120 40" className="h-10 w-32" role="img" aria-label="Mini price sparkline">
      <polyline fill="none" stroke={positive ? '#22c55e' : '#ef4444'} strokeWidth="2" points={points} />
    </svg>
  )
}
