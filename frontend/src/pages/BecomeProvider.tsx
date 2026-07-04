import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Building2, ShieldCheck, Users } from 'lucide-react'
import { ApiError, apiFetch } from '../api/client'
import { AuthScreen } from '../components/auth'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'

export function BecomeProvider() {
  const navigate = useNavigate()
  const { profile, loading, refreshProfile } = useAuth()
  const { canAccessProvider } = useBusinessAccess()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return (
      <AuthScreen title="Loading…" footer={<Link to="/account">Back to account</Link>}>
        <p className="auth-page__hint">One moment…</p>
      </AuthScreen>
    )
  }

  if (!profile) return <Navigate to="/login?next=%2Fprovider%2Fstart" replace />

  if (profile.user_type === 'service_provider') {
    return <Navigate to="/provider/onboarding" replace />
  }

  if (canAccessProvider) {
    return <Navigate to="/provider" replace />
  }

  async function onConfirm() {
    setBusy(true)
    setError(null)
    try {
      await apiFetch('/api/accounts/me/become-provider/', { method: 'POST', body: JSON.stringify({}) })
      await refreshProfile()
      navigate('/provider/onboarding', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not upgrade your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      title="List on Delve"
      subtitle="Upgrade your traveller account to list stays, transport, food, events, and more. Your personal profile stays separate."
      footer={
        <>
          Changed your mind? <Link to="/dashboard">Back to travel dashboard</Link>
        </>
      }
      hint={
        !profile.email_verified ? (
          <>
            Tip: <Link to="/verify-email">Verify your email</Link> first so travellers can reach you about bookings.
          </>
        ) : undefined
      }
    >
      <ul className="become-provider-page__list">
        <li>
          <Users size={18} strokeWidth={2} aria-hidden />
          <span>Keep posting and travelling from @{profile.username}.</span>
        </li>
        <li>
          <Building2 size={18} strokeWidth={2} aria-hidden />
          <span>Add a business profile for listings, bookings, and team access.</span>
        </li>
        <li>
          <ShieldCheck size={18} strokeWidth={2} aria-hidden />
          <span>Business verification is reviewed separately from email verification.</span>
        </li>
      </ul>

      {error ? (
        <p className="auth-page__error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="button" className="auth-page__submit" disabled={busy} onClick={() => void onConfirm()}>
        {busy ? 'Upgrading account…' : 'Continue to business setup'}
      </button>

      <p className="auth-page__hint" style={{ marginTop: '1rem' }}>
        <Link to="/account">Back to account</Link>
      </p>
    </AuthScreen>
  )
}
