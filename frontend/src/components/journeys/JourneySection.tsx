import type { ReactNode } from 'react'
import './journey-detail.css'

type Props = {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Render without the card chrome (padding/border/background). */
  flush?: boolean
  id?: string
}

/** Titled content block for the journey detail page. Journey-native — replaces
 *  the borrowed listing section so nothing here reads as a bookable listing. */
export function JourneySection({ title, action, children, className = '', flush = false, id }: Props) {
  return (
    <section id={id} className={`jd-section${flush ? ' jd-section--flush' : ''} ${className}`.trim()}>
      {title || action ? (
        <div className="jd-section__head">
          {title ? <h2 className="jd-section__title">{title}</h2> : <span aria-hidden />}
          {action ?? null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
