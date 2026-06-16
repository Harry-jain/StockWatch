import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { expired?: string }
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 relative">
      <section className="w-full max-w-sm glass-panel-elevated p-8 shadow-2xl">
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">StockWatch</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">Private Console</h1>
          <p className="text-xs text-text-secondary mt-1">Please sign in to access your dashboard.</p>
          {searchParams?.expired ? <p className="mt-2 text-sm text-market-down font-medium">Session expired. Sign in again.</p> : null}
        </div>
        <LoginForm />
      </section>
    </main>
  )
}
