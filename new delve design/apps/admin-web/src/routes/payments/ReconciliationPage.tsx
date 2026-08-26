import ReconciliationPanel from '../../features/finance/ReconciliationPanel'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'

export default function ReconciliationPage() {
  return (
    <div>
      <AdminPageHeader
        title="Reconciliation"
        description="Compares Delve records with Stripe. Does not create payments, transfers, refunds, or reversals."
      />
      <ReconciliationPanel />
    </div>
  )
}
