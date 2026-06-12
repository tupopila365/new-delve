import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, backTo, backLabel = 'Back', action, className = '' }: Props) {
  return (
    <header className={`ui-page-header ${className}`.trim()}>
      {backTo ? (
        <Link to={backTo} className="ui-page-header__back">
          ← {backLabel}
        </Link>
      ) : null}
      <div className="ui-page-header__main">
        <div>
          <h1 className="ui-page-header__title">{title}</h1>
          {subtitle ? <p className="ui-page-header__sub">{subtitle}</p> : null}
        </div>
        {action ? <div className="ui-page-header__action">{action}</div> : null}
      </div>
    </header>
  )
}
