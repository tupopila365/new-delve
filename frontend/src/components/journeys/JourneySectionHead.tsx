import type { ReactNode } from 'react'
import './JourneySectionHead.css'

type Props = {
  title: string
  subtitle?: string
  id?: string
  trailing?: ReactNode
  variant?: 'default' | 'rail'
  className?: string
}

export function JourneySectionHead({
  title,
  subtitle,
  id,
  trailing,
  variant = 'default',
  className = '',
}: Props) {
  return (
    <div
      className={[
        'journey-section-head',
        variant === 'rail' ? 'journey-section-head--rail' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="journey-section-head__copy">
        {id ? (
          <h2 id={id} className="journey-section-head__title">
            {title}
          </h2>
        ) : (
          <h2 className="journey-section-head__title">{title}</h2>
        )}
        {subtitle ? <p className="journey-section-head__subtitle">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="journey-section-head__trailing">{trailing}</div> : null}
    </div>
  )
}
