import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeDollarSign,
  Bookmark,
  CalendarDays,
  Clock,
  Heart,
  MapPin,
  Share2,
  Sparkles,
  Ticket,
  UserRound,
} from 'lucide-react'
import type { EventListing } from '../../utils/eventDisplay'
import {
  categoryMeta,
  eventAccentBadge,
  eventCoverSrc,
  EVENT_DEFAULT_IMAGE,
  eventLocationLine,
  eventPriceLabel,
  formatEventDate,
  organizerLabel,
} from '../../utils/eventDisplay'
import './EventListingCard.css'

type Props = {
  event: EventListing
  variant?: 'default' | 'featured'
  liked: boolean
  saved: boolean
  likeCount: number
  onLike: (event: MouseEvent) => void
  onSave: (event: MouseEvent) => void
  onShare: (event: MouseEvent) => void
}

export function EventListingCard({
  event,
  variant = 'default',
  liked,
  saved,
  likeCount,
  onLike,
  onSave,
  onShare,
}: Props) {
  const when = formatEventDate(event.starts_at)
  const cat = categoryMeta(event.category)
  const CatIcon = cat.Icon
  const accent = eventAccentBadge(event)
  const price = eventPriceLabel(event)
  const location = eventLocationLine(event)
  const organizer = organizerLabel(event)
  const featured = variant === 'featured'

  return (
    <article
      className={[
        'event-card-v2',
        featured ? 'event-card-v2--featured' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Link to={`/events/${event.id}`} className="event-card-v2__media" aria-label={`View ${event.title}`}>
        <img
          src={eventCoverSrc(event.cover_image, event.category)}
          alt={event.title}
          loading="lazy"
          onError={(imageEvent) => {
            const image = imageEvent.currentTarget
            if (image.src !== EVENT_DEFAULT_IMAGE) image.src = EVENT_DEFAULT_IMAGE
          }}
        />

        {featured ? (
          <span className="event-card-v2__badge event-card-v2__badge--featured">
            <Sparkles size={12} strokeWidth={2.35} aria-hidden />
            Featured
          </span>
        ) : (
          <span className="event-card-v2__badge">{accent}</span>
        )}

        <div className="event-card-v2__date-badge" aria-label={`${when.weekday}, ${when.month} ${when.day}`}>
          <span className="event-card-v2__date-month">{when.month}</span>
          <span className="event-card-v2__date-day">{when.day}</span>
        </div>

        <div className="event-card-v2__overlay-actions">
          <button
            type="button"
            className={liked ? 'is-active' : ''}
            onClick={onLike}
            aria-label={liked ? 'Unlike event' : 'Like event'}
          >
            <Heart size={16} strokeWidth={2.35} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button
            type="button"
            className={saved ? 'is-active' : ''}
            onClick={onSave}
            aria-label={saved ? 'Remove saved event' : 'Save event'}
          >
            <Bookmark size={16} strokeWidth={2.35} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button type="button" onClick={onShare} aria-label="Share event">
            <Share2 size={16} strokeWidth={2.35} aria-hidden />
          </button>
        </div>
      </Link>

      <div className="event-card-v2__body">
        <div className="event-card-v2__topline">
          <div>
            <p className="event-card-v2__category">
              <CatIcon size={12} strokeWidth={2.5} aria-hidden />
              {cat.label}
            </p>
            <Link to={`/events/${event.id}`} className="event-card-v2__title">
              {event.title}
            </Link>
          </div>
          {price ? (
            <p className="event-card-v2__price">
              {event.is_free ? (
                <BadgeDollarSign size={13} strokeWidth={2.25} aria-hidden />
              ) : (
                <Ticket size={13} strokeWidth={2.25} aria-hidden />
              )}
              {price}
            </p>
          ) : null}
        </div>

        <p className="event-card-v2__when">
          <Clock size={13} strokeWidth={2.25} aria-hidden />
          {when.full} · {when.time}
        </p>

        <p className="event-card-v2__venue">
          <MapPin size={13} strokeWidth={2.25} aria-hidden />
          <span>{location}</span>
        </p>

        <div className="event-card-v2__facts" aria-label="Event details">
          <span>
            <CalendarDays size={13} strokeWidth={2.25} aria-hidden />
            {when.weekday}
          </span>
          <span>
            <CatIcon size={13} strokeWidth={2.25} aria-hidden />
            {cat.label}
          </span>
          {likeCount > 0 ? (
            <span>
              <Heart size={13} strokeWidth={2.25} aria-hidden />
              {likeCount}
            </span>
          ) : null}
          {event.region ? (
            <span>
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {event.region}
            </span>
          ) : null}
        </div>

        <p className="event-card-v2__organizer">
          <UserRound size={14} strokeWidth={2.25} aria-hidden />
          {event.organizer_username ? (
            <Link to={`/u/${event.organizer_username}`}>{organizer}</Link>
          ) : (
            <span>{organizer}</span>
          )}
        </p>
      </div>
    </article>
  )
}
