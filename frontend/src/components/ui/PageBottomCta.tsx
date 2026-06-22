import { Link } from 'react-router-dom'
import { useId, type ReactNode } from 'react'
import './PageBottomCta.css'

type LinkAction = {
  label: string
  to: string
  icon?: ReactNode
}

type ButtonAction = {
  label: string
  onClick: () => void
  icon?: ReactNode
}

type Props = {
  title: string
  description: string
  action: LinkAction | ButtonAction
  className?: string
  tone?: 'dark' | 'light'
}

function isLinkAction(action: LinkAction | ButtonAction): action is LinkAction {
  return 'to' in action
}

export function PageBottomCta({ title, description, action, className = '', tone = 'dark' }: Props) {
  const titleId = useId()

  return (
    <section
      className={`page-bottom-cta page-bottom-cta--${tone} ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="page-bottom-cta__title">
        {title}
      </h2>
      <p className="page-bottom-cta__text">{description}</p>
      {isLinkAction(action) ? (
        <Link to={action.to} className="btn btn-primary page-bottom-cta__btn">
          {action.icon}
          {action.label}
        </Link>
      ) : (
        <button type="button" className="btn btn-primary page-bottom-cta__btn" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </button>
      )}
    </section>
  )
}
