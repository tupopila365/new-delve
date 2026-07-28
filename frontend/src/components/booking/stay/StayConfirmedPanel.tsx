import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { BookingDetailItem } from '../BookingDetailsList'

type NextStep = {
  title: string
  text: string
}

type Props = {
  title?: string
  message?: string
  statusLabel?: string
  details: BookingDetailItem[]
  reference?: number | string
  nextSteps?: NextStep[]
  actions: ReactNode
}

export function StayConfirmedPanel({
  title = 'Request sent',
  message = 'The host will review your dates. We will notify you when they respond.',
  statusLabel = 'Pending confirmation',
  details,
  reference,
  nextSteps,
  actions,
}: Props) {
  return (
    <section className="stay-card stay-confirmed" aria-labelledby="stay-confirmed-title">
      <CheckCircle2 className="stay-confirmed__icon" size={48} strokeWidth={2} aria-hidden />
      <span className="stay-confirmed__badge">{statusLabel}</span>
      <h2 id="stay-confirmed-title" className="stay-confirmed__title">
        {title}
      </h2>
      <p className="stay-confirmed__text">{message}</p>

      <ul className="stay-review__list stay-confirmed__details">
        {details.map((item) => (
          <li
            key={item.label}
            className={`stay-review__item ${item.fullWidth ? 'stay-review__item--full' : ''}`.trim()}
          >
            <span>{item.label}</span>
            <span>{item.value}</span>
          </li>
        ))}
      </ul>

      {nextSteps?.length ? (
        <div className="stay-confirmed__next">
          <h3>What happens next</h3>
          <ol>
            {nextSteps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden>{index + 1}</span>
                <p>
                  <strong>{step.title}</strong>
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {reference != null ? (
        <p className="stay-confirmed__ref">
          Reference <strong>#{reference}</strong>
        </p>
      ) : null}

      <div className="stay-confirmed__actions">{actions}</div>
    </section>
  )
}
