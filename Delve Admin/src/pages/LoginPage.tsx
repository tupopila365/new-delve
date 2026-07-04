import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { DelveAdminPageHeader } from '../components'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@delve.local')
  const [password, setPassword] = useState('demo12345')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed.'
      setError(msg.includes('admin access') ? msg : 'Invalid email or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="da-login">
      <form className="da-login__card" onSubmit={(e) => void onSubmit(e)}>
        <div className="da-login__brand">
          <strong>DELVE</strong>
          <span>Platform admin</span>
        </div>
        <DelveAdminPageHeader
          title="Sign in"
          subtitle="Staff accounts only. Use admin@delve.local / demo12345 in mock mode."
        />
        {error ? (
          <p className="da-login__error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="da-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="da-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="da-login__submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
