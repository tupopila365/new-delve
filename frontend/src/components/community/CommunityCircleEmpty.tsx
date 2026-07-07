import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './community-circle-empty.css'
import './community-feed-cards.css'

type CircleAction =
  | { label: string; to: string; icon: ReactNode }
  | { label: string; onClick: () => void; icon: ReactNode }

type Props = {
  title: string
  sub?: string
  actions: CircleAction[]
}

export function CommunityCircleEmpty({ title, sub, actions }: Props) {
  return (
    <div className="cm-circle-empty" role="status">
      <p className="cm-circle-empty__title">{title}</p>
      {sub ? <p className="cm-circle-empty__sub">{sub}</p> : null}
      <div className="cm-circle-empty__actions">
        {actions.map((action) =>
          'to' in action ? (
            <Link
              key={`${action.to}-${action.label}`}
              to={action.to}
              className="cm-feed-toolbar__item cm-feed-toolbar__item--action"
            >
              <span className="cm-feed-toolbar__circle" aria-hidden>
                {action.icon}
              </span>
              <span className="cm-feed-toolbar__label">{action.label}</span>
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              className="cm-feed-toolbar__item cm-feed-toolbar__item--action"
              onClick={action.onClick}
            >
              <span className="cm-feed-toolbar__circle" aria-hidden>
                {action.icon}
              </span>
              <span className="cm-feed-toolbar__label">{action.label}</span>
            </button>
          ),
        )}
      </div>
    </div>
  )
}
