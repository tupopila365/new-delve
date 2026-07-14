import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  Ticket,
  UserRound,
} from 'lucide-react'
import type { EventListing } from '../../utils/eventDisplay'
import {
  EVENT_DEFAULT_IMAGE,
  eventAccentBadge,
  eventLocationLine,
  eventPreviewMedia,
  eventPriceLabel,
  formatEventDate,
  organizerLabel,
} from '../../utils/eventDisplay'
import '../journeys/JourneyListingCard.css'
import './EventListingCard.css'

type Props = {
  event: EventListing
  variant?: 'default' | 'featured' | 'rail'
  liked: boolean
  saved: boolean
  likeCount?: number
  saveCount?: number
  likeBusy?: boolean
  saveBusy?: boolean
  onLike: (event: MouseEvent) => void
  onSave: (event: MouseEvent) => void
  onShare: (event: MouseEvent) => void
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(n)
}

export function EventListingCard({
  event,
  variant = 'default',
  liked,
  saved,
  likeCount,
  saveCount,
  likeBusy = false,
  saveBusy = false,
  onLike,
  onSave,
  onShare,
}: Props) {
  const when = formatEventDate(event.starts_at)
  const accent = eventAccentBadge(event)
  const price = eventPriceLabel(event)
  const location = eventLocationLine(event)
  const organizer = organizerLabel(event)
  const preview = eventPreviewMedia(event)
  const featured = variant === 'featured'
  const rail = variant === 'rail'
  const likes = likeCount ?? event.likes_count ?? 0
  const saves = saveCount ?? event.saves_count ?? 0
  const [heartBurst, setHeartBurst] = useState(false)
  const lastTapRef = useRef(0)
  const mediaRef = useRef<HTMLAnchorElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (preview.kind !== 'video') return
    const root = mediaRef.current
    const video = videoRef.current
    if (!root || !video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
          void video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: [0, 0.45, 0.75] },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [preview.kind, preview.src])

  function fireHeartBurst() {
    setHeartBurst(true)
    window.setTimeout(() => setHeartBurst(false), 700)
  }

  function handleMediaClick(clickEvent: MouseEvent<HTMLAnchorElement>) {
    const now = Date.now()
    if (now - lastTapRef.current < 320) {
      clickEvent.preventDefault()
      if (!liked) {
        onLike(clickEvent)
        fireHeartBurst()
      } else {
        fireHeartBurst()
      }
      lastTapRef.current = 0
      return
    }
    lastTapRef.current = now
  }

  return (
    <article
      className={[
        'jn-feed-card',
        'ev-feed-card',
        featured ? 'jn-feed-card--featured' : '',
        rail ? 'jn-feed-card--rail' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="jn-feed-card__head">
        {event.organizer_username ? (
          <Link to={`/u/${event.organizer_username}`} className="jn-feed-card__author">
            <span className="jn-feed-card__avatar jn-feed-card__avatar--fallback" aria-hidden>
              <UserRound size={16} strokeWidth={2.25} />
            </span>
            <span className="jn-feed-card__author-copy">
              <span className="jn-feed-card__author-name">{organizer}</span>
              <span className="jn-feed-card__author-meta">
                {when.full}
                {when.time ? ` · ${when.time}` : ''}
              </span>
            </span>
          </Link>
        ) : (
          <div className="jn-feed-card__author">
            <span className="jn-feed-card__avatar jn-feed-card__avatar--fallback" aria-hidden>
              <UserRound size={16} strokeWidth={2.25} />
            </span>
            <span className="jn-feed-card__author-copy">
              <span className="jn-feed-card__author-name">{organizer}</span>
              <span className="jn-feed-card__author-meta">
                {when.full}
                {when.time ? ` · ${when.time}` : ''}
              </span>
            </span>
          </div>
        )}
        {accent ? <span className="jn-feed-card__pill">{accent}</span> : null}
      </header>

      <Link
        ref={mediaRef}
        to={`/events/${event.id}`}
        className="jn-feed-card__media"
        aria-label={`View ${event.title}`}
        onClick={handleMediaClick}
      >
        {preview.kind === 'video' ? (
          <video
            ref={videoRef}
            className="ev-feed-card__video"
            src={preview.src}
            muted
            loop
            playsInline
            preload="metadata"
            poster={EVENT_DEFAULT_IMAGE}
          />
        ) : (
          <img
            src={preview.src}
            alt=""
            loading="lazy"
            onError={(imageEvent) => {
              const image = imageEvent.currentTarget
              if (image.src !== EVENT_DEFAULT_IMAGE) image.src = EVENT_DEFAULT_IMAGE
            }}
          />
        )}
        <span className="jn-feed-card__days" aria-label={`${when.weekday}, ${when.month} ${when.day}`}>
          {when.month} {when.day}
        </span>
        {heartBurst ? (
          <span className="jn-feed-card__burst" aria-hidden>
            <Heart size={72} strokeWidth={1.5} fill="currentColor" />
          </span>
        ) : null}
      </Link>

      <div className="jn-feed-card__actions" aria-label="Event actions">
        <div className="jn-feed-card__actions-primary">
          <button
            type="button"
            className={`jn-feed-card__action jn-feed-card__action--like${liked ? ' is-active' : ''}`}
            onClick={onLike}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike event' : 'Like event'}
            aria-pressed={liked}
          >
            <Heart size={22} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            {likes > 0 ? <span>{formatCount(likes)}</span> : null}
          </button>
          <Link
            to={`/events/${event.id}#event-comments`}
            className="jn-feed-card__action"
            aria-label={`${event.comments_count ?? 0} comments`}
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle size={22} strokeWidth={2.25} aria-hidden />
            {(event.comments_count ?? 0) > 0 ? <span>{formatCount(event.comments_count ?? 0)}</span> : null}
          </Link>
          <button
            type="button"
            className="jn-feed-card__action"
            onClick={onShare}
            aria-label="Share event"
          >
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          className={`jn-feed-card__action jn-feed-card__action--save${saved ? ' is-active' : ''}`}
          onClick={onSave}
          disabled={saveBusy}
          aria-label={saved ? 'Remove saved event' : 'Save event'}
          aria-pressed={saved}
        >
          <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          {saves > 0 ? <span>{formatCount(saves)}</span> : null}
        </button>
      </div>

      <div className="jn-feed-card__body">
        {likes > 0 ? (
          <p className="jn-feed-card__social-line">
            Liked by <strong>{formatCount(likes)}</strong> {likes === 1 ? 'person' : 'people'}
          </p>
        ) : null}

        <Link to={`/events/${event.id}`} className="jn-feed-card__title">
          {event.title}
        </Link>

        <p className="jn-feed-card__hook">
          {location}
          {price ? ` · ${price}` : ''}
        </p>

        {!rail && event.rsvp_count && event.rsvp_count > 0 ? (
          <p className="jn-feed-card__cost-meta">
            <Ticket size={12} strokeWidth={2.25} aria-hidden />
            {event.rsvp_count} going
          </p>
        ) : null}
      </div>
    </article>
  )
}
