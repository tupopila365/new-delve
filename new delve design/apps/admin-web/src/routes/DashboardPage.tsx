import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ReconciliationSummaryDto } from '@delve/contracts'
import { adminFetch } from '../api/adminClient'
import { adminMarketplaceOpsSummary } from '../api/businesses'
import { adminTravelerOpsSummary } from '../api/travelers'
import { adminModerationOpsSummary } from '../api/moderation'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AttentionCard } from '../components/admin/AttentionCard'
import { ErrorState } from '../components/admin/ErrorState'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'

type Count = { value: string; tone: 'default' | 'warning' | 'critical' }

function listCount(length: number, cap = 200): Count {
  const value = length >= cap ? `${cap}+` : String(length)
  return { value, tone: length > 0 ? 'warning' : 'default' }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDeals, setPendingDeals] = useState<Count | null>(null)
  const [openReports, setOpenReports] = useState<Count | null>(null)
  const [eligible, setEligible] = useState<Count | null>(null)
  const [disputes, setDisputes] = useState<Count | null>(null)
  const [cancellations, setCancellations] = useState<Count | null>(null)
  const [unmatched, setUnmatched] = useState<Count | null>(null)
  const [recon, setRecon] = useState<ReconciliationSummaryDto | null>(null)
  const [pendingBiz, setPendingBiz] = useState<Count | null>(null)
  const [stripeIssues, setStripeIssues] = useState<Count | null>(null)
  const [travelers, setTravelers] = useState<Count | null>(null)
  const [newTravelers, setNewTravelers] = useState<Count | null>(null)
  const [restrictedTravelers, setRestrictedTravelers] = useState<Count | null>(null)
  const [contentReports, setContentReports] = useState<Count | null>(null)
  const [repeatReports, setRepeatReports] = useState<Count | null>(null)
  const [upcomingEventReports, setUpcomingEventReports] = useState<Count | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [dealsRes, reportsRes, settleRes, disputeRes, cancelRes, unmatchedRes, reconRes, ops, travelerOps, moderationOps] = await Promise.all([
        adminFetch('/admin/deals?status=PENDING_REVIEW'),
        adminFetch('/admin/deal-reports?status=OPEN'),
        adminFetch('/admin/settlements?status=ELIGIBLE'),
        adminFetch('/admin/disputes?status=NEEDS_RESPONSE'),
        adminFetch('/admin/cancellation-requests?status=PENDING'),
        adminFetch('/admin/reconciliation/unmatched?status=OPEN'),
        adminFetch('/admin/reconciliation/summary'),
        adminMarketplaceOpsSummary(),
        adminTravelerOpsSummary(),
        adminModerationOpsSummary(),
      ])
      async function json<T>(res: Response) {
        const body = (await res.json()) as { success?: boolean; data?: T }
        if (!res.ok || body.success === false) throw new Error('Could not load dashboard')
        return body.data
      }
      const deals = (await json<unknown[]>(dealsRes)) || []
      const reports = (await json<unknown[]>(reportsRes)) || []
      const settlements = (await json<unknown[]>(settleRes)) || []
      const disputeRows = (await json<unknown[]>(disputeRes)) || []
      const cancelRows = (await json<unknown[]>(cancelRes)) || []
      const unmatchedRows = (await json<unknown[]>(unmatchedRes)) || []
      const summary = await json<ReconciliationSummaryDto>(reconRes)
      setPendingDeals(listCount(deals.length, 200))
      setOpenReports(listCount(reports.length, 200))
      setEligible(listCount(settlements.length, 200))
      setDisputes({ ...listCount(disputeRows.length, 100), tone: disputeRows.length > 0 ? 'critical' : 'default' })
      setCancellations(listCount(cancelRows.length, 200))
      setUnmatched({ ...listCount(unmatchedRows.length, 100), tone: unmatchedRows.length > 0 ? 'critical' : 'default' })
      setRecon(summary || null)
      setPendingBiz({ value: String(ops.pendingVerificationCount), tone: ops.pendingVerificationCount > 0 ? 'warning' : 'default' })
      setStripeIssues({ value: String(ops.stripeSetupIssueCount), tone: ops.stripeSetupIssueCount > 0 ? 'warning' : 'default' })
      setTravelers({ value: String(travelerOps.travelerCount), tone: 'default' })
      setNewTravelers({ value: String(travelerOps.newThisMonthCount), tone: 'default' })
      setRestrictedTravelers({
        value: String(travelerOps.restrictedCount),
        tone: travelerOps.restrictedCount > 0 ? 'warning' : 'default',
      })
      setContentReports({
        value: String(moderationOps.openReportCount),
        tone: moderationOps.openReportCount > 0 ? 'warning' : 'default',
      })
      setRepeatReports({
        value: String(moderationOps.repeatTargetCount),
        tone: moderationOps.repeatTargetCount > 0 ? 'warning' : 'default',
      })
      setUpcomingEventReports({
        value: String(moderationOps.upcomingEventsWithReports),
        tone: moderationOps.upcomingEventsWithReports > 0 ? 'critical' : 'default',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Attention items from existing operations queues. Opening this page does not load every finance or marketplace dataset."
      />
      {loading ? <LoadingSkeleton rows={3} /> : null}
      {error ? <ErrorState title="Dashboard unavailable" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <AttentionCard label="Travelers" value={travelers?.value ?? '—'} to="/travelers" tone={travelers?.tone} />
          <AttentionCard label="New travelers this month" value={newTravelers?.value ?? '—'} to="/travelers" tone={newTravelers?.tone} />
          <AttentionCard label="Restricted traveler accounts" value={restrictedTravelers?.value ?? '—'} to="/travelers?accountStatus=restricted" tone={restrictedTravelers?.tone} />
          <AttentionCard label="Content reports awaiting review" value={contentReports?.value ?? '—'} to="/moderation/reports" tone={contentReports?.tone} />
          <AttentionCard label="Repeated reports on the same content" value={repeatReports?.value ?? '—'} to="/moderation/reports?minReports=3" tone={repeatReports?.tone} />
          <AttentionCard label="Upcoming events with open reports" value={upcomingEventReports?.value ?? '—'} to="/moderation/events?reported=true" tone={upcomingEventReports?.tone} />
          <AttentionCard label="Businesses pending verification" value={pendingBiz?.value ?? '—'} to="/businesses?status=PENDING_VERIFICATION" tone={pendingBiz?.tone} />
          <AttentionCard label="Business Stripe setup issues" value={stripeIssues?.value ?? '—'} to="/businesses" tone={stripeIssues?.tone} />
          <AttentionCard label="Deals pending review" value={pendingDeals?.value ?? '—'} to="/deals" tone={pendingDeals?.tone} />
          <AttentionCard label="Open deal reports" value={openReports?.value ?? '—'} to="/deals" tone={openReports?.tone} />
          <AttentionCard label="Eligible settlements" value={eligible?.value ?? '—'} to="/payments/settlements" tone={eligible?.tone} />
          <AttentionCard label="Disputes needing response" value={disputes?.value ?? '—'} to="/payments/disputes" tone={disputes?.tone} />
          <AttentionCard label="Pending cancellations" value={cancellations?.value ?? '—'} to="/payments/refunds" tone={cancellations?.tone} />
          <AttentionCard
            label="Open reconciliation issues"
            value={recon?.openIssues ?? '—'}
            to="/payments/reconciliation"
            tone={(recon?.criticalIssues || 0) > 0 ? 'critical' : (recon?.openIssues || 0) > 0 ? 'warning' : 'default'}
          />
          <AttentionCard label="Unmatched Stripe events" value={unmatched?.value ?? '—'} to="/payments/reconciliation" tone={unmatched?.tone} />
        </div>
      ) : null}
      <p className="text-xs m-0 mt-6" style={{ color: 'var(--muted)' }}>
        Counts of 200+ mean the queue is at least as large as the existing list endpoint cap.{' '}
        <Link to="/payments" style={{ color: 'var(--fg)' }}>
          Payments overview
        </Link>
      </p>
    </div>
  )
}
