import { Link } from 'react-router-dom'
import {
  Building2,
  Bus,
  CalendarDays,
  Clock,
  MessageCircle,
} from 'lucide-react'
import { BookingGuestSelector, BookingPriceSummary, UserBookingErrorState } from '../index'
import { formatTripWhen, type BusTripListing } from '../../../utils/transportListing'
import { BusSeatPicker } from './BusSeatPicker'
import './transport-booking.css'

type Reservation = {
  id: number
  seat_number: number
  status: string
  mock_payment_ref: string
}

type GroupReserveResponse = {
  reservations: Reservation[]
  total_price: string
  seat_count: number
}

type SeatProps = {
  totalSeats: number
  taken: Set<number>
  firstSeat: number | null
  blockSeats: number[]
  blockValid: boolean
  onSelectSeat: (seat: number | null) => void
}

type Props = {
  trip: BusTripListing
  passengers: number
  seatPref: string
  onPassengersChange: (n: number) => void
  onSeatPrefChange: (v: string) => void
  onBook: () => void
  isPending: boolean
  err: string | null
  onDismissErr: () => void
  profile: { email_verified: boolean } | null
  group: GroupReserveResponse | null
  totalPrice: string | null
  seats: SeatProps
  className?: string
}

export function BusTripReserveCard({
  trip,
  passengers,
  seatPref,
  onPassengersChange,
  onSeatPrefChange,
  onBook,
  isPending,
  err,
  onDismissErr,
  profile,
  group,
  totalPrice,
  seats,
  className = '',
}: Props) {
  const firstRes = group?.reservations[0]
  if (firstRes && firstRes.status !== 'pending') return null

  const dep = formatTripWhen(trip.departs_at)
  const payLabel = group ? `N$${Number(group.total_price).toFixed(0)}` : totalPrice ? `N$${totalPrice}` : `N$${trip.price}`
  const operatorName = trip.route_detail.operator_name
  const lowSeats = trip.available_seats <= 3

  const authHint = !profile
    ? 'Sign in to send a seat request.'
    : !profile.email_verified
      ? 'Verify your email to request a seat.'
      : seats.blockValid
        ? null
        : 'Choose your seats below, then request.'

  return (
    <div className={`shared-reserve ${className}`.trim()} id="bus-reserve-panel">
      <p className="shared-reserve__kicker">Book your seat</p>

      <div className="shared-reserve__route">
        <p className="shared-reserve__route-line">
          {trip.route_detail.origin} → {trip.route_detail.destination}
        </p>
        <span className="shared-reserve__dep-chip">
          <CalendarDays size={12} strokeWidth={2.25} aria-hidden />
          {dep.date} · {dep.time}
        </span>
      </div>

      <div className="shared-reserve__price-row">
        <p className="shared-reserve__price">
          N${trip.price}
          <small> / passenger</small>
        </p>
        <span className={`shared-reserve__seats-left${lowSeats ? ' shared-reserve__seats-left--low' : ''}`}>
          {trip.available_seats} left
        </span>
      </div>

      <p className="shared-reserve__operator">
        <Building2 size={13} strokeWidth={2.25} aria-hidden />
        {operatorName}
        <Clock size={12} strokeWidth={2.25} aria-hidden style={{ marginLeft: 6 }} />
        Departs {dep.time}
      </p>

      <div className="shared-reserve__fields">
        <BookingGuestSelector
          id="bus-passengers"
          label="Passengers"
          value={passengers}
          min={1}
          max={Math.min(4, trip.available_seats)}
          onChange={onPassengersChange}
          hint={`Up to ${Math.min(4, trip.available_seats)} passengers`}
        />
        <div className="field">
          <label className="label" htmlFor="bus-seat-pref">
            Seat preference
          </label>
          <select
            id="bus-seat-pref"
            className="input"
            value={seatPref}
            onChange={(e) => onSeatPrefChange(e.target.value)}
          >
            <option value="any">Any seat</option>
            <option value="window">Window</option>
            <option value="aisle">Aisle</option>
          </select>
        </div>
      </div>

      <div className="shared-reserve__seats">
        <BusSeatPicker
          totalSeats={seats.totalSeats}
          taken={seats.taken}
          passengers={passengers}
          firstSeat={seats.firstSeat}
          blockSeats={seats.blockSeats}
          blockValid={seats.blockValid}
          onSelectSeat={seats.onSelectSeat}
          compact
        />
      </div>

      <BookingPriceSummary
        lines={[
          {
            label: `${passengers} ${passengers === 1 ? 'passenger' : 'passengers'} × N$${trip.price}`,
            value: payLabel,
          },
        ]}
        total={{ label: 'Estimated total', value: payLabel }}
        estimateNote="Operator confirms fare and seat allocation"
      />

      {err ? <UserBookingErrorState message={err} onDismiss={onDismissErr} /> : null}

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={onBook}
        disabled={isPending || !seats.blockValid}
      >
        <Bus size={16} strokeWidth={2.25} aria-hidden />
        {isPending ? 'Sending…' : seats.blockValid ? 'Request seat' : 'Select seats first'}
      </button>

      <Link to="/messages" className="shared-reserve__secondary">
        <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
        Contact operator
      </Link>

      {authHint ? <p className="shared-reserve__hint">{authHint}</p> : null}
    </div>
  )
}

export function BusTripBookingStatus({
  group,
  routeTitle,
  payLabel,
  onPay,
  isPayPending,
}: {
  group: GroupReserveResponse
  routeTitle: string
  payLabel: string
  onPay: () => void
  isPayPending: boolean
}) {
  const firstRes = group.reservations[0]
  const seatList = group.reservations.map((r) => r.seat_number).sort((a, b) => a - b).join(', ')

  if (firstRes?.status === 'pending') {
    return (
      <section className="detail-section tp-transport-status acc-detail__section">
        <Bus className="tp-transport-status__icon tp-transport-status__icon--pending" size={40} strokeWidth={2} aria-hidden />
        <h2 className="tp-transport-status__title">Request received</h2>
        <span className="tp-transport-status__badge">Awaiting operator</span>
        <p className="tp-transport-status__total">
          Seats {seatList} · <strong>{payLabel}</strong>
        </p>
        <p className="tp-transport-status__text">
          This demo includes a practice payment step — your card is never charged.
        </p>
        <div className="tp-transport-status__actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onPay} disabled={isPayPending}>
            {isPayPending ? 'Processing…' : 'Complete demo step'}
          </button>
        </div>
      </section>
    )
  }

  if (firstRes?.status === 'confirmed') {
    return (
      <section className="detail-section tp-transport-status tp-transport-status--success acc-detail__section">
        <Bus className="tp-transport-status__icon" size={40} strokeWidth={2} aria-hidden />
        <h2 className="tp-transport-status__title">Seat request confirmed</h2>
        <span className="tp-transport-status__badge tp-transport-status__badge--confirmed">Confirmed</span>
        <p className="tp-transport-status__text">
          {routeTitle} · Seats {seatList}
        </p>
        <p className="tp-transport-status__ref">
          Reference: <code>{firstRes.mock_payment_ref}</code>
        </p>
        <div className="tp-transport-status__actions">
          <Link to="/transport" className="btn btn-primary btn-block">
            Browse transport
          </Link>
        </div>
      </section>
    )
  }

  return null
}

export type { GroupReserveResponse, Reservation }
