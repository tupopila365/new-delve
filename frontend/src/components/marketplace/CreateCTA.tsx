import { Link } from 'react-router-dom'

type Props = {
  title: string
  subtitle?: string
  label: string
  to: string
  emoji?: string
  className?: string
}

export function CreateCTA({ title, subtitle, label, to, emoji, className = '' }: Props) {
  return (
    <section className={`mk-create-cta ${className}`.trim()} aria-label={title}>
      {emoji ? (
        <span className="mk-create-cta__emoji" aria-hidden>
          {emoji}
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
