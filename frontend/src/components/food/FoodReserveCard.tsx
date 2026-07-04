import { Link } from 'react-router-dom'
import { CalendarDays, Users, Utensils } from 'lucide-react'
import { BookingDateFields, UserBookingErrorState } from '../booking'
import { MessageProviderLink } from '../messages'
import type { MyFoodReservation } from '../../hooks/useMyFoodReservations'
import type { FoodVenueListing } from '../../utils/foodListing'
import '../booking/transport/transport-booking.css'

type Props = {
  venue: FoodVenueListing
  date: string
  time: string
  partySize: number
  notes: string
  onDateChange: (v: string) => void
  onTimeChange: (v: string) => void
  onPartySizeChange: (v: number) => void
  onNotesChange: (v: string) => void
  onReserve: () => void
  isPending: boolean
  err: string | null
  onDismissErr: () => void
  profile: { email_verified: boolean } | null
  reservation: MyFoodReservation | null
  className?: string
}

function formatReservedFor(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-NA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function FoodReservationStatus({ reservation }: { reservation: MyFoodReservation }) {
  const status = reservation.status
  if (status === 'cancelled' || status === 'refunded') return null

  const confirmed = status === 'confirmed' || status === 'checked_in' || status === 'checked_out'

  return (
    <section className="detail-section tp-transport-status acc-detail__section">
      <Utensils
        className={`tp-transport-status__icon${confirmed ? '' : ' tp-transport-status__icon--pending'}`}
        size={40}
        strokeWidth={2}
        aria-hidden
      />
      <h2 className="tp-transport-status__title">
        {status === 'pending' ? 'Table request sent' : confirmed ? 'Reservation confirmed' : 'Reservation update'}
      </h2>
      <span
        className={`tp-transport-status__badge${confirmed ? ' tp-transport-status__badge--confirmed' : ''}`}
      >
        {status === 'pending' ? 'Awaiting venue' : status.replace(/_/g, ' ')}
      </span>
      <p className="tp-transport-status__text">
        {formatReservedFor(reservation.reserved_for)} · {reservation.party_size}{' '}
        {reservation.party_size === 1 ? 'guest' : 'guests'}
      </p>
      <div className="tp-transport-status__actions">
        <Link to={`/dashboard/bookings/food/${reservation.id}`} className="btn btn-primary btn-block">
          View reservation
        </Link>
        <MessageProviderLink
          username={reservation.owner_username}
          label="Message venue"
          role="host"
          variant="ghost"
          size="block"
          place={{
            type: 'booking_food',
            id: reservation.id,
            label: reservation.venue_name,
          }}
        />
      </div>
    </section>
  )
}

export function FoodReserveCard({
  venue,
  date,
  time,
  partySize,
  notes,
  onDateChange,
  onTimeChange,
  onPartySizeChange,
  onNotesChange,
  onReserve,
  isPending,
  err,
  onDismissErr,
  profile,
  reservation,
  className = '',
}: Props) {
  if (reservation && !['cancelled', 'refunded'].includes(reservation.status)) {
    return <FoodReservationStatus reservation={reservation} />
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const authHint = !profile
    ? 'Sign in to request a table.'
    : !profile.email_verified
      ? 'Verify your email to request a table.'
      : null

  return (
    <div className={`rental-reserve ${className}`.trim()} id="food-reserve-panel">
      <p className="rental-reserve__kicker">Request a table</p>

      <div className="rental-reserve__head">
        <p className="rental-reserve__price">
          {venue.name}
          <small> · table reservation</small>
        </p>
        <span className="rental-reserve__type">
          <Utensils size={14} strokeWidth={2.25} aria-hidden />
          Dine in
        </span>
      </div>

      {authHint ? <p className="rental-reserve__hint">{authHint}</p> : null}

      <BookingDateFields
        mode="single"
        date={{
          id: 'food-reserve-date',
          label: 'Date',
          value: date,
          onChange: onDateChange,
          min: todayStr,
        }}
        time={{
          id: 'food-reserve-time',
          label: 'Time',
          value: time,
          onChange: onTimeChange,
        }}
      />

      <div className="field">
        <label className="label bk-dates__label" htmlFor="food-party-size">
          <Users size={14} strokeWidth={2.25} aria-hidden />
          Party size
        </label>
        <input
          id="food-party-size"
          className="input"
          type="number"
          min={1}
          max={20}
          value={partySize}
          onChange={(e) => onPartySizeChange(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="food-reserve-notes">
          Special requests <span className="label__optional">(optional)</span>
        </label>
        <textarea
          id="food-reserve-notes"
          className="input"
          rows={3}
          value={notes}
          placeholder="Dietary needs, seating preference, celebration…"
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      {err ? <UserBookingErrorState message={err} onDismiss={onDismissErr} /> : null}

      <button
        type="button"
        className="btn btn-primary btn-block rental-reserve__cta"
        disabled={isPending || Boolean(authHint)}
        onClick={onReserve}
      >
        {isPending ? 'Sending request…' : 'Request table'}
      </button>

      <p className="rental-reserve__fine">
        <CalendarDays size={13} strokeWidth={2.25} aria-hidden />
        The venue will confirm availability. No payment on DELVE yet.
      </p>

      <MessageProviderLink
        username={venue.owner_username}
        label="Message venue instead"
        role="host"
        variant="ghost"
        size="block"
        place={{ type: 'food', id: venue.id, label: venue.name }}
      />
    </div>
  )
}
