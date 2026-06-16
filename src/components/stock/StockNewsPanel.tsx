import type { NewsItem } from '@/types'

export function StockNewsPanel({ news }: { news: NewsItem[] }) {
  return (
    <section className="rounded-lg border border-background-border bg-background-card p-4">
      <h2 className="text-sm font-semibold text-text-primary">News</h2>
      <div className="mt-4 space-y-3">
        {news.length === 0 ? <p className="text-sm text-text-muted">No recent Yahoo Finance news.</p> : null}
        {news.map((item) => (
          <a key={`${item.title}-${item.providerPublishTime}`} href={item.link} target="_blank" rel="noreferrer" className="block rounded-md bg-background-elevated p-3 hover:bg-background-border">
            <p className="text-sm font-medium text-text-primary">{item.title}</p>
            <p className="mt-1 text-xs text-text-muted">{item.publisher}</p>
          </a>
        ))}
      </div>
    </section>
  )
}
