import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AdminAccountStatus, AdminTravelerListDto } from '@delve/contracts'
import { adminListTravelers } from '../api/travelers'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminTable } from '../components/admin/AdminTable'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { FilterBar } from '../components/admin/FilterBar'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { StatusBadge } from '../components/admin/StatusBadge'

const STATUSES: Array<AdminAccountStatus | ''> = [
  '',
  'pending_verification',
  'active',
  'restricted',
  'disabled',
  'deactivated',
]

export default function TravelersPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<AdminTravelerListDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const query = useMemo(() => {
    const next = new URLSearchParams()
    for (const key of [
      'q',
      'accountStatus',
      'location',
      'createdFrom',
      'createdTo',
      'hasBookings',
      'hasOpenDispute',
      'hasCancellationRequest',
      'page',
      'pageSize',
    ]) {
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
      setData(await adminListTravelers(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load travelers')
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
        title="Travelers"
        description="Manage traveler accounts and investigate marketplace activity."
      />
      <FilterBar>
        <input
          className="admin-input"
          style={{ maxWidth: 220 }}
          placeholder="Search name, username, email"
          defaultValue={params.get('q') || ''}
          onBlur={e => setFilter('q', e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') setFilter('q', (e.target as HTMLInputElement).value)
          }}
        />
        <select
          className="admin-input"
          style={{ maxWidth: 180 }}
          value={params.get('accountStatus') || ''}
          onChange={e => setFilter('accountStatus', e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>
              {String(s).replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <input
          className="admin-input"
          style={{ maxWidth: 140 }}
          placeholder="Location"
          defaultValue={params.get('location') || ''}
          onBlur={e => setFilter('location', e.target.value)}
        />
        <input
          className="admin-input"
          style={{ maxWidth: 150 }}
          type="date"
          value={params.get('createdFrom') || ''}
          onChange={e => setFilter('createdFrom', e.target.value)}
          aria-label="Joined from"
        />
        <select
          className="admin-input"
          style={{ maxWidth: 160 }}
          value={params.get('hasBookings') || ''}
          onChange={e => setFilter('hasBookings', e.target.value)}
        >
          <option value="">Bookings: any</option>
          <option value="true">Has bookings</option>
          <option value="false">No bookings</option>
        </select>
        <select
          className="admin-input"
          style={{ maxWidth: 170 }}
          value={params.get('hasOpenDispute') || ''}
          onChange={e => setFilter('hasOpenDispute', e.target.value)}
        >
          <option value="">Disputes: any</option>
          <option value="true">Open dispute</option>
        </select>
        <select
          className="admin-input"
          style={{ maxWidth: 190 }}
          value={params.get('hasCancellationRequest') || ''}
          onChange={e => setFilter('hasCancellationRequest', e.target.value)}
        >
          <option value="">Cancellations: any</option>
          <option value="true">Pending cancellation</option>
        </select>
        <button
          type="button"
          className="admin-btn-secondary"
          onClick={() => setParams(new URLSearchParams({ page: '1', pageSize: params.get('pageSize') || '25' }))}
        >
          Clear filters
        </button>
      </FilterBar>
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Could not load travelers" detail={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data && data.items.length === 0 ? (
        <EmptyState title="No travelers match these filters." />
      ) : null}
      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <AdminTable
            headers={['Traveler', 'Email', 'Location', 'Status', 'Bookings', 'Claims', 'Journeys', 'Joined', '', '']}
          >
            {data.items.map(row => (
              <tr key={row.id}>
                <td className="p-1 font-semibold">{row.displayName || row.username}</td>
                <td className="p-1">{row.email}</td>
                <td className="p-1">{[row.homeCity, row.homeCountryCode].filter(Boolean).join(', ') || '—'}</td>
                <td className="p-1">
                  <StatusBadge>{row.accountStatus}</StatusBadge>
                </td>
                <td className="p-1">{row.bookingCount}</td>
                <td className="p-1">{row.claimCount}</td>
                <td className="p-1">{row.journeyCount}</td>
                <td className="p-1">{new Date(row.createdAt).toLocaleDateString()}</td>
                <td className="p-1">{row.attention ? <StatusBadge>Needs attention</StatusBadge> : '—'}</td>
                <td className="p-1">
                  <Link to={`/travelers/${row.id}`}>View Traveler</Link>
                </td>
              </tr>
            ))}
          </AdminTable>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={!data.hasPrevious}
              onClick={() => setFilter('page', String(data.page - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={!data.hasNext}
              onClick={() => setFilter('page', String(data.page + 1))}
            >
              Next
            </button>
            <select
              className="admin-input"
              style={{ maxWidth: 100 }}
              value={params.get('pageSize') || '25'}
              onChange={e => setFilter('pageSize', e.target.value)}
            >
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
