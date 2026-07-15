import { Link } from 'react-router-dom'
import { MapPin, MessageCircle, UserRound } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { JourneySection } from '../journeys/JourneySection'
import { messageProviderPath } from '../messages/messageProviderUtils'

type Props = {
  displayName: string
  username: string
  bio?: string | null
  regionLine?: string | null
  photo?: string | null
  guideId: string
  headline?: string
  className?: string
}

export function GuideProviderCard({
  displayName,
  username,
  bio,
  regionLine,
  photo,
  guideId,
  headline,
  className = '',
}: Props) {
  const profileHref = `/u/${encodeURIComponent(username)}`
  const avatarSrc = photo
    ? /^https?:\/\//i.test(photo)
      ? photo
      : mediaUrl(photo) || photo
    : null
  const initial = displayName.charAt(0).toUpperCase() || 'G'
  const messageHref = messageProviderPath(username, {
    type: 'guide',
    id: guideId,
    label: headline || displayName,
  })

  return (
    <JourneySection title="Your guide" className={`gd-provider-section ${className}`.trim()}>
      <div className="gd-provider-card">
        <div className="gd-provider-card__avatar" aria-hidden>
          {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{initial}</span>}
        </div>
        <div className="gd-provider-card__body">
          <p className="gd-provider-card__kicker">Local guide</p>
          <p className="gd-provider-card__name">{displayName}</p>
          {regionLine ? (
            <p className="gd-provider-card__loc">
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {regionLine}
            </p>
          ) : null}
          <p className="gd-provider-card__bio">
            {bio?.trim() ||
              'Experiences on DELVE. Message to discuss custom routes, languages, or group size.'}
          </p>
          <div className="gd-provider-card__actions">
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
