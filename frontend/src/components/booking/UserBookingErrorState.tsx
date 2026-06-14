import { AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

type Action = {
  label: string
  to?: string
  onClick?: () => void
  variant?: 'primary' | 'ghost'
}

type Props = {
  title?: string
  message: string
  actions?: Action[]
  onDismiss?: () => void
  className?: string
}

export function UserBookingErrorState({
  title = "We couldn't send your request",
  message,
  actions = [],
  onDismiss,
  className = '',
}: Props) {
  return (
    <div className={`bk-error card ${className}`.trim()} role="alert">
      <AlertCircle className="bk-error__icon" size={22} strokeWidth={2.25} aria-hidden />
      <div className="bk-error__body">
        <h3 className="bk-error__title">{title}</h3>
        <p className="bk-error__text">{message}</p>
        {actions.length > 0 ? (
          <div className="bk-error__actions">
            {actions.map((a) =>
              a.to ? (
                <Link key={a.label} to={a.to} className={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}>
                  {a.label}
                </Link>
              ) : (
                <button
                  key={a.label}
                  type="button"
                  className={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={a.onClick}
                >
                  {a.label}
                </button>
              ),
            )}
          </div>
        ) : null}
        {onDismiss ? (
          <button type="button" className="bk-error__dismiss btn btn-ghost btn-sm" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  )
}
