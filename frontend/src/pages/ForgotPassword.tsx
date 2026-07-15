import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'
import { AuthScreen } from '../components/auth'

const SENT_MESSAGE = 'If an account exists, we sent reset instructions.'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const res = await apiFetch<{ detail: string }>('/api/accounts/password-reset/request/', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: email.trim() }),
      })
      setMsg(res.detail || SENT_MESSAGE)
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      title="Forgot password"
      subtitle="Enter the email on your account. If it exists, we’ll send reset instructions."
      hint={
        import.meta.env.DEV ? (
          <>
            In dev, check the <strong>Django console</strong> for the reset link.
          </>
        ) : (
          <>
            Check your inbox and spam folder for an email from DELVE with a reset link.
          </>
        )
      }
      footer={
        <>
          Remember your password? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {err ? <p className="auth-page__error">{err}</p> : null}
      {msg ? <p className="auth-page__success">{msg}</p> : null}
      <form className="auth-page__form" onSubmit={onSubmit}>
        <div className="auth-page__field">
          <label className="auth-page__label" htmlFor="auth-forgot-email">
            Email
          </label>
          <input
            id="auth-forgot-email"
            type="email"
            className="auth-page__input"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
          />
        </div>
        <button type="submit" className="auth-page__submit" disabled={busy || !email.trim()}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthScreen>
  )
}
