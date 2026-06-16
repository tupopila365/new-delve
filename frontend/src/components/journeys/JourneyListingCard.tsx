import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  CalendarDays,
  Car,
  Heart,
  MapPin,
  MessageCircle,
  Route,
  Share2,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import type { MockTrip } from '../../data/mockTrips'
import {
  dayLabel,
  formatJourneyCost,
  journeyAccentBadge,
  journeyCoverSrc,
  journeyHook,
  JOURNEY_DEFAULT_IMAGE,
  partyLabel,
  routeLabel,
  stopsPreviewLabel,
  transportLabel,
  journeyStyleTags,
} from '../../utils/journeyDisplay'
import './JourneyListingCard.css'

type Props = {
  trip: MockTrip
  variant?: 'default' | 'featured' | 'rail'
  liked: boolean
  saved: boolean
  onLike: (event: MouseEvent) => void
  onSave: (event: MouseEvent) => void
  onShare: (event: MouseEvent) => void
}

export function JourneyListingCard({
  trip,
  variant = 'default',
  liked,
  saved,
  onLike,
  onSave,
  onShare,
}: Props) {
  const accent = journeyAccentBadge(trip)
  const tags = journeyStyleTags(trip)
  const stops = stopsPreviewLabel(trip)
  const featured = variant === 'featured'
  const rail = variant === 'rail'

  return (
    <article
      className={[
        'journey-card-v2',
        featured ? 'journey-card-v2--featured' : '',
        rail ? 'journey-card-v2--rail' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Link to={`/journeys/${trip.id}`} className="journey-card-v2__media" aria-label={`View ${trip.title}`}>
        {trip.cover_image ? (
          <img
            src={journeyCoverSrc(trip.cover_image)}
            alt={trip.title}
            loading="lazy"
            onError={(event) => {
              const image = event.currentTarget
              if (image.src !== JOURNEY_DEFAULT_IMAGE) image.src = JOURNEY_DEFAULT_IMAGE
            }}
          />
        ) : (
          <div className="journey-card-v2__placeholder" aria-hidden>
            <Route size={featured ? 40 : 30} strokeWidth={1.75} />
          </div>
        )}

        {featured ? (
          <span className="journey-card-v2__badge journey-card-v2__badge--featured">
            <Sparkles size={12} strokeWidth={2.35} aria-hidden />
            Featured journey
          </span>
        ) : accent ? (
          <span className="journey-card-v2__badge">{accent}</span>
        ) : null}

        <span className="journey-card-v2__days">
          <CalendarDays size={12} strokeWidth={2.35} aria-hidden />
          {dayLabel(trip.days)}
        </span>

        <div className="journey-card-v2__overlay-actions">
          <button
            type="button"
            className={liked ? 'is-active' : ''}
            onClick={onLike}
            aria-label={liked ? 'Unlike journey' : 'Like journey'}
          >
            <Heart size={16} strokeWidth={2.35} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button
            type="button"
            className={saved ? 'is-active' : ''}
            onClick={onSave}
            aria-label={saved ? 'Remove saved journey' : 'Save journey'}
          >
            <Bookmark size={16} strokeWidth={2.35} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button type="button" onClick={onShare} aria-label="Share journey">
            <Share2 size={16} strokeWidth={2.35} aria-hidden />
          </button>
        </div>
      </Link>

      <div className="journey-card-v2__body">
        <div className="journey-card-v2__topline">
          <div>
            <Link to={`/journeys/${trip.id}`} className="journey-card-v2__title">
              {trip.title}
            </Link>
            <p className="journey-card-v2__route">
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {routeLabel(trip)}
            </p>
          </div>
          <p className="journey-card-v2__cost">
            <span>Total</span>
            {formatJourneyCost(trip.total_cost, trip.currency)}
            <small>est.</small>
          </p>
        </div>

        {!rail ? <p className="journey-card-v2__summary">{trip.summary}</p> : null}

        {stops ? (
          <p className="journey-card-v2__stops">
            <Route size={12} strokeWidth={2.25} aria-hidden />
            {stops}
          </p>
        ) : null}

        <div className="journey-card-v2__facts" aria-label="Journey facts">
          <span>
            <CalendarDays size={13} strokeWidth={2.25} aria-hidden />
            {dayLabel(trip.days)}
          </span>
          {trip.stops.length > 0 ? (
            <span>
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
            </span>
          ) : null}
          <span>
            <Users size={13} strokeWidth={2.25} aria-hidden />
            {partyLabel(trip.party)}
          </span>
          <span>
            <Car size={13} strokeWidth={2.25} aria-hidden />
            {transportLabel(trip.transport_modes)}
          </span>
          {trip.comments_count > 0 ? (
            <span>
              <MessageCircle size={13} strokeWidth={2.25} aria-hidden />
              {trip.comments_count}
            </span>
          ) : null}
        </div>

        {tags.length > 0 ? (
          <div className="journey-card-v2__tags" aria-label="Journey style">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}

        <p className="journey-card-v2__hook">
          <Sparkles size={13} strokeWidth={2.25} aria-hidden />
          {journeyHook(trip)}
        </p>

        <p className="journey-card-v2__creator">
          {trip.author.avatar ? (
            <img src={trip.author.avatar} alt="" className="journey-card-v2__creator-avatar" loading="lazy" />
          ) : (
            <UserRound size={14} strokeWidth={2.25} aria-hidden />
          )}
          By {trip.author.display_name}
        </p>
      </div>
    </article>
  )
}
