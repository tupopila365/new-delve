import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiFetch, ApiError, setTokens } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AuthScreen } from '../components/auth'
import { ResendVerificationButton } from '../components/auth/ResendVerificationButton'
import type { MyBusiness } from '../hooks/useBusinessAccess'

type VerifyResponse = {
  detail: string
  access?: string
  refresh?: string
}

export function VerifyEmail() {
  const loc = useLocation()
  const nav = useNavigate()
  const { refreshProfile } = useAuth()
  const state = loc.state as { emailHint?: string; isProvider?: boolean } | null
  const hint = state?.emailHint
  const isProvider = state?.isProvider ?? false
  const [token, setToken] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const autoAttempted = useRef<string | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(loc.search).get('token')
    if (q) setToken(q)
  }, [loc.search])

  const completeVerification = useCallback(
    async (rawToken: string) => {
      setErr(null)
      setMsg(null)
      setBusy(true)
      try {
        const data = await apiFetch<VerifyResponse>('/api/accounts/verify-email/', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({ token: rawToken.trim() }),
        })
        if (data.access && data.refresh) {
          setTokens(data.access, data.refresh)
          await refreshProfile()
          setMsg('Email verified — signing you in…')
          if (isProvider) {
            const businesses = await apiFetch<MyBusiness[]>('/api/accounts/me/businesses/')
            const needsOnboarding =
              businesses.length === 0 || businesses.some((b) => b.onboarding_completed === false)
            nav(needsOnboarding ? '/provider/onboarding' : '/', { replace: true })
          } else {
            nav('/', { replace: true })
          }
          return
        }
        setMsg('Email verified. You can sign in now.')
      } catch (e2) {
        setErr(e2 instanceof ApiError ? e2.message : 'Verification failed')
      } finally {
        setBusy(false)
      }
    },
    [isProvider, nav, refreshProfile],
  )

  useEffect(() => {
    const q = new URLSearchParams(loc.search).get('token')?.trim()
    if (!q || autoAttempted.current === q) return
    autoAttempted.current = q
    void completeVerification(q)
  }, [loc.search, completeVerification])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await completeVerification(token)
  }

  return (
    <AuthScreen
      title="Verify email"
      subtitle={
        hint
          ? `We sent a link to ${hint}. Paste the token below, or open the link from your email.`
          : 'Confirm your email to unlock bookings and provider tools. You can browse and sign in before verifying.'
      }
      hint={
        <>
          In dev, check the <strong>Django console</strong> for the verification link.
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
          {!msg.includes('signing you in') ? (
            isProvider ? (
              <Link to="/login?next=%2Fprovider%2Fonboarding">Log in to continue setup →</Link>
            ) : (
              <Link to="/login">Log in →</Link>
            )
          ) : null}
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
      {hint ? <ResendVerificationButton email={hint} /> : null}
    </AuthScreen>
  )
}
