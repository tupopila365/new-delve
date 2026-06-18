import { Link } from 'react-router-dom'
import { MessageProviderLink } from './MessageProviderLink'
import { messageProviderLabel } from './messageProviderUtils'
import './MessageProviderLink.css'

type Props = {
  username: string
  name: string
  role?: string | null
  kicker?: string
  avatar?: string | null
  bio?: string | null
  messageLabel?: string
  profileHref?: string
  className?: string
}

export function MessageProviderCard({
  username,
  name,
  role,
  kicker,
  avatar,
  bio,
  messageLabel,
  profileHref,
  className = '',
}: Props) {
  const label = messageLabel ?? messageProviderLabel(role)
  const profileLink = profileHref ?? `/u/${encodeURIComponent(username)}`

  return (
    <div className={`msg-provider-card ${className}`.trim()}>
      <div className="msg-provider-card__head">
        <span className="msg-provider-card__avatar" aria-hidden>
          {avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}
        </span>
        <div className="msg-provider-card__copy">
          {kicker ? <p className="msg-provider-card__kicker">{kicker}</p> : null}
          <p className="msg-provider-card__name">{name}</p>
          {role && !kicker ? <p className="msg-provider-card__kicker">{role}</p> : null}
        </div>
      </div>
      {bio ? <p className="msg-provider-card__bio">{bio}</p> : null}
      <div className="msg-provider-card__actions">
        <MessageProviderLink
          username={username}
          label={label}
          variant="primary"
          size="sm"
          className="msg-provider-card__msg"
        />
        <Link to={profileLink} className="btn btn-ghost btn-sm">
          View profile
        </Link>
      </div>
    </div>
  )
}
