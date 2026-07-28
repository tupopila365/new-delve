import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { useDisplayMoney } from '../hooks/useDisplayMoney'
import { ProviderAccessGate } from '../components/provider'
import {
  stayListingToForm,
  type ProviderStayListing,
  type StayRoomForm,
} from '../components/provider/stays'
import { ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'
import { friendlyApiMessage } from '../utils/friendlyError'
import '../components/provider/stays/stay-listing.css'

type AvailabilityOverride = {
  id: number
  listing: number
  room_type: number | null
  room_type_name: string
  date: string
  is_available: boolean
  quantity_available: number | null
  price_override: string | null
  note: string
}

type ProviderBooking = {
  id: number
  listing?: number
  listing_title: string
  room_type?: number | null
  room_type_name?: string
  check_in: string
  check_out: string
  status: string
}

type CalendarDay = {
  iso: string
  date: Date
  inMonth: boolean
  isToday: boolean
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const fullDateLabel = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function parseIso(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function calendarDays(month: Date): CalendarDay[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const start = addDays(first, -mondayOffset)
  const today = isoDate(new Date())
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index)
    return {
      iso: isoDate(date),
      date,
      inMonth: date.getMonth() === month.getMonth(),
      isToday: isoDate(date) === today,
    }
  })
}

function isBookedOn(booking: ProviderBooking, date: string) {
  return booking.check_in <= date && date < booking.check_out
}

function roomId(room: StayRoomForm) {
  return typeof room.id === 'number' ? room.id : null
}

