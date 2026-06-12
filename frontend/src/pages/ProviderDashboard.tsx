import { Link } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import {
  ProviderAttentionList,
  ProviderBookingRow,
  ProviderHealthList,
  ProviderPageHeader,
  ProviderQuickActions,
  ProviderStatGrid,
  ProviderStatusBadge,
} from '../components/provider'
import { EmptyState } from '../components/ui'
import {
  getAttentionItems,
  getBookingStats,
  getHealthItems,
  getListingStats,
  getProviderBookings,
  getProviderListings,
} from '../data/providerData'

const MESSAGES = [
  { from: 'James O.', listing: 'Freesia Hotel', preview: 'Can we check in early on May 14?', ago: '2h ago' },
  { from: 'Sara M.', listing: 'Desert sunrise tour', preview: 'Is the guide package still available?', ago: '5h ago' },
]

function verificationBadge(status?: string) {
  if (status === 'verified') return <span className="prov-verify prov-verify--ok">Verified</span>
  if (status === 'pending') return <span className="prov-verify prov-verify--warn">Verification pending</span>
  return <span className="prov-verify">Unverified</span>
}

export function ProviderDashboard() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const owner = activeBusiness?.owner_username

  const listings = getProviderListings(owner)
  const bookings = getProviderBookings(owner)
  const listingStats = getListingStats(listings)
  const bookingStats = getBookingStats(bookings)
  const attention = getAttentionItems(listings, bookings)
  const health = getHealthItems(listings)

  const categoryCounts = {
    stays: listings.filter((l) => l.category === 'Stay').length,
    guides: listings.filter((l) => l.category === 'Guide').length,
    transport: listings.filter((l) => l.category === 'Transport').length,
    food: listings.filter((l) => l.category === 'Food').length,
    events: listings.filter((l) => l.category === 'Event').length,
  }

  const quick = [
    { label: 'Add listing', to: '/provider/listings', emoji: '＋' },
    { label: 'Update availability', to: '/provider/stays', emoji: '📅' },
    { label: 'Reply to messages', to: '/messages', emoji: '💬' },
    { label: 'Manage bookings', to: '/provider/bookings', emoji: '📅' },
    { label: 'Create event', to: '/events/new', emoji: '🎟' },
    ...(activeBusiness
      ? [{ label: 'View public profile', to: `/business/${activeBusiness.id}`, emoji: '👁' }]
      : []),
  ]

  return (
    <div className="prov-page">
      <ProviderPageHeader
        title="Provider dashboard"
        subtitle={`Operational overview for ${activeBusiness?.business_name ?? 'your business'}.`}
        badge={verificationBadge(activeBusiness?.verification_status)}
        action={
          activeBusiness ? (
            <Link to={`/business/${activeBusiness.id}`} className="btn btn-ghost">
              Public business profile
            </Link>
          ) : null
        }
      />

      <ProviderAttentionList items={attention} />

      <ProviderStatGrid
        stats={[
          { value: listingStats.total, label: 'Active listings' },
          { value: bookingStats.pending, label: 'Pending bookings', accent: bookingStats.pending > 0 },
          { value: 2, label: 'Unread messages', accent: true },
          { value: `N$${bookingStats.revenue.toLocaleString()}`, label: 'Revenue this month' },
          { value: '4.7 ★', label: 'Average rating' },
          { value: listingStats.needsUpdate, label: 'Listings need updates', accent: listingStats.needsUpdate > 0 },
        ]}
      />

      <div className="prov-overview-grid">
        <section className="prov-overview-card">
          <div className="prov-overview-card__head">
            <h2>Recent bookings</h2>
            <Link to="/provider/bookings" className="prov-page__link">
              View all
            </Link>
          </div>
          {bookings.length === 0 ? (
            <EmptyState compact icon="📅" title="No bookings yet" sub="Booking requests will appear here." />
          ) : (
            <div className="prov-booking-list">
              {bookings.slice(0, 4).map((b) => (
                <ProviderBookingRow key={b.id} booking={b} />
              ))}
            </div>
          )}
        </section>

        <section className="prov-overview-card">
          <div className="prov-overview-card__head">
            <h2>Messages needing reply</h2>
            <Link to="/messages" className="prov-page__link">
              Open inbox
            </Link>
          </div>
          <div className="prov-message-preview">
            {MESSAGES.map((m) => (
              <div key={m.from} className="prov-message-preview__row">
                <div>
                  <strong>{m.from}</strong>
                  <span>{m.listing} · {m.preview}</span>
                </div>
                <Link to="/messages" className="prov-message-preview__reply">
                  Reply
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="prov-overview-card">
        <div className="prov-overview-card__head">
          <h2>Listing health</h2>
          <Link to="/provider/listings" className="prov-page__link">
            All listings
          </Link>
        </div>
        <ProviderHealthList items={health} />
      </section>

      <section className="prov-overview-card">
        <h2>Booking status summary</h2>
        <div className="prov-booking-summary">
          <div className="prov-booking-summary__item">
            <strong>{bookingStats.pending}</strong>
            <small>Pending</small>
          </div>
          <div className="prov-booking-summary__item">
            <strong>{bookingStats.confirmed}</strong>
            <small>Confirmed</small>
          </div>
          <div className="prov-booking-summary__item">
            <strong>{bookingStats.completed}</strong>
            <small>Completed</small>
          </div>
          <div className="prov-booking-summary__item">
            <strong>{bookingStats.cancelled}</strong>
            <small>Cancelled</small>
          </div>
        </div>
      </section>

      <section className="prov-overview-card">
        <h2>Listings by category</h2>
        <div className="prov-overview-card__grid">
          <Link to="/provider/stays" className="prov-overview-card__item">
            <span>🏨 {categoryCounts.stays}</span>
            <small>Stays</small>
          </Link>
          <Link to="/provider/guides" className="prov-overview-card__item">
            <span>🧭 {categoryCounts.guides}</span>
            <small>Guides</small>
          </Link>
          <Link to="/provider/transport" className="prov-overview-card__item">
            <span>🚗 {categoryCounts.transport}</span>
            <small>Transport</small>
          </Link>
          <Link to="/provider/food" className="prov-overview-card__item">
            <span>🍽 {categoryCounts.food}</span>
            <small>Food & drink</small>
          </Link>
          <Link to="/events/new" className="prov-overview-card__item prov-overview-card__item--planned">
            <span>🎟 {categoryCounts.events}</span>
            <small>Events</small>
          </Link>
        </div>
        <p className="prov-overview-card__total">{listingStats.total} listings across categories</p>
      </section>

      <section className="prov-overview-card">
        <h2>Quick actions</h2>
        <ProviderQuickActions actions={quick} />
      </section>

      <section className="prov-overview-card prov-overview-card--events">
        <h2>Events</h2>
        <p className="prov-page__hint">
          Create and manage events, tickets, attendees, and venue details. Full event management is available through event creation.
        </p>
        <Link to="/events/new" className="btn btn-primary">
          Create event
        </Link>
      </section>
    </div>
  )
}
