import { CalendarDays, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { BookingDateFields } from '../BookingDateFields'
import { BookingGuestSelector } from '../BookingGuestSelector'
import { formatStayRange } from '../bookingUtils'
import type { AvailabilityStatus } from '../bookingUtils'

type Props = {
  status: AvailabilityStatus
  unavailableReason?: string | null
  checkIn: string
  checkOut: string
  guests: number
  maxGuests: number
  roomName?: string
  nights: number | null
  nightlyRate: number | null
  estimatedTotal: string | null
  showDateFields: boolean
  error?: string | null
  today: string
  onCheckInChange: (v: string) => void
  onCheckOutChange: (v: string) => void
  onGuestsChange: (v: number) => void
  onCheck: () => void
  onContinue: () => void
  onChangeDates: () => void
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
  nightlyRate,
  estimatedTotal,
  showDateFields,
  error,
  today,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onCheck,
  onContinue,
  onChangeDates,
}: Props) {
  const hasDates = Boolean(checkIn && checkOut && nights)

  return (
    <section className="stay-card stay-avail" aria-labelledby="stay-avail-title">
      <h2 id="stay-avail-title" className="stay-card__title">
        {status === 'available' ? 'Room available' : 'Check availability'}
      </h2>
      <p className="stay-card__sub">
        {status === 'available'
          ? 'Your dates are open. Continue to finish your booking.'
          : 'Pick your dates and we’ll confirm the room is free.'}
      </p>

      {error ? <p className="stay-avail__error" role="alert">{error}</p> : null}

      {status === 'checking' ? (
        <div className="stay-avail__status stay-avail__status--checking">
          <Loader2 className="stay-avail__status-icon" size={22} strokeWidth={2.25} aria-hidden />
          <div>
            <p className="stay-avail__status-title">Checking availability…</p>
            <p className="stay-avail__status-text">This only takes a moment.</p>
          </div>
        </div>
      ) : null}

      {status === 'available' ? (
        <div className="stay-avail__status stay-avail__status--ok">
          <CheckCircle2 className="stay-avail__status-icon" size={22} strokeWidth={2.25} aria-hidden />
          <div>
            <p className="stay-avail__status-title">Great news — it&apos;s available!</p>
            <p className="stay-avail__status-text">
              {roomName ? `${roomName} is open for your dates.` : 'This stay is open for your dates.'}
            </p>
          </div>
        </div>
      ) : null}

      {status === 'unavailable' ? (
        <div className="stay-avail__status stay-avail__status--bad">
          <XCircle className="stay-avail__status-icon" size={22} strokeWidth={2.25} aria-hidden />
          <div>
            <p className="stay-avail__status-title">Not available</p>
            <p className="stay-avail__status-text">
              {unavailableReason ?? 'Try different dates or another room.'}
            </p>
          </div>
        </div>
      ) : null}

      {showDateFields ? (
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
      ) : null}

      {hasDates && status !== 'checking' ? (
        <ul className="stay-avail__facts">
          <li className="stay-avail__fact">
            <span>
              <CalendarDays size={14} strokeWidth={2.25} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
              Dates
            </span>
            <span>{formatStayRange(checkIn, checkOut)}</span>
          </li>
          {roomName ? (
            <li className="stay-avail__fact">
              <span>Room</span>
              <span>{roomName}</span>
            </li>
          ) : null}
          <li className="stay-avail__fact">
            <span>Guests</span>
            <span>{guests}</span>
          </li>
          {nights && nightlyRate != null && estimatedTotal ? (
            <li className="stay-avail__fact">
              <span>Total</span>
              <span>N${estimatedTotal}</span>
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="stay-card__actions">
        {status === 'available' ? (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={onContinue}>
              Continue booking
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={onChangeDates}>
              Change dates
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={onCheck}
            disabled={status === 'checking'}
          >
            {status === 'checking' ? 'Checking…' : 'Check availability'}
          </button>
        )}
      </div>
    </section>
  )
}
