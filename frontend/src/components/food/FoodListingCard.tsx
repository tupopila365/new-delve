import { useEffect, useRef, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Heart, MapPin, Share2, Star, Utensils } from 'lucide-react'
import { foodCoverSrc, foodOpenBadge } from '../../utils/foodDisplay'
import { cuisineIcon, cuisineLabel, priceLevelLabel, priceLevelName } from '../../utils/foodListing'
import './food-list.css'

export type FoodCardVenue = {
  id: number
  name: string
  description?: string
  cuisine: string
  region: string
  city?: string | null
  cover_image: string | null
  cover_kind?: 'image' | 'video' | string | null
  price_level: number
  rating_avg?: string | null
  rating_count?: number | null
  is_open?: boolean | null
  closes_at?: string | null
  tagline?: string | null
  popular_dish?: string | null
  takeaway?: boolean | null
  delivery?: boolean | null
  reservations?: boolean | null
  is_featured_partner?: boolean
  partner_label?: string
  liked_by_me?: boolean
  likes_count?: number
  saved_by_me?: boolean
  saves_count?: number
}

type Props = {
  venue: FoodCardVenue
  liked: boolean
  saved: boolean
  likeCount?: number
  likeBusy?: boolean
  saveBusy?: boolean
  onToggleLike: (id: number, e: MouseEvent) => void
  onToggleSave: (id: number, e: MouseEvent) => void
  onShare?: (id: number, e: MouseEvent) => void
}

function onImgError(e: React.SyntheticEvent<HTMLImageElement>, cuisine: string) {
  const img = e.currentTarget
  const fallback = foodCoverSrc(null, cuisine)
  if (img.src !== fallback) img.src = fallback
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(n)
}

export function FoodListingCard({
  venue,
  liked,
  saved,
  likeCount = 0,
  likeBusy = false,
  saveBusy = false,
  onToggleLike,
  onToggleSave,
  onShare,
}: Props) {
  const Icon = cuisineIcon(venue.cuisine)
  const location = venue.city ? `${venue.city}, ${venue.region}` : venue.region
  const price = priceLevelLabel(venue.price_level)
  const openLabel = foodOpenBadge(venue.is_open, venue.closes_at)
  const ratingCount = venue.rating_count ?? 0
  const ratingNum = venue.rating_avg != null && venue.rating_avg !== '' ? Number(venue.rating_avg) : null
  const ratingLabel =
    ratingCount > 0 && ratingNum != null && Number.isFinite(ratingNum) && ratingNum > 0
      ? ratingNum.toFixed(1)
      : null
  const isVideoCover = venue.cover_kind === 'video'
  const coverSrc = foodCoverSrc(venue.cover_image, venue.cuisine)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVideoCover) return
    const root = mediaRef.current
    const video = videoRef.current
    if (!root || !video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.55 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [isVideoCover, coverSrc])

  return (
    <Link to={`/food/${venue.id}`} className="fd-spot">
      <div className="fd-spot__media" ref={mediaRef}>
        {isVideoCover && venue.cover_image ? (
          <video
            ref={videoRef}
            className="fd-spot__img fd-spot__video"
            src={venue.cover_image}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={venue.name}
          />
        ) : (
          <img
            className="fd-spot__img"
            src={coverSrc}
            alt={venue.name}
            loading="lazy"
            onError={(e) => onImgError(e, venue.cuisine)}
          />
        )}
        {openLabel ? (
          <span className={`fd-spot__open${venue.is_open === false ? ' is-closed' : ''}`}>{openLabel}</span>
        ) : null}
        {venue.is_featured_partner ? (
          <span className="fd-spot__partner">{venue.partner_label || 'Featured'}</span>
        ) : null}
        <div className="fd-spot__actions" aria-label="Venue actions">
          <button
            type="button"
            className={`fd-spot__act fd-spot__act--like${liked ? ' is-active' : ''}`}
            aria-label={liked ? 'Unlike venue' : 'Like venue'}
            aria-pressed={liked}
            disabled={likeBusy}
            onClick={(e) => onToggleLike(venue.id, e)}
          >
            <Heart size={17} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            {likeCount > 0 ? <span>{formatCount(likeCount)}</span> : null}
          </button>
          {onShare ? (
            <button
              type="button"
              className="fd-spot__act"
              aria-label="Share venue"
              onClick={(e) => onShare(venue.id, e)}
            >
              <Share2 size={16} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className={`fd-spot__act fd-spot__act--save${saved ? ' is-active' : ''}`}
            aria-label={saved ? 'Remove from saved' : 'Save venue'}
            aria-pressed={saved}
            disabled={saveBusy}
            onClick={(e) => onToggleSave(venue.id, e)}
          >
            <Bookmark size={17} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </div>

      <div className="fd-spot__body">
        <div className="fd-spot__meta-row">
          <span className="fd-spot__cuisine">
            <Icon size={13} strokeWidth={2.25} aria-hidden />
            {cuisineLabel(venue.cuisine)}
          </span>
          <span className="fd-spot__price" title={priceLevelName(venue.price_level)}>
            {price}
          </span>
        </div>

        <h2 className="fd-spot__title">{venue.name}</h2>

        <p className="fd-spot__location">
          <MapPin size={13} strokeWidth={2.25} aria-hidden />
          {location || 'Namibia'}
        </p>

        {venue.popular_dish?.trim() ? (
          <p className="fd-spot__dish">
            <Utensils size={12} strokeWidth={2.25} aria-hidden />
            Known for <strong>{venue.popular_dish.trim()}</strong>
          </p>
        ) : venue.tagline?.trim() ? (
          <p className="fd-spot__dish">{venue.tagline.trim()}</p>
        ) : null}

        <div className="fd-spot__foot">
          {ratingLabel ? (
            <span className="fd-spot__rating">
              <Star size={13} strokeWidth={2.25} fill="currentColor" aria-hidden />
              {ratingLabel}
              {venue.rating_count ? <em>({venue.rating_count})</em> : null}
            </span>
          ) : (
            <span className="fd-spot__rating fd-spot__rating--muted">New on DELVE</span>
          )}
          <span className="fd-spot__cta">View</span>
        </div>
      </div>
    </Link>
  )
}
