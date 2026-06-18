import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import './stay-booking.css'

export type StayBookingStep = {
  id: string
  label: string
  active?: boolean
  done?: boolean
}

type Props = {
  backTo: string
  backLabel?: string
  steps: StayBookingStep[]
  summary?: ReactNode
  children: ReactNode
  className?: string
}

export function StayBookingLayout({
  backTo,
  backLabel = 'Back',
  steps,
  summary,
  children,
  className = '',
}: Props) {
  return (
    <div className={`stay-book ${className}`.trim()}>
      <div className="stay-book__container">
        <Link to={backTo} className="stay-book__back">
          <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
          {backLabel}
        </Link>

        <nav className="stay-book__steps" aria-label="Booking progress">
          <ol className="stay-book__steps-list">
            {steps.map((step, i) => (
              <li
                key={step.id}
                className={`stay-book__step ${step.active ? 'stay-book__step--active' : ''} ${step.done ? 'stay-book__step--done' : ''}`.trim()}
                aria-current={step.active ? 'step' : undefined}
              >
                <span className="stay-book__step-num" aria-hidden>
                  {step.done ? '✓' : i + 1}
                </span>
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
        </nav>

        <div className="stay-book__layout">
          <div className="stay-book__main">{children}</div>
          {summary ? <aside className="stay-book__sidebar">{summary}</aside> : null}
        </div>
      </div>
    </div>
  )
}
