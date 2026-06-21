import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  title: string
  actionLabel?: string
  actionTo?: string
  badge?: ReactNode
  children: ReactNode
  id?: string
}

export function DelveAdminPanel({ title, actionLabel, actionTo, badge, children, id }: Props) {
  return (
    <section className="da-panel" id={id}>
      <div className="da-panel__head">
        <h2 className="da-panel__title">{title}</h2>
        {badge}
        {actionLabel && actionTo ? (
          <Link to={actionTo} className="da-panel__link">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="da-panel__body">{children}</div>
    </section>
  )
}
