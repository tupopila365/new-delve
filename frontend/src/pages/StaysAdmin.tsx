import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock3, Plus } from 'lucide-react'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import {
  StayBookingCard,
  StayListingCard,
  StayMonetizationSection,
  type StayMonetizationAnalytics,
  type ProviderStayListing,
} from '../components/provider/stays'
import {
  ProviderUiChips,
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
  ProviderUiStats,
} from '../components/provider/ui'
import '../components/provider/stays/stay-listing.css'
import { ListSkeleton } from '../components/ui'
import { useDisplayMoney } from '../hooks/useDisplayMoney'
import {
  useProviderReviewReply,
  useProviderReviews,
  type ProviderReviewRow,
} from '../hooks/useProviderReviews'
import { friendlyApiMessage } from '../utils/friendlyError'

type ProviderBooking = {
  id: number
  listing?: number
  listing_title: string
  guest_display_name: string
  guest_username: string
  check_in: string
  check_out: string
  guests: number
  total_price: string
  room_type_name?: string
  room_type?: number | null
  special_requests?: string
  status: string
  platform_fee?: string
  seller_payout?: string
  payout_status?: string
  hold_expires_at?: string | null
  expired_at?: string | null
  paid_at?: string | null
  payout_released_at?: string | null
  mock_payment_ref?: string | null
}

