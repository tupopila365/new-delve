import type { BookingDetailItem } from '../BookingDetailsList'

type Props = {
  title: string
  location?: string
  items: BookingDetailItem[]
  priceLine?: string
  total?: string
  cancelNote?: string
  isSubmitting?: boolean
  onBack: () => void
  onConfirm: () => void
}

export function StayReviewPanel({
  title,
  location,
  items,
  priceLine,
  total,
  cancelNote,
  isSubmitting,
  onBack,
  onConfirm,
}: Props) {
  return (
    <section className="stay-card stay-review" aria-labelledby="stay-review-title">
      <h2 id="stay-review-title" className="stay-card__title">
        Review &amp; confirm
      </h2>
      <p className="stay-card__sub">
        {title}
        {location ? ` · ${location}` : ''}
      </p>

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

      {priceLine && total ? (
        <div className="stay-review__price">
          <div className="stay-review__price-row">
            <span>{priceLine}</span>
            <span>{total}</span>
          </div>
          <div className="stay-review__price-total">
            <span>Total</span>
            <span>{total}</span>
          </div>
        </div>
      ) : null}

      {cancelNote ? <p className="stay-review__note">{cancelNote}</p> : null}

      <p className="stay-review__note">
        You won&apos;t be charged yet. The host confirms availability before your stay is final.
      </p>

      <div className="stay-card__actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending request…' : 'Send booking request'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack} disabled={isSubmitting}>
          Edit details
        </button>
      </div>
    </section>
  )
}
