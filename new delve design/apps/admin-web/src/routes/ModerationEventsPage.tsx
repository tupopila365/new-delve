import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AdminEventModerationSummary } from '@delve/contracts'
import { adminListModerationEvents } from '../api/moderation'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminTable } from '../components/admin/AdminTable'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { FilterBar } from '../components/admin/FilterBar'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { StatusBadge } from '../components/admin/StatusBadge'

type List = { items: AdminEventModerationSummary[]; page: number; hasNext: boolean; hasPrevious: boolean }

export default function ModerationEventsPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<List | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const query = useMemo(() => {
    const next = new URLSearchParams()
    for (const key of ['q', 'reported', 'page', 'pageSize']) {
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
      setData(await adminListModerationEvents(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events')
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
      <AdminPageHeader title="Events" description="Public, reported, or already moderated events. Creator cancellation is separate from Admin removal." />
      <FilterBar>
        <input className="admin-input" style={{ maxWidth: 220 }} placeholder="Title, location, creator" defaultValue={params.get('q') || ''} onBlur={e => setFilter('q', e.target.value)} />
        <select className="admin-input" style={{ maxWidth: 160 }} value={params.get('reported') || ''} onChange={e => setFilter('reported', e.target.value)}>
          <option value="">All inspectable</option>
          <option value="true">Reported</option>
        </select>
      </FilterBar>
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Could not load events" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data && data.items.length === 0 ? <EmptyState title="No events match these filters." /> : null}
      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <AdminTable headers={['Event', 'Creator', 'When', 'Location', 'Status', 'Attendance', 'Reports', '']}>
            {data.items.map(row => (
              <tr key={row.id}>
                <td className="p-1">
                  {row.title}
                  {row.occurringSoon ? <div><StatusBadge>Occurring soon</StatusBadge></div> : null}
                </td>
                <td className="p-1">{row.creatorUsername}</td>
                <td className="p-1">{new Date(row.startAt).toLocaleString()}</td>
                <td className="p-1">{row.location || '—'}</td>
                <td className="p-1">
                  <StatusBadge>{row.status}</StatusBadge> <StatusBadge>{row.moderationStatus}</StatusBadge>
                </td>
                <td className="p-1">{row.attendanceCount}</td>
                <td className="p-1">{row.openReportCount}</td>
                <td className="p-1">
                  <Link to={`/moderation/reports/EVENT/${row.id}`}>Review</Link>
                </td>
              </tr>
            ))}
          </AdminTable>
          <div className="flex gap-2 mt-3">
            <button type="button" className="admin-btn-secondary" disabled={!data.hasPrevious} onClick={() => setFilter('page', String(data.page - 1))}>Previous</button>
            <button type="button" className="admin-btn-secondary" disabled={!data.hasNext} onClick={() => setFilter('page', String(data.page + 1))}>Next</button>
            <select className="admin-input" style={{ maxWidth: 100 }} value={params.get('pageSize') || '25'} onChange={e => setFilter('pageSize', e.target.value)}>
              {['25', '50', '100'].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </>
      ) : null}
    </div>
  )
}
