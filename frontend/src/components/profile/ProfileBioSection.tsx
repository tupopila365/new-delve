import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Compass, MapPin, MessageCircle, Plus, Share2, Users } from 'lucide-react'
import { EditableProfileAvatar } from '../avatar/EditableProfileAvatar'
import { UserAvatar } from '../UserAvatar'
import { ReportButton } from '../report/ReportButton'
import { HOME_ATMOSPHERE_BG } from '../../data/homeDefaults'
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

  const actionRow =
    actions ??
    (isMe ? (
      <>
        <Link to="/settings" className="profile-bio__btn">
          Edit profile
        </Link>
        <Link to="/create" className="profile-bio__btn profile-bio__btn--accent">
          <Plus size={14} strokeWidth={2.5} aria-hidden />
          Share a moment
        </Link>
        <button
          type="button"
          className="profile-bio__btn profile-bio__btn--icon"
          onClick={onShare}
          aria-label="Share profile"
        >
          <Share2 size={14} strokeWidth={2.25} aria-hidden />
        </button>
      </>
    ) : (
      <>
        {followHref ? (
          <Link to={followHref} className="profile-bio__btn profile-bio__btn--accent">
            <Users size={14} strokeWidth={2.25} aria-hidden />
            Follow
          </Link>
        ) : onFollowToggle ? (
          <button
            type="button"
            className={
              isFollowing
                ? 'profile-bio__btn profile-bio__btn--following'
                : 'profile-bio__btn profile-bio__btn--accent'
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
          <Link to={messagePath} className="profile-bio__btn">
            <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
            Message
          </Link>
        )}
        <button
          type="button"
          className="profile-bio__btn profile-bio__btn--icon"
          onClick={onShare}
          aria-label="Share profile"
        >
          <Share2 size={14} strokeWidth={2.25} aria-hidden />
        </button>
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
      </>
    ))

  return (
    <section className="profile-bio" aria-label="Profile">
      <div className="profile-bio__scene" aria-hidden>
        <div
          className="profile-bio__scene-photo"
          style={{ backgroundImage: `url(${HOME_ATMOSPHERE_BG})` }}
        />
        <div className="profile-bio__scene-veil" />
      </div>

      <div className="profile-bio__passport">
        <div className="profile-bio__identity">
          <div className="profile-bio__avatar-wrap">
            {isMe ? (
              <EditableProfileAvatar avatar={avatar} displayName={displayName} username={username} />
            ) : (
              <UserAvatar
                src={avatar}
                name={displayName}
                size="xl"
            shape="circle"
            className="profile-bio__avatar"
                fill
              />
            )}
          </div>

          <div className="profile-bio__copy">
            <p className="profile-bio__kicker">
              {isProvider ? 'Hosts on DELVE' : isMe ? 'Your trail' : 'On the road'}
            </p>
            <h1 className="profile-bio__name">{displayName}</h1>
            <p className="profile-bio__handle">@{username}</p>
            {place ? (
              <p className="profile-bio__place">
                <MapPin size={13} strokeWidth={2.25} aria-hidden />
                {place}
              </p>
            ) : null}
          </div>
        </div>

        {bio ? (
          <p className="profile-bio__text">{bio}</p>
        ) : (
          <p className="profile-bio__text profile-bio__text--empty">
            {isMe ? 'Add a short bio so travellers know who you are.' : 'No bio yet.'}
          </p>
        )}

        {isProvider ? (
          <span className="profile-bio__badge">
            <Compass size={11} strokeWidth={2.25} aria-hidden />
            Lists stays, food, guides, or more
          </span>
        ) : null}

        <div className="profile-bio__actions">{actionRow}</div>
      </div>
    </section>
  )
}
