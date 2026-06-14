import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock,
  Info,
  Landmark,
  MapPin,
  MessageCircle,
  Music,
  Navigation,
  Ticket,
  Trophy,
  UserRound,
  Users,
  Utensils,
} from 'lucide-react'
import { BookingTrustNote } from '../components/booking'
import {
  CommentBox,
  DelversMoments,
  DetailActionCard,
  DetailHeroWrap,
  DetailLayout,
  DetailPage,
  DetailSkeleton,
  MobileStickyCTA,
  SocialActionRow,
  TrustBadgeRow,
} from '../components/detail'
import { EmptyState } from '../components/ui'
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

type EventListItem = {
  id: number
  title: string
  category: string
  starts_at: string
  venue: string
  city?: string | null
  region: string
}

type EventComment = {
  id: string
  author: string
  body: string
  ago: string
}

const CATEGORY_META: Record<string, { label: string; Icon: LucideIcon }> = {
  music: { label: 'Music', Icon: Music },
  sports: { label: 'Sports', Icon: Trophy },
  culture: { label: 'Culture', Icon: Landmark },
  business: { label: 'Business', Icon: BriefcaseBusiness },
  food: { label: 'Food & drink', Icon: Utensils },
  other: { label: 'Other', Icon: Ticket },
}

const SEED_COMMENTS: EventComment[] = [
  { id: 'c1', author: 'Mila K.', body: 'Is parking available near the venue?', ago: '2h ago' },
  { id: 'c2', author: 'Jonas T.', body: 'What time should we arrive if doors open on time?', ago: '5h ago' },
]

function catMeta(value: string) {
  return CATEGORY_META[value] ?? { label: value, Icon: Ticket }
}

function formatDateLong(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return {
      weekday: 'Date TBA',
      date: 'Date TBA',
      time: 'Time TBA',
      day: '--',
      month: 'TBA',
      gcalDate: '',
    }
  }
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
  const endDate = end?.gcalDate || start.gcalDate
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
    cat.label === 'Music' ? 'Live atmosphere' : 'Local experience',
    'Good for groups',
    'Family friendly',
    isFree ? 'Free entry' : 'Ticketed entry',
    cat.label === 'Food & drink' ? 'Food nearby' : null,
    cat.label === 'Sports' ? 'Outdoor event' : null,
    cat.label === 'Culture' ? 'Creative performances' : null,
    cat.label === 'Business' ? 'Networking' : null,
  ].filter(Boolean) as string[]

  const unique: string[] = []
  for (const item of items) {
    if (!unique.includes(item)) unique.push(item)
    if (unique.length >= 5) break
  }
  return unique
}

function admissionLabel(data: Event): string {
  if (data.is_free) return 'Free entry'
  if (data.price) return `N$${data.price}`
  return 'Price TBA'
}

