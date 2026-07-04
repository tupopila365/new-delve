import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'
import { AuthScreen } from '../components/auth'

function usernameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const cleaned = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24)
  return cleaned.length >= 3 ? cleaned : ''
}

export function Register() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isProvider, setIsProvider] = useState(false)
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [avail, setAvail] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!usernameTouched && email.includes('@')) {
      const suggested = usernameFromEmail(email)
      if (suggested) setUsername(suggested)
    }
  }, [email, usernameTouched])

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
    const em = email.trim().toLowerCase()
    if (u.length < 3) {
      setErr('Username must be at least 3 characters.')
      return
    }
    if (password.length < 8) {
      setErr('Password must be at least 8 characters.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setErr('Enter a valid email.')
      return
    }
    if (avail === false) {
      setErr('That username is taken — try another.')
      return
    }
    if (checking) return
    setBusy(true)
    try {
      await apiFetch('/api/accounts/register/', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          username: u,
          email: em,
          password,
          user_type: isProvider ? 'service_provider' : 'normal',
        }),
      })
      nav('/verify-email', { state: { emailHint: em, isProvider } })
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      title="Sign up"
      subtitle="Create your Delve account. You will verify your email next — browsing works before that; bookings need a verified email."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
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
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          aria-label="Password"
          required
        />
        <input
          type="text"
          className="auth-page__input"
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsernameTouched(true)
            setUsername(e.target.value)
          }}
          autoComplete="username"
          aria-label="Username"
          required
        />
        {username.trim().length >= 2 ? (
          <p className="auth-page__field-hint" aria-live="polite">
            {checking
              ? 'Checking username…'
              : avail === true
                ? 'Username is available'
                : avail === false
                  ? 'Username is taken'
                  : null}
          </p>
        ) : null}
        <label className="auth-page__check">
          <input type="checkbox" checked={isProvider} onChange={(e) => setIsProvider(e.target.checked)} />
          <span>
            I&apos;m registering as a <strong>service provider</strong>
          </span>
        </label>
        {isProvider ? (
          <p className="auth-page__field-hint">
            Provider accounts can list stays, transport, food, events, and more after email verification and business
            onboarding. You can also upgrade from a traveller account later in Settings.
          </p>
        ) : (
          <p className="auth-page__field-hint">
            Traveller accounts can book, post, and explore. You can become a service provider anytime from Settings.
          </p>
        )}
        <button type="submit" className="auth-page__submit" disabled={busy || avail === false || checking}>
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthScreen>
  )
}
