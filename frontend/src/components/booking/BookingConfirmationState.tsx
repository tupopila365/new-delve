import { CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

type Action = {
  label: string
  to?: string
  onClick?: () => void
  variant?: 'primary' | 'ghost'
}

type Props = {
  title?: string
  message?: string
  actions?: Action[]
  className?: string
}

export function BookingConfirmationState({
  title = 'Request sent',
  message = 'The provider will review your request and confirm the details.',
  actions = [],
  className = '',
}: Props) {
  return (
    <div className={`bk-confirm card ${className}`.trim()} role="status">
      <CheckCircle className="bk-confirm__icon" size={40} strokeWidth={2} aria-hidden />
      <h2 className="bk-confirm__title">{title}</h2>
      <p className="bk-confirm__text">{message}</p>
      {actions.length > 0 ? (
        <div className="bk-confirm__actions">
          {actions.map((a) =>
            a.to ? (
              <Link key={a.label} to={a.to} className={`btn ${a.variant === 'ghost' ? 'btn-ghost' : 'btn-primary'}`}>
                {a.label}
              </Link>
            ) : (
              <button
                key={a.label}
                type="button"
                className={`btn ${a.variant === 'ghost' ? 'btn-ghost' : 'btn-primary'}`}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}