function formatEventCardDate(iso: string): { day: string; month: string; time: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { day: '--', month: 'TBA', time: 'Time TBA' }
  return {
    day: d.toLocaleDateString('en-NA', { day: 'numeric' }),
    month: d.toLocaleDateString('en-NA', { month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' }),
  }
}

type DetailRow = {
  label: string
  value: string
  Icon: LucideIcon
}

export function EventDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [comments, setComments] = useState<EventComment[]>(SEED_COMMENTS)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: () => apiFetch<Event>(`/api/events/${id}/`, { auth: false }),
  })

  const { data: relatedRaw } = useQuery({
    queryKey: ['events', 'related', data?.category],
    enabled: Boolean(data?.category),
    queryFn: () =>
      apiFetch<EventListItem[]>(`/api/events/?category=${encodeURIComponent(data!.category)}`, { auth: false }),
  })

  const relatedEvents = useMemo(
    () => (relatedRaw ?? []).filter((e) => String(e.id) !== String(id)).slice(0, 3),
    [relatedRaw, id],
  )

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

  if (isLoading) {
    return (
      <DetailPage prefix="ev-detail" className="ev-detail--premium">
        <DetailSkeleton className="ev-detail__skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="ev-detail" className="ev-detail--premium">
        <EmptyState
          iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
          title="We couldn't load this event"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </DetailPage>
    )
  }

  if (!data) {
    return (
      <DetailPage prefix="ev-detail" className="ev-detail--premium">
        <EmptyState
          iconElement={<Ticket size={28} strokeWidth={2} aria-hidden />}
          title="Event not found"
          sub="This event may have been removed or the link is incorrect."
          cta={{ label: 'Browse events', to: '/events' }}
        />
      </DetailPage>
    )
  }

  const start = formatDateLong(data.starts_at)
  const end = data.ends_at ? formatDateLong(data.ends_at) : null
  const cat = catMeta(data.category)
  const CatIcon = cat.Icon
  const mapUrl = openStreetMapUrl(data.venue, data.city ?? '', data.region)
  const gcalUrl = buildGoogleCalendarUrl(data)
  const organizerName = data.organizer_display_name?.trim() || data.organizer_username
  const organizerProfileHref = `/u/${encodeURIComponent(data.organizer_username)}`
  const locationLine = [data.venue, data.city || data.region].filter(Boolean).join(' · ')
  const cityLine = [data.city, data.region].filter(Boolean).join(', ')
  const expectItems = whatToExpect(data.category, data.is_free)
  const priceLabel = admissionLabel(data)
  const timeLabel = end ? `${start.time} – ${end.time}` : start.time
  const hasLocation = Boolean(data.venue?.trim() || data.city || data.region)
  const hasTicketing = Boolean(data.ticket_url?.trim())

  const trustItems: string[] = ['Event listing']
  if (data.is_free) trustItems.push('Free entry')
  else if (data.price) trustItems.push(`From N$${data.price}`)
  if (hasTicketing) trustItems.push('Tickets available')
  if (data.capacity) trustItems.push(`Up to ${data.capacity} attendees`)

  const detailRows: DetailRow[] = [
    { label: 'Date', value: start.date, Icon: CalendarDays },
    { label: 'Time', value: timeLabel, Icon: Clock },
    { label: 'Venue', value: data.venue?.trim() || 'Venue TBA', Icon: Building2 },
    { label: 'Location', value: cityLine || data.region || 'Location TBA', Icon: MapPin },
    { label: 'Price', value: priceLabel, Icon: BadgeDollarSign },
    { label: 'Organizer', value: organizerName, Icon: UserRound },
    { label: 'Category', value: cat.label, Icon: CatIcon },
  ]
  if (data.capacity) {
    detailRows.push({ label: 'Capacity', value: `${data.capacity} attendees`, Icon: Users })
  }

  const primaryCtaLabel = hasTicketing ? 'Get tickets' : 'Contact organizer'
  const mobileTitle =
    start.month !== 'TBA' ? `${start.weekday}, ${start.month} ${start.day}` : priceLabel
  const mobileSubtitle = [data.venue || cityLine, !data.is_free && data.price ? `N$${data.price}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <DetailPage prefix="ev-detail" className="ev-detail--premium" toast={shareMsg || null}>
      <DetailHeroWrap
        className="evd-hero"
        backTo="/events"
        backLabel="Events"
        saved={saved}
        onSave={() => setSaved((v) => !v)}
        onShare={() => onShare(data.title)}
      >
        {data.cover_image ? (
          <img
            className="evd-hero__img"
            src={mediaUrl(data.cover_image) || ''}
            alt={`${data.title} event cover`}
          />
        ) : (
          <div className="evd-hero__img evd-hero__placeholder" aria-hidden>
            <CatIcon size={56} strokeWidth={1.5} className="evd-hero__placeholder-icon" />
          </div>
        )}

        <div className="evd-hero__scrim" aria-hidden />

        <div className="evd-hero__date-pill" aria-label={`${start.month} ${start.day}`}>
          <span>{start.month}</span>
          <strong>{start.day}</strong>
        </div>
      </DetailHeroWrap>

      <section className="detail-section evd-identity">
        <div className="ev-detail__meta-row">
          <span className="ev-detail__cat-chip">
            <CatIcon size={13} strokeWidth={2.25} aria-hidden />
            {cat.label}
          </span>
          {data.is_free ? (
            <span className="ev-detail__free-chip">
              <BadgeDollarSign size={12} strokeWidth={2.5} aria-hidden />
              Free
            </span>
          ) : null}
        </div>

        <h1 className="display ev-detail__title">{data.title}</h1>

        <ul className="evd-identity__facts">
          <li>
            <CalendarDays size={16} strokeWidth={2.25} aria-hidden />
            <span>
              {start.weekday}, {start.date}
            </span>
          </li>
          <li>
            <Clock size={16} strokeWidth={2.25} aria-hidden />
            <span>{timeLabel}</span>
          </li>
          {hasLocation ? (
            <li>
              <MapPin size={16} strokeWidth={2.25} aria-hidden />
              <span>{locationLine}</span>
            </li>
          ) : null}
          <li>
            <UserRound size={16} strokeWidth={2.25} aria-hidden />
            <span>
              Hosted by{' '}
              <Link to={organizerProfileHref} className="evd-identity__organizer-link">
                {organizerName}
              </Link>
            </span>
          </li>
        </ul>

        <TrustBadgeRow items={trustItems} className="evd-trust-row" />

        <SocialActionRow saved={saved} onSave={() => setSaved((v) => !v)} onShare={() => onShare(data.title)}>
          <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
            <CalendarDays size={15} strokeWidth={2.25} aria-hidden />
            Add to calendar
          </a>
          {hasLocation ? (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer">
              <Navigation size={15} strokeWidth={2.25} aria-hidden />
              Directions
            </a>
          ) : null}
        </SocialActionRow>
      </section>

      <DetailLayout
        main={
          <>
            <section className="detail-section evd-about">
              <h2 className="evd-section-title">About this event</h2>
              {data.description?.trim() ? (
                <p className="ev-detail__desc-text">{data.description}</p>
              ) : (
                <p className="evd-about__empty" role="status">
                  More event details will appear here once the organizer adds them.
                </p>
              )}
            </section>

            <section className="detail-section evd-expect">
              <h2 className="evd-section-title">What to expect</h2>
              <div className="evd-expect-grid">
                {expectItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>

            <section className="detail-section evd-details">
              <h2 className="evd-section-title">Event details</h2>
              <ul className="evd-details-list">
                {detailRows.map((row) => (
                  <li key={row.label} className="evd-details-list__item">
                    <span className="evd-details-list__icon" aria-hidden>
                      <row.Icon size={18} strokeWidth={2.25} />
                    </span>
                    <div className="evd-details-list__body">
                      <span className="evd-details-list__label">{row.label}</span>
                      <strong className="evd-details-list__value">{row.value}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="detail-section evd-date">
              <h2 className="evd-section-title">Date and time</h2>
              <div className="ev-detail__date-card ev-detail__date-card--inline">
                <div className="ev-detail__date-visual">
                  <span className="ev-detail__date-month">{start.month}</span>
                  <span className="ev-detail__date-day">{start.day}</span>
                </div>
                <div className="ev-detail__date-info">
                  <p className="ev-detail__date-weekday">{start.weekday}</p>
                  <p className="ev-detail__date-full">{start.date}</p>
                  <p className="ev-detail__date-time">
                    <Clock size={14} strokeWidth={2.25} aria-hidden />
                    {timeLabel}
                  </p>
                </div>
                <a
                  href={gcalUrl}
                  className="ev-detail__cal-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Add to Google Calendar"
                >
                  <CalendarDays size={16} strokeWidth={2.25} aria-hidden />
                  <span>Add to calendar</span>
                </a>
              </div>
            </section>

            <section className="detail-section evd-venue">
              <h2 className="evd-section-title">Venue and location</h2>
              <div className="ev-detail__venue-card ev-detail__venue-card--inline">
                <div className="ev-detail__venue-info">
                  <p className="ev-detail__venue-name">{data.venue?.trim() || 'Venue to be announced'}</p>
                  {cityLine ? <p className="ev-detail__venue-location">{cityLine}</p> : null}
                  {data.address ? <p className="ev-detail__venue-address">{data.address}</p> : null}
                  {!data.venue && !cityLine && !data.address ? (
                    <p className="evd-venue__empty">Location details will be shared by the organizer.</p>
                  ) : null}
                </div>
                {hasLocation ? (
                  <a
                    href={mapUrl}
                    className="ev-detail__map-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open directions"
                  >
                    <Navigation size={16} strokeWidth={2.25} aria-hidden />
                    <span>Get directions</span>
                  </a>
                ) : null}
              </div>
            </section>

            <section className="detail-section evd-organizer">
              <h2 className="evd-section-title">Organizer</h2>
              <div className="evd-organizer-card">
                <div className="evd-organizer-card__avatar" aria-hidden>
                  <UserRound size={22} strokeWidth={2} />
                </div>
                <div className="evd-organizer-card__body">
                  <p className="evd-organizer-card__kicker">Event organizer</p>
                  <p className="evd-organizer__name">{organizerName}</p>
                  <p className="evd-organizer__copy">
                    Hosted on DELVE. Message the organizer for tickets, group bookings, or accessibility questions.
                  </p>
                  <div className="evd-organizer-card__actions">
                    <Link to={organizerProfileHref} className="btn btn-ghost btn-sm">
                      <UserRound size={14} strokeWidth={2.25} aria-hidden />
                      View organizer profile
                    </Link>
                    <Link to="/messages" className="btn btn-ghost btn-sm">
                      <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
                      Message organizer
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {relatedEvents.length > 0 ? (
              <section className="detail-section evd-related">
                <div className="evd-section-head">
                  <h2 className="evd-section-title">More events</h2>
                  <Link to="/events">Browse all</Link>
                </div>
                <div className="evd-related-grid">
                  {relatedEvents.map((ev) => {
                    const evDate = formatEventCardDate(ev.starts_at)
                    const evCat = catMeta(ev.category)
                    const EvCatIcon = evCat.Icon
                    const evLocation = [ev.venue, ev.city || ev.region].filter(Boolean).join(' · ')
                    return (
                      <Link key={ev.id} to={`/events/${ev.id}`} className="evd-related-card">
                        <div className="evd-related-card__date" aria-hidden>
                          <span>{evDate.month}</span>
                          <strong>{evDate.day}</strong>
                        </div>
                        <div className="evd-related-card__body">
                          <span className="evd-related-card__cat">
                            <EvCatIcon size={12} strokeWidth={2.25} aria-hidden />
                            {evCat.label}
                          </span>
                          <h3 className="evd-related-card__title">{ev.title}</h3>
                          <p className="evd-related-card__meta">
                            <Clock size={13} strokeWidth={2.25} aria-hidden />
                            {evDate.time}
                            {evLocation ? (
                              <>
                                <MapPin size={13} strokeWidth={2.25} aria-hidden />
                                {evLocation}
                              </>
                            ) : null}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ) : (
              <section className="detail-section evd-related evd-related--empty">
                <h2 className="evd-section-title">More events</h2>
                <p className="evd-related__empty">Browse upcoming events across DELVE.</p>
                <Link to="/events" className="btn btn-ghost">
                  Browse more events
                </Link>
              </section>
            )}

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
              title="Questions and local tips"
              subtitle="Ask about parking, safety, entry, timing, or what to bring."
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
              emptyMessage="Questions and tips will appear here as people discuss this event."
              className="evd-comments"
            />
          </>
        }
        sidebar={
          <DetailActionCard
            kicker="Attend this event"
            title={
              <span className="evd-ticket-card__price">
                {data.is_free ? (
                  <>
                    <BadgeDollarSign size={18} strokeWidth={2.25} aria-hidden />
                    Free entry
                  </>
                ) : data.price ? (
                  <>
                    <BadgeDollarSign size={18} strokeWidth={2.25} aria-hidden />
                    N${data.price}
                  </>
                ) : (
                  <>
                    <Info size={18} strokeWidth={2.25} aria-hidden />
                    {priceLabel}
                  </>
                )}
              </span>
            }
            className="evd-ticket-card"
            footer={
              <BookingTrustNote>
                Event details are managed by the organizer. Confirm time, venue, and entry requirements before attending.
              </BookingTrustNote>
            }
          >
            <div className="evd-ticket-card__meta">
              <span>
                <CalendarDays size={13} strokeWidth={2.25} aria-hidden />
                {start.month} {start.day}
              </span>
              <span>
                <Clock size={13} strokeWidth={2.25} aria-hidden />
                {start.time}
              </span>
              {hasLocation ? (
                <span>
                  <MapPin size={13} strokeWidth={2.25} aria-hidden />
                  {data.venue || cityLine}
                </span>
              ) : null}
              <span>
                <UserRound size={13} strokeWidth={2.25} aria-hidden />
                {organizerName}
              </span>
            </div>

            {hasTicketing ? (
              <a
                href={data.ticket_url!}
                className="btn btn-primary evd-ticket-card__btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Ticket size={16} strokeWidth={2.25} aria-hidden />
                Get tickets
              </a>
            ) : (
              <Link to={organizerProfileHref} className="btn btn-primary evd-ticket-card__btn">
                <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
                Contact organizer
              </Link>
            )}

            <div className="evd-ticket-card__secondary-row">
              {hasLocation ? (
                <a href={mapUrl} className="evd-ticket-card__secondary" target="_blank" rel="noopener noreferrer">
                  <Navigation size={14} strokeWidth={2.25} aria-hidden />
                  Directions
                </a>
              ) : null}
              <a href={gcalUrl} className="evd-ticket-card__secondary" target="_blank" rel="noopener noreferrer">
                <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
                Add to calendar
              </a>
            </div>
          </DetailActionCard>
        }
      />

      <MobileStickyCTA
        ariaLabel="Event actions"
        title={mobileTitle}
        subtitle={mobileSubtitle || 'Event details'}
        action={
          hasTicketing ? (
            <a href={data.ticket_url!} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              <Ticket size={16} strokeWidth={2.25} aria-hidden />
              Get tickets
            </a>
          ) : (
            <Link to={organizerProfileHref} className="btn btn-primary">
              <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
              Contact organizer
            </Link>
          )
        }
        className="evd-mobile-bar"
      />
    </DetailPage>
  )
}
