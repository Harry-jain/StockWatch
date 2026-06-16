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
    // id + action are required for Apple Keychain / Brave to detect and save the password
    <form
      id="stockwatch-login-form"
      onSubmit={onSubmit}
      action="/api/auth/login"
      method="post"
      className="space-y-4"
    >
      {/* Hidden username field — required for password managers to associate a username */}
      <input
        type="text"
        name="username"
        id="username"
        autoComplete="username"
        defaultValue="admin"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        readOnly
      />

      <label className="block">
        <span className="mb-2 block text-sm text-text-secondary">Password</span>
        <Input
          autoFocus
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
