import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AdminBusinessListDto, BusinessStatus, StripeConnectStatus } from '@delve/contracts'
import { adminListBusinesses } from '../api/businesses'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminTable } from '../components/admin/AdminTable'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { FilterBar } from '../components/admin/FilterBar'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { StatusBadge } from '../components/admin/StatusBadge'

const STATUSES: Array<BusinessStatus | ''> = ['', 'DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED']
const CONNECT: Array<StripeConnectStatus | ''> = ['', 'NOT_CONNECTED', 'ONBOARDING', 'RESTRICTED', 'ACTIVE', 'DISABLED']

export default function BusinessesPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<AdminBusinessListDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const query = useMemo(() => {
    const next = new URLSearchParams()
    for (const key of ['q', 'status', 'category', 'country', 'city', 'connect', 'page', 'pageSize']) {
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
      setData(await adminListBusinesses(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load businesses')
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
      <AdminPageHeader title="Businesses" description="Manage businesses operating on the Delve marketplace." />
      <FilterBar>
        <input className="admin-input" style={{ maxWidth: 220 }} placeholder="Search name, city, country" defaultValue={params.get('q') || ''} onBlur={e => setFilter('q', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setFilter('q', (e.target as HTMLInputElement).value) }} />
        <select className="admin-input" style={{ maxWidth: 180 }} value={params.get('status') || ''} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{String(s).replace(/_/g, ' ')}</option>)}
        </select>
        <input className="admin-input" style={{ maxWidth: 140 }} placeholder="Category" defaultValue={params.get('category') || ''} onBlur={e => setFilter('category', e.target.value)} />
        <input className="admin-input" style={{ maxWidth: 90 }} placeholder="Country" defaultValue={params.get('country') || ''} onBlur={e => setFilter('country', e.target.value)} />
        <select className="admin-input" style={{ maxWidth: 180 }} value={params.get('connect') || ''} onChange={e => setFilter('connect', e.target.value)}>
          <option value="">All Stripe states</option>
          {CONNECT.filter(Boolean).map(s => <option key={s} value={s}>{String(s).replace(/_/g, ' ')}</option>)}
        </select>
        <button type="button" className="admin-btn-secondary" onClick={() => setParams(new URLSearchParams({ page: '1', pageSize: params.get('pageSize') || '25' }))}>Clear filters</button>
      </FilterBar>
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Could not load businesses" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data && data.items.length === 0 ? <EmptyState title="No businesses match these filters." /> : null}
      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <AdminTable headers={['Business', 'Category', 'Location', 'Status', 'Listings', 'Published deals', 'Bookings', 'Stripe Connect', 'Created', '']}>
            {data.items.map(row => (
              <tr key={row.id}>
                <td className="p-1 font-semibold">{row.name}</td>
                <td className="p-1">{row.category || '—'}</td>
                <td className="p-1">{[row.city, row.countryCode].filter(Boolean).join(', ') || '—'}</td>
                <td className="p-1"><StatusBadge>{row.status}</StatusBadge></td>
                <td className="p-1">{row.listingCount}</td>
                <td className="p-1">{row.publishedDealCount}</td>
                <td className="p-1">{row.bookingCount}</td>
                <td className="p-1"><StatusBadge>{row.connect.label}</StatusBadge></td>
                <td className="p-1">{new Date(row.createdAt).toLocaleDateString()}</td>
                <td className="p-1"><Link to={`/businesses/${row.id}`}>View Business</Link></td>
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