export function StayAvailabilityPage() {
  const { listingId: rawListingId } = useParams()
  const listingId = Number(rawListingId)
  const qc = useQueryClient()
  const { format } = useDisplayMoney()
  const { profile } = useAuth()
  const { activeBusiness, canManageListings, canAccessProvider } = useBusinessAccess()
  const today = isoDate(new Date())
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [date, setDate] = useState(today)
  const [roomType, setRoomType] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState('')

  const { data: listing, isLoading: loadingListing } = useQuery({
    queryKey: ['provider-stay', listingId],
    queryFn: () =>
      apiFetch<ProviderStayListing>(`/api/accommodation/provider-listings/${listingId}/`),
    enabled: Boolean(profile && canAccessProvider && listingId),
  })

  const gridDays = useMemo(() => calendarDays(visibleMonth), [visibleMonth])
  const rangeStart = gridDays[0]?.iso ?? today
  const rangeEnd = gridDays[gridDays.length - 1]?.iso ?? today

  const { data: overrides = [], isLoading: loadingOverrides } = useQuery({
    queryKey: ['provider-stay-calendar', listingId, rangeStart, rangeEnd],
    queryFn: () =>
      apiFetch<AvailabilityOverride[]>(
        `/api/accommodation/provider-listings/${listingId}/calendar/?date_from=${rangeStart}&date_to=${rangeEnd}`,
      ),
    enabled: Boolean(profile && canAccessProvider && listingId),
  })

  const bookingQuery = activeBusiness?.id ? `?business=${activeBusiness.id}` : ''
  const { data: providerBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['provider-stay-bookings', 'calendar', activeBusiness?.id ?? 'all'],
    queryFn: async () =>
      asArray<ProviderBooking>(
        await apiFetch(`/api/accommodation/provider-bookings/${bookingQuery}`),
      ),
    enabled: Boolean(profile && canAccessProvider && listingId),
  })

  const rooms = useMemo(
    () => (listing ? stayListingToForm(listing).room_types.filter((room) => room.is_active) : []),
    [listing],
  )
  const selectedRoomId = roomType ? Number(roomType) : null
  const selectedRoom = rooms.find((room) => roomId(room) === selectedRoomId) ?? null
  const selectedOverride = overrides.find(
    (row) => row.date === date && (row.room_type ?? null) === selectedRoomId,
  )

  useEffect(() => {
    setIsAvailable(selectedOverride?.is_available ?? true)
    setQuantity(
      selectedOverride?.quantity_available == null
        ? ''
        : String(selectedOverride.quantity_available),
    )
    setPrice(selectedOverride?.price_override ?? '')
    setNote(selectedOverride?.note ?? '')
    setError('')
  }, [date, selectedOverride?.id, selectedOverride?.is_available, selectedOverride?.quantity_available, selectedOverride?.price_override, selectedOverride?.note])

  const bookings = useMemo(
    () =>
      providerBookings.filter(
        (booking) =>
          (booking.listing === listingId ||
            (!booking.listing && booking.listing_title === listing?.title)) &&
          !['cancelled', 'expired', 'refunded'].includes(booking.status),
      ),
    [listing?.title, listingId, providerBookings],
  )

  const dayInventory = useMemo(() => {
    const byDate = new Map<
      string,
      {
        booked: number
        capacity: number
        available: number
        price: string
        closed: boolean
        hasOverride: boolean
      }
    >()
    const roomCapacity = rooms.reduce(
      (sum, room) => sum + Math.max(0, Number(room.quantity_available || 0)),
      0,
    )
    const baseCapacity = selectedRoom
      ? Math.max(0, Number(selectedRoom.quantity_available || 0))
      : roomCapacity || 1
    const basePrice = selectedRoom?.price_per_night || listing?.price_per_night || '0'

    for (const day of gridDays) {
      const propertyOverride = overrides.find(
        (row) => row.date === day.iso && row.room_type == null,
      )
      const roomOverride = selectedRoomId
        ? overrides.find(
            (row) => row.date === day.iso && row.room_type === selectedRoomId,
          )
        : undefined
      const effectiveOverride = roomOverride ?? propertyOverride
      const closed =
        propertyOverride?.is_available === false || roomOverride?.is_available === false
      const overrideQuantity = selectedRoomId
        ? roomOverride?.quantity_available
        : propertyOverride?.quantity_available
      const capacity = closed
        ? 0
        : overrideQuantity == null
          ? baseCapacity
          : Math.max(0, Number(overrideQuantity))
      const booked = bookings.filter(
        (booking) =>
          isBookedOn(booking, day.iso) &&
          (selectedRoomId == null || booking.room_type === selectedRoomId),
      ).length

      byDate.set(day.iso, {
        booked,
        capacity,
        available: Math.max(0, capacity - booked),
        price: effectiveOverride?.price_override || basePrice,
        closed,
        hasOverride: Boolean(propertyOverride || roomOverride),
      })
    }
    return byDate
  }, [bookings, gridDays, listing?.price_per_night, overrides, rooms, selectedRoom, selectedRoomId])

  const saveMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<AvailabilityOverride | null>(
        `/api/accommodation/provider-listings/${listingId}/calendar/`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async () => {
      setError('')
      setSavedFlash('Calendar updated')
      window.setTimeout(() => setSavedFlash(''), 2200)
      await qc.invalidateQueries({ queryKey: ['provider-stay-calendar', listingId] })
      await qc.invalidateQueries({ queryKey: ['stay-provider-analytics'] })
    },
    onError: (reason: Error) => setError(friendlyApiMessage(reason)),
  })

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }
  if (!listingId || Number.isNaN(listingId)) return <Navigate to="/provider/stays" replace />

  const selectedInventory = dayInventory.get(date)
  const selectedIsPast = date < today

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Availability & pricing"
        subtitle={
          listing
            ? `${listing.title} — review occupancy and tune inventory one date at a time.`
            : 'Manage property and room inventory by date.'
        }
        actions={
          <>
            <Link to="/provider/stays" className="prov-ui__btn prov-ui__btn--ghost">
              Stays
            </Link>
            <Link to={`/provider/stays/${listingId}/rooms`} className="prov-ui__btn prov-ui__btn--ghost">
              Rooms
            </Link>
          </>
        }
      />

      {loadingListing ? <p className="stay-hint">Loading property…</p> : null}

      <div className="stay-calendar-workspace">
        <section className="stay-month prov-ui__card" aria-labelledby="stay-month-title">
          <header className="stay-month__head">
            <div>
              <span className="stay-month__eyebrow">Inventory calendar</span>
              <h2 id="stay-month-title">{monthLabel.format(visibleMonth)}</h2>
            </div>
            <div className="stay-month__controls">
              <button
                type="button"
                onClick={() =>
                  setVisibleMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  )
                }
                aria-label="Previous month"
              >
                <ChevronLeft size={18} strokeWidth={2.3} aria-hidden />
              </button>
              <button
                type="button"
                className="stay-month__today"
                onClick={() => {
                  const now = new Date()
                  setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                  setDate(today)
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() =>
                  setVisibleMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  )
                }
                aria-label="Next month"
              >
                <ChevronRight size={18} strokeWidth={2.3} aria-hidden />
              </button>
            </div>
          </header>

          <label className="stay-month__room-filter">
            <span>Calendar view</span>
            <select value={roomType} onChange={(event) => setRoomType(event.target.value)}>
              <option value="">Whole property</option>
              {rooms.map((room) => (
                <option key={room.id ?? room.name} value={room.id ?? ''}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>

          <div className="stay-month__weekdays" aria-hidden>
            {DAY_LABELS.map((label) => <span key={label}>{label}</span>)}
          </div>
          <div className="stay-month__grid" aria-busy={loadingOverrides || loadingBookings}>
            {gridDays.map((day) => {
              const inventory = dayInventory.get(day.iso)
              const selected = day.iso === date
              const full = Boolean(
                inventory && inventory.capacity > 0 && inventory.available === 0,
              )
              return (
                <button
                  type="button"
                  key={day.iso}
                  className={[
                    'stay-month__day',
                    !day.inMonth ? 'is-outside' : '',
                    day.isToday ? 'is-today' : '',
                    selected ? 'is-selected' : '',
                    inventory?.closed ? 'is-closed' : '',
                    full ? 'is-full' : '',
                    inventory?.hasOverride ? 'has-override' : '',
                  ].filter(Boolean).join(' ')}
                  aria-pressed={selected}
                  aria-label={`${fullDateLabel.format(day.date)}. ${
                    inventory?.closed
                      ? 'Closed.'
                      : `${inventory?.booked ?? 0} booked, ${inventory?.available ?? 0} available.`
                  } ${inventory?.price ? `${format(inventory.price)} per night.` : ''}`}
                  onClick={() => setDate(day.iso)}
                >
                  <span className="stay-month__date">{day.date.getDate()}</span>
                  <strong>{inventory?.closed ? 'Closed' : format(inventory?.price ?? 0)}</strong>
                  <small>
                    {inventory?.closed
                      ? 'Not bookable'
                      : `${inventory?.booked ?? 0} sold · ${inventory?.available ?? 0} left`}
                  </small>
                  {inventory?.hasOverride ? <i aria-label="Has override" /> : null}
                </button>
              )
            })}
          </div>
          <footer className="stay-month__legend">
            <span><i className="is-open" /> Available</span>
            <span><i className="is-full" /> Sold out</span>
            <span><i className="is-override" /> Override</span>
          </footer>
        </section>

        <aside className="stay-calendar-editor prov-ui__card" aria-labelledby="stay-editor-title">
          <header>
            <span className="stay-month__eyebrow">Selected date</span>
            <h2 id="stay-editor-title">{fullDateLabel.format(parseIso(date))}</h2>
            <p>
              {selectedRoom?.name || 'Whole property'} · {selectedInventory?.booked ?? 0} booked ·{' '}
              {selectedInventory?.available ?? 0} available
            </p>
          </header>

          {selectedIsPast ? (
            <div className="stay-calendar-editor__notice">
              <CircleAlert size={16} strokeWidth={2.25} aria-hidden />
              Past dates are shown for context and cannot be changed.
            </div>
          ) : null}
          {error ? <p className="stay-form__error">{error}</p> : null}
          {savedFlash ? <p className="stay-stories__saved" role="status">{savedFlash}</p> : null}

          {canManageListings && listing ? (
            <div className="stay-calendar-editor__form">
              <label className="stay-form__field">
                <span>Date</span>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(event) => {
                    const next = event.target.value
                    setDate(next)
                    const parsed = parseIso(next)
                    setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
                  }}
                />
              </label>
              <label className="stay-form__field">
                <span>Applies to</span>
                <select value={roomType} onChange={(event) => setRoomType(event.target.value)}>
                  <option value="">Whole property</option>
                  {rooms.map((room) => (
                    <option key={room.id ?? room.name} value={room.id ?? ''}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stay-calendar-editor__availability">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  disabled={selectedIsPast}
                  onChange={(event) => setIsAvailable(event.target.checked)}
                />
                <span>
                  <strong>{isAvailable ? 'Open for bookings' : 'Closed to bookings'}</strong>
                  <small>Toggle availability for this date and inventory level.</small>
                </span>
              </label>
              <div className="stay-form__row">
                <label className="stay-form__field">
                  <span>Quantity available</span>
                  <input
                    type="number"
                    min={0}
                    value={quantity}
                    disabled={selectedIsPast || !isAvailable}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="Normal inventory"
                  />
                </label>
                <label className="stay-form__field">
                  <span>Nightly price</span>
                  <input
                    inputMode="decimal"
                    value={price}
                    disabled={selectedIsPast || !isAvailable}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder={selectedRoom?.price_per_night || listing.price_per_night}
                  />
                </label>
              </div>
              <label className="stay-form__field">
                <span>Internal note</span>
                <textarea
                  rows={3}
                  value={note}
                  disabled={selectedIsPast}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={200}
                  placeholder="Only your team sees this note"
                />
              </label>
              <div className="stay-calendar-editor__actions">
                <button
                  type="button"
                  className="prov-ui__btn prov-ui__btn--primary"
                  disabled={saveMut.isPending || selectedIsPast || !date}
                  onClick={() =>
                    saveMut.mutate({
                      date,
                      room_type: selectedRoomId,
                      is_available: isAvailable,
                      quantity_available: quantity === '' ? null : Number(quantity),
                      price_override: price.trim() || null,
                      note: note.trim(),
                    })
                  }
                >
                  {saveMut.isPending ? 'Saving…' : 'Save date'}
                </button>
                <button
                  type="button"
                  className="prov-ui__btn prov-ui__btn--ghost"
                  disabled={saveMut.isPending || selectedIsPast || !selectedOverride}
                  onClick={() =>
                    saveMut.mutate({
                      date,
                      room_type: selectedRoomId,
                      reset: true,
                    })
                  }
                >
                  Reset to base
                </button>
              </div>
              {!selectedOverride ? (
                <p className="stay-calendar-editor__base-note">
                  Saving creates a date override. Until then, your standard inventory and pricing apply.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="stay-calendar-editor__base-note">
              You have view-only access to this calendar.
            </p>
          )}
        </aside>
      </div>

      {listing && rooms.length === 0 ? (
        <div className="stay-calendar-no-rooms">
          <CalendarDays size={18} strokeWidth={2} aria-hidden />
          Property-level controls are available now. Add room types for room-by-room inventory.
        </div>
      ) : null}
    </ProviderUiPage>
  )
}
