import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function Login() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await login(username.trim(), password)
      nav('/')
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand">DELVE</h1>
        <p className="auth-tagline">Welcome back — your feed, stays, and rides in one place.</p>
        <p className="auth-hint">Demo: <strong>demo_user</strong> / <strong>demo12345</strong> (any password works in mock mode)</p>
        {err && <div className="error-banner">{err}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="label" htmlFor="u">
              Username
            </label>
            <input id="u" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="p">
              Password
            </label>
            <input
              id="p"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
          New here?{' '}
          <Link to="/register" style={{ fontWeight: 700 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
