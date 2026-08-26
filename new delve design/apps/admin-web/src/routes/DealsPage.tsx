import DealsPanel from '../features/deals/DealsPanel'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'

export default function DealsPage() {
  return (
    <div>
      <AdminPageHeader title="Deals" description="Review, publish, feature, and report queues. This page does not load bookings or finance data." />
      <DealsPanel />
    </div>
  )
}
