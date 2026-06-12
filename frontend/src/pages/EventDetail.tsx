import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CommentBox,
  DelversMoments,
  DetailActionCard,
  DetailLayout,
  DetailPage,
  DetailSkeleton,
  MobileStickyCTA,
  SocialActionRow,
} from '../components/detail'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

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

type EventComment = {
  id: string
  author: string
  body: string
  ago: string
}

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  music: { label: 'Music', emoji: '🎵' },
  sports: { label: 'Sports', emoji: '🏆' },
  culture: { label: 'Culture', emoji: '🎭' },
  business: { label: 'Business', emoji: '💼' },
  food: { label: 'Food & drink', emoji: '🍽' },
  other: { label: 'Other', emoji: '✨' },
}

const SEED_COMMENTS: EventComment[] = [
  { id: 'c1', author: 'Mila K.', body: 'Is parking available near the venue?', ago: '2h ago' },
  { id: 'c2', author: 'Jonas T.', body: 'What time should we arrive if doors open on time?', ago: '5h ago' },
]

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

function whatToExpect(category: string, isFree?: boolean | null): string[] {
  const cat = catMeta(category)
  const items = [
    cat.label === 'Music' ? 'Live atmosphere' : 'Community gathering',
    'Good for groups',
    'Local experience',
    isFree ? 'Free to attend' : 'Ticketed entry',
    cat.label === 'Food & drink' ? 'Food & drinks on site' : null,
    cat.label === 'Sports' ? 'Active crowd energy' : null,
    cat.label === 'Culture' ? 'Creative performances' : null,
  ].filter(Boolean) as string[]

  const unique: string[] = []
  for (const item of items) {
    if (!unique.includes(item)) unique.push(item)
    if (unique.length >= 4) break
  }
  return unique
}

function admissionLabel(data: Event): string {
  if (data.is_free) return 'Free entry'
  if (data.price) return `N$${data.price}`
  return 'Price TBA'
}

