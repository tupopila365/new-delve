import { CalendarDays, CheckCircle2, Clock, Loader2, Users, XCircle } from 'lucide-react'
import { BookingDateFields } from '../BookingDateFields'
import { BookingGuestSelector } from '../BookingGuestSelector'
import { GUIDE_TIME_PRESETS } from '../guideRequestShared'
import { formatGuideDate } from '../bookingUtils'
import type { AvailabilityStatus } from '../bookingUtils'

type Props = {
  status: AvailabilityStatus
  unavailableReason?: string | null
  date: string
  startTime: string
  groupSize: number
  maxGroupSize: number
  packageTitle: string
  durationHours: number
  packagePrice: string
  showFields: boolean
  error?: string | null
  today: string
  onDateChange: (v: string) => void
  onStartTimeChange: (v: string) => void
  onGroupSizeChange: (v: number) => void
  onCheck: () => void
  onContinue: () => void
  onChangeDate: () => void
}

export function GuideAvailabilityPanel({
  status,
  unavailableReason,
  date,
  startTime,
  groupSize,
  maxGroupSize,
  packageTitle,
  durationHours,
  packagePrice,
  showFields,
  error,
  today,
  onDateChange,
  onStartTimeChange,
  onGroupSizeChange,
  onCheck,
  onContinue,
  onChangeDate,
}: Props) {
  const hasDate = Boolean(date)

  return (
    <section className="guide-card guide-avail" aria-labelledby="guide-avail-title">
      <h2 id="guide-avail-title" className="guide-card__title">
        {status === 'available' ? 'Guide is available' : 'Check availability'}
      </h2>
      <p className="guide-card__sub">
        {status === 'available'
          ? 'Your date works. Continue to add trip details and send your request.'
          : 'Pick a date and group size — we’ll confirm the guide can take this experience.'}
      </p>

      {error ? (
        <p className="guide-avail__error" role="alert">
          {error}
        </p>
      ) : null}

      {status === 'checking' ? (
        <div className="guide-avail__status guide-avail__status--checking">
          <Loader2 className="guide-avail__status-icon" size={22} strokeWidth={2.25} aria-hidden />
          <div>
            <p className="guide-avail__status-title">Checking guide schedule…</p>
            <p className="guide-avail__status-text">This only takes a moment.</p>
          </div>
        </div>
      ) : null}

      {status === 'available' ? (
        <div className="guide-avail__status guide-avail__status--ok">
          <CheckCircle2 className="guide-avail__status-icon" size={22} strokeWidth={2.25} aria-hidden />
          <div>
            <p className="guide-avail__status-title">You&apos;re good to go!</p>
            <p className="guide-avail__status-text">
              {packageTitle} is open on your preferred date.
            </p>
          </div>
        </div>
      ) : null}

      {status === 'unavailable' ? (
        <div className="guide-avail__status guide-avail__status--bad">
          <XCircle className="guide-avail__status-icon" size={22} strokeWidth={2.25} aria-hidden />
          <div>
            <p className="guide-avail__status-title">Not available</p>
            <p className="guide-avail__status-text">
              {unavailableReason ?? 'Try a different date or a smaller group.'}
            </p>
          </div>
        </div>
      ) : null}

      {showFields ? (
        <div className="guide-avail__fields">
          <BookingDateFields
            mode="single"
            date={{
              id: 'guide-book-date',
              label: 'Preferred date',
              value: date,
              min: today,
              onChange: onDateChange,
            }}
            time={{
              id: 'guide-book-time',
              label: 'Preferred start time (optional)',
              value: startTime,
              options: GUIDE_TIME_PRESETS.map(({ label, value }) => ({ label: `${label} (${value})`, value })),
              onChange: onStartTimeChange,
            }}
          />
          <BookingGuestSelector
            id="guide-book-group"
            label="Travellers"
            value={groupSize}
            min={1}
            max={maxGroupSize}
            onChange={onGroupSizeChange}
            hint={`Up to ${maxGroupSize} travellers for this experience.`}
          />
        </div>
      ) : null}

      {hasDate && status !== 'checking' ? (
        <ul className="guide-avail__facts">
          <li className="guide-avail__fact">
            <span>
              <CalendarDays size={14} strokeWidth={2.25} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
              Date
            </span>
            <span>{formatGuideDate(date)}</span>
          </li>
          {startTime ? (
            <li className="guide-avail__fact">
              <span>
                <Clock size={14} strokeWidth={2.25} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
                Start
              </span>
              <span>{startTime}</span>
            </li>
          ) : null}
          <li className="guide-avail__fact">
            <span>
              <Users size={14} strokeWidth={2.25} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
              Travellers
            </span>
            <span>{groupSize}</span>
          </li>
          <li className="guide-avail__fact">
            <span>Duration</span>
            <span>
              {durationHours} {durationHours === 1 ? 'hour' : 'hours'}
            </span>
          </li>
          <li className="guide-avail__fact">
            <span>Package price</span>
            <span>${packagePrice}</span>
          </li>
        </ul>
      ) : null}

      <div className="guide-card__actions">
        {status === 'available' ? (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={onContinue}>
              Continue to trip details
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={onChangeDate}>
              Change date
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
