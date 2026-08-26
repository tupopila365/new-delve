import { useEffect, useState } from 'react'
import type { ReconciliationSummaryDto } from '@delve/contracts'
import { adminFetch } from '../../api/adminClient'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { AttentionCard } from '../../components/admin/AttentionCard'
import { ErrorState } from '../../components/admin/ErrorState'
import { LoadingSkeleton } from '../../components/admin/LoadingSkeleton'

function cap(n: number, limit: number) {
  return n >= limit ? `${limit}+` : String(n)
}

export default function PaymentsOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eligible, setEligible] = useState('—')
  const [pendingRefunds, setPendingRefunds] = useState('—')
  const [requests, setRequests] = useState('—')
  const [disputes, setDisputes] = useState('—')
  const [recon, setRecon] = useState<ReconciliationSummaryDto | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [s, r, c, d, sum] = await Promise.all([
        adminFetch('/admin/settlements?status=ELIGIBLE'),
        adminFetch('/admin/refunds?status=PENDING'),
        adminFetch('/admin/cancellation-requests?status=PENDING'),
        adminFetch('/admin/disputes?status=NEEDS_RESPONSE'),
        adminFetch('/admin/reconciliation/summary'),
      ])
      async function rows(res: Response) {
        const body = (await res.json()) as { success?: boolean; data?: unknown[] }
        if (!res.ok || body.success === false) throw new Error('Could not load payments overview')
        return body.data?.length ?? 0
      }
      setEligible(cap(await rows(s), 200))
      setPendingRefunds(cap(await rows(r), 200))
      setRequests(cap(await rows(c), 200))
      setDisputes(cap(await rows(d), 100))
      const sumBody = (await sum.json()) as { success?: boolean; data?: ReconciliationSummaryDto }
      if (!sum.ok || sumBody.success === false) throw new Error('Could not load payments overview')
      setRecon(sumBody.data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payments overview')
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
        title="Payments overview"
        description="Finance queues only. This page does not load deal analytics, bookings, or financial reports."
      />
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Payments overview unavailable" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <AttentionCard label="Eligible settlements" value={eligible} to="/payments/settlements" tone={eligible !== '0' ? 'warning' : 'default'} />
          <AttentionCard label="Pending cancellation requests" value={requests} to="/payments/refunds" tone={requests !== '0' ? 'warning' : 'default'} />
          <AttentionCard label="Pending refunds" value={pendingRefunds} to="/payments/refunds" />
          <AttentionCard label="Disputes needing response" value={disputes} to="/payments/disputes" tone={disputes !== '0' ? 'critical' : 'default'} />
          <AttentionCard
            label="Open reconciliation issues"
            value={recon?.openIssues ?? '—'}
            to="/payments/reconciliation"
            tone={(recon?.criticalIssues || 0) > 0 ? 'critical' : 'default'}
          />
          <AttentionCard label="Reports" value="Open" to="/payments/reports" />
        </div>
      ) : null}
    </div>
  )
}
