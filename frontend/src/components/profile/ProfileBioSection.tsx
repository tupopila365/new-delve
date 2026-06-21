import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Compass, MapPin, MessageCircle, Plus, Share2, UserRound, Users } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { ReportButton } from '../report/ReportButton'
import './ProfileBioSection.css'

type Props = {
  displayName: string
  username: string
  avatar: string | null
  bio: string
  city?: string
  region?: string
  userType: string
  isMe: boolean
  messagesDisabled: boolean
  onShare: () => void
  actions?: ReactNode
}

function locationLabel(city?: string, region?: string): string {
  return [city, region].filter(Boolean).join(', ')
}

export function ProfileBioSection({
  displayName,
  username,
  avatar,
  bio,
  city,
  region,
  userType,
  isMe,
  messagesDisabled,
  onShare,
  actions,
}: Props) {
  const place = locationLabel(city, region)
  const avatarSrc = mediaUrl(avatar)
  const isProvider = userType === 'service_provider'

  return (
    <section className="profile-bio" aria-label="Profile">
      <div className="profile-bio__top">
        <div className="profile-bio__avatar-wrap">
          {avatarSrc ? (
            <img className="profile-bio__avatar" src={avatarSrc} alt={displayName} />
          ) : (
            <div className="profile-bio__avatar profile-bio__avatar--empty" aria-hidden>
              <UserRound size={28} strokeWidth={1.75} />
            </div>
          )}
        </div>

        <div className="profile-bio__actions">
          {actions ?? (
            <>
              {isMe ? (
                <>
                  <Link to="/settings" className="profile-bio__btn">
                    Edit profile
                  </Link>
                  <Link to="/create" className="profile-bio__btn profile-bio__btn--accent">
                    <Plus size={14} strokeWidth={2.5} aria-hidden />
                    Share a moment
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="profile-bio__btn"
                    disabled
                    title="Follow coming soon"
                    aria-label="Follow (coming soon)"
                  >
                    <Users size={14} strokeWidth={2.25} aria-hidden />
                    Follow
                  </button>
                  {messagesDisabled ? (
                    <span className="profile-bio__btn profile-bio__btn--disabled" aria-disabled="true">
                      <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
                      Message
                    </span>
                  ) : (
                    <Link to="/messages" className="profile-bio__btn profile-bio__btn--accent">
                      <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
                      Message
                    </Link>
                  )}
                </>
              )}
              <button
                type="button"
                className="profile-bio__btn profile-bio__btn--icon"
                onClick={onShare}
                aria-label="Share profile"
              >
                <Share2 size={14} strokeWidth={2.25} aria-hidden />
              </button>
              {!isMe ? (
                <ReportButton
                  className="profile-bio__btn profile-bio__btn--report"
                  iconOnly
                  triggerLabel="Report profile"
                  target={{
                    target_type: 'user',
                    target_id: username,
                    target_label: `@${username}`,
                  }}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="profile-bio__copy">
        <h1 className="profile-bio__name">{displayName}</h1>
        <p className="profile-bio__handle">@{username}</p>
        {place ? (
          <p className="profile-bio__place">
            <MapPin size={13} strokeWidth={2.25} aria-hidden />
            {place}
          </p>
        ) : null}
        {bio ? (
          <p className="profile-bio__text">{bio}</p>
        ) : (
          <p className="profile-bio__text profile-bio__text--empty">No bio yet.</p>
        )}
        {isProvider ? (
          <span className="profile-bio__badge">
            <Compass size={11} strokeWidth={2.25} aria-hidden />
            Community contributor
          </span>
        ) : null}
      </div>
    </section>
  )
}
