import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiFetch, mediaUrl } from '../api/client'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { DashboardPageHeader } from '../components/dashboard'
import { EmptyState } from '../components/ui'

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
        <DashboardPageHeader title="Account" subtitle="Sign in to manage your DELVE account." />
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
      <DashboardPageHeader
        title="Account"
        subtitle="Profile information, verification, and shortcuts"
        action={
          <Link to="/dashboard" className="btn btn-primary">
            My travel dashboard
          </Link>
        }
      />

      <section className="account-page__profile card">
        <div className="account-page__avatar-wrap">
          {profile.avatar ? (
            <img className="account-page__avatar" src={mediaUrl(profile.avatar) || ''} alt="" />
          ) : (
            <div className="account-page__avatar account-page__avatar--init" aria-hidden>
              {initial}
            </div>
          )}
        </div>
        <div className="account-page__info">
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

      <section className="account-page__section detail-section">
        <h2 className="account-page__section-title">Shortcuts</h2>
        <div className="account-page__links">
          <Link to={`/u/${profile.username}`} className="account-page__link">
            View public profile
          </Link>
          <Link to="/dashboard" className="account-page__link">
            Travel dashboard
          </Link>
          <Link to="/settings" className="account-page__link">
            Settings &amp; privacy
          </Link>
          <Link to="/messages" className="account-page__link">
            Messages
          </Link>
        </div>
      </section>

      {isProvider ? (
        <section className="account-page__section detail-section account-page__section--provider">
          <h2 className="account-page__section-title">Provider tools</h2>
          <p className="account-page__section-sub">Manage your business separately from your traveller account.</p>
          <div className="account-page__links">
            <Link to="/provider" className="account-page__link account-page__link--accent">
              Provider dashboard
            </Link>
            <Link to="/provider/listings" className="account-page__link">
              Listings
            </Link>
            {businesses.map((b) => (
              <Link key={b.id} to={`/business/${b.id}`} className="account-page__link">
                {b.business_name} (public profile)
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {profile.is_staff ? (
        <section className="account-page__section detail-section account-page__section--admin">
          <h2 className="account-page__section-title">Admin tools</h2>
          <div className="account-page__links">
            <Link to="/admin" className="account-page__link account-page__link--accent">
              Platform admin
            </Link>
          </div>
        </section>
      ) : null}

      <section className="account-page__section detail-section">
        <button type="button" className="btn btn-ghost account-page__logout" onClick={logout}>
          Sign out
        </button>
      </section>
    </div>
  )
}
