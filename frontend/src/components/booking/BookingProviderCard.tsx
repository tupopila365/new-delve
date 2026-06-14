import { Link } from 'react-router-dom'
import { MapPin, MessageCircle } from 'lucide-react'

type Props = {
  name: string
  role?: string
  avatar?: string
  href?: string
  onMessage?: () => void
  messageLabel?: string
  className?: string
}

export function BookingProviderCard({
  name,
  role,
  avatar,
  href,
  onMessage,
  messageLabel = 'Message provider',
  className = '',
}: Props) {
  const avatarEl = avatar ? (
    <img src={avatar} alt="" className="bk-provider__avatar" />
  ) : (
    <span className="bk-provider__avatar bk-provider__avatar--placeholder" aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  )

  return (
    <div className={`bk-provider ${className}`.trim()}>
      {href ? (
        <Link to={href} className="bk-provider__link">
          {avatarEl}
          <span className="bk-provider__info">
            <span className="bk-provider__name">{name}</span>
            {role ? <span className="bk-provider__role">{role}</span> : null}
          </span>
        </Link>
      ) : (
        <div className="bk-provider__link">
          {avatarEl}
          <span className="bk-provider__info">
            <span className="bk-provider__name">{name}</span>
            {role ? <span className="bk-provider__role">{role}</span> : null}
          </span>
        </div>
      )}
      {onMessage ? (
        <button type="button" className="btn btn-ghost btn-sm bk-provider__msg" onClick={onMessage}>
          <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
          {messageLabel}
        </button>
      ) : null}
    </div>
  )
}
