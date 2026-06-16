import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch, mediaUrl } from '../api/client'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { EmptyState } from '../components/ui'

function AccountRow({ to, label, accent = false }: { to: string; label: string; accent?: boolean }) {
  return (
    <Link to={to} className={`account-page__row${accent ? ' account-page__row--accent' : ''}`}>
      <span>{label}</span>
      <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
    </Link>
  )
}

export function Account() {
  const { profile, logout } = useAuth()

  const { data: businesses = [] } = useQuery({
    queryKey: ['my-businesses-account'],
    queryFn: () => apiFetch<MyBusiness[]>('/api/accounts/me/businesses/'),
    enabled: Boolean(profile),
  })

  if (!profile) {
    return (
      <div className="account-page">
        <EmptyState
          icon="👤"
          title="You are not signed in"
          sub="Sign in or create an account to access your travel dashboard and settings."
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </div>
    )
  }

  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase()
  const isProvider = profile.user_type === 'service_provider' || businesses.length > 0

  return (
    <div className="account-page">
      <section className="account-page__profile" aria-label="Your account">
        {profile.avatar ? (
          <img className="account-page__avatar" src={mediaUrl(profile.avatar) || ''} alt="" />
        ) : (
          <div className="account-page__avatar account-page__avatar--init" aria-hidden>
            {initial}
          </div>
        )}
        <div>
          <h2 className="account-page__name">{profile.display_name || profile.username}</h2>
          <p className="account-page__handle">@{profile.username}</p>
          <div className="account-page__badges">
            <span className="pill">
              {profile.user_type === 'service_provider' ? 'Service provider' : 'Traveller'}
            </span>
            {profile.is_staff ? <span className="pill pill--staff">Platform admin</span> : null}
            {profile.email_verified ? (
              <span className="pill pill--ok">Email verified</span>
            ) : (
              <span className="pill pill--warn">Email not verified</span>
            )}
          </div>
          {!profile.email_verified ? (
            <p className="account-page__hint">
              <Link to="/verify-email">Verify your email</Link> to unlock full account features.
            </p>
          ) : null}
        </div>
      </section>

      <nav className="account-page__group" aria-label="Account shortcuts">
        <h2 className="account-page__group-title">Shortcuts</h2>
        <AccountRow to={`/u/${profile.username}`} label="Public profile" />
        <AccountRow to="/dashboard" label="Travel dashboard" />
        <AccountRow to="/settings" label="Settings & privacy" />
        <AccountRow to="/messages" label="Messages" />
      </nav>

      {isProvider ? (
        <nav className="account-page__group" aria-label="Provider tools">
          <h2 className="account-page__group-title">Provider</h2>
          <p className="account-page__group-sub">Manage your business separately from your traveller account.</p>
          <AccountRow to="/provider" label="Provider dashboard" accent />
          <AccountRow to="/provider/listings" label="Listings" />
          {businesses.map((b) => (
            <AccountRow key={b.id} to={`/business/${b.id}`} label={`${b.business_name} (public)`} />
          ))}
        </nav>
      ) : null}

      {profile.is_staff ? (
        <nav className="account-page__group" aria-label="Admin tools">
          <h2 className="account-page__group-title">Admin</h2>
          <AccountRow to="/admin" label="Platform admin" accent />
        </nav>
      ) : null}

      <button type="button" className="account-page__logout" onClick={logout}>
        Sign out
      </button>
    </div>
  )
}
