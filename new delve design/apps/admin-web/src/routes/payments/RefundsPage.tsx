import RefundsPanel from '../../features/finance/RefundsPanel'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'

export default function RefundsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Refunds"
        description="Paid cancellation is a review workflow. This page does not load deals, bookings lists, settlements, or reports."
      />
      <RefundsPanel />
    </div>
  )
}
