import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { apiFetch, asArray } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import {
  EMPTY_STAY_LISTING_FORM,
  StayBookingCard,
  StayListingCard,
  StayListingForm,
  StayMonetizationSection,
  StayStoriesPanel,
  buildStayListingApiPayload,
  nextIncompleteStayFormStep,
  nextStayFormStep,
  stayListingToForm,
  type ProviderStayListing,
  type StayFormStepId,
  type StayListingSaveMode,
} from '../components/provider/stays'
import {
  ProviderUiChips,
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
  ProviderUiStats,
} from '../components/provider/ui'
import '../components/provider/stays/stay-listing.css'
import { normalizeReviews } from '../components/GuestReviewCard'
import { ListSkeleton } from '../components/ui'
import { useDisplayMoney } from '../hooks/useDisplayMoney'

type StayReviewsResponse = {
  reviews: unknown[]
  rating_avg: number
  rating_count: number
}

type ProviderBooking = {
  id: number
  listing_title: string
  guest_display_name: string
  guest_username: string
  check_in: string
  check_out: string
  guests: number
  total_price: string
  status: string
  platform_fee?: string
  seller_payout?: string
  payout_status?: string
}

const TABS = [
  { id: 'listings', label: 'Listings' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'reviews', label: 'Reviews' },
] as const

function tabFromSearchParam(raw: string | null): (typeof TABS)[number]['id'] | null {
  if (!raw) return null
  if (raw === 'stories' || raw === 'highlights') return 'highlights'
  if (TABS.some((t) => t.id === raw)) return raw as (typeof TABS)[number]['id']
  return null
}

const BOOKING_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'checked_in', label: 'Checked in' },
  { id: 'checked_out', label: 'Checked out' },
  { id: 'cancelled', label: 'Cancelled' },
]

const STATUS_ACTIONS: Record<string, { label: string; action: string }[]> = {
  pending: [
    { label: 'Confirm', action: 'confirm' },
    { label: 'Cancel', action: 'cancel' },
  ],
  confirmed: [
    { label: 'Check in', action: 'check_in' },
    { label: 'Cancel', action: 'cancel' },
    { label: 'Refund', action: 'refund' },
  ],
  checked_in: [{ label: 'Check out', action: 'check_out' }],
  cancelled: [{ label: 'Refund', action: 'refund' }],
}

function nightsBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

