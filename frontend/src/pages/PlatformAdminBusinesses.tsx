import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import {
  AdminFilterBar,
  AdminFilterChip,
  AdminPageHeader,
  AdminStatGrid,
  AdminStatusBadge,
} from '../components/admin'
import { EmptyState, ListSkeleton } from '../components/ui'
import { verificationVariant } from '../data/adminData'

type Business = {
  id: number
  slug: string
  owner_username: string
  business_name: string
  business_types: string[]
  verification_status: string
  city: string
  region: string
}

const STATUSES = ['unverified', 'pending', 'verified', 'suspended', 'rejected'] as const
const VERIFY_FILTERS = ['All', 'Pending review', 'Verified', 'Rejected', 'Suspended', 'Unverified'] as const
const TYPE_FILTERS = ['All types', 'Stays', 'Food & drink', 'Guides', 'Transport', 'Events', 'Multi-provider'] as const

const TYPE_KEYS: Record<string, string> = {
  'Stays': 'stays',
  'Food & drink': 'food_drink',
  'Guides': 'guides',
  'Transport': 'transport',
  'Events': 'events',
  'Multi-provider': 'multi_provider',
}

const TYPE_LABELS: Record<string, string> = {
  stays: 'Stays',
  food_drink: 'Food & drink',
  guides: 'Guides',
  transport: 'Transport',
  events: 'Events',
  multi_provider: 'Multi-provider',
}

export function PlatformAdminBusinesses() {
  const qc = useQueryClient()
  const { data: businesses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-businesses'],
    queryFn: () => apiFetch<Business[]>('/api/accounts/admin/businesses/'),
  })

  const [search, setSearch] = useState('')
  const [verifyFilter, setVerifyFilter] = useState<(typeof VERIFY_FILTERS)[number]>('All')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All types')

  const verifyMut = useMutation({
    mutationFn: ({ id, verification_status }: { id: number; verification_status: string }) =>
      apiFetch<Business>(`/api/accounts/admin/businesses/${id}/verification/`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['platform-businesses'] }),
  })

  const filtered = useMemo(() => {
    let rows = businesses
    if (verifyFilter !== 'All') {
      const key = verifyFilter.toLowerCase().replace(/\s+/g, '_').replace('pending_review', 'pending')
      rows = rows.filter((b) => b.verification_status === key)
    }
    if (typeFilter !== 'All types') {
      const key = TYPE_KEYS[typeFilter]
      rows = rows.filter((b) => b.business_types.includes(key))
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
  }, [businesses, verifyFilter, typeFilter, search])

  const pending = businesses.filter((b) => b.verification_status === 'pending')

  return (
    <div className="adm-page">
      <AdminPageHeader
        title="Businesses"
        subtitle="Review provider businesses, verification status, and platform trust."
      />

      {isLoading ? (
        <ListSkeleton count={5} />
      ) : isError ? (
        <p className="adm-page__error" role="alert">
          We couldn&apos;t load businesses.{' '}
          <button type="button" className="adm-page__retry" onClick={() => void refetch()}>
            Try again
          </button>
        </p>
      ) : (
        <>
          <AdminStatGrid
            stats={[
              { value: businesses.length, label: 'Total businesses' },
              { value: businesses.filter((b) => b.verification_status === 'verified').length, label: 'Verified' },
              { value: pending.length, label: 'Pending review', accent: pending.length > 0 },
              { value: businesses.filter((b) => b.verification_status === 'rejected').length, label: 'Rejected' },
              { value: businesses.filter((b) => b.verification_status === 'suspended').length, label: 'Suspended', warn: true },
            ]}
          />

          {pending.length > 0 ? (
            <section className="adm-panel" id="verifications">
              <div className="adm-panel__head">
                <h2>Awaiting verification ({pending.length})</h2>
              </div>
              <ul className="adm-mini-table">
                {pending.map((b) => (
                  <li key={b.id}>
                    <div>
                      <strong>{b.business_name}</strong>
                      <span>@{b.owner_username} · {b.city}, {b.region}</span>
                    </div>
                    <AdminStatusBadge status="pending review" variant="warning" />
                    <Link to={`/business/${b.id}`} className="adm-panel__action">
                      View profile
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <AdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search businesses…">
            {VERIFY_FILTERS.map((f) => (
              <AdminFilterChip key={f} label={f} active={verifyFilter === f} onClick={() => setVerifyFilter(f)} />
            ))}
            {TYPE_FILTERS.map((f) => (
              <AdminFilterChip key={f} label={f} active={typeFilter === f} onClick={() => setTypeFilter(f)} sub />
            ))}
          </AdminFilterBar>

          {businesses.length === 0 ? (
            <EmptyState compact icon="🏢" title="No businesses yet" sub="Provider businesses will appear here for review." />
          ) : filtered.length === 0 ? (
            <EmptyState compact icon="🔍" title="No businesses found" sub="Try changing your search or filters." />
          ) : (
            <div className="adm-data-table">
              {filtered.map((b) => (
                <article key={b.id} className="adm-data-table__row adm-data-table__row--biz">
                  <div className="adm-data-table__primary">
                    <strong>{b.business_name}</strong>
                    <span>
                      @{b.owner_username} · {b.city}, {b.region}
                    </span>
                    <span className="adm-data-table__types">
                      {b.business_types.map((t) => TYPE_LABELS[t] ?? t).join(' · ')}
                    </span>
                  </div>
                  <AdminStatusBadge status={b.verification_status} variant={verificationVariant(b.verification_status)} />
                  <div className="adm-data-table__actions adm-data-table__actions--wrap">
                    <Link to={`/business/${b.id}`} className="btn btn-ghost btn--sm">
                      Public profile
                    </Link>
                    <div className="adm-verify-btns">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`adm-verify-btn${b.verification_status === s ? ' adm-verify-btn--on' : ''}`}
                          disabled={verifyMut.isPending}
                          onClick={() => verifyMut.mutate({ id: b.id, verification_status: s })}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
