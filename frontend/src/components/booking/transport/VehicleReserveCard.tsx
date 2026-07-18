import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, MapPin, Users } from 'lucide-react'
import { BookingDateFields, UserBookingErrorState } from '../index'
import { messageProviderPath } from '../../messages/messageProviderUtils'
import { RenterDocumentUploads } from './RenterDocumentUploads'
import type { RenterDocumentUpload } from '../../../data/renterDocuments'
import {
  rentalDaysInclusive,
  vehicleLocationLine,
  vehicleProviderName,
  vehicleTypeMeta,
  type VehicleListing,
} from '../../../utils/transportListing'
import './transport-booking.css'

type Booking = {
  id: number
  status: string
  total_price: string
  mock_payment_ref: string
}

type Props = {
  vehicle: VehicleListing
  start: string
  end: string
  pickupArea: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  onPickupAreaChange: (v: string) => void
  onReserve: () => void
  isPending: boolean
  err: string | null
  onDismissErr: () => void
  profile: { email_verified: boolean } | null
  booking: Booking | null
  renterDocuments?: Record<string, RenterDocumentUpload | undefined>
  onRenterDocUpload?: (docType: string, file: File) => void
  onRenterDocRemove?: (docType: string) => void
  className?: string
}

export function VehicleReserveCard({
  vehicle,
  start,
  end,
  pickupArea,
  onStartChange,
  onEndChange,
  onPickupAreaChange,
  onReserve,
  isPending,
  err,
  onDismissErr,
  profile,
  booking,
  renterDocuments = {},
  onRenterDocUpload,
  onRenterDocRemove,
  className = '',
}: Props) {
  if (booking && booking.status !== 'pending') return null

  const typeMeta = vehicleTypeMeta(vehicle.vehicle_type)
  const locationLine = vehicleLocationLine(vehicle)
  const providerName = vehicleProviderName(vehicle)
  const todayStr = new Date().toISOString().split('T')[0]
  const days = rentalDaysInclusive(start, end)
  const estimatedTotal =
    days && vehicle.price_per_day
      ? (parseFloat(vehicle.price_per_day) * days).toFixed(0)
      : null

  const pickupOptions = [...new Set([vehicle.city, 'Airport', 'Provider location'].filter(Boolean) as string[])]
  const requiredDocs = vehicle.required_renter_documents ?? []
  const messageHref = vehicle.owner_username
    ? messageProviderPath(vehicle.owner_username, {
        type: 'transport',
        id: vehicle.id,
        label: vehicle.title,
      })
    : '/messages'

  const authHint = !profile
    ? (
        <>
          <Link to="/login">Sign in</Link> to request this vehicle.
        </>
      )
    : !profile.email_verified
      ? (
          <>
            <Link to="/verify-email">Verify your email</Link> to request this vehicle.
          </>
        )
      : null

  return (
    <aside className={`rental-reserve ${className}`.trim()} id="vehicle-reserve-panel">
      <header className="rental-reserve__top">
        <div>
          <p className="rental-reserve__kicker">{typeMeta.label}</p>
          <p className="rental-reserve__price">
            N${vehicle.price_per_day}
            <span>/ day</span>
          </p>
        </div>
        <p className="rental-reserve__host">{providerName}</p>
      </header>

      <p className="rental-reserve__meta">
        {vehicle.seats != null ? (
          <span>
            <Users size={13} strokeWidth={2.25} aria-hidden />
            {vehicle.seats} seats
          </span>
        ) : null}
        {locationLine ? (
          <span>
            <MapPin size={13} strokeWidth={2.25} aria-hidden />
            {locationLine}
          </span>
        ) : null}
      </p>

      <div className="rental-reserve__fields">
        <BookingDateFields
          mode="range"
          checkIn={{
            id: 'veh-pickup',
            label: 'Pick-up',
            value: start,
            min: todayStr,
            onChange: onStartChange,
          }}
          checkOut={{
            id: 'veh-return',
            label: 'Return',
            value: end,
            min: start || todayStr,
            onChange: onEndChange,
          }}
        />
        <label className="rental-reserve__field">
          <span>Area</span>
          <select
            id="veh-pickup-area"
            value={pickupArea || pickupOptions[0] || ''}
            onChange={(e) => onPickupAreaChange(e.target.value)}
          >
            {pickupOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      {requiredDocs.length > 0 && onRenterDocUpload && onRenterDocRemove ? (
        <RenterDocumentUploads
          required={requiredDocs}
          uploads={renterDocuments}
          onUpload={onRenterDocUpload}
          onRemove={onRenterDocRemove}
          disabled={isPending}
        />
      ) : null}

      {err ? <UserBookingErrorState message={err} onDismiss={onDismissErr} /> : null}

      <div className="rental-reserve__foot">
        <div className="rental-reserve__total">
          {estimatedTotal ? (
            <>
              <strong>N${estimatedTotal}</strong>
              <span>
                {days} {days === 1 ? 'day' : 'days'}
              </span>
            </>
          ) : (
            <>
              <strong>N${vehicle.price_per_day}</strong>
              <span>per day</span>
            </>
          )}
        </div>
        <button type="button" className="rental-reserve__cta" onClick={onReserve} disabled={isPending}>
          {isPending ? 'Sending…' : 'Request'}
        </button>
      </div>

      <nav className="rental-reserve__links" aria-label="Provider">
        <Link to={messageHref}>Message</Link>
        {vehicle.owner_username ? (
          <Link to={`/u/${encodeURIComponent(vehicle.owner_username)}`}>Profile</Link>
        ) : null}
      </nav>

      {authHint ? <p className="rental-reserve__hint">{authHint}</p> : null}
      <p className="rental-reserve__trust">No charge until the provider confirms.</p>
    </aside>
  )
}

export function VehicleBookingStatus({
  booking,
  onPay,
  isPayPending,
}: {
  booking: Booking
  onPay: () => void
  isPayPending: boolean
}) {
  if (booking.status === 'pending') {
    return (
      <section className="detail-section tp-transport-status">
        <Clock className="tp-transport-status__icon tp-transport-status__icon--pending" size={44} strokeWidth={2} aria-hidden />
        <h2 className="tp-transport-status__title">Request received</h2>
        <span className="tp-transport-status__badge">Awaiting provider</span>
        <p className="tp-transport-status__total">
          Estimated total: <strong>N${booking.total_price}</strong>
        </p>
        <p className="tp-transport-status__text">
          The provider will confirm your dates. Practice payment unlocks after they accept.
        </p>
      </section>
    )
  }

  if (booking.status === 'confirmed' && !booking.mock_payment_ref) {
    return (
      <section className="detail-section tp-transport-status">
        <CheckCircle2 className="tp-transport-status__icon" size={44} strokeWidth={2} aria-hidden />
        <h2 className="tp-transport-status__title">Provider confirmed</h2>
        <span className="tp-transport-status__badge tp-transport-status__badge--confirmed">Confirmed</span>
        <p className="tp-transport-status__total">
          Total: <strong>N${booking.total_price}</strong>
        </p>
        <p className="tp-transport-status__text">
          Complete the practice payment step — your card is never charged.
        </p>
        <div className="tp-transport-status__actions">
          <button type="button" className="rental-reserve__cta" onClick={onPay} disabled={isPayPending}>
            {isPayPending ? 'Processing…' : 'Complete demo payment'}
          </button>
        </div>
      </section>
    )
  }

  if (booking.status === 'confirmed') {
    return (
      <section className="detail-section tp-transport-status tp-transport-status--success">
        <CheckCircle2 className="tp-transport-status__icon" size={44} strokeWidth={2} aria-hidden />
        <h2 className="tp-transport-status__title">Request confirmed</h2>
        <span className="tp-transport-status__badge tp-transport-status__badge--confirmed">Confirmed</span>
        <p className="tp-transport-status__text">
          The provider would share pickup instructions and contact details here.
        </p>
        <p className="tp-transport-status__ref">
          Reference: <code>{booking.mock_payment_ref}</code>
        </p>
        <div className="tp-transport-status__actions">
          <Link to="/transport" className="rental-reserve__cta">
            Browse transport
          </Link>
        </div>
      </section>
    )
  }

  return null
}
