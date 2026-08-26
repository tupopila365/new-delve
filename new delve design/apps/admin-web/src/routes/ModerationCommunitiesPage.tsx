import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AdminCommunityModerationSummary } from '@delve/contracts'
import { adminListModerationCommunities } from '../api/moderation'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminTable } from '../components/admin/AdminTable'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { FilterBar } from '../components/admin/FilterBar'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { StatusBadge } from '../components/admin/StatusBadge'

type List = { items: AdminCommunityModerationSummary[]; page: number; hasNext: boolean; hasPrevious: boolean }

export default function ModerationCommunitiesPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<List | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const query = useMemo(() => {
    const next = new URLSearchParams()
    for (const key of ['q', 'page', 'pageSize']) {
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
      setData(await adminListModerationCommunities(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load communities')
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
      <AdminPageHeader title="Communities" description="Inspect communities and open reports. Platform restriction is separate from community-moderator removal." />
      <FilterBar>
        <input className="admin-input" style={{ maxWidth: 220 }} placeholder="Name or slug" defaultValue={params.get('q') || ''} onBlur={e => setFilter('q', e.target.value)} />
      </FilterBar>
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Could not load communities" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data && data.items.length === 0 ? <EmptyState title="No communities match these filters." /> : null}
      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <AdminTable headers={['Community', 'Privacy', 'Members', 'Reports', 'Status', 'Created', '']}>
            {data.items.map(row => (
              <tr key={row.id}>
                <td className="p-1">{row.name}<div className="text-xs">/{row.slug}</div></td>
                <td className="p-1"><StatusBadge>{row.privacy}</StatusBadge></td>
                <td className="p-1">{row.memberCount}</td>
                <td className="p-1">{row.openReportCount}</td>
                <td className="p-1"><StatusBadge>{row.moderationStatus}</StatusBadge></td>
                <td className="p-1">{new Date(row.createdAt).toLocaleDateString()}</td>
                <td className="p-1"><Link to={`/moderation/reports/COMMUNITY/${row.id}`}>Review</Link></td>
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
