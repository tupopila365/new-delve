import ReportsPanel from '../../features/finance/ReportsPanel'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'

export default function FinancialReportsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Reports"
        description="Operational marketplace reporting from persisted financial records. Currencies are never combined. This page does not move money."
      />
      <ReportsPanel />
    </div>
  )
}
