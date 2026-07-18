import type { SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin } from 'lucide-react'
import { ListingSection } from '../listing'
import { mediaUrl } from '../../api/client'
import { isVideoUrl } from '../listing/photos/listingGalleryMedia'
import {
  categoryMeta,
  eventCoverSrc,
  EVENT_DEFAULT_IMAGE,
  formatEventDate,
  type EventListItem,
} from '../../utils/eventListing'
import './event-detail.css'

type Props = {
  events: EventListItem[]
  className?: string
}

function onCoverError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.onerror = null
  event.currentTarget.src = EVENT_DEFAULT_IMAGE
}

export function EventRelatedSection({ events, className = '' }: Props) {
  if (events.length === 0) {
    return (
      <ListingSection title="Similar events" className={`ev-related-section ${className}`.trim()}>
        <p className="ev-related-empty">Browse upcoming events across DELVE.</p>
        <Link to="/events" className="btn btn-ghost">
          Browse more events
        </Link>
      </ListingSection>
    )
  }

  return (
    <ListingSection
      title="Similar events"
      className={`ev-related-section ${className}`.trim()}
      action={<Link to="/events">Browse all</Link>}
    >
      <div className="ev-related-grid">
        {events.map((ev) => {
          const when = formatEventDate(ev.starts_at)
          const cat = categoryMeta(ev.category)
          const CatIcon = cat.Icon
          const location = [ev.venue, ev.city || ev.region].filter(Boolean).join(' · ')
          const coverRaw = mediaUrl(ev.cover_image) || (ev.cover_image?.trim() ?? '')
          const isVideo = Boolean(coverRaw) && (ev.cover_kind === 'video' || isVideoUrl(coverRaw))
          const imgSrc = isVideo ? '' : eventCoverSrc(ev.cover_image, ev.category)
          return (
            <Link key={ev.id} to={`/events/${ev.id}`} className="ev-related-card">
              <span className="ev-related-card__media">
                {isVideo ? (
                  <video src={coverRaw} muted loop playsInline preload="metadata" aria-hidden />
                ) : (
                  <img src={imgSrc} alt="" loading="lazy" onError={onCoverError} />
                )}
                <span className="ev-related-card__date" aria-hidden>
                  <span>{when.month}</span>
                  <strong>{when.day}</strong>
                </span>
              </span>
              <span className="ev-related-card__body">
                <span className="ev-related-card__cat">
                  <CatIcon size={12} strokeWidth={2.25} aria-hidden />
                  {cat.label}
                </span>
                <h3 className="ev-related-card__title">{ev.title}</h3>
                <p className="ev-related-card__meta">
                  <span>
                    <Clock size={13} strokeWidth={2.25} aria-hidden />
                    {when.time}
                  </span>
                  {location ? (
                    <span>
                      <MapPin size={13} strokeWidth={2.25} aria-hidden />
                      {location}
                    </span>
                  ) : null}
                </p>
              </span>
            </Link>
          )
        })}
      </div>
    </ListingSection>
  )
}
