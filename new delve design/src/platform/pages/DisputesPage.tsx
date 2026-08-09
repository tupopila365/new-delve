import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { AdminDispute, AdminDisputeDetail } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminDrawer,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatGrid,
  DelveAdminStatusBadge,
} from '../components'

const SOURCE_FILTERS = [
  { id: 'All', label: 'All sources' },
  { id: 'shop', label: 'Shop' },
  { id: 'accommodation', label: 'Stays' },
  { id: 'guide', label: 'Guides' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'bus_seat', label: 'Bus' },
] as const

const STATUS_FILTERS = [
  { id: 'active', label: 'Open cases' },
  { id: 'open', label: 'Open' },
  { id: 'under_review', label: 'Under review' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
] as const

const RESOLUTIONS = [
  { id: 'refund_buyer', label: 'Refund buyer' },
  { id: 'release_seller', label: 'Release to seller' },
  { id: 'partial', label: 'Partial / other' },
  { id: 'dismissed', label: 'Dismissed' },
] as const

function disputeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'open') return 'danger'
  if (status === 'under_review') return 'warning'
  if (status === 'resolved') return 'success'
  return 'neutral'
}

export function DisputesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_FILTERS)[number]['id']>('All')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['id']>('active')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]['id']>('refund_buyer')
  const [note, setNote] = useState('')

  const { data: disputes = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['disputes', sourceFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (sourceFilter !== 'All') params.set('source', sourceFilter)
      params.set('status', statusFilter)
      return asArray<AdminDispute>(await apiFetch(`/api/accounts/admin/disputes/?${params}`))
    },
  })

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['dispute', selectedId],
    queryFn: () => apiFetch<AdminDisputeDetail>(`/api/accounts/admin/disputes/${selectedId}/`),
    enabled: selectedId != null,
  })

  const resolveMut = useMutation({
    mutationFn: (payload: { status: string; resolution?: string; resolution_note?: string }) =>
      apiFetch<AdminDisputeDetail>(`/api/accounts/admin/disputes/${selectedId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ ...payload, apply_money: true }),
      }),
    onSuccess: () => {
      setNote('')
      void qc.invalidateQueries({ queryKey: ['disputes'] })
      void qc.invalidateQueries({ queryKey: ['dispute', selectedId] })
      void qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return disputes
    const q = search.trim().toLowerCase()
    return disputes.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.buyer_username.toLowerCase().includes(q) ||
        d.seller_username.toLowerCase().includes(q) ||
        d.reason_label.toLowerCase().includes(q),
    )
  }, [disputes, search])

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Disputes" subtitle="Buyer cases across shop orders and bookings." />
        <DelveAdminLoading count={5} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Disputes" subtitle="Buyer cases across shop orders and bookings." />
        <DelveAdminError message="Could not load disputes." onRetry={() => void refetch()} />
      </div>
    )
  }

  const openCount = disputes.filter((d) => d.status === 'open' || d.status === 'under_review').length

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Disputes"
        subtitle="Open cases hold payout attention until staff resolve refund or release."
      />

      <DelveAdminStatGrid
        stats={[
          { value: openCount, label: 'Active cases', warn: openCount > 0 },
          { value: disputes.length, label: 'Shown' },
        ]}
      />

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search disputes…">
        {SOURCE_FILTERS.map((f) => (
          <DelveAdminFilterChip
            key={f.id}
            label={f.label}
            active={sourceFilter === f.id}
            onClick={() => setSourceFilter(f.id)}
          />
        ))}
        {STATUS_FILTERS.map((f) => (
          <DelveAdminFilterChip
            key={f.id}
            label={f.label}
            active={statusFilter === f.id}
            onClick={() => setStatusFilter(f.id)}
          />
        ))}
      </DelveAdminFilterBar>

      {filtered.length === 0 ? (
        <DelveAdminEmpty title="No disputes match" message="Try changing filters or wait for buyer cases." />
      ) : (
        <div className="da-stack">
          {filtered.map((d) => (
            <DelveAdminDataRow
              key={d.id}
              primary={d.title}
              secondary={`@${d.buyer_username} → @${d.seller_username} · ${d.reason_label}`}
              badge={
                <>
                  <DelveAdminStatusBadge status={d.source_label} variant="info" />
                  <DelveAdminStatusBadge status={d.status_label} variant={disputeVariant(d.status)} />
                </>
              }
              actions={
                <button type="button" className="da-link-btn" onClick={() => setSelectedId(d.id)}>
                  Review
                </button>
              }
            />
          ))}
        </div>
      )}

      <DelveAdminDrawer
        open={selectedId != null}
        title={detail?.title || 'Dispute'}
        onClose={() => setSelectedId(null)}
      >
        {loadingDetail || !detail ? (
          <DelveAdminLoading count={3} />
        ) : (
          <>
            <dl className="da-dl">
              <div>
                <dt>Case</dt>
                <dd>
                  #{detail.id} · {detail.source_label}
                </dd>
              </div>
              <div>
                <dt>Buyer</dt>
                <dd>@{detail.buyer_username}</dd>
              </div>
              <div>
                <dt>Seller</dt>
                <dd>@{detail.seller_username}</dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>{detail.reason_label}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <DelveAdminStatusBadge status={detail.status_label} variant={disputeVariant(detail.status)} />
                </dd>
              </div>
              <div>
                <dt>Buyer message</dt>
                <dd>{detail.body}</dd>
              </div>
              {detail.resolution_note ? (
                <div>
                  <dt>Resolution note</dt>
                  <dd>{detail.resolution_note}</dd>
                </div>
              ) : null}
            </dl>

            {detail.status === 'open' || detail.status === 'under_review' ? (
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                <button
                  type="button"
                  className="da-link-btn"
                  onClick={() => resolveMut.mutate({ status: 'under_review' })}
                  disabled={resolveMut.isPending}
                >
                  Mark under review
                </button>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span>Resolution</span>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value as typeof resolution)}>
                    {RESOLUTIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span>Note</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                </label>
                <button
                  type="button"
                  className="da-link-btn"
                  disabled={resolveMut.isPending}
                  onClick={() =>
                    resolveMut.mutate({
                      status: 'resolved',
                      resolution,
                      resolution_note: note,
                    })
                  }
                >
                  {resolveMut.isPending ? 'Saving…' : 'Resolve case'}
                </button>
                {resolveMut.isError ? <p>Could not update dispute.</p> : null}
              </div>
            ) : (
              <p style={{ opacity: 0.75 }}>
                Resolved{detail.resolution_label ? ` · ${detail.resolution_label}` : ''}.
              </p>
            )}

            <p style={{ marginTop: 16 }}>
              <a className="da-link-btn" href={`/admin/payments?source=${detail.source}`}>
                Open payments desk
              </a>
            </p>
          </>
        )}
      </DelveAdminDrawer>
    </div>
  )
}
