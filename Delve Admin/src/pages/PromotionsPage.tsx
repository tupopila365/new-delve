import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminListing, PromotionCampaign, PromotionConflictSummary } from '../api/types'
import { FEED_TARGET_TYPES, PLACEMENT_OPTIONS } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminPanel,
  DelveAdminStatusBadge,
} from '../components'

const STATUS_FILTERS = ['All', 'Pending payment', 'Requested', 'Active', 'Scheduled', 'Rejected', 'Refunded', 'Expired', 'Cancelled'] as const

const PLACEMENT_FILTERS = ['All', ...PLACEMENT_OPTIONS.map((p) => p.label)] as const

const SPOTLIGHT_TARGET_TYPES = [
  { value: 'accommodation', label: 'Stays' },
  { value: 'guide', label: 'Guides' },
  { value: 'food', label: 'Food' },
  { value: 'event', label: 'Events' },
  { value: 'vehicle', label: 'Vehicle rental' },
  { value: 'bus_trip', label: 'Bus trip' },
] as const

function promotionStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'active') return 'success'
  if (status === 'scheduled') return 'warning'
  if (status === 'requested') return 'info'
  if (status === 'pending_payment') return 'warning'
  if (status === 'rejected' || status === 'cancelled') return 'danger'
  if (status === 'refunded') return 'neutral'
  if (status === 'expired') return 'neutral'
  return 'info'
}

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultEndDate() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString()
}

