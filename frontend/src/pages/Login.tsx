import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AuthScreen } from '../components/auth'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { readLoginReturnPath } from '../utils/authRedirect'

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
    setErr(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      const me = await apiFetch<{ user_type: string }>('/api/accounts/me/')
      if (me.user_type === 'service_provider') {
        const businesses = await apiFetch<MyBusiness[]>('/api/accounts/me/businesses/')
        const needsOnboarding =
          businesses.length === 0 || businesses.some((b) => b.onboarding_completed === false)
        if (needsOnboarding) {
          nav('/provider/onboarding')
          return
        }
      }
      nav(readLoginReturnPath(returnQs, '/'))
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Could not sign in. Check your email and password.')
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
      hint={
        import.meta.env.DEV ? (
          <>
            Demo: <strong>demo@delve.local</strong>
          </>
        ) : undefined
      }
      footer={
        <>
          New here? <Link to={registerTo}>Create an account</Link>
        </>
      }
    >
      {err ? <p className="auth-page__error">{err}</p> : null}
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
          />
        </div>
        <button type="submit" className="auth-page__submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="auth-page__assist">
        Don&apos;t have an account yet? Use <Link to={registerTo}>Create account</Link> above.
      </p>
    </AuthScreen>
  )
}
