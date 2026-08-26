import BookingsPanel from '../features/bookings/BookingsPanel'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'

export default function BookingsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Bookings"
        description="Inspect-only list of reservations. Traveler payment and business settlement are separate."
      />
      <BookingsPanel />
    </div>
  )
}
