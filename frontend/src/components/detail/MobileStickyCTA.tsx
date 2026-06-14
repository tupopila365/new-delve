import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  action: ReactNode
  className?: string
  ariaLabel?: string
}

export function MobileStickyCTA({ title, subtitle, action, className = '', ariaLabel = 'Booking actions' }: Props) {
  return (
    <div
      className={`dl-detail__mobile-bar ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
    >
      <div>
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {action}
    </div>
  )
}
