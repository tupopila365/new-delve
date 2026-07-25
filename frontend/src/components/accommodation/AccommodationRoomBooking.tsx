import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, CheckCircle2, Loader2, Users, XCircle } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import {
  BookingDateFields,
  BookingGuestSelector,
  buildBookingSearchParams,
  checkStayAvailability,
  nightsBetween,
  todayIsoDate,
  type AvailabilityStatus,
} from '../booking'
import type { ListingRoomOption } from '../listing/types'
import { loginHrefWithReturn } from '../../utils/authRedirect'
import { useDisplayMoney } from '../../hooks/useDisplayMoney'
import './accommodation-room.css'

type Props = {
  room: ListingRoomOption
  listingId: string
  listingTitle: string
  maxListingGuests: number
  className?: string
}

function parsePrice(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = parseFloat(String(raw))
  return Number.isNaN(n) ? null : n
}

function roomPricing(room: ListingRoomOption) {
  const price = parsePrice(room.pricePerNight) ?? parsePrice(room.fallbackPrice)
  const compareAt = parsePrice(room.compareAtPrice)
  const onSale = compareAt != null && price != null && compareAt > price + 0.001
  const discountPct =
    onSale && compareAt && price ? Math.round((1 - price / compareAt) * 100) : null
  const badge =
    room.badge?.trim() || (onSale && discountPct ? `${discountPct}% off` : room.featured ? 'Special' : null)
  return { price, compareAt, onSale, discountPct, badge }
}

