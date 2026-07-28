import { CalendarDays, Loader2, XCircle } from 'lucide-react'
import { BookingDateFields } from '../BookingDateFields'
import { BookingGuestSelector } from '../BookingGuestSelector'
import { formatStayRange } from '../bookingUtils'
import type { AvailabilityStatus } from '../bookingUtils'
import { useDisplayMoney } from '../../../hooks/useDisplayMoney'

type Props = {
  status: AvailabilityStatus
  unavailableReason?: string | null
  checkIn: string
  checkOut: string
  guests: number
  maxGuests: number
  roomName: string
  nights: number | null
  estimatedTotal: string | null
  error?: string | null
  today: string
  onCheckInChange: (value: string) => void
  onCheckOutChange: (value: string) => void
  onGuestsChange: (value: number) => void
  onReview: () => void
}

export function StayAvailabilityPanel({
  status,
  unavailableReason,
  checkIn,
  checkOut,
  guests,
  maxGuests,
  roomName,
  nights,
  estimatedTotal,
  error,
  today,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onReview,
}: Props) {
  const { format } = useDisplayMoney()
  const hasDates = Boolean(checkIn && checkOut && nights)

  return (
    <section className="stay-card stay-avail" aria-labelledby="stay-avail-title">
      <p className="stay-card__eyebrow">Step 2 of 5</p>
      <h2 id="stay-avail-title" className="stay-card__title">
        Choose dates and guests
      </h2>
      <p className="stay-card__sub">
        We will check {roomName} once, then take you straight to review.
      </p>

      {error ? (
        <p className="stay-avail__error" role="alert">
          {error}
        </p>
      ) : null}

      {status === 'unavailable' ? (
        <div className="stay-avail__status stay-avail__status--bad" role="alert">
          <XCircle className="stay-avail__status-icon" size={22} strokeWidth={2.25} aria-hidden />
          <div>
            <p className="stay-avail__status-title">Choose different dates</p>
            <p className="stay-avail__status-text">
              {unavailableReason ?? 'This room is not available for those dates.'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="stay-avail__fields">
        <BookingDateFields
          mode="range"
          checkIn={{
            id: 'stay-check-in',
            label: 'Check-in',
            value: checkIn,
            min: today,
            onChange: onCheckInChange,
          }}
          checkOut={{
            id: 'stay-check-out',
            label: 'Check-out',
            value: checkOut,
            min: checkIn || today,
            onChange: onCheckOutChange,
          }}
        />
        <BookingGuestSelector
          id="stay-guests"
          value={guests}
          min={1}
          max={maxGuests}
          onChange={onGuestsChange}
          hint={`Max ${maxGuests} guests`}
        />
      </div>

      {hasDates ? (
        <ul className="stay-avail__facts">
          <li className="stay-avail__fact">
            <span>
              <CalendarDays
                size={14}
                strokeWidth={2.25}
                aria-hidden
                style={{ verticalAlign: -2, marginRight: 4 }}
              />
              Dates
            </span>
            <span>{formatStayRange(checkIn, checkOut)}</span>
          </li>
          <li className="stay-avail__fact">
            <span>Room</span>
            <span>{roomName}</span>
          </li>
          <li className="stay-avail__fact">
            <span>Guests</span>
            <span>{guests}</span>
          </li>
          {estimatedTotal ? (
            <li className="stay-avail__fact">
              <span>Estimated total</span>
              <span>{format(estimatedTotal)}</span>
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="stay-card__actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={onReview}
          disabled={status === 'checking'}
        >
          {status === 'checking' ? (
            <>
              <Loader2 className="stay-avail__button-spin" size={17} strokeWidth={2.25} aria-hidden />
              Checking dates…
            </>
          ) : (
            'Review request'
          )}
        </button>
      </div>

      <p className="stay-avail__footnote">
        No payment now. The host confirms your request before you pay.
      </p>
    </section>
  )
}
