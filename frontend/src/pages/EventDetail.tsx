import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'

type Event = {
  id: number
  title: string
  description: string
  category: string
  starts_at: string
  ends_at: string | null
  venue: string
  address?: string | null
  region: string
  city?: string | null
  cover_image: string | null
  organizer_username: string
  organizer_display_name?: string | null
  is_free?: boolean | null
  price?: string | null
  ticket_url?: string | null
  capacity?: number | null
}

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  music: { label: 'Music', emoji: '🎵' },
  sports: { label: 'Sports', emoji: '🏆' },
  culture: { label: 'Culture', emoji: '🎭' },
  business: { label: 'Business', emoji: '💼' },
  food: { label: 'Food & drink', emoji: '🍽' },
  other: { label: 'Other', emoji: '✨' },
}

function catMeta(value: string) {
  return CATEGORY_META[value] ?? { label: value, emoji: '✨' }
}

function formatDateLong(iso: string) {
  const d = new Date(iso)
  return {
    weekday: d.toLocaleDateString('en-NA', { weekday: 'long' }),
    date: d.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' }),
    day: d.toLocaleDateString('en-NA', { day: 'numeric' }),
    month: d.toLocaleDateString('en-NA', { month: 'short' }).toUpperCase(),
    gcalDate: d.toISOString().replace(/[-:]/g, '').split('.')[0],
  }
}

function buildGoogleCalendarUrl(event: Event): string {
  const start = formatDateLong(event.starts_at)
  const end = event.ends_at ? formatDateLong(event.ends_at) : null
  const endDate = end ? end.gcalDate : start.gcalDate
  const location = [event.venue, event.city || event.region].filter(Boolean).join(', ')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start.gcalDate}/${endDate}`,
    details: event.description?.slice(0, 400) ?? '',
    location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function openStreetMapUrl(venue: string, city: string, region: string) {
  const q = [venue, city, region].filter(Boolean).join(', ')
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
}

export function EventDetail() {
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: () => apiFetch<Event>(`/api/events/${id}/`, { auth: false }),
  })

  if (isLoading || !data) {
    return (
      <div className="ev-detail">
        <div className="skeleton ev-detail__skeleton" />
      </div>
    )
  }

  const start = formatDateLong(data.starts_at)
  const end = data.ends_at ? formatDateLong(data.ends_at) : null
  const cat = catMeta(data.category)
  const mapUrl = openStreetMapUrl(data.venue, data.city ?? '', data.region)
  const gcalUrl = buildGoogleCalendarUrl(data)
  const organiserName = data.organizer_display_name?.trim() || `@${data.organizer_username}`
  const locationLine = [data.venue, data.city || data.region].filter(Boolean).join(' · ')

  return (
    <div className="ev-detail">
      <Link to="/events" className="ev-detail__back">← Back to events</Link>

      {/* Cover image */}
      {data.cover_image ? (
        <img
          className="ev-detail__cover"
          src={mediaUrl(data.cover_image) || ''}
          alt={data.title}
        />
      ) : (
        <div className="ev-detail__cover ev-detail__cover--placeholder">
          <span aria-hidden>{cat.emoji}</span>
        </div>
      )}

      <div className="ev-detail__content">

        {/* Category + organiser row */}
        <div className="ev-detail__meta-row">
          <span className="ev-detail__cat-chip">
            <span aria-hidden>{cat.emoji}</span> {cat.label}
          </span>
          {data.is_free && <span className="ev-detail__free-chip">Free</span>}
          <Link
            to={`/u/${encodeURIComponent(data.organizer_username)}`}
            className="ev-detail__organiser"
          >
            By {organiserName}
          </Link>
        </div>

        {/* Title */}
        <h1 className="display ev-detail__title">{data.title}</h1>

        {/* Date + time block */}
        <div className="ev-detail__date-card card">
          <div className="ev-detail__date-visual">
            <span className="ev-detail__date-month">{start.month}</span>
            <span className="ev-detail__date-day">{start.day}</span>
          </div>
          <div className="ev-detail__date-info">
            <p className="ev-detail__date-weekday">{start.weekday}</p>
            <p className="ev-detail__date-full">{start.date}</p>
            <p className="ev-detail__date-time">
              {start.time}
              {end ? ` – ${end.time}` : ''}
            </p>
          </div>
          <a
            href={gcalUrl}
            className="ev-detail__cal-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Add to Google Calendar"
          >
            <IconCalendar />
            <span>Add to calendar</span>
          </a>
        </div>

        {/* Venue + map */}
        <div className="ev-detail__venue-card card">
          <div className="ev-detail__venue-info">
            <p className="ev-detail__venue-name">{data.venue || 'Venue to be announced'}</p>
            {locationLine && (
              <p className="ev-detail__venue-location">{locationLine}</p>
            )}
            {data.address && (
              <p className="ev-detail__venue-address">{data.address}</p>
            )}
          </div>
          {data.venue && (
            <a
              href={mapUrl}
              className="ev-detail__map-btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on map"
            >
              <IconMap />
              <span>View map</span>
            </a>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <section className="ev-detail__desc" aria-labelledby="ev-desc-heading">
            <h2 id="ev-desc-heading" className="ev-detail__section-label">About this event</h2>
            <p className="ev-detail__desc-text">{data.description}</p>
          </section>
        )}

        {/* Pricing / ticketing */}
        <div className="ev-detail__ticket-card card">
          <div className="ev-detail__ticket-price-row">
            <div>
              <p className="ev-detail__ticket-label">Admission</p>
              {data.is_free ? (
                <p className="ev-detail__ticket-free">Free entry</p>
              ) : data.price ? (
                <p className="ev-detail__ticket-price">From N${data.price}</p>
              ) : (
                <p className="ev-detail__ticket-price ev-detail__ticket-price--tba">Price TBA</p>
              )}
            </div>
            {data.capacity && (
              <div className="ev-detail__ticket-capacity">
                <p className="ev-detail__ticket-label">Capacity</p>
                <p className="ev-detail__ticket-cap-val">{data.capacity} people</p>
              </div>
            )}
          </div>

          {data.ticket_url ? (
            <a
              href={data.ticket_url}
              className="btn btn-primary btn-block ev-detail__ticket-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get tickets →
            </a>
          ) : (
            <div className="ev-detail__ticket-placeholder">
              <p className="ev-detail__ticket-placeholder-text">
                Ticket booking via DELVE is coming soon — for now, contact the organiser directly or check their page.
              </p>
              <Link
                to={`/u/${encodeURIComponent(data.organizer_username)}`}
                className="btn btn-ghost ev-detail__ticket-organiser-btn"
              >
                View organiser profile →
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
