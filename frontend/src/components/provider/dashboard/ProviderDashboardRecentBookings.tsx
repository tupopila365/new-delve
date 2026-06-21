import { Link } from 'react-router-dom'
import type { ProviderBooking } from '../../../data/providerData'

type Props = {
  bookings: ProviderBooking[]
}

export function ProviderDashboardRecentBookings({ bookings }: Props) {
  if (bookings.length === 0) return null

  return (
    <section>
      <div className="prov-ui__recent-head">
        <h2 className="prov-ui__section-title">Recent bookings</h2>
        <Link to="/provider/bookings" className="prov-ui__link">
          View all
        </Link>
      </div>
      <ul className="prov-ui__list">
        {bookings.slice(0, 3).map((b) => (
          <li key={b.id} className="prov-ui__recent-row">
            <div>
              <strong>{b.guest}</strong>
              <span>
                {b.service} · {b.date}
              </span>
            </div>
            <span className={`prov-ui__status prov-ui__status--${b.status}`}>{b.status}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
