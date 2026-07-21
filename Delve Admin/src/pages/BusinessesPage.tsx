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
  food_drink: 'Foodies',
  retail_shop: 'Shop',
  activity: 'Activities',
  guide: 'Guides',
  transport: 'Transport',
  event_organiser: 'Events',
  multi_provider: 'Multi',
}

export function BusinessesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<(typeof VERIFY_FILTERS)[number]>('All')
  const [toast, setToast] = useState('')
  const [reasonPrompt, setReasonPrompt] = useState<{ id: number; status: string; name: string } | null>(
    null,
  )
  const [reasonText, setReasonText] = useState('')

  const { data: businesses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => apiFetch<AdminBusiness[]>('/api/accounts/admin/businesses/'),
  })

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
      apiFetch<AdminBusiness>(`/api/accounts/admin/businesses/${id}/verification/`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status, reason }),
      }),
    onSuccess: (data) => {
      setReasonPrompt(null)
      setReasonText('')
      setToast(data.email_detail || (data.email_sent ? 'Provider emailed.' : 'Status updated.'))
      void qc.invalidateQueries({ queryKey: ['businesses'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    },
    onError: (e) => {
      setToast(e instanceof Error ? e.message : 'Could not update status.')
    },
  })

  const requestStatusChange = (id: number, name: string, verification_status: string) => {
    if (verification_status === 'rejected' || verification_status === 'suspended') {
      setReasonPrompt({ id, status: verification_status, name })
      setReasonText('')
      return
    }
    verifyMut.mutate({
      id,
      verification_status,
      reason: verification_status === 'verified' ? '' : 'Updated from businesses list',
    })
  }

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
      <DelveAdminPageHeader
        title="Businesses"
        subtitle="Review verification status across all providers. Status changes email the service provider."
      />

      {toast ? (
        <p className="da-toast" role="status">
          {toast}
        </p>
      ) : null}

      {reasonPrompt ? (
        <div className="da-dialog" role="dialog" aria-labelledby="da-biz-reason-title">
          <h2 id="da-biz-reason-title">
            {reasonPrompt.status === 'suspended' ? 'Suspend' : 'Reject'} {reasonPrompt.name}
          </h2>
          <p className="da-dialog__sub">This reason is emailed to the provider and shown in their settings.</p>
          <label className="da-field">
            <span>Reason</span>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={4}
              placeholder="Reason…"
            />
          </label>
          <div className="da-dialog__actions">
            <button type="button" className="da-btn da-btn--ghost" onClick={() => setReasonPrompt(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="da-btn da-btn--primary"
              disabled={verifyMut.isPending || !reasonText.trim()}
              onClick={() =>
                verifyMut.mutate({
                  id: reasonPrompt.id,
                  verification_status: reasonPrompt.status,
                  reason: reasonText.trim(),
                })
              }
            >
              {verifyMut.isPending ? 'Saving…' : 'Confirm & email provider'}
            </button>
          </div>
        </div>
      ) : null}

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
                    onChange={(e) => requestStatusChange(b.id, b.business_name, e.target.value)}
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
