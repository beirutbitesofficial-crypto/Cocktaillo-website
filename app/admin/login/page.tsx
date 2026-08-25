'use client'

import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const form = event.currentTarget
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        body: new FormData(form),
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => null) as { error?: string } | null

      if (!res.ok) {
        setError(data?.error || 'Could not sign in. Please try again.')
        setLoading(false)
        return
      }

      window.location.assign('/admin')
    } catch {
      setError('Could not reach the server. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="adminLoginPage">
      <div className="loginCard">
        <img src="/cocktaillo-logo.jpg" alt="Cocktaillo" />
        <span>COCKTAILLO CONTROL</span>
        <h1>Admin login</h1>
        <p>Manage menu, orders, payments and restaurant settings.</p>
        {error && <div className="adminError">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
          <button disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <a href="/">← Back to website</a>
      </div>
    </div>
  )
}