function StayReviewCard({
  review,
  canReply,
  saving,
  onSave,
}: {
  review: ProviderReviewRow
  canReply: boolean
  saving: boolean
  onSave: (reply: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(review.needsReply)
  const [draft, setDraft] = useState(review.response ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(review.response ?? '')
  }, [review.response])

  return (
    <article className={`prov-ui-review${review.needsReply ? ' prov-ui-review--urgent' : ''}`}>
      <div className="prov-ui-review__head">
        <span className="prov-ui__booking-avatar" aria-hidden>
          {review.guest.charAt(0).toUpperCase()}
        </span>
        <div>
          <strong>{review.guest}</strong>
          <span>
            {review.listing}
            {review.date ? ` · ${review.date}` : ''}
          </span>
        </div>
        <span className="prov-ui-review__rating" aria-label={`${review.rating} out of 5`}>
          {review.rating} ★
        </span>
      </div>
      <p className="prov-ui-review__body">{review.body}</p>
      {review.response && !editing ? (
        <p className="prov-ui-review__response">
          <strong>Your reply:</strong> {review.response}
        </p>
      ) : null}
      {canReply && editing ? (
        <div className="prov-ui-review__reply">
          <label className="prov-ui-review__reply-label" htmlFor={`stay-review-${review.id}`}>
            {review.response ? 'Edit your reply' : 'Reply to this traveller'}
          </label>
          <textarea
            id={`stay-review-${review.id}`}
            className="prov-ui-review__reply-input"
            value={draft}
            maxLength={1000}
            onChange={(event) => setDraft(event.target.value)}
          />
          {error ? <p className="prov-ui-review__reply-error">{error}</p> : null}
          <div className="stay-review__actions">
            <button
              type="button"
              className="prov-ui__btn prov-ui__btn--primary"
              disabled={saving || !draft.trim()}
              onClick={async () => {
                setError('')
                try {
                  await onSave(draft)
                  setEditing(false)
                } catch (reason) {
                  setError(friendlyApiMessage(reason, 'Could not save your reply.'))
                }
              }}
            >
              {saving ? 'Saving…' : review.response ? 'Update reply' : 'Post reply'}
            </button>
            {review.response ? (
              <button
                type="button"
                className="prov-ui__btn prov-ui__btn--ghost"
                disabled={saving}
                onClick={() => {
                  setDraft(review.response ?? '')
                  setEditing(false)
                  setError('')
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : canReply ? (
        <button
          type="button"
          className="stay-review__edit"
          onClick={() => setEditing(true)}
        >
          {review.response ? 'Edit reply' : 'Reply'}
        </button>
      ) : null}
    </article>
  )
}

const TABS = [
  { id: 'listings', label: 'Listings' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'reviews', label: 'Reviews' },
] as const

function tabFromSearchParam(raw: string | null): (typeof TABS)[number]['id'] | null {
  if (!raw) return null
  if (raw === 'stories' || raw === 'highlights') return 'listings'
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
  { id: 'expired', label: 'Expired' },
]

const STATUS_ACTIONS: Record<string, { label: string; action: string }[]> = {
  pending: [
    { label: 'Confirm', action: 'confirm' },
    { label: 'Decline', action: 'cancel' },
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
  const {
    activeBusiness,
    canManageListings,
    canManageBookings,
    isViewerOnly,
    canAccessProvider,
  } = useBusinessAccess()

  const initialTab = tabFromSearchParam(searchParams.get('tab')) ?? 'listings'
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>(initialTab)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fromUrl = tabFromSearchParam(searchParams.get('tab'))
    if (fromUrl) setTab(fromUrl)
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('tab') || searchParams.get('listing')) {
      setSearchParams({}, { replace: true })
    }
    // Clear deep-link params once applied so refresh does not re-force the tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['provider-stays', activeBusiness?.id ?? 'all'],
    queryFn: async () =>
      asArray<ProviderStayListing>(
        await apiFetch(
          `/api/accommodation/provider-listings/${
            activeBusiness?.id ? `?business=${activeBusiness.id}` : ''
          }`,
        ),
      ),
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

  const bookingParams = new URLSearchParams()
  if (statusFilter !== 'all') bookingParams.set('status', statusFilter)
  if (activeBusiness?.id) bookingParams.set('business', String(activeBusiness.id))
  const bookingQuery = bookingParams.toString()
  const bookingsUrl = `/api/accommodation/provider-bookings/${
    bookingQuery ? `?${bookingQuery}` : ''
  }`

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['provider-stay-bookings', statusFilter, activeBusiness?.id ?? 'all'],
    queryFn: async () => asArray<ProviderBooking>(await apiFetch(bookingsUrl)),
    enabled: Boolean(profile && canAccessProvider),
  })

  const analyticsUrl = `/api/accommodation/provider-analytics/?days=30${
    activeBusiness?.id ? `&business=${activeBusiness.id}` : ''
  }`
  const { data: analytics } = useQuery({
    queryKey: ['stay-provider-analytics', activeBusiness?.id ?? 'all'],
    queryFn: () =>
      apiFetch<StayMonetizationAnalytics>(analyticsUrl),
    enabled: Boolean(profile && canAccessProvider),
  })

  const { data: providerReviews = [], isLoading: loadingReviews } = useProviderReviews(
    Boolean(profile && canAccessProvider && tab === 'reviews'),
  )
  const reviewReplyMut = useProviderReviewReply()
  const reviews = useMemo(
    () =>
      providerReviews.filter(
        (review) => review.source === 'accommodation' || review.category === 'Stay',
      ),
    [providerReviews],
  )

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

  const revenue =
    analytics?.on_platform_revenue ??
    bookings
      .filter((b) => ['confirmed', 'checked_in', 'checked_out'].includes(b.status))
      .reduce((s, b) => s + parseFloat(b.total_price), 0)

  const bookingCount = analytics?.total_bookings ?? bookings.length
  const pendingBookings =
    analytics?.pending_requests ?? bookings.filter((b) => b.status === 'pending').length
  const viewCount = analytics?.total_views ?? 0
  const listingViewCount = analytics?.total_listing_views ?? 0
  const roomViewCount = analytics?.total_room_views ?? 0
  const missingPhotos = listings.filter((l) => !l.cover_image).length
  const expiringRequests = analytics?.expiring_requests ?? []
  const attention = [
    ...expiringRequests.map((request) => ({
      id: `expiring-${request.id}`,
      label: `${request.guest_display_name || request.guest || 'Guest'} · ${request.listing_title} expires in ${Math.max(
        1,
        request.minutes_remaining,
      )} min`,
      action: 'Open request',
      urgent: true,
      onClick: () => {
        setStatusFilter(request.status || 'pending')
        setTab('bookings')
        window.setTimeout(() => {
          document.getElementById(`booking-${request.id}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }, 120)
      },
    })),
    ...(missingPhotos > 0
      ? [
          {
            id: 'photos',
            label: `${missingPhotos} propert${missingPhotos === 1 ? 'y' : 'ies'} missing cover photos`,
            action: 'Fix listings',
            urgent: false,
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
            urgent: false,
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
            ? 'View your accommodation, bookings, and reviews.'
            : 'Manage every property operated by this business, then configure its room inventory and calendar.'
        }
        actions={
          <>
            <Link to="/accommodation" className="prov-ui__btn prov-ui__btn--ghost">
              Browse public
            </Link>
            {canManageListings ? (
              <Link to="/provider/stays/new" className="prov-ui__btn prov-ui__btn--primary">
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Create accommodation
              </Link>
            ) : null}
          </>
        }
      />

      {attention.length > 0 ? (
        <section>
          <h2 className="prov-ui__section-title">Needs attention</h2>
          <ul className="prov-ui__attention stay-attention">
            {attention.map((item) => (
              <li key={item.id} className={item.urgent ? 'stay-attention__urgent' : undefined}>
                <span>
                  {item.urgent ? <Clock3 size={17} strokeWidth={2.25} aria-hidden /> : null}
                  {item.label}
                </span>
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
          {
            value:
              typeof analytics?.occupancy_rate === 'number'
                ? `${Math.round(analytics.occupancy_rate)}%`
                : '—',
            label: `${analytics?.occupied_room_nights ?? 0} of ${analytics?.available_room_nights ?? 0} room nights`,
            accent: Boolean(analytics?.occupancy_rate),
          },
          { value: format(revenue), label: 'Revenue · 30d', accent: revenue > 0 },
          {
            value: bookingCount || '—',
            label: pendingBookings > 0 ? `${pendingBookings} pending` : 'Bookings · 30d',
            accent: pendingBookings > 0,
          },
          {
            value: viewCount || '—',
            label: viewCount > 0 ? `${listingViewCount} stay · ${roomViewCount} room` : 'Views · 30d',
          },
        ]}
      />

      <StayMonetizationSection
        enabled={canAccessProvider}
        canManage={canManageListings}
        activeBusinessId={activeBusiness?.id}
      />

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
                title="No accommodation yet"
                message="Create your property details first, then add rooms one by one."
              />
              {canManageListings ? (
                <Link to="/provider/stays/new" className="stay-add-btn">
                  Create your accommodation
                </Link>
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
                  actionPending={
                    bookingActionMut.isPending && bookingActionMut.variables?.id === b.id
                  }
                  pendingAction={
                    bookingActionMut.isPending && bookingActionMut.variables?.id === b.id
                      ? bookingActionMut.variables.action
                      : null
                  }
                  onAction={(action) => bookingActionMut.mutate({ id: b.id, action })}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'reviews' && (
        <section>
          {loadingReviews ? (
            <ListSkeleton count={3} variant="row" />
          ) : reviews.length === 0 ? (
            <ProviderUiEmpty title="No reviews yet" message="Guest reviews will appear here after completed stays." />
          ) : (
            <div className="prov-ui__list">
              {reviews.map((r) => (
                <StayReviewCard
                  key={r.id}
                  review={r}
                  canReply={canManageListings}
                  saving={
                    reviewReplyMut.isPending &&
                    reviewReplyMut.variables?.source === r.source &&
                    reviewReplyMut.variables?.reviewId === r.reviewId
                  }
                  onSave={(reply) =>
                    reviewReplyMut.mutateAsync({
                      source: r.source,
                      reviewId: r.reviewId,
                      reply,
                    }).then(() => undefined)
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}
    </ProviderUiPage>
  )
}
