import DisputesPanel from '../../features/finance/DisputesPanel'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'

export default function DisputesPage() {
  return (
    <div>
      <AdminPageHeader
        title="Disputes"
        description="Stripe is authoritative for dispute outcomes. Delve does not automatically refund travelers or reverse business settlement when a dispute opens."
      />
      <DisputesPanel />
    </div>
  )
}
