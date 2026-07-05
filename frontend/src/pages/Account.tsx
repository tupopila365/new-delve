import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { UserAvatar } from '../components/UserAvatar'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { adminConsoleUrl } from '../utils/adminAppUrl'
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

  const { businesses, canAccessProvider } = useBusinessAccess()

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

  const showTeamBadge = canAccessProvider && profile.user_type !== 'service_provider'

  return (
    <div className="account-page">
      <section className="account-page__profile" aria-label="Your account">
        <UserAvatar
          src={profile.avatar}
          name={profile.display_name || profile.username}
          className="account-page__avatar"
          shape="rounded"
          fill
        />
        <div>
          <h2 className="account-page__name">{profile.display_name || profile.username}</h2>
          <p className="account-page__handle">@{profile.username}</p>
          <div className="account-page__badges">
            <span className="pill">
              {profile.user_type === 'service_provider'
                ? 'Service provider'
                : showTeamBadge
                  ? 'Business team'
                  : 'Traveller'}
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
              <Link to="/verify-email">Verify your email</Link> to unlock bookings and reservations.
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

      {canAccessProvider ? (
        <nav className="account-page__group" aria-label="Provider tools">
          <h2 className="account-page__group-title">Provider</h2>
          <p className="account-page__group-sub">
            {showTeamBadge
              ? 'You access provider tools as a business team member — your personal profile stays separate.'
              : 'Manage your business separately from your traveller account.'}
          </p>
          <AccountRow to="/provider" label="Provider dashboard" accent />
          <AccountRow to="/provider/listings" label="Listings" />
          {businesses.map((b) => (
            <AccountRow key={b.id} to={`/business/${b.id}`} label={`${b.business_name} (public)`} />
          ))}
        </nav>
      ) : profile.user_type === 'normal' ? (
        <nav className="account-page__group" aria-label="Become a provider">
          <h2 className="account-page__group-title">List on Delve</h2>
          <p className="account-page__group-sub">
            Offer stays, transport, food, events, or guides — your traveller profile stays separate from your business.
          </p>
          <AccountRow to="/provider/start" label="Become a service provider" accent />
        </nav>
      ) : null}

      {profile.is_staff ? (
        <nav className="account-page__group" aria-label="Admin tools">
          <h2 className="account-page__group-title">Admin</h2>
          <p className="account-page__group-sub">
            Platform operations run in the Delve Admin console (separate app). Sign in there with the same staff email.
          </p>
          <a href={adminConsoleUrl()} className="account-page__row account-page__row--accent">
            <span>Delve Admin console</span>
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
          </a>
          <a href={adminConsoleUrl('/users')} className="account-page__row">
            <span>Users</span>
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
          </a>
          <a href={adminConsoleUrl('/verifications')} className="account-page__row">
            <span>Business verifications</span>
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
          </a>
          <a href={adminConsoleUrl('/email-verification')} className="account-page__row">
            <span>Email verification queue</span>
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
          </a>
        </nav>
      ) : null}

      <button type="button" className="account-page__logout" onClick={logout}>
        Sign out
      </button>
    </div>
  )
}
