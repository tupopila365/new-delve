import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { Plus, MessageCircle, Store, CalendarDays, Star } from 'lucide-react'
import { apiFetch } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import { ProviderCategoryStrip, ProviderAccessGate } from '../components/provider'
import {
  FoodMonetizationSection,
  FoodVenueCard,
  FoodVenueCreateShell,
  type ProviderFoodVenue,
} from '../components/provider/food'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ListSkeleton } from '../components/ui'
import { bookingStatusLabel } from '../components/booking'
import '../components/provider/transport/transport-admin.css'
import '../components/provider/transport/transport-listing.css'

type ProviderFoodReservation = {
  id: number
  venue: number
  venue_name: string
  guest_username: string
  guest_display_name?: string | null
  reserved_for: string
  party_size: number
  special_requests?: string
  status: string
}

const RESERVATION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'checked_in', label: 'Seated' },
  { id: 'cancelled', label: 'Cancelled' },
] as const

const RESERVATION_ACTIONS: Record<string, { label: string; action: string }[]> = {
  pending: [
    { label: 'Confirm', action: 'confirm' },
    { label: 'Cancel', action: 'cancel' },
  ],
  confirmed: [
    { label: 'Mark seated', action: 'check_in' },
    { label: 'Cancel', action: 'cancel' },
  ],
  checked_in: [{ label: 'Complete', action: 'check_out' }],
}

function formatReservationWhen(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-NA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
}

