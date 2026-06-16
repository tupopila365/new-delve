import type { ReactNode } from 'react'

type Props = {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bleed?: boolean
  id?: string
}

export function ListingSection({ title, action, children, className = '', bleed = false, id }: Props) {
  return (
    <section
      id={id}
      className={`listing-section${bleed ? ' listing-section--bleed' : ''} ${className}`.trim()}
    >
      {title || action ? (
        <div className="listing-section__head">
          {title ? <h2 className="listing-section__title">{title}</h2> : <span aria-hidden />}
          {action ?? null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
