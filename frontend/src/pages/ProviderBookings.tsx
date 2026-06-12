import { Link } from 'react-router-dom'

const MOCK = [
  { id: 1, guest: 'Anna K.', service: 'Freesia Hotel', type: 'Stay', date: '2026-05-10', status: 'confirmed', total: 1050 },
  { id: 2, guest: 'James O.', service: 'Desert sunrise tour', type: 'Guide', date: '2026-05-14', status: 'requested', total: 340 },
  { id: 3, guest: 'Maria S.', service: 'Toyota Hilux 4×4', type: 'Transport', date: '2026-05-20', status: 'reserved', total: 1800 },
  { id: 4, guest: 'Tobias L.', service: 'Oryx Grill House', type: 'Food', date: '2026-06-01', status: 'confirmed', total: 0 },
]

export function ProviderBookings() {
  return (
    <div className="prov-page">
      <h1 className="prov-page__title">Bookings</h1>
      <p className="prov-page__sub">All booking requests across your listings — stays, guides, transport, food, and events.</p>

      <div className="prov-page__stats">
        <div className="prov-page__stat">
          <strong>4</strong>
          <span>Pending</span>
        </div>
        <div className="prov-page__stat">
          <strong>12</strong>
          <span>This month</span>
        </div>
        <div className="prov-page__stat">
          <strong>N$12,400</strong>
          <span>Revenue</span>
        </div>
      </div>

      <div className="prov-table">
        {MOCK.map((b) => (
          <div key={b.id} className="prov-table__row">
            <div>
              <strong>{b.guest}</strong>
              <span>
                {b.service} · {b.type}
              </span>
            </div>
            <span>{b.date}</span>
            <span className={`prov-table__status prov-table__status--${b.status}`}>{b.status}</span>
            <strong>{b.total ? `N$${b.total.toLocaleString()}` : 'Free'}</strong>
          </div>
        ))}
      </div>

      <p className="prov-page__hint">
        Open a category module for detailed booking flows.{' '}
        <Link to="/provider/stays">Stays</Link> · <Link to="/provider/guides">Guides</Link>
      </p>
    </div>
  )
}
