import { useEffect, useState } from 'react'
import type { AdminModerationOpsSummary } from '@delve/contracts'
import { adminModerationOpsSummary } from '../api/moderation'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AttentionCard } from '../components/admin/AttentionCard'
import { ErrorState } from '../components/admin/ErrorState'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'

export default function ModerationPage() {
  const [data, setData] = useState<AdminModerationOpsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await adminModerationOpsSummary())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load moderation overview')
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
        title="Trust & Safety"
        description="Open reports, repeat-reported content, and upcoming events with unresolved reports. Counts are operational facts, not risk scores."
      />
      {loading ? <LoadingSkeleton rows={3} /> : null}
      {error ? <ErrorState title="Moderation unavailable" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <AttentionCard label="Open reports" value={data.openReportCount} to="/moderation/reports" tone={data.openReportCount > 0 ? 'warning' : 'default'} />
          <AttentionCard label="Needs review" value={data.needsReviewCount} to="/moderation/reports" tone={data.needsReviewCount > 0 ? 'warning' : 'default'} />
          <AttentionCard
            label="Targets with 3+ open reports"
            value={data.repeatTargetCount}
            to="/moderation/reports?minReports=3"
            tone={data.repeatTargetCount > 0 ? 'warning' : 'default'}
          />
          <AttentionCard label="Resolved today" value={data.resolvedTodayCount} to="/moderation/reports" />
          <AttentionCard
            label="Hidden or removed content"
            value={data.hiddenOrRemovedCount}
            to="/moderation/posts?status=removed"
            tone={data.hiddenOrRemovedCount > 0 ? 'warning' : 'default'}
          />
          <AttentionCard
            label="Open community reports"
            value={data.communityOpenReportCount}
            to="/moderation/reports?targetType=COMMUNITY_THREAD"
            tone={data.communityOpenReportCount > 0 ? 'warning' : 'default'}
          />
          <AttentionCard
            label="Upcoming events with open reports"
            value={data.upcomingEventsWithReports}
            to="/moderation/events?reported=true"
            tone={data.upcomingEventsWithReports > 0 ? 'critical' : 'default'}
          />
        </div>
      ) : null}
    </div>
  )
}
