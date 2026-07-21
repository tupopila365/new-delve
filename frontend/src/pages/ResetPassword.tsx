import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { AuthScreen } from '../components/auth'
import { authFormError } from '../utils/authErrors'

export function ResetPassword() {
  const nav = useNavigate()
  const loc = useLocation()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(loc.search).get('token')
    if (q) setToken(q)
  }, [loc.search])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setErr(null)
    setMsg(null)
    if (password !== confirm) {
      setErr('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setErr('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      await apiFetch('/api/accounts/password-reset/confirm/', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ token: token.trim(), new_password: password }),
      })
      setMsg('Password updated. You can sign in now.')
      setTimeout(() => nav('/login', { replace: true }), 1500)
    } catch (e2) {
      setErr(authFormError(e2, 'This reset link is invalid or has expired. Request a new one.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <>
          Back to <Link to="/login">Sign in</Link>
          {' · '}
          <Link to="/forgot-password">Request a new link</Link>
        </>
      }
    >
      {err ? (
        <p className="auth-page__error" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? <p className="auth-page__success">{msg}</p> : null}
      <form className="auth-page__form" onSubmit={onSubmit}>
        <div className="auth-page__field">
          <label className="auth-page__label" htmlFor="auth-reset-token">
            Reset token
          </label>
          <input
            id="auth-reset-token"
            type="text"
            className="auth-page__input"
            placeholder="Paste token from email"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="one-time-code"
            required
            disabled={busy}
          />
        </div>
        <div className="auth-page__field">
          <label className="auth-page__label" htmlFor="auth-reset-password">
            New password
          </label>
          <input
            id="auth-reset-password"
            type="password"
            className="auth-page__input"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            disabled={busy}
          />
        </div>
        <div className="auth-page__field">
          <label className="auth-page__label" htmlFor="auth-reset-confirm">
            Confirm password
          </label>
          <input
            id="auth-reset-confirm"
            type="password"
            className="auth-page__input"
            placeholder="Repeat new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            disabled={busy}
          />
        </div>
        <button
          type="submit"
          className="auth-page__submit"
          disabled={busy || !token.trim() || !password || !confirm}
        >
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthScreen>
  )
}
