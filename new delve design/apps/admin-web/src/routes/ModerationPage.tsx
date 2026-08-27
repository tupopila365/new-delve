import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AdminModerationOpsSummary } from '@delve/contracts'
import { adminModerationOpsSummary } from '../api/moderation'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AttentionCard } from '../components/admin/AttentionCard'
import { ErrorState } from '../components/admin/ErrorState'
import { FilterBar } from '../components/admin/FilterBar'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'

function ageLabel(seconds: number | null) {
  if (seconds == null) return 'None'
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`
  return `${Math.floor(seconds / 86400)} d`
}

export default function ModerationPage() {
  const [params, setParams] = useSearchParams()
  const period = params.get('period') || '30d'
  const [data, setData] = useState<AdminModerationOpsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await adminModerationOpsSummary(period))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load moderation overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [period])

  return (
    <div>
      <AdminPageHeader
        title="Trust & Safety"
        description="Operational counts for this period. These are facts, not risk scores, and they do not restrict accounts."
      />
      <FilterBar>
        <select
          className="admin-input"
          style={{ maxWidth: 180 }}
          value={period}
          onChange={e => {
            const next = new URLSearchParams(params)
            next.set('period', e.target.value)
            setParams(next)
          }}
        >
          <option value="today">Today</option>
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
          <option value="month">This month</option>
        </select>
      </FilterBar>
      {loading ? <LoadingSkeleton rows={3} /> : null}
      {error ? <ErrorState title="Moderation unavailable" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <AttentionCard label="Open reports" value={data.openReportCount} to="/moderation/reports" tone={data.openReportCount > 0 ? 'warning' : 'default'} />
            <AttentionCard label="Under review" value={data.underReviewCount} to="/moderation/reports?status=under_review" tone={data.underReviewCount > 0 ? 'warning' : 'default'} />
            <AttentionCard label="Needs review" value={data.needsReviewCount} to="/moderation/reports" tone={data.needsReviewCount > 0 ? 'warning' : 'default'} />
            <AttentionCard
              label="Targets with 3+ open reports"
              value={data.repeatTargetCount}
              to="/moderation/reports?minReports=3"
              tone={data.repeatTargetCount > 0 ? 'warning' : 'default'}
            />
            <AttentionCard label="Resolved this period" value={data.resolvedCount} to="/moderation/reports?status=resolved" />
            <AttentionCard label="Dismissed this period" value={data.dismissedCount} to="/moderation/reports?status=dismissed" />
            <AttentionCard label="Resolved today" value={data.resolvedTodayCount} to="/moderation/reports?status=resolved" />
            <AttentionCard label="Posts removed" value={data.postsRemovedCount} to="/moderation/posts?status=removed" />
            <AttentionCard label="Comments removed" value={data.commentsRemovedCount} to="/moderation/comments?status=removed" />
            <AttentionCard label="Events removed" value={data.eventsRemovedCount} to="/moderation/events?reported=true" />
            <AttentionCard label="Journeys removed" value={data.journeysRemovedCount} to="/moderation/journeys" />
            <AttentionCard label="Restorations" value={data.restorationsCount} to="/moderation/reports?status=all" />
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
            <AttentionCard label="Oldest open report" value={ageLabel(data.oldestOpenReportAgeSeconds)} to="/moderation/reports" />
          </div>
          {data.reasonCounts.length ? (
            <section className="mt-5">
              <h2 className="text-sm font-semibold m-0 mb-2">Report reasons this period</h2>
              <ul className="text-xs m-0 pl-4">
                {data.reasonCounts.map(row => (
                  <li key={row.reason}>
                    {row.reason.replace(/_/g, ' ')}: {row.count}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
