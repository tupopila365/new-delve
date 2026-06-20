import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AuthScreen } from '../components/auth'
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      nav(readLoginReturnPath(returnQs, '/'))
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      title="Log in"
      hint={
        <>
          Demo: <strong>demo@delve.local</strong>
        </>
      }
      footer={
        <>
          Don&apos;t have an account? <Link to={registerTo}>Sign up</Link>
        </>
      }
    >
      {err ? <p className="auth-page__error">{err}</p> : null}
      <form className="auth-page__form" onSubmit={onSubmit}>
        <input
          type="email"
          className="auth-page__input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          aria-label="Email"
          required
        />
        <input
          type="password"
          className="auth-page__input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          aria-label="Password"
          required
        />
        <button type="submit" className="auth-page__submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </form>
    </AuthScreen>
  )
}
