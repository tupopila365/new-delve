import { useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  Heart,
  MessageCircle,
  Route,
  Share2,
  UserRound,
} from 'lucide-react'
import type { MockTrip } from '../../data/mockTrips'
import {
  dayLabel,
  formatJourneyCost,
  journeyAccentBadge,
  journeyCoverSrc,
  journeyHook,
  JOURNEY_DEFAULT_IMAGE,
  routeLabel,
  stopsPreviewLabel,
} from '../../utils/journeyDisplay'
import './JourneyListingCard.css'

type Props = {
  trip: MockTrip
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

function stopChips(trip: MockTrip, max = 4): string[] {
  const names = trip.stops.map((s) => s.place_name.trim()).filter(Boolean)
  if (names.length === 0) return []
  if (names.length <= max) return names
  return [...names.slice(0, max - 1), `+${names.length - (max - 1)}`]
}

export function JourneyListingCard({
  trip,
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
  const accent = journeyAccentBadge(trip)
  const stopsLine = stopsPreviewLabel(trip)
  const chips = stopChips(trip)
  const featured = variant === 'featured'
  const rail = variant === 'rail'
  const likes = likeCount ?? trip.likes_count ?? 0
  const saves = saveCount ?? trip.saves_count ?? 0
  const [heartBurst, setHeartBurst] = useState(false)
  const lastTapRef = useRef(0)

  function fireHeartBurst() {
    setHeartBurst(true)
    window.setTimeout(() => setHeartBurst(false), 700)
  }

  function handleMediaClick(event: MouseEvent<HTMLAnchorElement>) {
    // Double-tap / double-click to like (social habit) without blocking navigation timing.
    const now = Date.now()
    if (now - lastTapRef.current < 320) {
      event.preventDefault()
      if (!liked) {
        onLike(event)
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
        featured ? 'jn-feed-card--featured' : '',
        rail ? 'jn-feed-card--rail' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="jn-feed-card__head">
        <Link to={`/u/${trip.author.username}`} className="jn-feed-card__author">
          {trip.author.avatar ? (
            <img src={trip.author.avatar} alt="" className="jn-feed-card__avatar" loading="lazy" />
          ) : (
            <span className="jn-feed-card__avatar jn-feed-card__avatar--fallback" aria-hidden>
              <UserRound size={16} strokeWidth={2.25} />
            </span>
          )}
          <span className="jn-feed-card__author-copy">
            <span className="jn-feed-card__author-name">{trip.author.display_name}</span>
            <span className="jn-feed-card__author-meta">{routeLabel(trip)}</span>
          </span>
        </Link>
        {accent ? <span className="jn-feed-card__pill">{accent}</span> : null}
      </header>

      <Link
        to={`/journeys/${trip.id}`}
        className="jn-feed-card__media"
        aria-label={`View ${trip.title}`}
        onClick={handleMediaClick}
      >
        {trip.cover_image ? (
          <img
            src={journeyCoverSrc(trip.cover_image)}
            alt=""
            loading="lazy"
            onError={(event) => {
              const image = event.currentTarget
              if (image.src !== JOURNEY_DEFAULT_IMAGE) image.src = JOURNEY_DEFAULT_IMAGE
            }}
          />
        ) : (
          <div className="jn-feed-card__placeholder" aria-hidden>
            <Route size={featured ? 40 : 30} strokeWidth={1.75} />
          </div>
        )}
        <span className="jn-feed-card__days">{dayLabel(trip.days)}</span>
        {heartBurst ? (
          <span className="jn-feed-card__burst" aria-hidden>
            <Heart size={72} strokeWidth={1.5} fill="currentColor" />
          </span>
        ) : null}
      </Link>

      <div className="jn-feed-card__actions" aria-label="Journey actions">
        <div className="jn-feed-card__actions-primary">
          <button
            type="button"
            className={`jn-feed-card__action jn-feed-card__action--like${liked ? ' is-active' : ''}`}
            onClick={onLike}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike journey' : 'Like journey'}
            aria-pressed={liked}
          >
            <Heart size={22} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            {likes > 0 ? <span>{formatCount(likes)}</span> : null}
          </button>
          <Link
            to={`/journeys/${trip.id}#comments`}
            className="jn-feed-card__action"
            aria-label={`${trip.comments_count} comments`}
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle size={22} strokeWidth={2.25} aria-hidden />
            {trip.comments_count > 0 ? <span>{formatCount(trip.comments_count)}</span> : null}
          </Link>
          <button
            type="button"
            className="jn-feed-card__action"
            onClick={onShare}
            aria-label="Share journey"
          >
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          className={`jn-feed-card__action jn-feed-card__action--save${saved ? ' is-active' : ''}`}
          onClick={onSave}
          disabled={saveBusy}
          aria-label={saved ? 'Remove saved journey' : 'Save journey'}
          aria-pressed={saved}
        >
          <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          {saves > 0 ? <span>{formatCount(saves)}</span> : null}
        </button>
      </div>

      <div className="jn-feed-card__body">
        {likes > 0 ? (
          <p className="jn-feed-card__social-line">
            Liked by <strong>{formatCount(likes)}</strong> traveller{likes === 1 ? '' : 's'}
          </p>
        ) : null}

        <Link to={`/journeys/${trip.id}`} className="jn-feed-card__title">
          {trip.title}
        </Link>

        {!rail && trip.summary ? (
          <p className="jn-feed-card__summary">{trip.summary}</p>
        ) : null}

        {chips.length > 0 ? (
          <p className="jn-feed-card__route-strip" aria-label="Route stops">
            {chips.map((name, i) => (
              <span key={`${name}-${i}`}>
                {i > 0 ? <span className="jn-feed-card__route-sep" aria-hidden>→</span> : null}
                <span className="jn-feed-card__route-stop">{name}</span>
              </span>
            ))}
          </p>
        ) : stopsLine ? (
          <p className="jn-feed-card__route-strip">{stopsLine}</p>
        ) : null}

        <p className="jn-feed-card__hook">{journeyHook(trip)}</p>

        {trip.total_cost > 0 ? (
          <p className="jn-feed-card__cost-meta">
            ~{formatJourneyCost(trip.total_cost, trip.currency)}
            <span> est. total</span>
          </p>
        ) : null}
      </div>
    </article>
  )
}
