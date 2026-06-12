import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderCategoryStrip } from '../components/provider'
import { ListSkeleton } from '../components/ui'

type StayListing = {
  id: number
  title: string
  description: string
  region: string
  city: string
  price_per_night: string
  max_guests: number
  bedrooms: number
  property_type: string
  amenities: string[]
  cover_image: string | null
  rating_avg: string
  rating_count: number
  is_active: boolean
  guest_reviews?: { name: string; body: string; rating: number }[]
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
}

const EMPTY_FORM = {
  title: '',
  description: '',
  region: '',
  city: '',
  price_per_night: '',
  max_guests: 2,
  bedrooms: 1,
  property_type: 'guesthouse',
  is_active: true,
}

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
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { canManageListings, canManageBookings, isViewerOnly } = useBusinessAccess()

  const [tab, setTab] = useState<'listings' | 'bookings' | 'reviews'>('listings')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState('')

  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['provider-stays'],
    queryFn: () => apiFetch<StayListing[]>('/api/accommodation/provider-listings/'),
    enabled: Boolean(profile?.user_type === 'service_provider'),
  })

  const bookingsUrl =
    statusFilter === 'all'
      ? '/api/accommodation/provider-bookings/'
      : `/api/accommodation/provider-bookings/?status=${statusFilter}`

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['provider-stay-bookings', statusFilter],
    queryFn: () => apiFetch<ProviderBooking[]>(bookingsUrl),
    enabled: Boolean(profile?.user_type === 'service_provider'),
  })

  const reviews = useMemo(
    () =>
      listings.flatMap((l) =>
        (l.guest_reviews ?? []).map((r, i) => ({
          id: `${l.id}-${i}`,
          listing: l.title,
          guest: r.name,
          rating: r.rating,
          body: r.body,
        }))
      ),
    [listings]
  )

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        price_per_night: form.price_per_night,
        max_guests: Number(form.max_guests),
        bedrooms: Number(form.bedrooms),
        amenities: [],
      }
      if (editId) {
        return apiFetch<StayListing>(`/api/accommodation/provider-listings/${editId}/`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }
      return apiFetch<StayListing>('/api/accommodation/provider-listings/', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-stays'] })
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      setFormErr('')
    },
    onError: (e: Error) => setFormErr(friendlyApiMessage(e)),
  })

  const bookingActionMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      apiFetch<ProviderBooking>(`/api/accommodation/provider-bookings/${id}/${action}/`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['provider-stay-bookings'] }),
  })

  if (!profile) return <Navigate to="/login" replace />
  if (profile.user_type !== 'service_provider') return <Navigate to="/" replace />

  const avgRating = listings.length
    ? (listings.reduce((s, x) => s + parseFloat(x.rating_avg), 0) / listings.length).toFixed(2)
    : '—'
  const revenue = bookings
    .filter((b) => ['confirmed', 'checked_in', 'checked_out'].includes(b.status))
    .reduce((s, b) => s + parseFloat(b.total_price), 0)

  const pendingBookings = bookings.filter((b) => b.status === 'pending').length
  const missingPhotos = listings.filter((l) => !l.cover_image).length

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setFormErr('')
  }

  const openEdit = (stay: StayListing) => {
    setEditId(stay.id)
    setForm({
      title: stay.title,
      description: stay.description,
      region: stay.region,
      city: stay.city,
      price_per_night: stay.price_per_night,
      max_guests: stay.max_guests,
      bedrooms: stay.bedrooms,
      property_type: stay.property_type,
      is_active: stay.is_active,
    })
    setShowForm(true)
    setFormErr('')
  }

  return (
    <div className="prov-cat-page">
      <ProviderCategoryStrip
        title="Stays"
        subtitle="Manage properties, rooms, pricing, availability, and guest bookings."
        publicTo="/accommodation"
        attention={[
          ...(missingPhotos > 0
            ? [{ label: `${missingPhotos} propert${missingPhotos === 1 ? 'y' : 'ies'} missing cover photos`, actionLabel: 'Add photos', actionTo: '#listings', priority: 'high' as const }]
            : []),
          ...(pendingBookings > 0
            ? [{ label: `${pendingBookings} booking request${pendingBookings === 1 ? '' : 's'} pending`, actionLabel: 'Review bookings', actionTo: '#bookings', priority: 'high' as const }]
            : []),
          { label: 'Update availability for this weekend', actionLabel: 'Update availability', actionTo: '#listings', priority: 'medium' as const },
        ]}
        quickActions={[
          { label: 'Add property', to: '#listings', emoji: '＋' },
          { label: 'Manage bookings', to: '#bookings', emoji: '📅' },
          { label: 'Reply to messages', to: '/messages', emoji: '💬' },
        ]}
      />

      <div className="adm-bar adm-bar--compact">
        <Link to="/provider" className="up__back" aria-label="Back to provider overview">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h2 className="adm-bar__title">Properties &amp; bookings</h2>
          <p className="adm-bar__sub">
            {isViewerOnly ? 'View-only access' : 'Edit listings, confirm bookings, and respond to reviews'}
          </p>
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat__n">{listings.length}</span>
          <span className="adm-stat__l">Listings</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">⭐ {avgRating}</span>
          <span className="adm-stat__l">Avg rating</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">{bookings.length || '—'}</span>
          <span className="adm-stat__l">Bookings</span>
        </div>
        <div className="adm-stat adm-stat--accent">
          <span className="adm-stat__n">N${revenue.toLocaleString()}</span>
          <span className="adm-stat__l">Revenue</span>
        </div>
      </div>

      <div className="adm-tabs" role="tablist">
        {(['listings', 'bookings', 'reviews'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`adm-tab${tab === t ? ' adm-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'listings' ? '🏘 Listings' : t === 'bookings' ? '📅 Bookings' : '⭐ Reviews'}
          </button>
        ))}
      </div>

      {tab === 'listings' && (
        <div className="adm-section" id="listings">
          {loadingListings ? (
            <ListSkeleton count={3} variant="row" />
          ) : listings.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No stays added yet</p>
              <p className="adm-empty__sub">Add your first property so travellers can discover and book it.</p>
            </div>
          ) : (
            <div className="adm-list">
              {listings.map((stay) => (
                <div key={stay.id} className="adm-listing-card">
                  <div className="adm-listing-card__img">
                    {stay.cover_image ? (
                      <img src={mediaUrl(stay.cover_image) || stay.cover_image} alt="" />
                    ) : (
                      <span aria-hidden>🏨</span>
                    )}
                  </div>
                  <div className="adm-listing-card__body">
                    <div className="adm-listing-card__title-row">
                      <p className="adm-listing-card__title">{stay.title}</p>
                      <span className={`adm-badge ${stay.is_active ? 'adm-badge--green' : 'adm-badge--grey'}`}>
                        {stay.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <p className="adm-listing-card__meta">
                      {stay.city}, {stay.region} · N${stay.price_per_night}/night · {stay.max_guests} guests
                    </p>
                    <p className="adm-listing-card__rating">
                      ⭐ {stay.rating_avg} ({stay.rating_count} reviews)
                    </p>
                  </div>
                  <div className="adm-listing-card__actions">
                    <Link to={`/accommodation/${stay.id}`} className="btn btn-ghost adm-action-btn">
                      View
                    </Link>
                    {canManageListings ? (
                      <button type="button" className="btn btn-ghost adm-action-btn" onClick={() => openEdit(stay)}>
                        Edit
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          {canManageListings ? (
            <button type="button" className="adm-add-btn" onClick={openCreate}>
              + Add new listing
            </button>
          ) : null}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="adm-section" id="bookings">
          {!canManageBookings ? (
            <p className="adm-section__hint">Your role can view the stays module but not manage bookings.</p>
          ) : null}
          <div className="adm-filter-row">
            {['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((f) => (
              <button
                key={f}
                type="button"
                className={`acc-quick-chip${statusFilter === f ? ' acc-quick-chip--active' : ''}`}
                onClick={() => setStatusFilter(f)}
              >
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </button>
            ))}
          </div>
          {loadingBookings ? (
            <p>Loading bookings…</p>
          ) : bookings.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No bookings found</p>
            </div>
          ) : (
            <div className="adm-list">
              {bookings.map((b) => (
                <div key={b.id} className="adm-booking-row">
                  <div className="adm-booking-row__info">
                    <p className="adm-booking-row__guest">{b.guest_display_name}</p>
                    <p className="adm-booking-row__listing">{b.listing_title}</p>
                    <p className="adm-booking-row__dates">
                      {b.check_in} → {b.check_out} · {nightsBetween(b.check_in, b.check_out)} nights · {b.guests}{' '}
                      guests
                    </p>
                  </div>
                  <div className="adm-booking-row__right">
                    <p className="adm-booking-row__total">N${parseFloat(b.total_price).toLocaleString()}</p>
                    <span className={`adm-badge adm-badge--${b.status === 'pending' ? 'yellow' : 'green'}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                    {canManageBookings
                      ? (STATUS_ACTIONS[b.status] ?? []).map((a) => (
                          <button
                            key={a.action}
                            type="button"
                            className="btn btn-ghost adm-action-btn"
                            disabled={bookingActionMut.isPending}
                            onClick={() => bookingActionMut.mutate({ id: b.id, action: a.action })}
                          >
                            {a.label}
                          </button>
                        ))
                      : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="adm-section">
          {reviews.length === 0 ? (
            <div className="adm-empty">
              <p className="adm-empty__title">No reviews yet</p>
            </div>
          ) : (
            <div className="adm-list">
              {reviews.map((r) => (
                <div key={r.id} className="adm-review-card">
                  <div className="adm-review-card__header">
                    <p className="adm-review-card__guest">{r.guest}</p>
                    <span className="adm-review-card__stars">★ {r.rating}</span>
                    <p className="adm-review-card__listing">{r.listing}</p>
                  </div>
                  <p className="adm-review-card__body">{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && canManageListings ? (
        <div className="adm-modal" role="dialog" aria-modal="true">
          <div className="adm-modal__card">
            <h2>{editId ? 'Edit listing' : 'New listing'}</h2>
            {formErr ? <p className="error-banner" role="alert">{formErr}</p> : null}
            <label>
              Title
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="adm-modal__row">
              <label>
                City
                <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </label>
              <label>
                Region
                <input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
              </label>
            </div>
            <div className="adm-modal__row">
              <label>
                Price / night (N$)
                <input
                  value={form.price_per_night}
                  onChange={(e) => setForm((f) => ({ ...f, price_per_night: e.target.value }))}
                />
              </label>
              <label>
                Max guests
                <input
                  type="number"
                  min={1}
                  value={form.max_guests}
                  onChange={(e) => setForm((f) => ({ ...f, max_guests: Number(e.target.value) }))}
                />
              </label>
            </div>
            <label className="adm-modal__check">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Listing active (visible to guests)
            </label>
            <div className="adm-modal__actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saveMut.isPending || !form.title || !form.region || !form.price_per_night}
                onClick={() => saveMut.mutate()}
              >
                {saveMut.isPending ? 'Saving…' : 'Save listing'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
