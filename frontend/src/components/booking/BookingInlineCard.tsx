import type { ReactNode } from 'react'
import { DetailActionCard } from '../detail'
import './booking-detail.css'

type Props = {
  kicker?: string
  title: ReactNode
  meta?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function BookingInlineCard({ kicker, title, meta, children, footer, className = '' }: Props) {
  return (
    <DetailActionCard
      kicker={kicker}
      title={title}
      className={`bk-inline-card ${className}`.trim()}
      footer={footer}
    >
      {meta ? <div className="bk-inline-card__meta">{meta}</div> : null}
      <div className="bk-inline-card__body">{children}</div>
    </DetailActionCard>
  )
}
