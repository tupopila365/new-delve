import { Link } from 'react-router-dom'
import {
  Building2,
  Car,
  MapPin,
  Users,
} from 'lucide-react'
import { BookingDateFields, BookingPriceSummary, UserBookingErrorState } from '../index'
import { MessageProviderLink } from '../../messages'
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
  className = '',
}: Props) {
  if (booking && booking.status !== 'pending') return null

  const typeMeta = vehicleTypeMeta(vehicle.vehicle_type)
  const TypeIcon = typeMeta.Icon
  const locationLine = vehicleLocationLine(vehicle)
  const providerName = vehicleProviderName(vehicle)
  const providerProfileHref = vehicle.owner_username ? `/u/${encodeURIComponent(vehicle.owner_username)}` : null
  const todayStr = new Date().toISOString().split('T')[0]
  const days = rentalDaysInclusive(start, end)
  const estimatedTotal =
    days && vehicle.price_per_day
      ? (parseFloat(vehicle.price_per_day) * days).toFixed(0)
      : null

  const pickupOptions = [...new Set([vehicle.city, 'Airport', 'Provider location'].filter(Boolean) as string[])]

  const authHint = !profile
    ? 'Sign in to send a vehicle request.'
    : !profile.email_verified
      ? 'Verify your email to request this vehicle.'
      : null

  return (
    <div className={`rental-reserve ${className}`.trim()} id="vehicle-reserve-panel">
      <p className="rental-reserve__kicker">Reserve this vehicle</p>

      <div className="rental-reserve__head">
        <p className="rental-reserve__price">
          N${vehicle.price_per_day}
          <small> / day</small>
        </p>
        <span className="rental-reserve__type">
          <TypeIcon size={12} strokeWidth={2.25} aria-hidden />
          {typeMeta.label}
        </span>
      </div>

      <ul className="rental-reserve__facts">
        {vehicle.seats != null && (
          <li className="rental-reserve__fact">
            <Users size={14} strokeWidth={2.25} aria-hidden />
            {vehicle.seats} seats
          </li>
        )}
        {locationLine ? (
          <li className="rental-reserve__fact">
            <MapPin size={14} strokeWidth={2.25} aria-hidden />
            {locationLine}
          </li>
        ) : null}
        <li className="rental-reserve__fact">
          <Building2 size={14} strokeWidth={2.25} aria-hidden />
          {providerName}
        </li>
      </ul>

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
        <div className="field">
          <label className="label" htmlFor="veh-pickup-area">
            Pick-up area
          </label>
          <select
            id="veh-pickup-area"
            className="input"
            value={pickupArea || pickupOptions[0] || ''}
            onChange={(e) => onPickupAreaChange(e.target.value)}
          >
            {pickupOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BookingPriceSummary
        lines={
          days != null && estimatedTotal
            ? [{ label: `${days} ${days === 1 ? 'day' : 'days'} × N$${vehicle.price_per_day}`, value: `N$${estimatedTotal}` }]
            : [{ label: 'Daily rate', value: `N$${vehicle.price_per_day} / day`, muted: true }]
        }
        total={estimatedTotal ? { label: 'Estimated total', value: `N$${estimatedTotal}` } : undefined}
        estimateNote={estimatedTotal ? 'Provider confirms the final amount' : 'Choose dates to see an estimate'}
      />

      {err ? <UserBookingErrorState message={err} onDismiss={onDismissErr} /> : null}

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={onReserve}
        disabled={isPending}
      >
        <Car size={16} strokeWidth={2.25} aria-hidden />
        {isPending ? 'Sending…' : 'Request vehicle'}
      </button>

      {vehicle.owner_username ? (
        <MessageProviderLink username={vehicle.owner_username} variant="ghost" className="rental-reserve__secondary" />
      ) : providerProfileHref ? (
        <Link to={providerProfileHref} className="rental-reserve__secondary">
          Message provider
        </Link>
      ) : (
        <MessageProviderLink variant="ghost" className="rental-reserve__secondary" fallbackToInbox />
      )}

      {authHint ? <p className="rental-reserve__hint">{authHint}</p> : null}

      <p className="rental-reserve__trust">
        The provider confirms availability, pickup, deposit, and rental terms before anything is final. No charge
        until approved.
      </p>
    </div>
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
      <section className="detail-section tp-transport-status acc-detail__section">
        <Car className="tp-transport-status__icon tp-transport-status__icon--pending" size={40} strokeWidth={2} aria-hidden />
        <h2 className="tp-transport-status__title">Request received</h2>
        <span className="tp-transport-status__badge">Awaiting provider</span>
        <p className="tp-transport-status__total">
          Estimated total: <strong>N${booking.total_price}</strong>
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

  if (booking.status === 'confirmed') {
    return (
      <section className="detail-section tp-transport-status tp-transport-status--success acc-detail__section">
        <Car className="tp-transport-status__icon" size={40} strokeWidth={2} aria-hidden />
        <h2 className="tp-transport-status__title">Request confirmed</h2>
        <span className="tp-transport-status__badge tp-transport-status__badge--confirmed">Confirmed</span>
        <p className="tp-transport-status__text">
          The provider would share pickup instructions and contact details here.
        </p>
        <p className="tp-transport-status__ref">
          Reference: <code>{booking.mock_payment_ref}</code>
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
