import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  subtitle?: string
  label: string
  to: string
  /** @deprecated Use Icon instead. Kept so older callers do not break while they are migrated. */
  emoji?: string
  Icon?: LucideIcon
  className?: string
}

export function CreateCTA({ title, subtitle, label, to, Icon, className = '' }: Props) {
  return (
    <section className={`mk-create-cta ${className}`.trim()} aria-label={title}>
      {Icon ? (
        <span className="mk-create-cta__emoji mk-create-cta__icon" aria-hidden>
          <Icon size={24} strokeWidth={2.25} />
        </span>
      ) : null}
      <div className="mk-create-cta__copy">
        <h2 className="mk-create-cta__title">{title}</h2>
        {subtitle ? <p className="mk-create-cta__sub">{subtitle}</p> : null}
      </div>
      <Link to={to} className="btn btn-primary mk-create-cta__btn">
        {label}
      </Link>
    </section>
  )
}
