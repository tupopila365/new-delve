import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'
import { AuthScreen } from '../components/auth'

export function VerifyEmail() {
  const loc = useLocation()
  const hint = (loc.state as { emailHint?: string; isProvider?: boolean } | null)?.emailHint
  const isProvider = (loc.state as { isProvider?: boolean } | null)?.isProvider
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
    <AuthScreen
      title="Verify email"
      subtitle={
        hint
          ? `Paste the verification token from your email. Sent to ${hint}.`
          : 'Paste the verification token from your email.'
      }
      hint={
        <>
          In dev, check the <strong>Django console</strong>.
        </>
      }
      footer={
        <>
          Already verified? <Link to="/login">Log in</Link>
        </>
      }
    >
      {err ? <p className="auth-page__error">{err}</p> : null}
      {msg ? (
        <p className="auth-page__success">
          {msg}{' '}
          {isProvider ? (
            <Link to="/login?next=%2Fprovider%2Fonboarding">Log in to continue setup →</Link>
          ) : (
            <Link to="/login">Log in →</Link>
          )}
        </p>
      ) : null}
      <form className="auth-page__form" onSubmit={onSubmit}>
        <input
          id="tok"
          type="text"
          className="auth-page__input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Verification token"
          autoComplete="one-time-code"
          aria-label="Verification token"
          required
        />
        <button type="submit" className="auth-page__submit" disabled={busy}>
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </AuthScreen>
  )
}
