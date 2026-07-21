import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { AuthScreen } from '../components/auth'
import { authFormError } from '../utils/authErrors'

const SENT_MESSAGE = 'If an account exists, we sent reset instructions.'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
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
      setErr(authFormError(e2, 'Could not send reset instructions. Try again.'))
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
            In dev, check the <strong>console</strong> (mock) or Django console for the reset link.
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
      {err ? (
        <p className="auth-page__error" role="alert">
          {err}
        </p>
      ) : null}
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
            disabled={busy}
          />
        </div>
        <button type="submit" className="auth-page__submit" disabled={busy || !email.trim()}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthScreen>
  )
}
