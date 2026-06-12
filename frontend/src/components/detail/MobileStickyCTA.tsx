import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  action: ReactNode
  className?: string
}

export function MobileStickyCTA({ title, subtitle, action, className = '' }: Props) {
  return (
    <div
      className={`dl-detail__mobile-bar ${className}`.trim()}
      role="region"
      aria-label="Booking actions"
    >
      <div>
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {action}
    </div>
  )
}
