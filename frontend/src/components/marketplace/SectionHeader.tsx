import { Link } from 'react-router-dom'

type Props = {
  title: string
  subtitle?: string
  seeAllTo?: string
  seeAllLabel?: string
  id?: string
  className?: string
}

export function SectionHeader({ title, subtitle, seeAllTo, seeAllLabel = 'See all', id, className = '' }: Props) {
  return (
    <div className={`mk-section-head ${className}`.trim()}>
      <div>
        {id ? (
          <h2 id={id} className="mk-section-head__title">
            {title}
          </h2>
        ) : (
          <h2 className="mk-section-head__title">{title}</h2>
        )}
        {subtitle ? <p className="mk-section-head__sub">{subtitle}</p> : null}
      </div>
      {seeAllTo ? (
        <Link to={seeAllTo} className="section-see-all mk-section-head__link">
          {seeAllLabel}
        </Link>
      ) : null}
    </div>
  )
}
