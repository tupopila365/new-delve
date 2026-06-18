import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import './guide-booking.css'

export type GuideBookingStep = {
  id: string
  label: string
  active?: boolean
  done?: boolean
}

type Props = {
  backTo: string
  backLabel?: string
  steps: GuideBookingStep[]
  summary?: ReactNode
  children: ReactNode
  className?: string
}

export function GuideBookingLayout({
  backTo,
  backLabel = 'Back',
  steps,
  summary,
  children,
  className = '',
}: Props) {
  return (
    <div className={`guide-book ${className}`.trim()}>
      <div className="guide-book__container">
        <Link to={backTo} className="guide-book__back">
          <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
          {backLabel}
        </Link>

        <nav className="guide-book__steps" aria-label="Booking progress">
          <ol className="guide-book__steps-list">
            {steps.map((step, i) => (
              <li
                key={step.id}
                className={`guide-book__step ${step.active ? 'guide-book__step--active' : ''} ${step.done ? 'guide-book__step--done' : ''}`.trim()}
                aria-current={step.active ? 'step' : undefined}
              >
                <span className="guide-book__step-num" aria-hidden>
                  {step.done ? '✓' : i + 1}
                </span>
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
        </nav>

        <div className="guide-book__layout">
          <div className="guide-book__main">{children}</div>
          {summary ? <aside className="guide-book__sidebar">{summary}</aside> : null}
        </div>
      </div>
    </div>
  )
}
