import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AdminModerationQueueDto, AdminModerationTargetType, ContentReportReason } from '@delve/contracts'
import { adminListModerationQueue } from '../api/moderation'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminTable } from '../components/admin/AdminTable'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { FilterBar } from '../components/admin/FilterBar'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { StatusBadge } from '../components/admin/StatusBadge'

const TYPES: Array<AdminModerationTargetType | ''> = ['', 'POST', 'EVENT', 'JOURNEY', 'COMMUNITY', 'COMMUNITY_THREAD']
const REASONS: Array<ContentReportReason | ''> = [
  '',
  'SPAM',
  'SCAM_OR_FRAUD',
  'HARASSMENT',
  'HATE_OR_ABUSE',
  'SEXUAL_CONTENT',
  'VIOLENCE_OR_THREATS',
  'MISLEADING_INFORMATION',
  'ILLEGAL_OR_DANGEROUS',
  'PRIVACY',
  'IMPERSONATION',
  'COMMUNITY_RULE_VIOLATION',
  'OTHER',
]

export default function ModerationReportsPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<AdminModerationQueueDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const query = useMemo(() => {
    const next = new URLSearchParams()
    for (const key of ['targetType', 'reason', 'q', 'minReports', 'page', 'pageSize']) {
      const value = params.get(key)
      if (value) next.set(key, value)
    }
    if (!next.get('page')) next.set('page', '1')
    if (!next.get('pageSize')) next.set('pageSize', '25')
    return next
  }, [params])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await adminListModerationQueue(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [query.toString()])

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }

  return (
    <div>
      <AdminPageHeader
        title="Reports"
        description="Grouped by content target. Duplicate reports on the same item are reviewed together. Reporting never removes content automatically."
      />
      <FilterBar>
        <select className="admin-input" style={{ maxWidth: 200 }} value={params.get('targetType') || ''} onChange={e => setFilter('targetType', e.target.value)}>
          <option value="">All types</option>
          {TYPES.filter(Boolean).map(t => (
            <option key={t} value={t}>
              {String(t).replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select className="admin-input" style={{ maxWidth: 220 }} value={params.get('reason') || ''} onChange={e => setFilter('reason', e.target.value)}>
          <option value="">All reasons</option>
          {REASONS.filter(Boolean).map(r => (
            <option key={r} value={r}>
              {String(r).replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select className="admin-input" style={{ maxWidth: 160 }} value={params.get('minReports') || ''} onChange={e => setFilter('minReports', e.target.value)}>
          <option value="">Any count</option>
          <option value="2">2+ reports</option>
          <option value="3">3+ reports</option>
        </select>
        <input
          className="admin-input"
          style={{ maxWidth: 200 }}
          placeholder="Creator or preview"
          defaultValue={params.get('q') || ''}
          onBlur={e => setFilter('q', e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') setFilter('q', (e.target as HTMLInputElement).value)
          }}
        />
      </FilterBar>
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Could not load reports" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data && data.items.length === 0 ? <EmptyState title="No open reports match these filters." /> : null}
      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <AdminTable headers={['Content', 'Type', 'Creator', 'Context', 'Open reports', 'Reasons', 'First', 'Latest', 'Status', '']}>
            {data.items.map(row => (
              <tr key={`${row.targetType}:${row.targetId}`}>
                <td className="p-1" style={{ maxWidth: 280 }}>
                  {row.preview}
                </td>
                <td className="p-1">
                  <StatusBadge>{row.targetType}</StatusBadge>
                </td>
                <td className="p-1">
                  {row.creatorUserId ? (
                    <Link to={`/travelers/${row.creatorUserId}`}>{row.creatorDisplayName || row.creatorUsername || 'Traveler'}</Link>
                  ) : (
                    '—'
                  )}
                  {row.creatorAccountStatus ? (
                    <div>
                      <StatusBadge>{row.creatorAccountStatus}</StatusBadge>
                    </div>
                  ) : null}
                </td>
                <td className="p-1">{row.contextLabel || '—'}</td>
                <td className="p-1">{row.openReportCount}</td>
                <td className="p-1">{row.topReasons.join(', ') || '—'}</td>
                <td className="p-1">{new Date(row.firstReportedAt).toLocaleDateString()}</td>
                <td className="p-1">{new Date(row.latestReportedAt).toLocaleDateString()}</td>
                <td className="p-1">
                  <StatusBadge>{row.contentStatus}</StatusBadge>
                </td>
                <td className="p-1">
                  <Link to={`/moderation/reports/${row.targetType}/${row.targetId}`}>Review</Link>
                </td>
              </tr>
            ))}
          </AdminTable>
          <div className="flex gap-2 mt-3">
            <button type="button" className="admin-btn-secondary" disabled={!data.hasPrevious} onClick={() => setFilter('page', String(data.page - 1))}>
              Previous
            </button>
            <button type="button" className="admin-btn-secondary" disabled={!data.hasNext} onClick={() => setFilter('page', String(data.page + 1))}>
              Next
            </button>
            <select className="admin-input" style={{ maxWidth: 100 }} value={params.get('pageSize') || '25'} onChange={e => setFilter('pageSize', e.target.value)}>
              {['25', '50', '100'].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}
    </div>
  )
}
