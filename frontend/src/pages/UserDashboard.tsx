import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { MyBusiness } from '../hooks/useBusinessAccess'

type Booking = {
  id: number
  listing_title: string
  check_in: string
  check_out: string
  status: string
}

export function UserDashboard() {
  const { profile } = useAuth()

  const { data: bookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => apiFetch<Booking[]>('/api/accommodation/bookings/').catch(() => [] as Booking[]),
    enabled: Boolean(profile),
  })

  if (!profile) return <Navigate to="/login" replace />

  const { data: businesses = [] } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => apiFetch<MyBusiness[]>('/api/accounts/me/businesses/'),
    enabled: Boolean(profile),
  })
  const isProvider = profile.user_type === 'service_provider' && businesses.length > 0
  const pendingBookings = (bookings ?? []).filter((b) => b.status === 'pending').length

  return (
    <div className="udash">
      <header className="udash__hero">
        <div className="udash__hero-user">
          {profile.avatar ? (
            <img src={mediaUrl(profile.avatar) || ''} alt="" className="udash__avatar" />
          ) : (
            <span className="udash__avatar udash__avatar--init">
              {(profile.display_name || profile.username).charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <p className="udash__kicker">Private dashboard</p>
            <h1>{profile.display_name || profile.username}</h1>
            <p className="udash__sub">@{profile.username} · Bookings, saved items, and account shortcuts</p>
          </div>
        </div>
        <div className="udash__hero-actions">
          <Link to={`/u/${profile.username}`} className="btn btn-ghost">
            View public profile
          </Link>
          <Link to="/settings" className="btn btn-primary">
            Account settings
          </Link>
        </div>
      </header>

      <div className="udash__grid">
        <Link to="/dashboard#bookings" className="udash__card">
          <span className="udash__card-n">{bookings?.length ?? '—'}</span>
          <span className="udash__card-l">Bookings</span>
          {pendingBookings > 0 ? <span className="udash__card-badge">{pendingBookings} pending</span> : null}
        </Link>
        <Link to="/messages" className="udash__card">
          <span className="udash__card-n">💬</span>
          <span className="udash__card-l">Messages</span>
        </Link>
        <Link to="/dashboard#saved" className="udash__card">
          <span className="udash__card-n">♡</span>
          <span className="udash__card-l">Saved</span>
        </Link>
        <Link to="/settings" className="udash__card">
          <span className="udash__card-n">⚙</span>
          <span className="udash__card-l">Settings</span>
        </Link>
      </div>

      {isProvider ? (
        <section className="udash__section detail-section">
          <div className="udash__section-head">
            <h2>Your businesses</h2>
            <Link to="/provider" className="btn btn-primary">
              Provider dashboard
            </Link>
          </div>
          <div className="udash__biz-grid">
            {businesses.map((b) => (
              <Link key={b.id} to={`/business/${b.id}`} className="udash__biz-card">
                {b.logo ? <img src={b.logo} alt="" /> : <span>{b.business_name.charAt(0)}</span>}
                <div>
                  <strong>{b.business_name}</strong>
                  <small>{b.city}, {b.region}</small>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section id="bookings" className="udash__section detail-section">
        <h2>Recent bookings</h2>
        {(bookings ?? []).length === 0 ? (
          <p className="udash__empty">No bookings yet. Explore stays, guides, transport, and events on DELVE.</p>
        ) : (
          <ul className="udash__list">
            {(bookings ?? []).slice(0, 6).map((b) => (
              <li key={b.id} className="udash__list-row">
                <div>
                  <strong>{b.listing_title}</strong>
                  <span>
                    {b.check_in} → {b.check_out}
                  </span>
                </div>
                <span className={`udash__status udash__status--${b.status}`}>{b.status}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="udash__links">
          <Link to="/accommodation">Browse stays</Link>
          <Link to="/guides">Browse guides</Link>
          <Link to="/transport">Browse transport</Link>
          <Link to="/events">Browse events</Link>
        </div>
      </section>

      <section id="saved" className="udash__section detail-section">
        <h2>Saved items</h2>
        <p className="udash__empty">
          Saved stays, food, guides, journeys, and events appear on your{' '}
          <Link to={`/u/${profile.username}`}>public profile</Link> when you choose to share collections.
        </p>
        <Link to={`/u/${profile.username}`} className="btn btn-ghost">
          View saved on profile
        </Link>
      </section>

      <section className="udash__section detail-section">
        <h2>Quick actions</h2>
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
        </div>
      </section>
    </div>
  )
}
