import type { BookingDetailItem } from '../BookingDetailsList'

type Props = {
  experienceTitle: string
  guideName: string
  items: BookingDetailItem[]
  priceLine?: string
  total?: string
  trustNote?: string
  isSubmitting?: boolean
  onBack: () => void
  onConfirm: () => void
}

export function GuideReviewPanel({
  experienceTitle,
  guideName,
  items,
  priceLine,
  total,
  trustNote = 'You won\'t be charged yet. The guide confirms availability before your experience is final.',
  isSubmitting,
  onBack,
  onConfirm,
}: Props) {
  return (
    <section className="guide-card guide-review" aria-labelledby="guide-review-title">
      <h2 id="guide-review-title" className="guide-card__title">
        Review &amp; send request
      </h2>
      <p className="guide-card__sub">
        {experienceTitle} · with {guideName}
      </p>

      <ul className="guide-review__list">
        {items.map((item) => (
          <li
            key={item.label}
            className={`guide-review__item ${item.fullWidth ? 'guide-review__item--full' : ''}`.trim()}
          >
            <span>{item.label}</span>
            <span>{item.value}</span>
          </li>
        ))}
      </ul>

      {priceLine && total ? (
        <div className="guide-review__price">
          <div className="guide-review__price-row">
            <span>{priceLine}</span>
            <span>{total}</span>
          </div>
          <div className="guide-review__price-total">
            <span>Estimated total</span>
            <span>{total}</span>
          </div>
        </div>
      ) : null}

      <p className="guide-review__note">{trustNote}</p>

      <div className="guide-card__actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending request…' : 'Send experience request'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack} disabled={isSubmitting}>
          Edit details
        </button>
      </div>
    </section>
  )
}
