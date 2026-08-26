import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AdminPostListDto } from '@delve/contracts'
import { adminListModerationPosts } from '../api/moderation'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminTable } from '../components/admin/AdminTable'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { FilterBar } from '../components/admin/FilterBar'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { StatusBadge } from '../components/admin/StatusBadge'

export default function ModerationPostsPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<AdminPostListDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const query = useMemo(() => {
    const next = new URLSearchParams()
    for (const key of ['q', 'status', 'reported', 'page', 'pageSize']) {
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
      setData(await adminListModerationPosts(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load posts')
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
      <AdminPageHeader title="Posts" description="Public, reported, or already moderated Delvers posts. Unreported private posts are not listed for browsing." />
      <FilterBar>
        <input className="admin-input" style={{ maxWidth: 220 }} placeholder="Caption or author" defaultValue={params.get('q') || ''} onBlur={e => setFilter('q', e.target.value)} />
        <select className="admin-input" style={{ maxWidth: 160 }} value={params.get('status') || ''} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All</option>
          <option value="visible">Visible</option>
          <option value="removed">Removed / hidden</option>
        </select>
        <select className="admin-input" style={{ maxWidth: 160 }} value={params.get('reported') || ''} onChange={e => setFilter('reported', e.target.value)}>
          <option value="">Any reports</option>
          <option value="true">Reported</option>
        </select>
      </FilterBar>
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Could not load posts" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data && data.items.length === 0 ? <EmptyState title="No posts match these filters." /> : null}
      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <AdminTable headers={['Author', 'Preview', 'Created', 'Engagement', 'Reports', 'Status', '']}>
            {data.items.map(row => (
              <tr key={row.id}>
                <td className="p-1">{row.authorDisplayName || row.authorUsername}</td>
                <td className="p-1">{row.captionPreview}</td>
                <td className="p-1">{new Date(row.createdAt).toLocaleDateString()}</td>
                <td className="p-1">
                  {row.likeCount} likes · {row.commentCount} comments · {row.mediaCount} media
                </td>
                <td className="p-1">{row.openReportCount}</td>
                <td className="p-1">
                  <StatusBadge>{row.moderationStatus}</StatusBadge>
                </td>
                <td className="p-1">
                  <Link to={`/moderation/reports/POST/${row.id}`}>Review</Link>
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
