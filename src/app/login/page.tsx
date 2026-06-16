import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { expired?: string }
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background-primary px-4">
      <section className="w-full max-w-sm rounded-lg border border-background-border bg-background-card p-6 shadow-2xl">
        <div className="mb-6">
          <p className="font-mono text-sm uppercase tracking-widest text-accent">StockWatch</p>
          <h1 className="mt-2 text-2xl font-semibold text-text-primary">Private market console</h1>
          {searchParams?.expired ? <p className="mt-2 text-sm text-market-down">Session expired. Sign in again.</p> : null}
        </div>
        <LoginForm />
      </section>
    </main>
  )
}
