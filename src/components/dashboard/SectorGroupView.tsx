'use client'

export function SectorGroupView({ symbols }: { symbols: string[] }) {
  const groups = symbols.reduce<Record<string, string[]>>((acc, symbol) => {
    const key = symbol.includes('BANK') ? 'Financials' : 'Watchlist'
    acc[key] = [...(acc[key] ?? []), symbol]
    return acc
  }, {})

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {Object.entries(groups).map(([sector, items]) => (
        <div key={sector} className="rounded-lg border border-background-border bg-background-card p-4">
          <h3 className="text-sm font-semibold text-text-primary">{sector}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {items.map((symbol) => (
              <span key={symbol} className="rounded-md bg-background-elevated px-2 py-1 font-mono text-xs text-text-secondary">
                {symbol}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
