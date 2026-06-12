import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

type Overview = {
  users: number
  providers: number
  businesses: number
  businesses_pending: number
  listings: number
  bookings: number
  bookings_pending: number
}

export function PlatformAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-overview'],
    queryFn: () => apiFetch<Overview>('/api/accounts/admin/overview/'),
  })

  if (isLoading || !data) {
    return <div className="adm-platform"><p>Loading platform overview…</p></div>
  }

  return (
    <div className="adm-platform">
      <h1>Platform overview</h1>
      <p className="adm-platform__sub">DELVE internal control — users, businesses, listings, and bookings.</p>

      <div className="adm-platform__grid">
        <div className="adm-platform__card">
          <strong>{data.users}</strong>
          <span>Users</span>
        </div>
        <div className="adm-platform__card">
          <strong>{data.providers}</strong>
          <span>Providers</span>
        </div>
        <div className="adm-platform__card">
          <strong>{data.businesses}</strong>
          <span>Businesses</span>
        </div>
        <div className="adm-platform__card adm-platform__card--warn">
          <strong>{data.businesses_pending}</strong>
          <span>Pending verification</span>
        </div>
        <div className="adm-platform__card">
          <strong>{data.listings}</strong>
          <span>Stay listings</span>
        </div>
        <div className="adm-platform__card">
          <strong>{data.bookings}</strong>
          <span>Bookings</span>
        </div>
        <div className="adm-platform__card adm-platform__card--warn">
          <strong>{data.bookings_pending}</strong>
          <span>Pending bookings</span>
        </div>
      </div>
    </div>
  )
}
