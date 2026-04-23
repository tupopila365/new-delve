import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'

export function Register() {
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState<'normal' | 'service_provider'>('normal')
  const [avail, setAvail] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (username.trim().length < 2) {
      setAvail(null)
      return
    }
    const t = setTimeout(async () => {
      setChecking(true)
      try {
        const r = await apiFetch<{ available: boolean }>(
          `/api/accounts/check-username/?q=${encodeURIComponent(username.trim())}`,
          { auth: false },
        )
        setAvail(r.available)
      } catch {
        setAvail(null)
      } finally {
        setChecking(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [username])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const u = username.trim()
    if (u.length < 3) {
      setErr('Username must be at least 3 characters.')
      return
    }
    if (password.length < 8) {
      setErr('Password must be at least 8 characters.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr('Enter a valid email.')
      return
    }
    if (avail === false) {
      setErr('Username is taken.')
      return
    }
    setBusy(true)
    try {
      await apiFetch('/api/accounts/register/', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ username: u, email, password, user_type: userType }),
      })
      nav('/verify-email', { state: { emailHint: email } })
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand">DELVE</h1>
        <p className="auth-tagline">Create your username — we&apos;ll check it&apos;s available.</p>
        {err && <div className="error-banner">{err}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label className="label" htmlFor="user">
            Username
          </label>
          <input id="user" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          {checking && <small style={{ color: 'var(--text-secondary)' }}>Checking…</small>}
          {!checking && avail === true && (
            <small style={{ color: '#15803d', fontWeight: 700 }}>Username available</small>
          )}
          {!checking && avail === false && <small style={{ color: '#b91c1c', fontWeight: 700 }}>Taken</small>}
        </div>
        <div className="field">
          <label className="label" htmlFor="em">
            Email
          </label>
          <input id="em" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw">
            Password
          </label>
          <input
            id="pw"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="field">
          <span className="label">Account type</span>
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${userType === 'normal' ? 'active' : ''}`}
              onClick={() => setUserType('normal')}
            >
              Normal user
            </button>
            <button
              type="button"
              className={`chip ${userType === 'service_provider' ? 'active' : ''}`}
              onClick={() => setUserType('service_provider')}
            >
              Service provider
            </button>
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || avail === false}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
        <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 700 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
