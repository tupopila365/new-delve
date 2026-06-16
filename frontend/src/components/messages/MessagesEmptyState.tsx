import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './MessagesEmptyState.css'

type Action =
  | { label: string; onClick: () => void }
  | { label: string; href: string }

type Props = {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: Action
}

export function MessagesEmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <div className="msg-empty" role="status">
      <span className="msg-empty__icon" aria-hidden>
        {icon}
      </span>
      <p className="msg-empty__title">{title}</p>
      {subtitle ? <p className="msg-empty__subtitle">{subtitle}</p> : null}
      {action && 'href' in action ? (
        <Link to={action.href} className="msg-empty__action">
          {action.label}
        </Link>
      ) : null}
      {action && 'onClick' in action ? (
        <button type="button" className="msg-empty__action" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
