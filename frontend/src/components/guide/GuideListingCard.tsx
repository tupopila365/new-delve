import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Bookmark, Clock, Compass, MapPin, Share2, Star } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import './guide-list.css'

export type GuideCardData = {
  id: number
  headline: string
  bio?: string
  hourly_rate: string | null
  languages?: string[]
  regions: string[]
  photo: string | null
  username: string
  display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
  specialities?: string[]
  licensed_guide?: boolean
  response_hours_typical?: number | null
  tour_packages?: unknown[]
  saved_by_me?: boolean
  saves_count?: number
  is_featured_partner?: boolean
  partner_label?: string
}

type Props = {
  guide: GuideCardData
  saved: boolean
  saveBusy?: boolean
  onToggleSave: (id: number, e: MouseEvent) => void
  onShare?: (id: number, e: MouseEvent) => void
}

const FALLBACK_GUIDE_PHOTO = '/images/default-journey.jpg'
const FAST_RESPONSE_HOURS = 3

function onPhotoError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img.src.endsWith(FALLBACK_GUIDE_PHOTO)) {
    img.src = FALLBACK_GUIDE_PHOTO
  }
}

function displayName(g: GuideCardData): string {
  return g.display_name?.trim() || g.username
}

export function GuideListingCard({
  guide: g,
  saved,
  saveBusy = false,
  onToggleSave,
  onShare,
}: Props) {
  const name = displayName(g)
  const photo = mediaUrl(g.photo)
  const regionLine = (g.regions || []).slice(0, 2).join(' · ') || 'Namibia'
  const specs = (g.specialities || []).slice(0, 2)
  const packageCount = g.tour_packages?.length ?? 0
  const ratingNum = g.rating_avg != null && g.rating_avg !== '' ? Number(g.rating_avg) : null
  const ratingLabel =
    ratingNum != null && Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : null
  const fastReply = (g.response_hours_typical ?? 99) <= FAST_RESPONSE_HOURS

  return (
    <Link to={`/guides/${g.id}`} className="gl-spot">
      <div className="gl-spot__media">
        {photo ? (
          <img
            className="gl-spot__img"
            src={photo}
            alt={name}
            loading="lazy"
            onError={onPhotoError}
          />
        ) : (
          <div className="gl-spot__img gl-spot__placeholder" aria-hidden>
            <Compass size={36} strokeWidth={1.5} />
          </div>
        )}

        {g.is_featured_partner ? (
          <span className="gl-spot__partner">{g.partner_label || 'Featured'}</span>
        ) : null}

        <div className="gl-spot__actions" aria-label="Guide actions">
          {onShare ? (
            <button
              type="button"
              className="gl-spot__act"
              aria-label="Share guide"
              onClick={(e) => onShare(g.id, e)}
            >
              <Share2 size={16} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className={`gl-spot__act gl-spot__act--save${saved ? ' is-active' : ''}`}
            aria-label={saved ? 'Remove from saved' : 'Save guide'}
            aria-pressed={saved}
            disabled={saveBusy}
            onClick={(e) => onToggleSave(g.id, e)}
          >
            <Bookmark size={17} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </div>

      <div className="gl-spot__body">
        <div className="gl-spot__meta-row">
          <div className="gl-spot__trust">
            {g.licensed_guide ? (
              <span className="gl-spot__badge">
                <BadgeCheck size={12} strokeWidth={2.25} aria-hidden />
                Licensed
              </span>
            ) : null}
            {fastReply ? (
              <span className="gl-spot__badge gl-spot__badge--fast">
                <Clock size={12} strokeWidth={2.25} aria-hidden />
                Fast reply
              </span>
            ) : null}
          </div>
          {g.hourly_rate ? (
            <span className="gl-spot__price">
              From <strong>${g.hourly_rate}</strong>
              <em>/hr</em>
            </span>
          ) : (
            <span className="gl-spot__price gl-spot__price--muted">Rates on profile</span>
          )}
        </div>

        <h2 className="gl-spot__title">{g.headline || name}</h2>
        {g.headline ? <p className="gl-spot__byline">{name}</p> : null}

        <p className="gl-spot__location">
          <MapPin size={13} strokeWidth={2.25} aria-hidden />
          {regionLine}
        </p>

        {specs.length > 0 ? (
          <div className="gl-spot__chips" aria-label="Specialities">
            {specs.map((s) => (
              <span key={s} className="gl-spot__chip">
                {s}
              </span>
            ))}
          </div>
        ) : null}

        {packageCount > 0 ? (
          <p className="gl-spot__packages">
            {packageCount} {packageCount === 1 ? 'experience' : 'experiences'}
          </p>
        ) : null}

        <div className="gl-spot__foot">
          {ratingLabel ? (
            <span className="gl-spot__rating">
              <Star size={13} strokeWidth={2.25} fill="currentColor" aria-hidden />
              {ratingLabel}
              {g.rating_count ? <em>({g.rating_count})</em> : null}
            </span>
          ) : (
            <span className="gl-spot__rating gl-spot__rating--muted">New on DELVE</span>
          )}
          <span className="gl-spot__cta">View guide</span>
        </div>
      </div>
    </Link>
  )
}