export function FoodAdmin() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { canAccessProvider, canManageListings, canManageBookings, isViewerOnly } = useBusinessAccess()
  const [tab, setTab] = useState<'venues' | 'reservations' | 'reviews'>('venues')
  const [reservationFilter, setReservationFilter] = useState('all')
  const [showCreateShell, setShowCreateShell] = useState(false)
  const [formError, setFormError] = useState('')

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['provider-food-venues'],
    enabled: Boolean(profile && canAccessProvider),
    queryFn: () => apiFetch<ProviderFoodVenue[]>('/api/food/provider-venues/'),
  })

  const reservationsUrl =
    reservationFilter === 'all'
      ? '/api/food/provider-reservations/'
      : `/api/food/provider-reservations/?status=${reservationFilter}`

  const { data: reservations = [], isLoading: loadingReservations } = useQuery({
    queryKey: ['provider-food-reservations', reservationFilter],
    enabled: Boolean(profile && canAccessProvider),
    queryFn: () => apiFetch<ProviderFoodReservation[]>(reservationsUrl),
  })

  const reservationActionMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      apiFetch<ProviderFoodReservation>(`/api/food/provider-reservations/${id}/${action}/`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-food-reservations'] })
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'food'] })
    },
    onError: (err) => setFormError(friendlyApiMessage(err, 'Could not update reservation.')),
  })

  const reviewQueries = useQueries({
    queries: venues.map((venue) => ({
      queryKey: ['food-reviews', venue.id],
      enabled: tab === 'reviews' && venues.length > 0,
      queryFn: () =>
        apiFetch<{ reviews: { name: string; rating: number; body: string; source?: string }[] }>(
          `/api/food/venues/${venue.id}/reviews/`,
          { auth: false },
        ),
    })),
  })

  const providerReviews = useMemo(() => {
    const rows: { id: string; guest: string; venue: string; rating: number; body: string }[] = []
    venues.forEach((venue, index) => {
      const payload = reviewQueries[index]?.data
      for (const review of payload?.reviews ?? []) {
        if (review.source === 'traveler') {
          rows.push({
            id: `${venue.id}-${review.name}`,
            guest: review.name,
            venue: venue.name,
            rating: review.rating,
            body: review.body,
          })
        }
      }
    })
    return rows
  }, [venues, reviewQueries])

  const stats = useMemo(() => {
    const avgRating = venues.length
      ? (
          venues.reduce((sum, v) => sum + (parseFloat(v.rating_avg ?? '0') || 0), 0) / venues.length
        ).toFixed(2)
      : '—'
    const totalReviews = venues.reduce((sum, v) => sum + (v.rating_count ?? 0), 0)
    const missingPhotos = venues.filter((v) => !v.cover_image && !v.photos?.length).length
    return { avgRating, totalReviews, missingPhotos }
  }, [venues])

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <div className="prov-cat-page">
        <ProviderAccessGate />
      </div>
    )
  }

  function openCreate() {
    setFormError('')
    setShowCreateShell(true)
  }

  function openEdit(venue: ProviderFoodVenue) {
    navigate(`/provider/food/${venue.id}`)
  }

  return (
    <div className="prov-cat-page">
      <ProviderCategoryStrip
        title="Food & drink"
        subtitle={
          isViewerOnly
            ? 'View your venues and guest feedback.'
            : 'Manage venues, hours, photos, and what travellers see on DELVE.'
        }
        publicTo="/food"
        attention={[
          ...(canManageListings && stats.missingPhotos > 0
            ? [{ label: `${stats.missingPhotos} venue${stats.missingPhotos === 1 ? '' : 's'} missing photos`, actionLabel: 'Add photos', actionTo: '#venues', priority: 'high' as const }]
            : []),
        ]}
        quickActions={[
          ...(canManageListings
            ? [{ label: 'Add venue', to: '#venues', Icon: Plus }]
            : []),
          { label: 'Answer questions', to: '/provider/questions', Icon: MessageCircle },
        ]}
      />

      <div className="adm-bar adm-bar--compact">
        <Link to="/provider" className="up__back" aria-label="Back to dashboard">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h2 className="adm-bar__title">Food venues</h2>
          <p className="adm-bar__sub">Restaurant, café, and bar listings</p>
        </div>
        {canManageListings ? (
          <button type="button" className="btn btn-primary btn-sm transport-admin__add" onClick={openCreate}>
            <Plus size={16} aria-hidden /> Add venue
          </button>
        ) : null}
      </div>

      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat__n">{venues.length}</span>
          <span className="adm-stat__l">Venues</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n adm-stat__n--icon">
            <Star size={16} strokeWidth={2.25} aria-hidden />
            {stats.avgRating}
          </span>
          <span className="adm-stat__l">Avg rating</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">{stats.totalReviews}</span>
          <span className="adm-stat__l">Reviews</span>
        </div>
      </div>

      <FoodMonetizationSection enabled={canAccessProvider} canManage={canManageListings} />

      <div className="adm-tabs" role="tablist">
        {(
          [
            { id: 'venues' as const, label: 'Venues', Icon: Store },
            { id: 'reservations' as const, label: 'Reservations', Icon: CalendarDays },
            { id: 'reviews' as const, label: 'Reviews', Icon: Star },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`adm-tab${tab === id ? ' adm-tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={16} strokeWidth={2.25} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === 'venues' && (
        <div className="adm-section" id="venues">
          {isLoading ? <ListSkeleton count={3} /> : null}
          {!isLoading && venues.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No food venues yet</p>
              <p className="adm-empty__sub">Add your restaurant, café, bar, or food spot so travellers can discover it.</p>
              {canManageListings ? (
                <button type="button" className="btn btn-primary" onClick={openCreate}>Add your first venue</button>
              ) : null}
            </div>
          ) : null}
          {!isLoading && venues.length > 0 ? (
            <div className="adm-list">
              {venues.map((venue) => (
                <FoodVenueCard
                  key={venue.id}
                  venue={venue}
                  onEdit={() => openEdit(venue)}
                  canManage={canManageListings}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {tab === 'reservations' && (
        <div className="adm-section" id="reservations">
          {!canManageBookings ? (
            <p className="adm-empty__sub">Your role can view reservations but not manage them.</p>
          ) : null}
          <div className="adm-tabs adm-tabs--sub" role="tablist" aria-label="Filter reservations">
            {RESERVATION_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`adm-tab adm-tab--sm${reservationFilter === f.id ? ' adm-tab--active' : ''}`}
                onClick={() => setReservationFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {loadingReservations ? <ListSkeleton count={2} /> : null}
          {!loadingReservations && reservations.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No reservations yet</p>
              <p className="adm-empty__sub">
                Table requests from travellers appear here when your venues accept reservations on DELVE.
              </p>
            </div>
          ) : null}
          {!loadingReservations && reservations.length > 0 ? (
            <div className="adm-list">
              {reservations.map((r) => (
                <div key={r.id} className="adm-review-card">
                  <div className="adm-review-card__header">
                    <p className="adm-review-card__guest">
                      {r.guest_display_name?.trim() || r.guest_username} · {r.party_size}{' '}
                      {r.party_size === 1 ? 'guest' : 'guests'}
                    </p>
                    <p className="adm-review-card__listing">
                      {r.venue_name} · {formatReservationWhen(r.reserved_for)}
                    </p>
                  </div>
                  {r.special_requests?.trim() ? (
                    <p className="adm-review-card__body">{r.special_requests.trim()}</p>
                  ) : null}
                  <p className="adm-review-card__meta">
                    Status: <strong>{bookingStatusLabel(r.status)}</strong>
                  </p>
                  {canManageBookings ? (
                    <div className="adm-review-card__actions">
                      {(RESERVATION_ACTIONS[r.status] ?? []).map((a) => (
                        <button
                          key={a.action}
                          type="button"
                          className="btn btn-sm btn-ghost"
                          disabled={reservationActionMut.isPending}
                          onClick={() => reservationActionMut.mutate({ id: r.id, action: a.action })}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="adm-section">
          {providerReviews.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No traveller reviews yet</p>
              <p className="adm-empty__sub">Guest ratings appear here after verified travellers review your venues.</p>
            </div>
          ) : (
            <div className="adm-list">
              {providerReviews.map((r) => (
                <div key={r.id} className="adm-review-card">
                  <div className="adm-review-card__header">
                    <p className="adm-review-card__guest">{r.guest}</p>
                    <p className="adm-review-card__listing">{r.venue}</p>
                  </div>
                  <p className="adm-review-card__body">{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateShell && canManageListings ? (
        <FoodVenueCreateShell
          onClose={() => setShowCreateShell(false)}
          onCreated={(venue) => {
            setShowCreateShell(false)
            void qc.invalidateQueries({ queryKey: ['provider-food-venues'] })
            navigate(`/provider/food/${venue.id}`)
          }}
        />
      ) : null}
    </div>
  )
}
