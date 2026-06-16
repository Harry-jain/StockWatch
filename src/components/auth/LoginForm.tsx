'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

export function LoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const payload = await res.json()
      if (!res.ok) {
        setError(payload.error ?? 'Invalid password')
        return
      }
      router.replace('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm text-text-secondary">Password</span>
        <Input
          autoFocus
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter app password"
          required
        />
      </label>
      {error ? <p className="text-sm text-market-down">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Spinner /> : <Lock size={16} />}
        Sign in
      </Button>
    </form>
  )
}
