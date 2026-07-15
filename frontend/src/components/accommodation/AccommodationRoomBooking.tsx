import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import {
  BookingDateFields,
  BookingGuestSelector,
  buildBookingSearchParams,
  nightsBetween,
  todayIsoDate,
} from '../booking'
import type { ListingRoomOption } from '../listing/types'
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
  const { profile } = useAuth()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [err, setErr] = useState<string | null>(null)

  const maxGuests =
    room.maxGuests != null ? Math.min(maxListingGuests, room.maxGuests) : maxListingGuests
  const pricing = useMemo(() => roomPricing(room), [room])
  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut])
  const today = todayIsoDate()

  const total = useMemo(() => {
    if (!nights || pricing.price == null) return null
    return (pricing.price * nights).toFixed(2)
  }, [nights, pricing.price])

  const validate = (): boolean => {
    setErr(null)
    if (!checkIn) {
      setErr('Select a check-in date.')
      return false
    }
    if (!checkOut) {
      setErr('Select a check-out date.')
      return false
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setErr('Check-out must be after check-in.')
      return false
    }
    if (guests < 1 || guests > maxGuests) {
      setErr(`This room fits up to ${maxGuests} guests.`)
      return false
    }
    return true
  }

  const bookHref = `/accommodation/${listingId}/book${buildBookingSearchParams({
    room: room.name,
    checkIn,
    checkOut,
    guests,
  })}`

  const ctaLabel = total ? 'Reserve' : 'Check availability'

  return (
    <div className={`acc-room-booking ${className}`.trim()}>
      <p className="acc-room-booking__kicker">Request this room</p>

      <div className="acc-room-booking__price-block">
        {pricing.badge ? <span className="acc-room-booking__badge">{pricing.badge}</span> : null}
        <div className="acc-room-booking__price-row">
          {pricing.onSale && pricing.compareAt != null ? (
            <span className="acc-room-booking__was">N${pricing.compareAt}</span>
          ) : null}
          {pricing.price != null ? (
            <>
              <span className="acc-room-booking__now">N${pricing.price}</span>
              <span className="acc-room-booking__unit">/ night</span>
            </>
          ) : null}
        </div>
        {total ? (
          <div className="acc-room-booking__fees">
            <div className="acc-room-booking__fee-row">
              <span>
                N${pricing.price} × {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
              <span>N${total}</span>
            </div>
            <div className="acc-room-booking__fee-row acc-room-booking__fee-row--total">
              <span>Stay total</span>
              <strong>N${total}</strong>
            </div>
          </div>
        ) : (
          <p className="acc-room-booking__hint">Select dates to see your nightly total</p>
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

      {err ? (
        <p className="acc-room-booking__error" role="alert">
          {err}
        </p>
      ) : null}

      {profile && profile.email_verified ? (
        <Link
          to={bookHref}
          className="btn btn-primary btn-block acc-room-booking__cta"
          onClick={(e) => {
            if (!validate()) e.preventDefault()
          }}
        >
          {ctaLabel}
        </Link>
      ) : (
        <Link
          to={profile ? '/verify-email' : '/login'}
          className="btn btn-primary btn-block acc-room-booking__cta"
        >
          {profile ? 'Verify email to reserve' : 'Sign in to reserve'}
        </Link>
      )}

      <p className="acc-room-booking__note">
        You won&apos;t be charged yet — {listingTitle} confirms availability first.
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
