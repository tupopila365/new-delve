import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AuthScreen } from '../components/auth'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { writeActiveBusinessId } from '../utils/activeBusiness'
import { readLoginReturnPath } from '../utils/authRedirect'
import { authFormError } from '../utils/authErrors'

export function Login() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const returnQs = searchParams.toString()
  const registerTo = returnQs ? `/register?${returnQs}` : '/register'
  const loginTo = returnQs ? `/login?${returnQs}` : '/login'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setErr(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      const me = await apiFetch<{ user_type: string; username: string }>('/api/accounts/me/')
      if (me.user_type === 'service_provider') {
        const businesses = await apiFetch<MyBusiness[]>('/api/accounts/me/businesses/')
        const incomplete = businesses.find((b) => b.onboarding_completed === false)
        if (businesses.length === 0) {
          nav('/provider', { replace: true })
          return
        }
        if (incomplete) {
          writeActiveBusinessId(me.username, incomplete.id)
          nav(`/provider?business=${incomplete.id}`, { replace: true })
          return
        }
      }
      nav(readLoginReturnPath(returnQs, '/'), { replace: true })
    } catch (e2) {
      setErr(authFormError(e2, 'Could not sign in. Check your email and password.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      mode="login"
      loginTo={loginTo}
      registerTo={registerTo}
      title="Welcome back"
      subtitle="Sign in if you already have a DELVE account."
    >
      {err ? (
        <p className="auth-page__error" role="alert">
          {err}
        </p>
      ) : null}
      <form className="auth-page__form" onSubmit={onSubmit}>
        <div className="auth-page__field">
          <label className="auth-page__label" htmlFor="auth-login-email">
            Email
          </label>
          <input
            id="auth-login-email"
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
        <div className="auth-page__field">
          <div className="auth-page__label-row">
            <label className="auth-page__label" htmlFor="auth-login-password">
              Password
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <input
            id="auth-login-password"
            type="password"
            className="auth-page__input"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </div>
        <button type="submit" className="auth-page__submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthScreen>
  )
}
