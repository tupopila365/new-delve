import { Link } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'

const MODULES = [
  { to: '/provider/stays', label: 'Stays', emoji: '🏨', desc: 'Properties, rooms, photos, and nightly rates' },
  { to: '/provider/guides', label: 'Guides', emoji: '🧭', desc: 'Guide profile, packages, and availability' },
  { to: '/provider/transport', label: 'Transport', emoji: '🚗', desc: 'Vehicles, routes, and trip schedules' },
  { to: '/provider/food', label: 'Food & drink', emoji: '🍽', desc: 'Venues, menus, hours, and reservations' },
]

export function ProviderListings() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()

  return (
    <div className="prov-page">
      <h1 className="prov-page__title">Listings</h1>
      <p className="prov-page__sub">
        Manage listings for {activeBusiness?.business_name ?? 'your business'}. Choose a category module below.
      </p>
      <div className="prov-page__grid">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="prov-page__card">
            <span className="prov-page__card-icon" aria-hidden>
              {m.emoji}
            </span>
            <div>
              <h2>{m.label}</h2>
              <p>{m.desc}</p>
            </div>
            <span className="prov-page__arrow" aria-hidden>
              ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
