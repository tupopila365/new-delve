import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Compass, MapPin, MessageCircle, Plus, Share2, Users } from 'lucide-react'
import { EditableProfileAvatar } from '../avatar/EditableProfileAvatar'
import { UserAvatar } from '../UserAvatar'
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
  isFollowing?: boolean
  followLoading?: boolean
  onFollowToggle?: () => void
  followHref?: string
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
  isFollowing = false,
  followLoading = false,
  onFollowToggle,
  followHref,
  onShare,
  actions,
}: Props) {
  const place = locationLabel(city, region)
  const isProvider = userType === 'service_provider'
  const messagePath = `/messages/u/${encodeURIComponent(username)}`

  return (
    <section className="profile-bio" aria-label="Profile">
      <div className="profile-bio__top">
        <div className="profile-bio__avatar-wrap">
          {isMe ? (
            <EditableProfileAvatar avatar={avatar} displayName={displayName} username={username} />
          ) : (
            <UserAvatar
              src={avatar}
              name={displayName}
              size="xl"
              shape="rounded"
              className="profile-bio__avatar"
              fill
            />
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
                  {followHref ? (
                    <Link to={followHref} className="profile-bio__btn">
                      <Users size={14} strokeWidth={2.25} aria-hidden />
                      Follow
                    </Link>
                  ) : onFollowToggle ? (
                    <button
                      type="button"
                      className={
                        isFollowing
                          ? 'profile-bio__btn profile-bio__btn--following'
                          : 'profile-bio__btn'
                      }
                      onClick={onFollowToggle}
                      disabled={followLoading}
                      aria-pressed={isFollowing}
                      aria-label={isFollowing ? 'Unfollow' : 'Follow'}
                    >
                      <Users size={14} strokeWidth={2.25} aria-hidden />
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  ) : null}
                  {messagesDisabled ? (
                    <span
                      className="profile-bio__btn profile-bio__btn--disabled"
                      aria-disabled="true"
                      title="This person is not accepting messages"
                    >
                      <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
                      Message
                    </span>
                  ) : (
                    <Link to={messagePath} className="profile-bio__btn profile-bio__btn--accent">
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
          <span className="profile-bio__badge profile-bio__badge--provider">
            <Compass size={11} strokeWidth={2.25} aria-hidden />
            Service provider
          </span>
        ) : null}
      </div>
    </section>
  )
}
