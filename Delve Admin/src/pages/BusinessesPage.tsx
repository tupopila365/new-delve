import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminBusiness } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatGrid,
  DelveAdminStatusBadge,
} from '../components'
import { statusVariant } from '../data/demoData'
import { isFoodBusiness, foodServiceLabel } from '../utils/foodVerification'
import { isGuideBusiness, guideServiceLabel } from '../utils/guideVerification'
import { isTransportBusiness, transportModeLabel } from '../utils/transportVerification'

const VERIFY_FILTERS = ['All', 'Pending', 'Verified', 'Rejected', 'Suspended'] as const

const TYPE_LABELS: Record<string, string> = {
  accommodation: 'Stays',
  food_drink: 'Food & drink',
  guide: 'Guides',
  transport: 'Transport',
  event_organiser: 'Events',
  multi_provider: 'Multi',
}

export function BusinessesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<(typeof VERIFY_FILTERS)[number]>('All')

  const { data: businesses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => apiFetch<AdminBusiness[]>('/api/accounts/admin/businesses/'),
  })

  const verifyMut = useMutation({
    mutationFn: ({ id, verification_status }: { id: number; verification_status: string }) =>
      apiFetch(`/api/accounts/admin/businesses/${id}/verification/`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status, reason: 'Updated from businesses list' }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['businesses'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })

  const filtered = useMemo(() => {
    let rows = businesses
    if (filter !== 'All') {
      const key = filter.toLowerCase()
      rows = rows.filter((b) => b.verification_status === key)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (b) =>
          b.business_name.toLowerCase().includes(q) ||
          b.owner_username.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q),
      )
    }
    return rows
  }, [businesses, filter, search])

  const pending = businesses.filter((b) => b.verification_status === 'pending')

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Businesses" subtitle="All provider businesses on DELVE." />
        <DelveAdminLoading count={5} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Businesses" subtitle="All provider businesses on DELVE." />
        <DelveAdminError message="Could not load businesses." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader title="Businesses" subtitle="Review verification status across all providers." />

      <DelveAdminStatGrid
        stats={[
          { value: businesses.length, label: 'Total' },
          { value: businesses.filter((b) => b.verification_status === 'verified').length, label: 'Verified' },
          { value: pending.length, label: 'Pending', accent: pending.length > 0 },
          { value: businesses.filter((b) => b.verification_status === 'rejected').length, label: 'Rejected' },
        ]}
      />

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search businesses…">
        {VERIFY_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </DelveAdminFilterBar>

      {filtered.length === 0 ? (
        <DelveAdminEmpty title="No businesses found" message="Try changing your search or filters." />
      ) : (
        <div className="da-stack">
          {filtered.map((b) => (
            <DelveAdminDataRow
              key={b.id}
              primary={b.business_name}
              secondary={`@${b.owner_username} · ${b.city}, ${b.region}`}
              meta={
                <span className="da-row__types">
                  {(b.business_types ?? []).map((t) => TYPE_LABELS[t] ?? t).join(' · ')}
                  {isTransportBusiness(b.business_types) && (b.transport_modes?.length ?? 0) > 0
                    ? ` · ${(b.transport_modes ?? []).map(transportModeLabel).join(', ')}`
                    : ''}
                  {isFoodBusiness(b.business_types) ? ` · ${foodServiceLabel()}` : ''}
                  {isGuideBusiness(b.business_types) ? ` · ${guideServiceLabel()}` : ''}
                </span>
              }
              badge={
                <DelveAdminStatusBadge
                  status={b.verification_status}
                  variant={statusVariant(b.verification_status)}
                />
              }
              actions={
                b.verification_status === 'pending' ? (
                  <Link to="/admin/verifications" className="da-link-btn">
                    Review
                  </Link>
                ) : (
                  <select
                    className="da-select"
                    value={b.verification_status}
                    disabled={verifyMut.isPending}
                    onChange={(e) => verifyMut.mutate({ id: b.id, verification_status: e.target.value })}
                    aria-label={`Status for ${b.business_name}`}
                  >
                    {['unverified', 'pending', 'verified', 'rejected', 'suspended'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
