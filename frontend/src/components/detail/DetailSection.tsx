import type { ReactNode } from 'react'

type Props = {
  title?: string
  subtitle?: string
  className?: string
  children: ReactNode
  id?: string
}

export function DetailSection({ title, subtitle, className = '', children, id }: Props) {
  return (
    <section id={id} className={`detail-section dl-detail__section ${className}`.trim()}>
      {title ? <h2 className="dl-detail__section-title">{title}</h2> : null}
      {subtitle ? <p className="dl-detail__section-sub">{subtitle}</p> : null}
      {children}
    </section>
  )
}
