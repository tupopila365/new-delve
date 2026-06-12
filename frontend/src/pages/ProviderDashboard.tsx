import { Link } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { mockStays, mockGuides, mockVehicles, mockFood } from '../mocks/mockData'

const QUICK = [
  { label: 'Add listing', to: '/provider/listings', emoji: '＋' },
  { label: 'Update availability', to: '/provider/stays', emoji: '📅' },
  { label: 'Reply to messages', to: '/messages', emoji: '💬' },
  { label: 'Create event', to: '/events/new', emoji: '🎟' },
]

export function ProviderDashboard() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const owner = activeBusiness?.owner_username

  const stayCount = owner ? mockStays.filter((s) => s.owner_username === owner).length : 0
  const guideCount = owner ? mockGuides.filter((g) => g.username === owner).length : 0
  const vehicleCount = owner ? mockVehicles.filter((v) => v.owner_username === owner).length : 0
  const foodCount = owner ? mockFood.filter((f) => f.owner_username === owner).length : 0
  const listingTotal = stayCount + guideCount + vehicleCount + foodCount

  return (
    <div className="prov-page">
      <h1 className="prov-page__title">Overview</h1>
      <p className="prov-page__sub">
        Today at {activeBusiness?.business_name ?? 'your business'} — bookings, messages, and listing health.
      </p>

      <div className="prov-page__stats prov-page__stats--overview">
        <div className="prov-page__stat prov-page__stat--accent">
          <strong>4</strong>
          <span>Bookings pending</span>
        </div>
        <div className="prov-page__stat">
          <strong>8</strong>
          <span>Messages</span>
        </div>
        <div className="prov-page__stat">
          <strong>N$12,400</strong>
          <span>Revenue this month</span>
        </div>
        <div className="prov-page__stat">
          <strong>4.7 ★</strong>
          <span>Reviews</span>
        </div>
      </div>

      <section className="prov-overview-card">
        <h2>Listings snapshot</h2>
        <div className="prov-overview-card__grid">
          <Link to="/provider/stays" className="prov-overview-card__item">
            <span>🏨 {stayCount}</span>
            <small>Stays</small>
          </Link>
          <Link to="/provider/guides" className="prov-overview-card__item">
            <span>🧭 {guideCount}</span>
            <small>Guides</small>
          </Link>
          <Link to="/provider/transport" className="prov-overview-card__item">
            <span>🚗 {vehicleCount}</span>
            <small>Transport</small>
          </Link>
          <Link to="/provider/food" className="prov-overview-card__item">
            <span>🍽 {foodCount}</span>
            <small>Food</small>
          </Link>
        </div>
        <p className="prov-overview-card__total">{listingTotal} active listings</p>
      </section>

      <section className="prov-overview-card">
        <h2>Quick actions</h2>
        <div className="prov-quick">
          {QUICK.map((q) => (
            <Link key={q.label} to={q.to} className="prov-quick__btn">
              <span aria-hidden>{q.emoji}</span> {q.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="prov-overview-card">
        <h2>Recent bookings</h2>
        <div className="prov-table">
          <div className="prov-table__row">
            <div>
              <strong>Anna K.</strong>
              <span>Freesia Hotel · Stay</span>
            </div>
            <span>2026-05-10</span>
            <span className="prov-table__status prov-table__status--confirmed">confirmed</span>
            <strong>N$1,050</strong>
          </div>
          <div className="prov-table__row">
            <div>
              <strong>James O.</strong>
              <span>Desert tour · Guide</span>
            </div>
            <span>2026-05-14</span>
            <span className="prov-table__status prov-table__status--requested">requested</span>
            <strong>N$340</strong>
          </div>
        </div>
        <Link to="/provider/bookings" className="prov-page__link">
          View all bookings →
        </Link>
      </section>
    </div>
  )
}