export function PromotionsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [placementFilter, setPlacementFilter] = useState<(typeof PLACEMENT_FILTERS)[number]>('All')
  const [toast, setToast] = useState('')
  const [formPlacement, setFormPlacement] = useState<string>(PLACEMENT_OPTIONS[0].value)
  const [formTargetType, setFormTargetType] = useState<string>(PLACEMENT_OPTIONS[0].targetType)
  const [formStartsAt, setFormStartsAt] = useState(toLocalDatetimeValue(new Date().toISOString()))
  const [formEndsAt, setFormEndsAt] = useState(toLocalDatetimeValue(defaultEndDate()))
  const [formRegion, setFormRegion] = useState('')
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const selectedPlacement = PLACEMENT_OPTIONS.find((p) => p.value === formPlacement) ?? PLACEMENT_OPTIONS[0]

  const { data: campaigns = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => apiFetch<PromotionCampaign[]>('/api/accounts/admin/promotions/'),
  })

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => apiFetch<AdminListing[]>('/api/accounts/admin/listings/'),
  })

  const conflictQs = useMemo(() => {
    const p = new URLSearchParams({
      placement: formPlacement,
      starts_at: new Date(formStartsAt).toISOString(),
      ends_at: new Date(formEndsAt).toISOString(),
      region: formRegion.trim(),
    })
    if (formPlacement === 'category_spotlight') {
      p.set('target_type', formTargetType)
    }
    return p.toString()
  }, [formPlacement, formStartsAt, formEndsAt, formRegion, formTargetType])

  const { data: conflicts } = useQuery({
    queryKey: ['promotion-conflicts', conflictQs],
    queryFn: () => apiFetch<PromotionConflictSummary>(`/api/accounts/admin/promotions/conflicts/?${conflictQs}`),
    enabled: Boolean(formStartsAt && formEndsAt),
  })

  const isFeedPlacement = formPlacement === 'delvers_feed' || formPlacement === 'community_feed'
  const isCategorySpotlight = formPlacement === 'category_spotlight'

  const listingOptions = useMemo(() => {
    if (isFeedPlacement || isCategorySpotlight) {
      if (formTargetType === 'post') {
        const postType = formPlacement === 'community_feed' ? 'community' : 'post'
        return listings.filter((l) => l.listing_type === postType && l.status === 'published')
      }
      return listings.filter((l) => l.listing_type === formTargetType && l.status === 'published')
    }
    return listings.filter((l) => l.listing_type === selectedPlacement.listingType && l.status === 'published')
  }, [listings, formPlacement, formTargetType, selectedPlacement.listingType, isFeedPlacement, isCategorySpotlight])

  useEffect(() => {
    if (!isCategorySpotlight && !isFeedPlacement) {
      setFormTargetType(selectedPlacement.targetType)
    }
  }, [formPlacement, selectedPlacement.targetType, isCategorySpotlight, isFeedPlacement])

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<PromotionCampaign>('/api/accounts/admin/promotions/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setToast('Featured partner campaign created.')
      void qc.invalidateQueries({ queryKey: ['promotions'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
      void qc.invalidateQueries({ queryKey: ['promotion-conflicts'] })
    },
    onError: (err: Error) => setToast(err.message || 'Could not create campaign.'),
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<PromotionCampaign>(`/api/accounts/admin/promotions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ cancel: true }),
      }),
    onSuccess: () => {
      setToast('Campaign cancelled.')
      void qc.invalidateQueries({ queryKey: ['promotions'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  const approveMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<PromotionCampaign>(`/api/accounts/admin/promotions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ approve: true }),
      }),
    onSuccess: () => {
      setToast('Request approved — campaign scheduled.')
      void qc.invalidateQueries({ queryKey: ['promotions'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
    onError: (err: Error) => setToast(err.message || 'Could not approve request.'),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiFetch<PromotionCampaign>(`/api/accounts/admin/promotions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ reject: true, rejection_reason: reason }),
      }),
    onSuccess: () => {
      setToast('Request rejected.')
      setRejectId(null)
      setRejectReason('')
      void qc.invalidateQueries({ queryKey: ['promotions'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
    onError: (err: Error) => setToast(err.message || 'Could not reject request.'),
  })

  const filtered = useMemo(() => {
    let rows = campaigns
    if (statusFilter !== 'All') {
      const key = statusFilter.toLowerCase().replace(/ /g, '_')
      rows = rows.filter((c) => c.status === key)
    }
    if (placementFilter !== 'All') {
      rows = rows.filter((c) => c.placement_label === placementFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (c) =>
          c.target_label.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q) ||
          c.placement_label.toLowerCase().includes(q),
      )
    }
    return rows
  }, [campaigns, statusFilter, placementFilter, search])

  const liveCount = campaigns.filter((c) => c.is_live).length
  const requestQueue = campaigns.filter((c) => c.status === 'requested')

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Featured partners" subtitle="Spotlight campaigns across homepage rails and list heroes." />
        <DelveAdminLoading count={5} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Featured partners" subtitle="Spotlight campaigns across homepage rails and list heroes." />
        <DelveAdminError message="Could not load promotions." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Featured partners"
        subtitle={`${campaigns.length} campaigns · ${liveCount} live now`}
        action={
          <>
            <Link to="/admin/home-pins" className="da-btn da-btn--ghost">
              Home pins
            </Link>
            <Link to="/admin/promotions/analytics" className="da-btn da-btn--ghost">
              Promotion analytics
            </Link>
          </>
        }
      />

      {toast ? (
        <p className="da-toast" role="status">
          {toast}
        </p>
      ) : null}

      {requestQueue.length ? (
        <DelveAdminPanel title={`Provider requests (${requestQueue.length})`}>
          <p className="da-panel__hint">
            Providers submit these after arranging offline payment. Approve when payment is confirmed, or reject with a
            reason.
          </p>
          <div className="da-stack">
            {requestQueue.map((item) => (
              <DelveAdminDataRow
                key={item.id}
                primary={item.target_label || `${item.target_type} #${item.target_id}`}
                secondary={`${item.placement_label}${item.region ? ` · ${item.region}` : ' · National'} · ${new Date(item.starts_at).toLocaleDateString()} → ${new Date(item.ends_at).toLocaleDateString()}${item.requested_by_username ? ` · @${item.requested_by_username}` : ''}${item.provider_notes ? ` · “${item.provider_notes}”` : ''}`}
                badge={<DelveAdminStatusBadge status={item.status_label} variant="info" />}
                actions={
                  <>
                    <button
                      type="button"
                      className="da-btn da-btn--primary"
                      disabled={approveMut.isPending}
                      onClick={() => approveMut.mutate(item.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="da-btn da-btn--ghost"
                      disabled={rejectMut.isPending}
                      onClick={() => {
                        setRejectId(item.id)
                        setRejectReason('')
                      }}
                    >
                      Reject
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </DelveAdminPanel>
      ) : null}

      {rejectId ? (
        <DelveAdminPanel title="Reject promotion request">
          <form
            className="da-settings-form"
            onSubmit={(e) => {
              e.preventDefault()
              const reason = rejectReason.trim()
              if (!reason) return
              rejectMut.mutate({ id: rejectId, reason })
            }}
          >
            <label className="da-field">
              <span>Reason (shown to provider)</span>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Payment not received, dates conflict with existing partner…"
              />
            </label>
            <div className="da-field-row">
              <button type="submit" className="da-btn da-btn--danger" disabled={rejectMut.isPending || !rejectReason.trim()}>
                {rejectMut.isPending ? 'Rejecting…' : 'Confirm reject'}
              </button>
              <button type="button" className="da-btn da-btn--ghost" onClick={() => setRejectId(null)}>
                Cancel
              </button>
            </div>
          </form>
        </DelveAdminPanel>
      ) : null}

      <DelveAdminPanel title="Create campaign">
        <p className="da-panel__hint">
          Homepage rails show up to 2 partner slots first; category list heroes show 1. Leave region blank for national
          reach. No payment gate in v1 — complimentary growth spotlights.
        </p>
        <form
          className="da-settings-form"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const listingId = Number(fd.get('listing_id'))
            const listing = listingOptions.find((l) => l.listing_id === listingId)
            if (!listing) return
            createMut.mutate({
              placement: formPlacement,
              target_type: formTargetType,
              target_id: String(listingId),
              target_label: listing.title,
              region: formRegion.trim(),
              starts_at: new Date(formStartsAt).toISOString(),
              ends_at: new Date(formEndsAt).toISOString(),
              priority: Number(fd.get('priority') || 0),
              label: String(fd.get('label') || selectedPlacement.defaultLabel).trim() || selectedPlacement.defaultLabel,
              admin_notes: String(fd.get('admin_notes') || '').trim(),
            })
          }}
        >
          <label className="da-field">
            <span>Placement</span>
            <select
              name="placement"
              value={formPlacement}
              onChange={(e) => setFormPlacement(e.target.value)}
              required
            >
              {PLACEMENT_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} (max {p.maxSlots})
                </option>
              ))}
            </select>
          </label>

          {(isCategorySpotlight || isFeedPlacement) ? (
            <label className="da-field">
              <span>{isFeedPlacement ? 'Promote' : 'Category vertical'}</span>
              <select
                value={formTargetType}
                onChange={(e) => setFormTargetType(e.target.value)}
                required
              >
                {(isFeedPlacement ? FEED_TARGET_TYPES : SPOTLIGHT_TARGET_TYPES).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="da-field">
            <span>Listing</span>
            <select name="listing_id" required defaultValue="">
              <option value="" disabled>
                Select a published listing…
              </option>
              {listingOptions.map((l) => (
                <option key={l.id} value={l.listing_id}>
                  {l.title} — {l.city ? `${l.city}, ${l.region}` : l.region}
                </option>
              ))}
            </select>
          </label>

          <label className="da-field">
            <span>Region (optional — blank = all regions)</span>
            <input
              name="region"
              type="text"
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
              placeholder="e.g. Khomas, Erongo…"
              list="promo-regions"
            />
            <datalist id="promo-regions">
              {[...new Set(listingOptions.map((l) => l.region).filter(Boolean))].map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>

          <div className="da-field-row">
            <label className="da-field">
              <span>Starts</span>
              <input
                name="starts_at"
                type="datetime-local"
                required
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
              />
            </label>
            <label className="da-field">
              <span>Ends</span>
              <input
                name="ends_at"
                type="datetime-local"
                required
                value={formEndsAt}
                onChange={(e) => setFormEndsAt(e.target.value)}
              />
            </label>
          </div>

          {conflicts?.warnings?.length ? (
            <div className={`da-conflicts${conflicts.has_conflict ? ' da-conflicts--danger' : ''}`} role="status">
              <strong>{conflicts.has_conflict ? 'Slot conflict' : 'Slot availability'}</strong>
              <ul>
                {conflicts.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p>
                {conflicts.available_slots} of {conflicts.max_slots} slot{conflicts.max_slots === 1 ? '' : 's'} available
                for this period.
              </p>
            </div>
          ) : null}

          <label className="da-field">
            <span>Priority (higher wins when slots overlap)</span>
            <input name="priority" type="number" min={0} max={100} defaultValue={10} />
          </label>
          <label className="da-field">
            <span>Card label</span>
            <input name="label" type="text" defaultValue={selectedPlacement.defaultLabel} key={formPlacement} />
          </label>
          <label className="da-field">
            <span>Internal notes</span>
            <textarea name="admin_notes" rows={2} placeholder="Partner outreach, invoice ref, etc." />
          </label>
          <button
            type="submit"
            className="da-btn da-btn--primary"
            disabled={createMut.isPending || !listingOptions.length || conflicts?.has_conflict}
          >
            {createMut.isPending ? 'Creating…' : 'Create campaign'}
          </button>
        </form>
      </DelveAdminPanel>

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search campaigns…">
        {STATUS_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
        ))}
      </DelveAdminFilterBar>

      <div className="da-filter-row">
        {PLACEMENT_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={placementFilter === f} onClick={() => setPlacementFilter(f)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <DelveAdminEmpty title="No campaigns" message="Create a featured partner campaign above." />
      ) : (
        <div className="da-stack">
          {filtered.map((item) => (
            <DelveAdminDataRow
              key={item.id}
              primary={item.target_label || `${item.target_type} #${item.target_id}`}
              secondary={`${item.placement_label}${item.region ? ` · ${item.region}` : ' · National'} · ${new Date(item.starts_at).toLocaleDateString()} → ${new Date(item.ends_at).toLocaleDateString()}${item.product_name ? ` · ${item.product_name}` : ''}${item.payment_ref ? ` · paid ${item.payment_ref}` : item.status === 'pending_payment' ? ' · unpaid' : ''}${item.created_by_username ? ` · by @${item.created_by_username}` : ''}${item.requested_by_username ? ` · requested by @${item.requested_by_username}` : ''}${item.rejection_reason ? ` · Rejected: ${item.rejection_reason}` : ''}`}
              badge={
                <>
                  <DelveAdminStatusBadge status={item.label} variant="info" />
                  <DelveAdminStatusBadge status={item.status_label} variant={promotionStatusVariant(item.status)} />
                  {item.is_live ? <DelveAdminStatusBadge status="Live now" variant="success" /> : null}
                </>
              }
              actions={
                item.status === 'requested' ? (
                  <>
                    <button
                      type="button"
                      className="da-btn da-btn--primary"
                      disabled={approveMut.isPending}
                      onClick={() => approveMut.mutate(item.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="da-btn da-btn--ghost"
                      disabled={rejectMut.isPending}
                      onClick={() => {
                        setRejectId(item.id)
                        setRejectReason('')
                      }}
                    >
                      Reject
                    </button>
                  </>
                ) : item.status !== 'cancelled' && item.status !== 'expired' && item.status !== 'rejected' ? (
                  <button
                    type="button"
                    className="da-btn da-btn--ghost"
                    disabled={cancelMut.isPending}
                    onClick={() => cancelMut.mutate(item.id)}
                  >
                    Cancel
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
