import { Navbar } from '@/components/layout/Navbar'
import { WatchlistGrid } from '@/components/dashboard/WatchlistGrid'
import { getWatchlist } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const symbols = await getWatchlist()
  return (
    <main className="min-h-screen bg-background-primary">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <WatchlistGrid initialSymbols={symbols} />
      </div>
    </main>
  )
}
