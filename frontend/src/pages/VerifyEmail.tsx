import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'

export function VerifyEmail() {
  const loc = useLocation()
  const hint = (loc.state as { emailHint?: string } | null)?.emailHint
  const [token, setToken] = useState('')
  useEffect(() => {
    const q = new URLSearchParams(loc.search).get('token')
    if (q) setToken(q)
  }, [loc.search])
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      await apiFetch('/api/accounts/verify-email/', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ token: token.trim() }),
      })
      setMsg('Email verified. You can sign in now.')
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Verification failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand" style={{ fontSize: '1.75rem' }}>
          Verify email
        </h1>
        <p className="auth-tagline">
          Paste the token from your email (in dev, check the Django console).
          {hint ? ` Sent to ${hint}.` : ''}
        </p>
        {err && <div className="error-banner">{err}</div>}
        {msg && (
          <div className="success-banner">
            {msg}{' '}
            <Link to="/login" style={{ fontWeight: 700 }}>
              Log in →
            </Link>
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="label" htmlFor="tok">
              Verification token
            </label>
            <input id="tok" className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="UUID from email" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  )
}
