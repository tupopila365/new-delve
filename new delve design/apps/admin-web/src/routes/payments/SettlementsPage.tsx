import SettlementsPanel from '../../features/finance/SettlementsPanel'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'

export default function SettlementsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Settlements"
        description="Traveler payment is already collected. Settlement is a Stripe Transfer to the connected account — not a bank payout."
      />
      <SettlementsPanel />
    </div>
  )
}