export function AccommodationRoomBooking({
  room,
  listingId,
  listingTitle,
  maxListingGuests,
  className = '',
}: Props) {
  const { format } = useDisplayMoney()
  const { profile } = useAuth()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [err, setErr] = useState<string | null>(null)
  const [availStatus, setAvailStatus] = useState<AvailabilityStatus>('idle')
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [apiTotal, setApiTotal] = useState<string | null>(null)

  const maxGuests =
    room.maxGuests != null ? Math.min(maxListingGuests, room.maxGuests) : maxListingGuests
  const pricing = useMemo(() => roomPricing(room), [room])
  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut])
  const today = todayIsoDate()

  const localTotal = useMemo(() => {
    if (!nights || pricing.price == null) return null
    return (pricing.price * nights).toFixed(2)
  }, [nights, pricing.price])

  const total = apiTotal ?? localTotal
  const datesReady = Boolean(checkIn && checkOut && nights && guests >= 1)

  // Live availability whenever dates / guests change.
  useEffect(() => {
    if (!datesReady) {
      setAvailStatus('idle')
      setUnavailableReason(null)
      setApiTotal(null)
      setErr(null)
      return
    }

    let cancelled = false
    setAvailStatus('checking')
    setUnavailableReason(null)
    setErr(null)

    const t = window.setTimeout(() => {
      void checkStayAvailability({
        listingId,
        roomTypeName: room.name,
        checkIn,
        checkOut,
        guests,
        maxGuests,
      }).then((result) => {
        if (cancelled) return
        if (result.available) {
          setAvailStatus('available')
          setUnavailableReason(null)
          if (result.estimatedTotal) setApiTotal(result.estimatedTotal)
          else setApiTotal(null)
        } else {
          setAvailStatus('unavailable')
          setUnavailableReason(result.reason)
          setApiTotal(null)
        }
      })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [datesReady, listingId, room.name, checkIn, checkOut, guests, maxGuests])

  const bookHref = `/accommodation/${listingId}/book${buildBookingSearchParams({
    room: room.name,
    checkIn,
    checkOut,
    guests,
  })}`

  const canReserve = availStatus === 'available'
  const ctaLabel =
    availStatus === 'checking'
      ? 'Checking…'
      : availStatus === 'unavailable'
        ? 'Dates not available'
        : availStatus === 'available'
          ? 'Reserve'
          : 'Select dates'

  const onCtaClick = (e: MouseEvent) => {
    if (!canReserve) {
      e.preventDefault()
      if (!datesReady) setErr('Select check-in and check-out dates first.')
      else if (availStatus === 'unavailable') {
        setErr(unavailableReason || 'Those dates are not available.')
      } else if (availStatus === 'checking') {
        setErr('Still checking availability…')
      }
    }
  }

  const authHref = profile
    ? '/verify-email'
    : loginHrefWithReturn(bookHref)

  return (
    <div className={`acc-room-booking ${className}`.trim()}>
      <p className="acc-room-booking__kicker">Request this room</p>

      <div className="acc-room-booking__price-block">
        {pricing.badge ? <span className="acc-room-booking__badge">{pricing.badge}</span> : null}
        <div className="acc-room-booking__price-row">
          {pricing.onSale && pricing.compareAt != null ? (
            <span className="acc-room-booking__was">{format(pricing.compareAt)}</span>
          ) : null}
          {pricing.price != null ? (
            <>
              <span className="acc-room-booking__now">{format(pricing.price)}</span>
              <span className="acc-room-booking__unit">/ night</span>
            </>
          ) : null}
        </div>
        {total && availStatus !== 'unavailable' ? (
          <div className="acc-room-booking__fees">
            <div className="acc-room-booking__fee-row">
              <span>
                {format(pricing.price)} × {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
              <span>{format(total)}</span>
            </div>
            <div className="acc-room-booking__fee-row acc-room-booking__fee-row--total">
              <span>Stay total</span>
              <strong>{format(total)}</strong>
            </div>
          </div>
        ) : (
          <p className="acc-room-booking__hint">Select dates to check availability and see your total</p>
        )}
      </div>

      <div className="acc-room-booking__fields">
        <BookingDateFields
          className="acc-room-booking__dates"
          mode="range"
          checkIn={{
            id: `room-${listingId}-in`,
            label: 'Check-in',
            value: checkIn,
            min: today,
            onChange: setCheckIn,
          }}
          checkOut={{
            id: `room-${listingId}-out`,
            label: 'Check-out',
            value: checkOut,
            min: checkIn || today,
            onChange: setCheckOut,
          }}
        />
        <BookingGuestSelector
          id={`room-${listingId}-guests`}
          value={guests}
          min={1}
          max={maxGuests}
          onChange={setGuests}
          hint={`Max ${maxGuests} guests`}
        />
      </div>

      {availStatus === 'checking' ? (
        <div className="acc-room-booking__status acc-room-booking__status--checking" role="status">
          <Loader2 size={18} strokeWidth={2.25} className="acc-room-booking__spin" aria-hidden />
          <span>Checking if these dates are free…</span>
        </div>
      ) : null}

      {availStatus === 'available' ? (
        <div className="acc-room-booking__status acc-room-booking__status--ok" role="status">
          <CheckCircle2 size={18} strokeWidth={2.25} aria-hidden />
          <span>Available for your dates — you can reserve.</span>
        </div>
      ) : null}

      {availStatus === 'unavailable' ? (
        <div className="acc-room-booking__status acc-room-booking__status--bad" role="alert">
          <XCircle size={18} strokeWidth={2.25} aria-hidden />
          <span>{unavailableReason || 'Not available for those dates. Try different dates.'}</span>
        </div>
      ) : null}

      {err ? (
        <p className="acc-room-booking__error" role="alert">
          {err}
        </p>
      ) : null}

      {profile && profile.email_verified ? (
        <Link
          to={bookHref}
          className={`btn btn-primary btn-block acc-room-booking__cta${canReserve ? '' : ' is-disabled'}`}
          aria-disabled={!canReserve}
          onClick={onCtaClick}
        >
          {ctaLabel}
        </Link>
      ) : (
        <Link
          to={authHref}
          className={`btn btn-primary btn-block acc-room-booking__cta${canReserve || !datesReady ? '' : ' is-disabled'}`}
          aria-disabled={datesReady && !canReserve}
          onClick={(e) => {
            if (datesReady && !canReserve) {
              e.preventDefault()
              onCtaClick(e)
            }
          }}
        >
          {profile
            ? canReserve
              ? 'Verify email to reserve'
              : ctaLabel
            : canReserve
              ? 'Sign in to reserve'
              : ctaLabel}
        </Link>
      )}

      <p className="acc-room-booking__note">
        {availStatus === 'available'
          ? `Dates are open — ${listingTitle} still confirms your request before you pay.`
          : `We'll check the calendar as you pick dates. You won't be charged yet.`}
      </p>
    </div>
  )
}

export function AccommodationRoomMeta({ room }: { room: ListingRoomOption }) {
  const items: string[] = []
  if (room.maxGuests != null) items.push(`${room.maxGuests} guests`)
  if (room.bedSummary?.trim()) items.push(room.bedSummary.trim())
  else if (room.bedrooms != null)
    items.push(`${room.bedrooms} ${room.bedrooms === 1 ? 'bed' : 'beds'}`)

  if (items.length === 0) return null

  return (
    <ul className="acc-room-meta">
      {room.maxGuests != null ? (
        <li>
          <Users size={14} strokeWidth={2.25} aria-hidden />
          Up to {room.maxGuests} guests
        </li>
      ) : null}
      {room.bedSummary?.trim() || room.bedrooms != null ? (
        <li>
          <BedDouble size={14} strokeWidth={2.25} aria-hidden />
          {room.bedSummary?.trim() ||
            `${room.bedrooms} ${room.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`}
        </li>
      ) : null}
    </ul>
  )
}
