import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AdminListingListDto, ListingStatus } from '@delve/contracts'
import { adminListListings } from '../api/listings'
import { AdvertisedPrice } from '../components/admin/AdvertisedPrice'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminTable } from '../components/admin/AdminTable'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { FilterBar } from '../components/admin/FilterBar'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { StatusBadge } from '../components/admin/StatusBadge'

const STATUSES: Array<ListingStatus | ''> = ['', 'DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED']

export default function ListingsPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<AdminListingListDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const query = useMemo(() => {
    const next = new URLSearchParams()
    for (const key of ['q', 'businessId', 'status', 'priced', 'currency', 'page', 'pageSize']) {
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
      setData(await adminListListings(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load listings')
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
      <AdminPageHeader title="Listings" description="Review marketplace offers published by businesses." />
      <FilterBar>
        <input className="admin-input" style={{ maxWidth: 220 }} placeholder="Search listing or business" defaultValue={params.get('q') || ''} onBlur={e => setFilter('q', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setFilter('q', (e.target as HTMLInputElement).value) }} />
        <select className="admin-input" style={{ maxWidth: 160 }} value={params.get('status') || ''} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="admin-input" style={{ maxWidth: 140 }} value={params.get('priced') || ''} onChange={e => setFilter('priced', e.target.value)}>
          <option value="">Priced and unpriced</option>
          <option value="priced">Priced</option>
          <option value="unpriced">Unpriced</option>
        </select>
        <input className="admin-input" style={{ maxWidth: 90 }} placeholder="Currency" defaultValue={params.get('currency') || ''} onBlur={e => setFilter('currency', e.target.value.toUpperCase())} />
        <button type="button" className="admin-btn-secondary" onClick={() => setParams(new URLSearchParams({ page: '1', pageSize: '25' }))}>Clear filters</button>
      </FilterBar>
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Could not load listings." detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data && data.items.length === 0 ? <EmptyState title="No listings found." /> : null}
      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <AdminTable headers={['Listing', 'Business', 'Status', 'Price', 'Currency', 'Deals', 'Bookings', 'Created', 'Updated']}>
            {data.items.map(row => (
              <tr key={row.id}>
                <td className="p-1"><Link to={`/listings/${row.id}`}>{row.title}</Link></td>
                <td className="p-1"><Link to={`/businesses/${row.businessId}`}>{row.businessName}</Link></td>
                <td className="p-1"><StatusBadge>{row.status}</StatusBadge></td>
                <td className="p-1"><AdvertisedPrice pricing={row.pricing} /></td>
                <td className="p-1">{row.pricing?.currency || '—'}</td>
                <td className="p-1">{row.dealCount}</td>
                <td className="p-1">{row.bookingCount}</td>
                <td className="p-1">{new Date(row.createdAt).toLocaleDateString()}</td>
                <td className="p-1">{new Date(row.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </AdminTable>
          <div className="flex gap-2 mt-3">
            <button type="button" className="admin-btn-secondary" disabled={!data.hasPrevious} onClick={() => setFilter('page', String(data.page - 1))}>Previous</button>
            <button type="button" className="admin-btn-secondary" disabled={!data.hasNext} onClick={() => setFilter('page', String(data.page + 1))}>Next</button>
          </div>
        </>
      ) : null}
    </div>
  )
}
