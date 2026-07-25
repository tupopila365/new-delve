import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { AuthScreen } from '../components/auth'
import { authFormError } from '../utils/authErrors'

const MIN_ACCOUNT_AGE = 18

function usernameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const cleaned = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24)
  return cleaned.length >= 3 ? cleaned : ''
}

function maxBirthYear(): number {
  return new Date().getFullYear() - MIN_ACCOUNT_AGE
}

export function Register() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [isProvider, setIsProvider] = useState(false)
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [avail, setAvail] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const returnQs = searchParams.toString()
  const registerTo = returnQs ? `/register?${returnQs}` : '/register'
  const loginTo = returnQs ? `/login?${returnQs}` : '/login'

  const yearOptions = useMemo(() => {
    const max = maxBirthYear()
    const years: number[] = []
    for (let y = max; y >= 1900; y -= 1) years.push(y)
    return years
  }, [])

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
    if (busy || checking) return
    setErr(null)
    const u = username.trim()
    const em = email.trim().toLowerCase()
    const year = Number(birthYear)
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
    if (!Number.isFinite(year) || year < 1900 || year > maxBirthYear()) {
      setErr(`You must be at least ${MIN_ACCOUNT_AGE} to create an account.`)
      return
    }
    if (!ageConfirmed) {
      setErr(`Confirm that you are ${MIN_ACCOUNT_AGE} or older.`)
      return
    }
    if (avail === false) {
      setErr('That username is taken — try another.')
      return
    }
    setBusy(true)
    try {
      await apiFetch('/api/accounts/register/', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          username: u,
          email: em,
          password,
          birth_year: year,
          user_type: isProvider ? 'service_provider' : 'normal',
        }),
      })
      nav('/verify-email', { state: { emailHint: em, isProvider } })
    } catch (e2) {
      setErr(authFormError(e2, 'Could not create your account. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  const usernameHint =
    username.trim().length < 2
      ? null
      : checking
        ? 'Checking username…'
        : avail === true
          ? 'Username is available'
          : avail === false
            ? 'Username is taken'
            : null

  return (
    <AuthScreen
      mode="register"
      loginTo={loginTo}
      registerTo={registerTo}
      title="Create your account"
      subtitle="New to DELVE? Create an account to book, save, and ask locals."
    >
      {err ? (
        <p className="auth-page__error" role="alert">
          {err}
        </p>
      ) : null}
      <form className="auth-page__form" onSubmit={onSubmit}>
        <div className="auth-page__choice" role="group" aria-label="Account type">
          <p className="auth-page__choice-label">I want to</p>
          <div className="auth-page__choice-grid">
            <button
              type="button"
              className={`auth-page__choice-card${!isProvider ? ' is-active' : ''}`}
              onClick={() => setIsProvider(false)}
              aria-pressed={!isProvider}
              disabled={busy}
            >
              <strong>Travel & explore</strong>
              <span>Book stays, food, guides, and join the community.</span>
            </button>
            <button
              type="button"
              className={`auth-page__choice-card${isProvider ? ' is-active' : ''}`}
              onClick={() => setIsProvider(true)}
              aria-pressed={isProvider}
              disabled={busy}
            >
              <strong>List my business</strong>
              <span>Host stays, food, transport, or tours after setup.</span>
            </button>
          </div>
          <p className="auth-page__field-hint">
            {isProvider
              ? 'You’ll verify email, then finish business onboarding. You can also upgrade later in Settings.'
              : 'You can become a provider later from Settings — no need to decide forever now.'}
          </p>
        </div>

        <div className="auth-page__field">
          <label className="auth-page__label" htmlFor="auth-register-email">
            Email
          </label>
          <input
            id="auth-register-email"
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
          <label className="auth-page__label" htmlFor="auth-register-password">
            Password
          </label>
          <input
            id="auth-register-password"
            type="password"
            className="auth-page__input"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={busy}
          />
        </div>

        <div className="auth-page__field">
          <label className="auth-page__label" htmlFor="auth-register-username">
            Username
          </label>
          <input
            id="auth-register-username"
            type="text"
            className="auth-page__input"
            placeholder="How others will find you"
            value={username}
            onChange={(e) => {
              setUsernameTouched(true)
              setUsername(e.target.value)
            }}
            autoComplete="username"
            required
            disabled={busy}
          />
          {usernameHint ? (
            <p
              className={`auth-page__field-hint${
                avail === true ? ' auth-page__field-hint--ok' : avail === false ? ' auth-page__field-hint--bad' : ''
              }`}
              aria-live="polite"
            >
              {usernameHint}
            </p>
          ) : null}
        </div>

        <div className="auth-page__field">
          <label className="auth-page__label" htmlFor="auth-register-birth-year">
            Birth year
          </label>
          <select
            id="auth-register-birth-year"
            className="auth-page__input"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            required
            disabled={busy}
          >
            <option value="">Select year</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <p className="auth-page__field-hint">
            Must be {MIN_ACCOUNT_AGE}+. Used for age checks and deals — never shown publicly.
          </p>
        </div>

        <label className="auth-page__check">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            required
            disabled={busy}
          />
          <span>I confirm I am {MIN_ACCOUNT_AGE} years of age or older.</span>
        </label>

        <button type="submit" className="auth-page__submit" disabled={busy || avail === false || checking}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthScreen>
  )
}
