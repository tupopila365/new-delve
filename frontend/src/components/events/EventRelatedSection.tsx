import { Link } from 'react-router-dom'
import { Clock, MapPin } from 'lucide-react'
import { ListingSection } from '../listing'
import { categoryMeta, formatEventDate, type EventListItem } from '../../utils/eventListing'
import './event-detail.css'

type Props = {
  events: EventListItem[]
  className?: string
}

export function EventRelatedSection({ events, className = '' }: Props) {
  if (events.length === 0) {
    return (
      <ListingSection title="More events" className={`ev-related-section ${className}`.trim()}>
        <p className="ev-related-empty">Browse upcoming events across DELVE.</p>
        <Link to="/events" className="btn btn-ghost">
          Browse more events
        </Link>
      </ListingSection>
    )
  }

  return (
    <ListingSection
      title="More events"
      className={`ev-related-section ${className}`.trim()}
      action={
        <Link to="/events">Browse all</Link>
      }
    >
      <div className="ev-related-grid">
        {events.map((ev) => {
          const when = formatEventDate(ev.starts_at)
          const cat = categoryMeta(ev.category)
          const CatIcon = cat.Icon
          const location = [ev.venue, ev.city || ev.region].filter(Boolean).join(' · ')
          return (
            <Link key={ev.id} to={`/events/${ev.id}`} className="ev-related-card">
              <div className="ev-related-card__date" aria-hidden>
                <span>{when.month}</span>
                <strong>{when.day}</strong>
              </div>
              <div>
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
              </div>
            </Link>
          )
        })}
      </div>
    </ListingSection>
  )
}
