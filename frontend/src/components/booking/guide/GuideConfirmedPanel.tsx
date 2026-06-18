import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { BookingDetailItem } from '../BookingDetailsList'

type Props = {
  title?: string
  message?: string
  statusLabel?: string
  details: BookingDetailItem[]
  reference?: number | string
  actions: ReactNode
}

export function GuideConfirmedPanel({
  title = 'Request sent',
  message = 'The guide will review your date and trip details. We’ll notify you when they confirm.',
  statusLabel = 'Pending guide confirmation',
  details,
  reference,
  actions,
}: Props) {
  return (
    <section className="guide-card guide-confirmed" aria-labelledby="guide-confirmed-title">
      <CheckCircle2 className="guide-confirmed__icon" size={48} strokeWidth={2} aria-hidden />
      <span className="guide-confirmed__badge">{statusLabel}</span>
      <h2 id="guide-confirmed-title" className="guide-confirmed__title">
        {title}
      </h2>
      <p className="guide-confirmed__text">{message}</p>

      <ul className="guide-review__list guide-confirmed__details">
        {details.map((item) => (
          <li
            key={item.label}
            className={`guide-review__item ${item.fullWidth ? 'guide-review__item--full' : ''}`.trim()}
          >
            <span>{item.label}</span>
            <span>{item.value}</span>
          </li>
        ))}
      </ul>

      {reference != null ? (
        <p className="guide-confirmed__ref">
          Reference <strong>#{reference}</strong>
        </p>
      ) : null}

      <div className="guide-confirmed__actions">{actions}</div>
    </section>
  )
}
