import { BookingNotesField } from '../BookingNotesField'
import { formatStayRange } from '../bookingUtils'

type Props = {
  checkIn: string
  checkOut: string
  guests: number
  roomName?: string
  specialRequests: string
  onSpecialRequestsChange: (v: string) => void
  onBack: () => void
  onContinue: () => void
}

export function StayDetailsPanel({
  checkIn,
  checkOut,
  guests,
  roomName,
  specialRequests,
  onSpecialRequestsChange,
  onBack,
  onContinue,
}: Props) {
  return (
    <section className="stay-card stay-details" aria-labelledby="stay-details-title">
      <h2 id="stay-details-title" className="stay-card__title">
        Your stay
      </h2>
      <p className="stay-card__sub">Add any notes for the host. You can review everything next.</p>

      <ul className="stay-avail__facts">
        <li className="stay-avail__fact">
          <span>Dates</span>
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
      </ul>

      <div style={{ marginTop: 16 }}>
        <BookingNotesField
          id="stay-special"
          label="Special requests (optional)"
          value={specialRequests}
          onChange={onSpecialRequestsChange}
          placeholder="Late arrival, parking, accessibility needs…"
          hint="The host will see this before confirming your stay."
        />
      </div>

      <div className="stay-card__actions">
        <button type="button" className="btn btn-primary btn-block" onClick={onContinue}>
          Review booking
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          Back to availability
        </button>
      </div>
    </section>
  )
}
