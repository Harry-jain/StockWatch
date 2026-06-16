import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-background-primary p-6">
      <Skeleton className="h-10 w-64" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </main>
  )
}
