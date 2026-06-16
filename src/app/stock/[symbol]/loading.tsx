import { Skeleton } from '@/components/ui/Skeleton'

export default function StockLoading() {
  return (
    <main className="min-h-screen bg-background-primary p-6">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="mt-6 h-[420px]" />
    </main>
  )
}
