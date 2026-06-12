import type { ReactNode } from 'react'

type Props = {
  kicker?: string
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function DetailActionCard({ kicker, title, children, footer, className = '' }: Props) {
  return (
    <div className={`dl-detail__action-card ${className}`.trim()}>
      {kicker ? <p className="dl-detail__action-kicker">{kicker}</p> : null}
      <h2 className="dl-detail__action-title">{title}</h2>
      <div className="dl-detail__action-body">{children}</div>
      {footer ? <div className="dl-detail__action-footer">{footer}</div> : null}
    </div>
  )
}
