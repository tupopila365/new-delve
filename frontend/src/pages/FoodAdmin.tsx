import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { mockFood } from '../mocks/mockData'

const MOCK_REVIEWS = [
  { id: 1, guest: 'Amara D.', venue: 'Oryx Grill House', rating: 5, body: 'Best oryx steak in Windhoek. Smoky, juicy, and perfectly seasoned. The service was warm and attentive.' },
  { id: 2, guest: 'Lukas B.', venue: 'Coastal Café', rating: 4.8, body: 'Morning coffee and a fresh croissant with the sea breeze — perfect way to start the day in Swakopmund.' },
  { id: 3, guest: 'Priya N.', venue: 'Oryx Grill House', rating: 4.7, body: 'Amazing local flavours. The warthog ribs were incredible. Will definitely be back.' },
]

const MOCK_RESERVATIONS = [
  { id: 1, guest: 'Anna K.', venue: 'Oryx Grill House', date: '2026-05-10 19:00', guests: 4, status: 'confirmed' },
  { id: 2, guest: 'Sam W.', venue: 'Coastal Café', date: '2026-05-12 09:00', guests: 2, status: 'confirmed' },
  { id: 3, guest: 'James O.', venue: 'Oryx Grill House', date: '2026-05-14 20:00', guests: 6, status: 'pending' },
]

const PRICE_LABEL = ['', '$', '$$', '$$$', '$$$$']

function stars(n: number) {
  return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))
}

export function FoodAdmin() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'venues' | 'reservations' | 'reviews'>('venues')

  if (!profile) return <Navigate to="/login" replace />
  if (profile.user_type !== 'service_provider') return <Navigate to="/" replace />

  const myVenues = mockFood.filter((f) => f.owner_username === profile.username)
  const myReviews = MOCK_REVIEWS.filter((r) => myVenues.some((v) => v.name === r.venue))
  const myReservations = MOCK_RESERVATIONS.filter((r) => myVenues.some((v) => v.name === r.venue))

  const avgRating = myVenues.length
    ? (myVenues.reduce((s, v) => s + parseFloat(v.rating_avg), 0) / myVenues.length).toFixed(2)
    : '—'
  const totalReviews = myVenues.reduce((s, v) => s + v.rating_count, 0)

  return (
    <div className="adm-page">
      {/* Back */}
      <div className="adm-bar">
        <Link to="/provider" className="up__back" aria-label="Back to dashboard">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="adm-bar__title">🍽 Food & Drink</h1>
          <p className="adm-bar__sub">Manage your restaurant & café listings</p>
        </div>
        <Link to="/food" className="btn btn-ghost adm-bar__view">View public</Link>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat__n">{myVenues.length}</span>
          <span className="adm-stat__l">Venues</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">⭐ {avgRating}</span>
          <span className="adm-stat__l">Avg rating</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">{totalReviews}</span>
          <span className="adm-stat__l">Reviews</span>
        </div>
        <div className="adm-stat adm-stat--accent">
          <span className="adm-stat__n">{myReservations.filter((r) => r.status === 'confirmed').length}</span>
          <span className="adm-stat__l">Reservations</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="adm-tabs" role="tablist">
        {(['venues', 'reservations', 'reviews'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            className={`adm-tab${tab === t ? ' adm-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'venues' ? '🏪 Venues' : t === 'reservations' ? '📅 Reservations' : '⭐ Reviews'}
          </button>
        ))}
      </div>

      {/* Venues tab */}
      {tab === 'venues' && (
        <div className="adm-section">
          {myVenues.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No venues found</p>
              <p className="adm-empty__sub">Log in as <strong>food_owner</strong> to see your venues.</p>
            </div>
          ) : (
            <div className="adm-list">
              {myVenues.map((venue) => (
                <div key={venue.id} className="adm-listing-card">
                  <div className="adm-listing-card__img">
                    {venue.cover_image
                      ? <img src={venue.cover_image} alt="" />
                      : <span aria-hidden>🍽</span>
                    }
                  </div>
                  <div className="adm-listing-card__body">
                    <div className="adm-listing-card__title-row">
                      <p className="adm-listing-card__title">{venue.name}</p>
                      <span className="adm-badge adm-badge--green">Open</span>
                    </div>
                    <p className="adm-listing-card__meta">
                      {venue.cuisine} · {venue.city}, {venue.region} · {PRICE_LABEL[venue.price_level] ?? '$$'}
                    </p>
                    <p className="adm-listing-card__rating">
                      ⭐ {venue.rating_avg} ({venue.rating_count} reviews)
                    </p>
                    <p className="adm-listing-card__desc">{venue.description}</p>
                  </div>
                  <div className="adm-listing-card__actions">
                    <Link to={`/food/${venue.id}`} className="btn btn-ghost adm-action-btn">View</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="adm-add-btn" disabled title="Full editing coming soon">
            + Add venue
          </button>
        </div>
      )}

      {/* Reservations tab */}
      {tab === 'reservations' && (
        <div className="adm-section">
          {myReservations.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No reservations found</p>
              <p className="adm-empty__sub">Log in as <strong>food_owner</strong> to see reservations.</p>
            </div>
          ) : (
            <div className="adm-list">
              {myReservations.map((r) => (
                <div key={r.id} className="adm-booking-row">
                  <div className="adm-booking-row__info">
                    <p className="adm-booking-row__guest">{r.guest}</p>
                    <p className="adm-booking-row__listing">{r.venue}</p>
                    <p className="adm-booking-row__dates">{r.date} · {r.guests} {r.guests === 1 ? 'guest' : 'guests'}</p>
                  </div>
                  <div className="adm-booking-row__right">
                    <span className={`adm-badge ${r.status === 'confirmed' ? 'adm-badge--green' : 'adm-badge--yellow'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews tab */}
      {tab === 'reviews' && (
        <div className="adm-section">
          {myReviews.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No reviews yet</p>
              <p className="adm-empty__sub">Log in as <strong>food_owner</strong> to see your reviews.</p>
            </div>
          ) : (
            <div className="adm-list">
              {myReviews.map((r) => (
                <div key={r.id} className="adm-review-card">
                  <div className="adm-review-card__header">
                    <p className="adm-review-card__guest">{r.guest}</p>
                    <span className="adm-review-card__stars">{stars(r.rating)}</span>
                    <p className="adm-review-card__listing">{r.venue}</p>
                  </div>
                  <p className="adm-review-card__body">{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
