import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import './EmptyState.css'

type Cta = { label: string; to: string } | { label: string; onClick: () => void }

type Props = {
  /** @deprecated Prefer iconElement. Kept for backward compatibility, but not rendered for product consistency. */
  icon?: string
  iconElement?: ReactNode
  title: string
  sub?: string
  cta?: Cta
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ iconElement, title, sub, cta, action, className = '', compact }: Props) {
  return (
    <div
      className={`ui-empty${compact ? ' ui-empty--compact' : ''} ${className}`.trim()}
      role="status"
    >
      <div className="ui-empty__inner">
        {iconElement ? (
          <div className="ui-empty__icon-wrap">
            <div className="ui-empty__icon ui-empty__icon--graphic">{iconElement}</div>
          </div>
        ) : null}
        <p className="ui-empty__title">{title}</p>
        {sub ? <p className="ui-empty__sub">{sub}</p> : null}
        {action}
        {cta && 'to' in cta ? (
          <Link to={cta.to} className="btn btn-primary ui-empty__cta">
            {cta.label}
          </Link>
        ) : null}
        {cta && 'onClick' in cta ? (
          <button type="button" className="btn btn-primary ui-empty__cta" onClick={cta.onClick}>
            {cta.label}
          </button>
        ) : null}
      </div>
    </div>
  )
}
