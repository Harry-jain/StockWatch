import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { StockAIPanel } from '@/components/stock/StockAIPanel'
import { StockAlertPanel } from '@/components/stock/StockAlertPanel'
import { StockHeader } from '@/components/stock/StockHeader'
import { StockMetrics } from '@/components/stock/StockMetrics'
import { StockNewsPanel } from '@/components/stock/StockNewsPanel'
import { StockNotes } from '@/components/stock/StockNotes'
import { StockPortfolioPanel } from '@/components/stock/StockPortfolioPanel'
import { getQuote, getQuoteSummaryNews, normalizeSymbol } from '@/lib/yahoo-finance'

const StockChart = dynamic(() => import('@/components/stock/StockChart').then((mod) => mod.StockChart), {
  ssr: false,
})

export default async function StockPage({ params }: { params: { symbol: string } }) {
  const symbol = normalizeSymbol(decodeURIComponent(params.symbol))
  const [quote, news] = await Promise.all([getQuote(symbol), getQuoteSummaryNews(symbol)])

  return (
    <main className="min-h-screen bg-background-primary">
      <Navbar />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft size={16} />
          Dashboard
        </Link>
        <StockHeader quote={quote} />
        <StockChart symbol={symbol} />
        <StockMetrics quote={quote} />
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <StockAIPanel symbol={symbol} />
            <StockNotes symbol={symbol} />
            <StockNewsPanel news={news} />
          </div>
          <div className="space-y-4">
            <StockPortfolioPanel symbol={symbol} currentPrice={quote?.price ?? 0} />
            <StockAlertPanel symbol={symbol} />
          </div>
        </div>
      </div>
    </main>
  )
}
