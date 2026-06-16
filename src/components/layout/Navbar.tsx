'use client'

import { LogOut, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { MarketStatusBar } from '@/components/layout/MarketStatusBar'

export function Navbar() {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background-primary/45 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        <div>
          <p className="font-mono text-base font-semibold text-text-primary">StockWatch</p>
          <p className="text-xs text-text-muted">Private NSE/BSE monitor</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={() => router.refresh()} aria-label="Refresh">
            <RefreshCw size={16} />
          </Button>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={logout} aria-label="Logout">
            <LogOut size={16} />
          </Button>
        </div>
      </div>
      <MarketStatusBar />
    </header>
  )
}
