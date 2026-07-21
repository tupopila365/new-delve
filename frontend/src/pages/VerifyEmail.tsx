import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiFetch, setTokens } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AuthScreen } from '../components/auth'
import { ResendVerificationButton } from '../components/auth/ResendVerificationButton'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { writeActiveBusinessId } from '../utils/activeBusiness'
import { authFormError } from '../utils/authErrors'

type VerifyResponse = {
  detail: string
  access?: string
  refresh?: string
}

export function VerifyEmail() {
  const loc = useLocation()
  const nav = useNavigate()
  const { refreshProfile } = useAuth()
  const state = loc.state as {
    emailHint?: string
    isProvider?: boolean
    reason?: string
    from?: string
  } | null
  const hint = state?.emailHint
  const isProvider = state?.isProvider ?? false
  const reason = state?.reason
  const [token, setToken] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const autoAttempted = useRef<string | null>(null)
  const inFlight = useRef(false)

  useEffect(() => {
    const q = new URLSearchParams(loc.search).get('token')
    if (q) setToken(q)
  }, [loc.search])

  const completeVerification = useCallback(
    async (rawToken: string) => {
      if (inFlight.current) return
      inFlight.current = true
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
          if (state?.from) {
            nav(state.from, { replace: true })
            return
          }
          if (isProvider) {
            const businesses = await apiFetch<MyBusiness[]>('/api/accounts/me/businesses/')
            const me = await apiFetch<{ username: string }>('/api/accounts/me/')
            const incomplete = businesses.find((b) => b.onboarding_completed === false)
            if (businesses.length === 0) {
              nav('/provider', { replace: true })
            } else if (incomplete) {
              writeActiveBusinessId(me.username, incomplete.id)
              nav(`/provider?business=${incomplete.id}`, { replace: true })
            } else {
              nav('/', { replace: true })
            }
          } else {
            nav('/', { replace: true })
          }
          return
        }
        setMsg('Email verified. You can sign in now.')
      } catch (e2) {
        setErr(authFormError(e2, 'This link is invalid or has expired. Request a new one.'))
      } finally {
        inFlight.current = false
        setBusy(false)
      }
    },
    [isProvider, nav, refreshProfile, state?.from],
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

  const subtitle = reason
    ? `Verify your email to ${reason}. Paste the token below, or open the link from your email.`
    : hint
      ? `We sent a link to ${hint}. Paste the token below, or open the link from your email.`
      : 'Confirm your email to unlock bookings and provider tools. You can browse and sign in before verifying.'

  return (
    <AuthScreen
      title="Verify email"
      subtitle={subtitle}
      hint={
        import.meta.env.DEV ? (
          <>
            In dev, check the <strong>console</strong> (mock) or Django console for the verification
            link.
          </>
        ) : (
          <>
            Check your inbox and spam folder for an email from DELVE, then open the link or paste
            the token below.
          </>
        )
      }
      footer={
        <>
          Already verified? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {err ? (
        <p className="auth-page__error" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="auth-page__success">
          {msg}{' '}
          {!msg.includes('signing you in') ? (
            isProvider ? (
              <Link to="/login?next=%2Fprovider%2Fonboarding">Sign in to continue setup →</Link>
            ) : (
              <Link to="/login">Sign in →</Link>
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
          disabled={busy}
        />
        <button type="submit" className="auth-page__submit" disabled={busy || !token.trim()}>
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>
      {hint || err ? <ResendVerificationButton email={hint} /> : null}
    </AuthScreen>
  )
}