export function EventDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [comments, setComments] = useState<EventComment[]>(SEED_COMMENTS)

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: () => apiFetch<Event>(`/api/events/${id}/`, { auth: false }),
  })

  const onShare = async (title: string) => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg(`Link to ${title} copied`)
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  const postComment = () => {
    const body = commentDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'Guest'
    setComments((prev) => [
      { id: `local-${Date.now()}`, author, body, ago: 'Just now' },
      ...prev,
    ])
    setCommentDraft('')
  }

  if (isLoading || !data) {
    return (
      <DetailPage prefix="ev-detail" className="ev-detail--premium">
        <DetailSkeleton className="ev-detail__skeleton" />
      </DetailPage>
    )
  }

  const start = formatDateLong(data.starts_at)
  const end = data.ends_at ? formatDateLong(data.ends_at) : null
  const cat = catMeta(data.category)
  const mapUrl = openStreetMapUrl(data.venue, data.city ?? '', data.region)
  const gcalUrl = buildGoogleCalendarUrl(data)
  const organiserName = data.organizer_display_name?.trim() || `@${data.organizer_username}`
  const locationLine = [data.venue, data.city || data.region].filter(Boolean).join(' · ')
  const expectItems = whatToExpect(data.category, data.is_free)
  const priceLabel = admissionLabel(data)

  return (
    <DetailPage prefix="ev-detail" className="ev-detail--premium" toast={shareMsg || null}>

      <div className="evd-hero">
        <Link to="/events" className="evd-hero__back">
          ← Events
        </Link>
        <div className="evd-hero__actions">
          <button
            type="button"
            className={`evd-hero__action${saved ? ' evd-hero__action--saved' : ''}`}
            onClick={() => setSaved((v) => !v)}
          >
            {saved ? '♥ Saved' : '♡ Save'}
          </button>
          <button type="button" className="evd-hero__action" onClick={() => onShare(data.title)}>
            ↗ Share
          </button>
        </div>

        {data.cover_image ? (
          <img className="evd-hero__img" src={mediaUrl(data.cover_image) || ''} alt={data.title} />
        ) : (
          <div className="evd-hero__img evd-hero__placeholder">
            <span aria-hidden>{cat.emoji}</span>
          </div>
        )}

        <div className="evd-hero__scrim" aria-hidden />

        <div className="evd-hero__date-pill" aria-label={`${start.month} ${start.day}`}>
          <span>{start.month}</span>
          <strong>{start.day}</strong>
        </div>
      </div>

      <section className="detail-section evd-identity">
        <div className="ev-detail__meta-row">
          <span className="ev-detail__cat-chip">
            <span aria-hidden>{cat.emoji}</span> {cat.label}
          </span>
          {data.is_free ? <span className="ev-detail__free-chip">Free</span> : null}
          <Link to={`/u/${encodeURIComponent(data.organizer_username)}`} className="ev-detail__organiser">
            By {organiserName}
          </Link>
        </div>

        <h1 className="display ev-detail__title">{data.title}</h1>

        <p className="evd-identity__summary">
          {start.weekday}, {start.date} · {start.time}
          {end ? ` – ${end.time}` : ''} · {locationLine}
        </p>

        <div className="evd-trust-row">
          <span>Official listing</span>
          <span>Mobile-friendly event page</span>
          {data.capacity ? <span>{data.capacity} capacity</span> : null}
        </div>

        <SocialActionRow saved={saved} onSave={() => setSaved((v) => !v)} onShare={() => onShare(data.title)}>
          <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
            Add to calendar
          </a>
        </SocialActionRow>
      </section>

      <DetailLayout
        main={
          <>
          <section className="detail-section evd-expect">
            <h2 className="evd-section-title">What to expect</h2>
            <div className="evd-expect-grid">
              {expectItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          {data.description?.trim() ? (
            <section className="detail-section evd-about">
              <h2 className="evd-section-title">About this event</h2>
              <p className="ev-detail__desc-text">{data.description}</p>
            </section>
          ) : null}

          <section className="detail-section evd-date">
            <h2 className="evd-section-title">Date & time</h2>
            <div className="ev-detail__date-card ev-detail__date-card--inline">
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
          </section>

          <section className="detail-section evd-venue">
            <h2 className="evd-section-title">Venue & location</h2>
            <div className="ev-detail__venue-card ev-detail__venue-card--inline">
              <div className="ev-detail__venue-info">
                <p className="ev-detail__venue-name">{data.venue || 'Venue to be announced'}</p>
                {locationLine ? <p className="ev-detail__venue-location">{locationLine}</p> : null}
                {data.address ? <p className="ev-detail__venue-address">{data.address}</p> : null}
              </div>
              {data.venue ? (
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
              ) : null}
            </div>
          </section>

          <section className="detail-section evd-organiser">
            <h2 className="evd-section-title">Organiser</h2>
            <p className="evd-organiser__name">{organiserName}</p>
            <p className="evd-organiser__copy">
              Listed organiser on DELVE — message them for tickets, group bookings, or accessibility questions.
            </p>
            <Link to={`/u/${encodeURIComponent(data.organizer_username)}`} className="evd-organiser__link">
              View organiser profile
            </Link>
          </section>

          <DelversMoments
            title="Delvers moments from this event"
            moments={[
              {
                id: 'm1',
                image: data.cover_image ? mediaUrl(data.cover_image) : null,
                author: 'localguide',
                body: 'Saved this for the weekend.',
              },
              { id: 'm2', author: 'traveller', body: 'Who else is going?' },
            ]}
            className="evd-moments"
          />

          <CommentBox
            title="Questions & comments"
            subtitle="Ask the organiser or share tips for people attending."
            placeholder="Ask about parking, tickets, dress code, food, or arrival time..."
            draft={commentDraft}
            onDraftChange={setCommentDraft}
            onPost={postComment}
            comments={comments.map((c) => ({
              id: c.id,
              author: c.author,
              body: c.body,
              ago: c.ago,
            }))}
            className="evd-comments"
          />
          </>
        }
        sidebar={
          <DetailActionCard kicker="Ready to attend?" title={priceLabel} className="evd-ticket-card">
            <div className="evd-ticket-card__meta">
              <span>
                {start.month} {start.day}
              </span>
              <span>{start.time}</span>
              {data.capacity ? <span>{data.capacity} capacity</span> : null}
            </div>

            {data.ticket_url ? (
              <a
                href={data.ticket_url}
                className="btn btn-primary evd-ticket-card__btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get tickets
              </a>
            ) : (
              <Link
                to={`/u/${encodeURIComponent(data.organizer_username)}`}
                className="btn btn-primary evd-ticket-card__btn"
              >
                Contact organiser
              </Link>
            )}

            <a href={gcalUrl} className="evd-ticket-card__secondary" target="_blank" rel="noopener noreferrer">
              Add to calendar
            </a>
          </DetailActionCard>
        }
      />

      <MobileStickyCTA
        title={priceLabel}
        subtitle={`${start.month} ${start.day} · ${start.time}`}
        action={
          data.ticket_url ? (
            <a href={data.ticket_url} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              Tickets
            </a>
          ) : (
            <Link to={`/u/${encodeURIComponent(data.organizer_username)}`} className="btn btn-primary">
              Contact
            </Link>
          )
        }
        className="evd-mobile-bar"
      />
    </DetailPage>
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
