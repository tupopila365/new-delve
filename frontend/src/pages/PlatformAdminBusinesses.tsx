import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../api/client'
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
const TYPE_FILTERS = ['All types', 'Stays', 'Foodies', 'Guides', 'Transport', 'Events', 'Multi-provider'] as const

/** Match both legacy display keys and current BusinessType values. */
const TYPE_KEYS: Record<string, string[]> = {
  Stays: ['accommodation', 'stays'],
  Foodies: ['food_drink'],
  Guides: ['guide', 'guides'],
  Transport: ['transport'],
  Events: ['event_organiser', 'events'],
  'Multi-provider': ['multi_provider'],
}

const TYPE_LABELS: Record<string, string> = {
  accommodation: 'Stays',
  stays: 'Stays',
  food_drink: 'Foodies',
  guide: 'Guides',
  guides: 'Guides',
  transport: 'Transport',
  event_organiser: 'Events',
  events: 'Events',
  multi_provider: 'Multi-provider',
  activity: 'Activities',
  retail_shop: 'Shop',
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
  const [reasonPrompt, setReasonPrompt] = useState<{ id: number; status: string } | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [actionErr, setActionErr] = useState<string | null>(null)

  const verifyMut = useMutation({
    mutationFn: ({
      id,
      verification_status,
      reason,
    }: {
      id: number
      verification_status: string
      reason?: string
    }) =>
      apiFetch<Business>(`/api/accounts/admin/businesses/${id}/verification/`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status, reason }),
      }),
    onSuccess: () => {
      setReasonPrompt(null)
      setReasonText('')
      setActionErr(null)
      void qc.invalidateQueries({ queryKey: ['platform-businesses'] })
    },
    onError: (e) => {
      setActionErr(e instanceof ApiError ? e.message : 'Could not update status.')
    },
  })

  const requestStatusChange = (id: number, verification_status: string) => {
    setActionErr(null)
    if (verification_status === 'rejected' || verification_status === 'suspended') {
      setReasonPrompt({ id, status: verification_status })
      setReasonText('')
      return
    }
    verifyMut.mutate({ id, verification_status })
  }

  const filtered = useMemo(() => {
    let rows = businesses
    if (verifyFilter !== 'All') {
      const key = verifyFilter.toLowerCase().replace(/\s+/g, '_').replace('pending_review', 'pending')
      rows = rows.filter((b) => b.verification_status === key)
    }
    if (typeFilter !== 'All types') {
      const keys = TYPE_KEYS[typeFilter] ?? []
      rows = rows.filter((b) => b.business_types.some((t) => keys.includes(t)))
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

      {actionErr ? (
        <p className="adm-page__error" role="alert">
          {actionErr}
        </p>
      ) : null}

      {reasonPrompt ? (
        <div className="adm-verify-dialog" role="dialog" aria-labelledby="adm-reason-title">
          <h2 id="adm-reason-title">
            {reasonPrompt.status === 'suspended' ? 'Suspend business' : 'Reject verification'}
          </h2>
          <p>Provide a reason — the business owner will see this note.</p>
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={4}
            placeholder="Reason for this decision…"
          />
          <div className="adm-verify-dialog__actions">
            <button
              type="button"
              className="btn btn-ghost btn--sm"
              onClick={() => {
                setReasonPrompt(null)
                setReasonText('')
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn--sm"
              disabled={verifyMut.isPending || !reasonText.trim()}
              onClick={() =>
                verifyMut.mutate({
                  id: reasonPrompt.id,
                  verification_status: reasonPrompt.status,
                  reason: reasonText.trim(),
                })
              }
            >
              {verifyMut.isPending ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      ) : null}

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
              {
                value: businesses.filter((b) => b.verification_status === 'suspended').length,
                label: 'Suspended',
                warn: true,
              },
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
                      <span>
                        @{b.owner_username} · {b.city}, {b.region}
                      </span>
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
            <EmptyState compact title="No businesses yet" sub="Provider businesses will appear here for review." />
          ) : filtered.length === 0 ? (
            <EmptyState compact title="No businesses found" sub="Try changing your search or filters." />
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
                          onClick={() => requestStatusChange(b.id, s)}
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