export function StaysAdmin() {
  const { format } = useDisplayMoney()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { canManageListings, canManageBookings, isViewerOnly, canAccessProvider } = useBusinessAccess()

  const initialTab = tabFromSearchParam(searchParams.get('tab')) ?? 'listings'
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>(initialTab)
  const [highlightListingId, setHighlightListingId] = useState<number | null>(() => {
    const raw = searchParams.get('listing')
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) && n > 0 ? n : null
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [formStep, setFormStep] = useState<StayFormStepId>('basics')
  const [form, setForm] = useState(EMPTY_STAY_LISTING_FORM)
  const [formErr, setFormErr] = useState('')

  useEffect(() => {
    const fromUrl = tabFromSearchParam(searchParams.get('tab'))
    if (fromUrl) setTab(fromUrl)
    const raw = searchParams.get('listing')
    const n = raw ? Number(raw) : NaN
    if (Number.isFinite(n) && n > 0) {
      setHighlightListingId(n)
      setTab('highlights')
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('tab') || searchParams.get('listing')) {
      setSearchParams({}, { replace: true })
    }
    // Clear deep-link params once applied so refresh does not re-force the tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['provider-stays'],
    queryFn: async () =>
      asArray<ProviderStayListing>(await apiFetch('/api/accommodation/provider-listings/')),
    enabled: Boolean(profile && canAccessProvider),
  })

  const { data: promoCampaigns = [] } = useQuery({
    queryKey: ['provider-promotions'],
    queryFn: async () =>
      asArray<{
        target_type: string
        target_id: string
        status: string
        is_live: boolean
        status_label: string
      }>(await apiFetch('/api/promotions/my/')),
    enabled: Boolean(profile && canAccessProvider),
  })

  const boostByListingId = useMemo(() => {
    const map = new Map<number, { label: string; tone: 'live' | 'pending' | 'scheduled' }>()
    for (const c of promoCampaigns) {
      if (c.target_type !== 'accommodation') continue
      const id = Number(c.target_id)
      if (!Number.isFinite(id)) continue
      if (c.is_live || c.status === 'active') {
        map.set(id, { label: 'Boosted', tone: 'live' })
      } else if (c.status === 'requested' || c.status === 'pending_payment') {
        if (!map.has(id) || map.get(id)?.tone !== 'live') {
          map.set(id, {
            label: c.status === 'requested' ? 'Awaiting admin' : 'Pay to boost',
            tone: 'pending',
          })
        }
      } else if (c.status === 'scheduled' && !map.has(id)) {
        map.set(id, { label: 'Boost scheduled', tone: 'scheduled' })
      }
    }
    return map
  }, [promoCampaigns])

  const bookingsUrl =
    statusFilter === 'all'
      ? '/api/accommodation/provider-bookings/'
      : `/api/accommodation/provider-bookings/?status=${statusFilter}`

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['provider-stay-bookings', statusFilter],
    queryFn: async () => asArray<ProviderBooking>(await apiFetch(bookingsUrl)),
    enabled: Boolean(profile && canAccessProvider),
  })

  const { data: analytics } = useQuery({
    queryKey: ['stay-provider-analytics'],
    queryFn: () =>
      apiFetch<{
        on_platform_revenue: number
        confirmed_bookings: number
        pending_requests: number
        total_bookings: number
      }>('/api/accommodation/provider-analytics/?days=30'),
    enabled: Boolean(profile && canAccessProvider),
  })

  const reviewQueries = useQueries({
    queries: listings.map((l) => ({
      queryKey: ['stay-reviews', l.id],
      queryFn: () => apiFetch<StayReviewsResponse>(`/api/accommodation/listings/${l.id}/reviews/`),
      enabled: Boolean(profile && canAccessProvider && tab === 'reviews'),
    })),
  })

  const reviews = useMemo(() => {
    const apiRows = reviewQueries.flatMap((q, i) => {
      const listing = listings[i]
      if (!listing || !q.data?.reviews) return []
      return normalizeReviews(q.data.reviews).map((r, j) => ({
        id: `api-${listing.id}-${j}`,
        listing: listing.title,
        guest: r.name,
        rating: r.rating,
        body: r.body,
        source: 'traveler' as const,
      }))
    })
    const seeded = listings.flatMap((l) =>
      (l.guest_reviews ?? []).map((r, i) => ({
        id: `seed-${l.id}-${i}`,
        listing: l.title,
        guest: r.name,
        rating: r.rating,
        body: r.body,
        source: 'host' as const,
      })),
    )
    const seen = new Set<string>()
    return [...apiRows, ...seeded].filter((r) => {
      const key = `${r.listing}:${r.guest}:${r.body.slice(0, 40)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [listings, reviewQueries])

  const saveMut = useMutation({
    mutationFn: async (mode: StayListingSaveMode) => {
      const body = await buildStayListingApiPayload(form)
      const saved = editId
        ? await apiFetch<ProviderStayListing>(`/api/accommodation/provider-listings/${editId}/`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : await apiFetch<ProviderStayListing>('/api/accommodation/provider-listings/', {
            method: 'POST',
            body: JSON.stringify(body),
          })
      return { saved, mode, fromStep: formStep }
    },
    onSuccess: ({ saved, mode, fromStep }) => {
      void qc.invalidateQueries({ queryKey: ['provider-stays'] })
      void qc.invalidateQueries({ queryKey: ['accommodation'] })
      void qc.invalidateQueries({ queryKey: ['acc'] })
      setEditId(saved.id)
      setForm(stayListingToForm(saved))
      setFormErr('')
      if (mode === 'continue') {
        const next = nextStayFormStep(fromStep)
        setFormStep(next ?? fromStep)
        setShowForm(true)
        return
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_STAY_LISTING_FORM)
      setFormStep('basics')
    },
    onError: (e: Error) => setFormErr(friendlyApiMessage(e)),
  })

  const bookingActionMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      apiFetch<ProviderBooking>(`/api/accommodation/provider-bookings/${id}/${action}/`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-stay-bookings'] })
      void qc.invalidateQueries({ queryKey: ['provider-stays'] })
      void qc.invalidateQueries({ queryKey: ['stay-provider-analytics'] })
    },
  })

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }

  const avgRating = listings.length
    ? (listings.reduce((s, x) => s + parseFloat(x.rating_avg), 0) / listings.length).toFixed(1)
    : '—'
  const revenue =
    analytics?.on_platform_revenue ??
    bookings
      .filter((b) => ['confirmed', 'checked_in', 'checked_out'].includes(b.status))
      .reduce((s, b) => s + parseFloat(b.total_price), 0)

  const bookingCount = analytics?.total_bookings ?? bookings.length
  const pendingBookings =
    analytics?.pending_requests ?? bookings.filter((b) => b.status === 'pending').length
  const missingPhotos = listings.filter((l) => !l.cover_image).length

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_STAY_LISTING_FORM)
    setFormStep('basics')
    setFormErr('')
  }

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_STAY_LISTING_FORM)
    setFormStep('basics')
    setShowForm(true)
    setFormErr('')
    setTab('listings')
  }

  const openEdit = (stay: ProviderStayListing, step?: StayFormStepId) => {
    const values = stayListingToForm(stay)
    setEditId(stay.id)
    setForm(values)
    setFormStep(step ?? nextIncompleteStayFormStep(values))
    setShowForm(true)
    setFormErr('')
  }

  const attention = [
    ...(missingPhotos > 0
      ? [
          {
            id: 'photos',
            label: `${missingPhotos} propert${missingPhotos === 1 ? 'y' : 'ies'} missing cover photos`,
            action: 'Fix listings',
            onClick: () => setTab('listings'),
          },
        ]
      : []),
    ...(pendingBookings > 0
      ? [
          {
            id: 'pending',
            label: `${pendingBookings} booking request${pendingBookings === 1 ? '' : 's'} pending`,
            action: 'Review',
            onClick: () => {
              setStatusFilter('pending')
              setTab('bookings')
            },
          },
        ]
      : []),
  ]

  const tabChips = TABS.map((t) =>
    t.id === 'bookings' && pendingBookings > 0
      ? { ...t, label: `Bookings (${pendingBookings})` }
      : t,
  )

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Stays"
        subtitle={
          isViewerOnly
            ? 'View listings, bookings, and reviews.'
            : 'Edit listings, handle bookings, then add highlights.'
        }
        actions={
          <>
            <Link to="/accommodation" className="prov-ui__btn prov-ui__btn--ghost">
              Browse public
            </Link>
            {canManageListings ? (
              <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={openCreate}>
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Add listing
              </button>
            ) : null}
          </>
        }
      />

      {attention.length > 0 ? (
        <section>
          <h2 className="prov-ui__section-title">Needs attention</h2>
          <ul className="prov-ui__attention">
            {attention.map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <button
                  type="button"
                  className="prov-ui__link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  onClick={item.onClick}
                >
                  {item.action}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ProviderUiStats
        columns={4}
        stats={[
          { value: listings.length, label: 'Listings' },
          { value: avgRating, label: 'Avg rating' },
          {
            value: bookingCount || '—',
            label: pendingBookings > 0 ? `${pendingBookings} pending` : 'Bookings',
            accent: pendingBookings > 0,
          },
          { value: format(revenue), label: 'Revenue · 30d', accent: revenue > 0 },
        ]}
      />

      <StayMonetizationSection enabled={canAccessProvider} canManage={canManageListings} />

      <ProviderUiChips
        chips={[...tabChips]}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        ariaLabel="Stays sections"
      />

      {tab === 'listings' && (
        <section id="listings">
          {loadingListings ? (
            <ListSkeleton count={3} variant="row" />
          ) : listings.length === 0 ? (
            <>
              <ProviderUiEmpty
                title="No stays yet"
                message="Add a listing with photos, rooms, and a map pin so travellers can book."
              />
              {canManageListings ? (
                <button type="button" className="stay-add-btn" onClick={openCreate}>
                  Add your first listing
                </button>
              ) : null}
            </>
          ) : (
            <div className="stay-list">
              {listings.map((stay) => (
                <StayListingCard
                  key={stay.id}
                  stay={stay}
                  canEdit={canManageListings}
                  boost={boostByListingId.get(stay.id) ?? null}
                  onEdit={() => openEdit(stay, 'basics')}
                  onContinue={() => openEdit(stay)}
                  onManageHighlights={() => {
                    setHighlightListingId(stay.id)
                    setTab('highlights')
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'bookings' && (
        <section id="bookings">
          {!canManageBookings ? (
            <p className="stay-hint">Your role can view the stays module but not manage bookings.</p>
          ) : null}
          <ProviderUiChips
            chips={BOOKING_FILTERS}
            active={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filter bookings"
          />
          {loadingBookings ? (
            <p className="stay-hint">Loading bookings…</p>
          ) : bookings.length === 0 ? (
            <ProviderUiEmpty title="No bookings found" message="Booking requests from travellers will appear here." />
          ) : (
            <div className="prov-ui__list">
              {bookings.map((b) => (
                <StayBookingCard
                  key={b.id}
                  booking={b}
                  nights={nightsBetween(b.check_in, b.check_out)}
                  canManage={canManageBookings}
                  statusActions={STATUS_ACTIONS[b.status] ?? []}
                  actionPending={bookingActionMut.isPending}
                  onAction={(action) => bookingActionMut.mutate({ id: b.id, action })}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'highlights' && (
        <section id="highlights">
          <StayStoriesPanel
            listings={listings}
            canManage={canManageListings}
            initialListingId={highlightListingId}
          />
        </section>
      )}

      {tab === 'reviews' && (
        <section>
          {reviews.length === 0 ? (
            <ProviderUiEmpty title="No reviews yet" message="Guest reviews will appear here after completed stays." />
          ) : (
            <div className="prov-ui__list">
              {reviews.map((r) => (
                <article key={r.id} className="prov-ui-review">
                  <div className="prov-ui-review__head">
                    <span className="prov-ui__booking-avatar" aria-hidden>
                      {r.guest.charAt(0)}
                    </span>
                    <div>
                      <strong>{r.guest}</strong>
                      <span>
                        {r.listing}
                        {r.source === 'traveler' ? ' · Traveller review' : ''}
                      </span>
                    </div>
                    <span className="prov-ui-review__rating">{r.rating}</span>
                  </div>
                  <p className="prov-ui-review__body">{r.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {showForm && canManageListings ? (
        <StayListingForm
          values={form}
          onChange={setForm}
          error={formErr}
          saving={saveMut.isPending}
          isEdit={Boolean(editId)}
          listingId={editId}
          step={formStep}
          onStepChange={setFormStep}
          onSave={(mode) => saveMut.mutate(mode)}
          onCancel={closeForm}
        />
      ) : null}
    </ProviderUiPage>
  )
}
