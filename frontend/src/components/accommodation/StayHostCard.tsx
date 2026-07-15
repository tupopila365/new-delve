import { Link } from 'react-router-dom'
import { MapPin, MessageCircle, UserRound } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { JourneySection } from '../journeys/JourneySection'
import { messageProviderPath } from '../messages/messageProviderUtils'

type Props = {
  username: string
  listingId: string
  listingTitle: string
  regionLine?: string | null
  displayName?: string | null
  photo?: string | null
  className?: string
}

export function StayHostCard({
  username,
  listingId,
  listingTitle,
  regionLine,
  displayName,
  photo,
  className = '',
}: Props) {
  const profileHref = `/u/${encodeURIComponent(username)}`
  const name = displayName?.trim() || `@${username}`
  const initial = (displayName?.trim() || username).charAt(0).toUpperCase() || 'H'
  const avatarSrc = photo
    ? /^https?:\/\//i.test(photo)
      ? photo
      : mediaUrl(photo) || photo
    : null
  const messageHref = messageProviderPath(username, {
    type: 'accommodation',
    id: listingId,
    label: listingTitle,
  })

  return (
    <JourneySection title="Your host" className={`acc-host-section ${className}`.trim()}>
      <div className="acc-host-card">
        <div className="acc-host-card__avatar" aria-hidden>
          {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{initial}</span>}
        </div>
        <div className="acc-host-card__body">
          <p className="acc-host-card__kicker">Stay host</p>
          <p className="acc-host-card__name">{name}</p>
          {regionLine ? (
            <p className="acc-host-card__loc">
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {regionLine}
            </p>
          ) : null}
          <p className="acc-host-card__bio">Message for check-in details or group stays.</p>
          <div className="acc-host-card__actions">
            <Link to={profileHref} className="jd-btn">
              <UserRound size={14} strokeWidth={2.25} aria-hidden />
              <span className="jd-btn--label">View profile</span>
            </Link>
            <Link to={messageHref} className="jd-btn jd-btn--primary">
              <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
              <span className="jd-btn--label">Message</span>
            </Link>
          </div>
        </div>
      </div>
    </JourneySection>
  )
}
