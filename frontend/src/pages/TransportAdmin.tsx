import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { mockVehicles, mockBusTrips } from '../mocks/mockData'
import { ProviderCategoryStrip } from '../components/provider'

const MOCK_RENTALS = [
  { id: 1, guest: 'Chris D.', vehicle: 'Toyota Hilux 4x4', from: '2026-05-10', to: '2026-05-14', days: 4, total: 3120, status: 'confirmed' },
  { id: 2, guest: 'Priya N.', vehicle: 'Mercedes V-Class', from: '2026-05-18', to: '2026-05-20', days: 2, total: 2500, status: 'pending' },
  { id: 3, guest: 'Sam W.', vehicle: 'Toyota Hilux 4x4', from: '2026-06-05', to: '2026-06-10', days: 5, total: 3900, status: 'confirmed' },
]

const MOCK_BUS_RESERVATIONS = [
  { id: 1, passenger: 'Lisa M.', route: 'Windhoek → Swakopmund', seat: 5, date: '2026-05-11', total: 180, status: 'confirmed' },
  { id: 2, passenger: 'David O.', route: 'Windhoek → Oshakati', seat: 12, date: '2026-05-15', total: 240, status: 'confirmed' },
  { id: 3, passenger: 'Anna F.', route: 'Windhoek → Swakopmund', seat: 18, date: '2026-05-21', total: 180, status: 'pending' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-NA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function TransportAdmin() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'vehicles' | 'buses' | 'rentals' | 'reservations'>('vehicles')

  if (!profile) return <Navigate to="/login" replace />
  if (profile.user_type !== 'service_provider') return <Navigate to="/" replace />

  const myVehicles = mockVehicles.filter((v) => v.owner_username === profile.username)
  const rentals = MOCK_RENTALS.filter((r) => myVehicles.some((v) => v.title === r.vehicle))
  const revenue = rentals.filter((r) => r.status === 'confirmed').reduce((s, r) => s + r.total, 0)
    + MOCK_BUS_RESERVATIONS.filter((r) => r.status === 'confirmed').reduce((s, r) => s + r.total, 0)

  const pendingRentals = rentals.filter((r) => r.status === 'pending').length
  const missingPhotos = myVehicles.filter((v) => !v.cover_image).length

  return (
    <div className="prov-cat-page">
      <ProviderCategoryStrip
        title="Transport"
        subtitle="Manage vehicles, routes, schedules, prices, and transport bookings."
        publicTo="/transport"
        attention={[
          ...(missingPhotos > 0
            ? [{ label: `${missingPhotos} vehicle${missingPhotos === 1 ? '' : 's'} missing photos`, actionLabel: 'Add photos', actionTo: '#vehicles', priority: 'high' as const }]
            : []),
          ...(pendingRentals > 0
            ? [{ label: `${pendingRentals} pending transport booking${pendingRentals === 1 ? '' : 's'}`, actionLabel: 'Review bookings', actionTo: '#rentals', priority: 'high' as const }]
            : []),
          { label: '1 route missing schedule', actionLabel: 'Manage schedule', actionTo: '#buses', priority: 'medium' as const },
        ]}
        quickActions={[
          { label: 'Add vehicle', to: '#vehicles', emoji: '🚗' },
          { label: 'Add route', to: '#buses', emoji: '🚌' },
          { label: 'Manage bookings', to: '#rentals', emoji: '📅' },
        ]}
      />

      <div className="adm-bar adm-bar--compact">
        <Link to="/provider" className="up__back" aria-label="Back to dashboard">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h2 className="adm-bar__title">Fleet &amp; routes</h2>
          <p className="adm-bar__sub">Vehicles, bus routes, rentals, and reservations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat__n">{myVehicles.length}</span>
          <span className="adm-stat__l">Vehicles</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">{mockBusTrips.length}</span>
          <span className="adm-stat__l">Bus trips</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">{rentals.length + MOCK_BUS_RESERVATIONS.length}</span>
          <span className="adm-stat__l">Bookings</span>
        </div>
        <div className="adm-stat adm-stat--accent">
          <span className="adm-stat__n">N${revenue.toLocaleString()}</span>
          <span className="adm-stat__l">Revenue</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="adm-tabs" role="tablist">
        {(['vehicles', 'buses', 'rentals', 'reservations'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            className={`adm-tab${tab === t ? ' adm-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'vehicles' ? '🚙 Fleet' : t === 'buses' ? '🚌 Routes' : t === 'rentals' ? '🔑 Rentals' : '🎫 Reservations'}
          </button>
        ))}
      </div>

      {/* Fleet tab */}
      {tab === 'vehicles' && (
        <div className="adm-section" id="vehicles">
          {myVehicles.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No transport listings yet</p>
              <p className="adm-empty__sub">Add vehicles or bus routes so travellers can move around.</p>
            </div>
          ) : (
            <div className="adm-list">
              {myVehicles.map((v) => (
                <div key={v.id} className="adm-listing-card">
                  <div className="adm-listing-card__img">
                    {v.cover_image
                      ? <img src={v.cover_image} alt="" />
                      : <span aria-hidden>🚗</span>
                    }
                  </div>
                  <div className="adm-listing-card__body">
                    <div className="adm-listing-card__title-row">
                      <p className="adm-listing-card__title">{v.title}</p>
                      <span className="adm-badge adm-badge--green">Available</span>
                    </div>
                    <p className="adm-listing-card__meta">
                      {v.make} {v.model} {v.year} · {v.vehicle_type} · {v.seats} seats · {v.transmission}
                    </p>
                    <p className="adm-listing-card__meta">📍 {v.city}, {v.region} · N${v.price_per_day}/day</p>
                    {v.included_features && (
                      <div className="adm-listing-card__amenities">
                        {v.included_features.slice(0, 3).map((f) => (
                          <span key={f} className="adm-pill">{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="adm-listing-card__actions">
                    <Link to={`/transport/vehicle/${v.id}`} className="btn btn-ghost adm-action-btn">View</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="adm-add-btn" disabled title="Full editing coming soon">
            + Add vehicle
          </button>
        </div>
      )}

      {/* Bus routes tab */}
      {tab === 'buses' && (
        <div className="adm-section" id="buses">
          <p className="adm-section__hint">All active bus trips across the network.</p>
          <div className="adm-list">
            {mockBusTrips.map((t) => {
              const occ = t.occupied_seats.length
              const pct = Math.round((occ / t.total_seats) * 100)
              return (
                <div key={t.id} className="adm-listing-card">
                  <div className="adm-listing-card__body" style={{ flex: 1 }}>
                    <div className="adm-listing-card__title-row">
                      <p className="adm-listing-card__title">
                        {t.route_detail.origin} → {t.route_detail.destination}
                      </p>
                      <span className={`adm-badge ${t.is_active ? 'adm-badge--green' : 'adm-badge--grey'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="adm-listing-card__meta">{t.route_detail.operator_name}</p>
                    <p className="adm-listing-card__meta">
                      🕐 {fmtDate(t.departs_at)} · N${t.price}
                    </p>
                    <div className="adm-bus-capacity">
                      <div className="adm-bus-capacity__bar">
                        <div className="adm-bus-capacity__fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="adm-bus-capacity__label">{occ}/{t.total_seats} seats · {pct}% full</span>
                    </div>
                  </div>
                  <div className="adm-listing-card__actions">
                    <Link to={`/transport/bus/${t.id}`} className="btn btn-ghost adm-action-btn">View</Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rentals tab */}
      {tab === 'rentals' && (
        <div className="adm-section" id="rentals">
          {rentals.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No rentals found</p>
              <p className="adm-empty__sub">Log in as <strong>transport_mgr</strong> to see vehicle rentals.</p>
            </div>
          ) : (
            <div className="adm-list">
              {rentals.map((r) => (
                <div key={r.id} className="adm-booking-row">
                  <div className="adm-booking-row__info">
                    <p className="adm-booking-row__guest">{r.guest}</p>
                    <p className="adm-booking-row__listing">{r.vehicle}</p>
                    <p className="adm-booking-row__dates">{r.from} → {r.to} · {r.days} days</p>
                  </div>
                  <div className="adm-booking-row__right">
                    <p className="adm-booking-row__total">N${r.total.toLocaleString()}</p>
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

      {/* Bus reservations tab */}
      {tab === 'reservations' && (
        <div className="adm-section">
          <div className="adm-list">
            {MOCK_BUS_RESERVATIONS.map((r) => (
              <div key={r.id} className="adm-booking-row">
                <div className="adm-booking-row__info">
                  <p className="adm-booking-row__guest">{r.passenger}</p>
                  <p className="adm-booking-row__listing">{r.route}</p>
                  <p className="adm-booking-row__dates">{r.date} · Seat {r.seat}</p>
                </div>
                <div className="adm-booking-row__right">
                  <p className="adm-booking-row__total">N${r.total}</p>
                  <span className={`adm-badge ${r.status === 'confirmed' ? 'adm-badge--green' : 'adm-badge--yellow'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
