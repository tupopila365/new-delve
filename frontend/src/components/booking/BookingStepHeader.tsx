type Step = {
  id: string
  label: string
  done?: boolean
  active?: boolean
}

type Props = {
  steps: Step[]
  className?: string
}

export function BookingStepHeader({ steps, className = '' }: Props) {
  return (
    <nav className={`bk-steps ${className}`.trim()} aria-label="Booking steps">
      <ol className="bk-steps__list">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className={`bk-steps__item ${step.active ? 'bk-steps__item--active' : ''} ${step.done ? 'bk-steps__item--done' : ''}`.trim()}
            aria-current={step.active ? 'step' : undefined}
          >
            <span className="bk-steps__num">{step.done ? '' : i + 1}</span>
            <span className="bk-steps__label">{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
