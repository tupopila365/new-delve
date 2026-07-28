import { Ban, Clock3, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { BookingNotesField } from '../BookingNotesField'
import type { BookingDetailItem } from '../BookingDetailsList'

type PriceRow = {
  label: string
  value: string
}

type Props = {
  title: string
  location?: string
  items: BookingDetailItem[]
  specialRequests: string
  onSpecialRequestsChange: (value: string) => void
  priceRows: PriceRow[]
  total?: string
  cancellationTerms: string
  availabilityChecking?: boolean
  isSubmitting?: boolean
  onBack: () => void
  onConfirm: () => void
}

export function StayReviewPanel({
  title,
  location,
  items,
  specialRequests,
  onSpecialRequestsChange,
  priceRows,
  total,
  cancellationTerms,
  availabilityChecking,
  isSubmitting,
  onBack,
  onConfirm,
}: Props) {
  const busy = Boolean(availabilityChecking || isSubmitting)

  return (
    <section className="stay-card stay-review" aria-labelledby="stay-review-title">
      <p className="stay-card__eyebrow">Step 3 of 5</p>
      <h2 id="stay-review-title" className="stay-card__title">
        Review your request
      </h2>
      <p className="stay-card__sub">
        {title}
        {location ? ` · ${location}` : ''}
      </p>

      {availabilityChecking ? (
        <div className="stay-review__preflight" role="status" aria-live="polite">
          <Loader2 size={17} strokeWidth={2.25} aria-hidden />
          Confirming these dates are still open…
        </div>
      ) : null}

      <div className="stay-review__section">
        <h3 className="stay-review__section-title">Stay details</h3>
        <ul className="stay-review__list">
          {items.map((item) => (
            <li
              key={item.label}
              className={`stay-review__item ${item.fullWidth ? 'stay-review__item--full' : ''}`.trim()}
            >
              <span>{item.label}</span>
              <span>{item.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="stay-review__section stay-review__requests">
        <h3 className="stay-review__section-title">Requests for the host</h3>
        <BookingNotesField
          id="stay-special"
          label="Special requests (optional)"
          value={specialRequests}
          onChange={onSpecialRequestsChange}
          placeholder="Late arrival, parking or accessibility needs…"
          hint="The host will see this before confirming. Requests are not guaranteed."
        />
      </div>

      <div className="stay-review__section">
        <h3 className="stay-review__section-title">Price breakdown</h3>
        <div className="stay-review__price">
          {priceRows.map((row) => (
            <div className="stay-review__price-row" key={row.label}>
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
          {total ? (
            <div className="stay-review__price-total">
              <span>Stay total</span>
              <span>{total}</span>
            </div>
          ) : (
            <p className="stay-review__price-missing">
              The final total will appear after the dates are checked.
            </p>
          )}
        </div>
        <p className="stay-review__fee-note">
          No additional DELVE fee is due now. Any charges returned for these dates are included in
          the stay total above.
        </p>
      </div>

      <div className="stay-review__section">
        <h3 className="stay-review__section-title">Policies &amp; what happens next</h3>
        <ul className="stay-review__policies">
          <li>
            <ShieldCheck size={19} strokeWidth={2} aria-hidden />
            <span>
              <strong>Cancellation</strong>
              {cancellationTerms}
            </span>
          </li>
          <li>
            <CreditCard size={19} strokeWidth={2} aria-hidden />
            <span>
              <strong>No payment now</strong>
              If the host confirms, you will have 30 minutes to pay.
            </span>
          </li>
          <li>
            <Clock3 size={19} strokeWidth={2} aria-hidden />
            <span>
              <strong>Host response</strong>
              The host normally responds within 24 hours.
            </span>
          </li>
          <li>
            <Ban size={19} strokeWidth={2} aria-hidden />
            <span>
              <strong>If declined or unanswered</strong>
              You are not charged, the request closes and the dates are released.
            </span>
          </li>
        </ul>
      </div>

      <div className="stay-card__actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={onConfirm}
          disabled={busy}
        >
          {isSubmitting
            ? 'Sending request…'
            : availabilityChecking
              ? 'Confirming dates…'
              : 'Send booking request'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack} disabled={busy}>
          Edit dates &amp; guests
        </button>
      </div>
    </section>
  )
}
