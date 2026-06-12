import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { DashboardPageHeader, DashboardSection, DashboardStatGrid, StatusBadge } from '../components/dashboard'
import { EmptyState } from '../components/ui'

type Booking = {
  id: number
  listing_title: string
  check_in: string
  check_out: string
  status: string
}

export function UserDashboard() {
  const { profile } = useAuth()

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => apiFetch<Booking[]>('/api/accommodation/bookings/').catch(() => [] as Booking[]),
    enabled: Boolean(profile),
  })

  const { data: businesses = [] } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => apiFetch<MyBusiness[]>('/api/accounts/me/businesses/'),
    enabled: Boolean(profile),
  })

  if (!profile) return <Navigate to="/login" replace />

  const isProvider = profile.user_type === 'service_provider' || businesses.length > 0
  const pendingBookings = (bookings ?? []).filter((b) => b.status === 'pending').length
  const upcoming = (bookings ?? []).filter((b) => b.status === 'confirmed' || b.status === 'pending').slice(0, 4)
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase()

  return (
    <div className="udash">
      <section className="udash__hero">
        <div className="udash__hero-user">
          {profile.avatar ? (
            <img className="udash__avatar" src={mediaUrl(profile.avatar) || ''} alt="" />
          ) : (
            <div className="udash__avatar udash__avatar--init" aria-hidden>
              {initial}
            </div>
          )}
          <div>
            <p className="udash__kicker">My travel dashboard</p>
            <h1>Welcome back, {profile.display_name || profile.username}</h1>
            <p className="udash__sub">Bookings, saved items, messages, and quick actions — your private control center.</p>
          </div>
        </div>
        <div className="udash__hero-actions">
          <Link to={`/u/${profile.username}`} className="btn btn-ghost">
            Public profile
          </Link>
          <Link to="/settings" className="btn btn-primary">
            Settings
          </Link>
        </div>
      </section>

      <DashboardStatGrid
        stats={[
          { value: bookings?.length ?? '—', label: 'Bookings', to: '/dashboard#bookings', accent: pendingBookings > 0 },
          { value: '💬', label: 'Messages', to: '/messages' },
          { value: '♡', label: 'Saved', to: '/dashboard#saved' },
          { value: '⚙', label: 'Account', to: '/account' },
        ]}
      />

      {isProvider ? (
        <DashboardSection
          title="Your businesses"
          action={
            <Link to="/provider" className="btn btn-primary">
              Provider dashboard
            </Link>
          }
        >
          <div className="udash__biz-grid">
            {businesses.map((b) => (
              <Link key={b.id} to={`/business/${b.id}`} className="udash__biz-card">
                {b.logo ? <img src={b.logo} alt="" /> : <span>{b.business_name.charAt(0)}</span>}
                <div>
                  <strong>{b.business_name}</strong>
                  <small>
                    {b.city}, {b.region}
                  </small>
                </div>
              </Link>
            ))}
          </div>
          <p className="udash__hint">Provider tools are separate from your traveller dashboard.</p>
        </DashboardSection>
      ) : null}

      <DashboardSection id="bookings" title="Upcoming bookings">
        {loadingBookings ? (
          <div className="udash__list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton udash__list-sk" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            compact
            icon="📅"
            title="No bookings yet"
            sub="Start by exploring stays, guides, events, or transport."
            cta={{ label: 'Explore stays', to: '/accommodation' }}
          />
        ) : (
          <ul className="udash__list">
            {upcoming.map((b) => (
              <li key={b.id} className="udash__list-row">
                <div>
                  <strong>{b.listing_title}</strong>
                  <span>
                    {b.check_in} → {b.check_out}
                  </span>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
        <div className="udash__links">
          <Link to="/accommodation">Explore stays</Link>
          <Link to="/guides">Browse guides</Link>
          <Link to="/transport">Browse transport</Link>
          <Link to="/events">Browse events</Link>
          <Link to="/community">Ask locals</Link>
        </div>
      </DashboardSection>

      <DashboardSection id="saved" title="Saved places & journeys">
        <EmptyState
          compact
          icon="♡"
          title="No saved places yet"
          sub="Save stays, food spots, guides, events, and journeys to plan later."
          cta={{ label: 'View on profile', to: `/u/${profile.username}` }}
        />
      </DashboardSection>

      <DashboardSection title="Recent activity">
        <EmptyState
          compact
          icon="✨"
          title="No recent activity"
          sub="Posts, bookings, and community replies will show up here."
          cta={{ label: 'Create a journey', to: '/journeys/new' }}
        />
      </DashboardSection>

      <DashboardSection title="Quick actions">
        <div className="udash__actions">
          <Link to="/create" className="udash__action">
            + Create Delvers post
          </Link>
          <Link to="/journeys/new" className="udash__action">
            + New journey
          </Link>
          <Link to="/events/new" className="udash__action">
            + Create event
          </Link>
          <Link to="/messages" className="udash__action">
            Open messages
          </Link>
          <Link to="/community" className="udash__action">
            Ask locals
          </Link>
        </div>
      </DashboardSection>
    </div>
  )
}
