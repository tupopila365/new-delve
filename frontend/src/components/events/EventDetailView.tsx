import { useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BadgeDollarSign,
  Bookmark,
  CalendarDays,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Share2,
  Ticket,
  Users,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useEventCategoryFollows } from '../../hooks/useEventCategoryFollows'
import { ReportButton } from '../report/ReportButton'
import { JourneyHero } from '../journeys/JourneyHero'
import { JourneySection } from '../journeys/JourneySection'
import { HighlightStoriesSection } from '../highlights/HighlightStoriesSection'
import { ListingDelversMoments, ListingReviews } from '../listing'
import type { ReviewItem } from '../GuestReviewCard'
import { messageProviderPath } from '../messages/messageProviderUtils'
import {
  admissionLabel,
  buildEventGalleryImages,
  buildEventHighlights,
  buildGoogleCalendarUrl,
  categoryMeta,
  eventCountdownLabel,
  eventLocationLine,
  eventTimeRange,
  formatEventDateLong,
  openStreetMapSearchUrl,
  organizerLabel,
  type EventDetail,
  type EventListItem,
} from '../../utils/eventListing'
import { eventAccentBadge } from '../../utils/eventDisplay'
import { externalTicketHref, resolveTicketingMode } from '../../utils/eventTicketing'
import { buildEventStoryChannels } from './eventStoriesUtils'
import { EventCommentsSection } from './EventCommentsSection'
import { EventDateShowcase } from './EventDateShowcase'
import { EventOrganizerCard } from './EventOrganizerCard'
import { EventRelatedSection } from './EventRelatedSection'
import { EventReviewForm } from './EventReviewForm'
import { EventTicketCard } from './EventTicketCard'
import '../journeys/journey-detail.css'
import './event-detail.css'

type Props = {
  event: EventDetail
  eventId: string
  editHref?: string
  saved: boolean
  saveCount: number
  onSave: () => void
  onShare: () => void
  liked: boolean
  likeCount: number
  onLike: () => void
  likeBusy?: boolean
  saveBusy?: boolean
  relatedEvents: EventListItem[]
  reviews?: ReviewItem[]
  reviewRating?: string | number | null
  reviewCount?: number | null
  showReviewForm?: boolean
  myBookingId?: number | null
  ticketQr?: { booking_ref: string; qr_payload: string } | null
  attending?: boolean
  rsvpPending?: boolean
  bookingStatus?: string
  bookingTotal?: string | number | null
  mockPaymentRef?: string | null
  payPending?: boolean
  onRsvp?: () => void
  onCancelRsvp?: () => void
  onPay?: () => void
  isOwner?: boolean
  onAddHighlight?: () => void
}

export function EventDetailView({
  event,
  eventId,
  editHref,
  saved,
  saveCount,
  onSave,
  onShare,
  liked,
  likeCount,
  onLike,
  likeBusy = false,
  saveBusy = false,
  relatedEvents,
  reviews = [],
  reviewRating,
  reviewCount,
  showReviewForm = false,
  myBookingId,
  ticketQr,
  attending = false,
  rsvpPending = false,
  bookingStatus,
  bookingTotal,
  mockPaymentRef,
  payPending = false,
  onRsvp,
  onCancelRsvp,
  onPay,
  isOwner = false,
  onAddHighlight,
}: Props) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const categoryFollows = useEventCategoryFollows()
  const commentsSectionRef = useRef<HTMLElement>(null)
  const commentComposerRef = useRef<HTMLInputElement>(null)

  const cat = categoryMeta(event.category)
  const CatIcon = cat.Icon
  const start = formatEventDateLong(event.starts_at)
  const timeLabel = eventTimeRange(event)
  const organizerName = organizerLabel(event)
  const organizerInitial = organizerName.charAt(0).toUpperCase() || '?'
  const locationLine = eventLocationLine(event)
  const cityLine = [event.city, event.region].filter(Boolean).join(', ')
  const hasLocation = Boolean(event.venue?.trim() || event.city || event.region)
  const ticketingMode = resolveTicketingMode(event)
  const priceLabel = admissionLabel(event)
  const countdown = eventCountdownLabel(event.starts_at)
  const accent = eventAccentBadge(event)
  const followingCategory = categoryFollows.isFollowing(event.category)
  const eventPath = `/events/${eventId}`
  const galleryImages = buildEventGalleryImages(event)
  const highlightLabels = buildEventHighlights(event)
  const mapHref = openStreetMapSearchUrl(event.venue ?? '', event.city ?? '', event.region)
  const gcalUrl = buildGoogleCalendarUrl(event)
  const commentsCount = event.comments_count ?? 0

  const storyChannels = useMemo(
    () => buildEventStoryChannels(event, { eventId, eventPath }),
    [event, eventId, eventPath],
  )

  function openComments() {
    commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => commentComposerRef.current?.focus(), 450)
  }

  function guardEngage(action: () => void) {
    if (!profile) {
      navigate('/login')
      return
    }
    action()
  }

  const mobileCtaLabel = attending
    ? bookingStatus === 'pending'
      ? 'Pay now'
      : "You're going"
    : ticketingMode === 'external'
      ? 'Get tickets'
      : ticketingMode === 'on_platform'
        ? `Reserve · N$${event.price}`
        : 'RSVP'

  return (
    <>
      <JourneyHero
        images={galleryImages}
        backTo="/events"
        backLabel="Events"
        liked={liked}
        saved={saved}
        likeBusy={likeBusy}
        saveBusy={saveBusy}
        onLike={() => guardEngage(onLike)}
        onSave={() => guardEngage(onSave)}
        onShare={onShare}
      />

      <div className="jd-head">
        {event.organizer_username ? (
          <Link to={`/u/${encodeURIComponent(event.organizer_username)}`} className="jd-author">
            <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
              {organizerInitial}
            </span>
            <span className="jd-author__copy">
              <span className="jd-author__name">{organizerName}</span>
              <span className="jd-author__sub">
                @{event.organizer_username}
                {countdown ? ` · ${countdown}` : ''}
              </span>
            </span>
          </Link>
        ) : (
          <div className="jd-author">
            <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
              {organizerInitial}
            </span>
            <span className="jd-author__copy">
              <span className="jd-author__name">{organizerName}</span>
              <span className="jd-author__sub">{countdown || 'Event host'}</span>
            </span>
          </div>
        )}

        <div className="jd-head__actions">
          {editHref ? (
            <Link to={editHref} className="jd-btn">
              <Pencil size={14} strokeWidth={2.25} aria-hidden />
              <span className="jd-btn--label">Edit</span>
            </Link>
          ) : event.organizer_username ? (
            <Link
              to={messageProviderPath(
                event.organizer_username,
                {
                  type: 'event',
                  id: eventId,
                  label: event.title,
                },
                event.business ?? null,
              )}
              className="jd-btn jd-btn--primary"
            >
              <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
              <span className="jd-btn--label">Message</span>
            </Link>
          ) : null}
          <ReportButton
            className="jd-btn jd-btn--icon"
            iconOnly
            triggerLabel="Report event"
            target={{ target_type: 'listing', target_id: `event:${eventId}`, target_label: event.title }}
          />
        </div>
      </div>

      <div className="jd-titleblock">
        <div className="ev-detail__badges">
          {accent ? <span className="jd-badge">{accent}</span> : null}
          <button
            type="button"
            className={`ev-detail__follow-cat${followingCategory ? ' is-active' : ''}`}
            disabled={categoryFollows.busyCategory === event.category}
            onClick={() => categoryFollows.toggleFollow(event.category)}
            aria-pressed={followingCategory}
          >
            {followingCategory ? `Following ${cat.label}` : `Follow ${cat.label}`}
          </button>
        </div>
        <h1 className="jd-title">{event.title}</h1>
        <p className="jd-route">
          <CalendarDays size={17} strokeWidth={2.25} aria-hidden />
          {start.valid ? `${start.weekday} · ${timeLabel}` : 'Date TBA'}
        </p>
        {locationLine ? (
          <p className="jd-hook">
            <MapPin size={15} strokeWidth={2.25} aria-hidden style={{ display: 'inline', verticalAlign: '-0.15em', marginRight: 6 }} />
            {locationLine}
          </p>
        ) : null}
      </div>

      <div className="jd-engage" aria-label="Event actions">
        <div className="jd-engage__primary">
          <button
            type="button"
            className={`jd-engage__btn jd-engage__btn--like${liked ? ' is-active' : ''}`}
            onClick={() => guardEngage(onLike)}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike event' : 'Like event'}
            aria-pressed={liked}
          >
            <Heart size={22} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            <span className="jd-engage__count">{likeCount}</span>
          </button>
          <button
            type="button"
            className="jd-engage__btn"
            onClick={openComments}
            aria-label={`${commentsCount} comments — view and write comments`}
          >
            <MessageCircle size={22} strokeWidth={2.25} aria-hidden />
            <span className="jd-engage__count">{commentsCount}</span>
          </button>
          <button type="button" className="jd-engage__btn" onClick={onShare} aria-label="Share event">
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <div className="jd-engage__secondary">
          <button
            type="button"
            className={`jd-engage__btn jd-engage__btn--save${saved ? ' is-active' : ''}`}
            onClick={() => guardEngage(onSave)}
            disabled={saveBusy}
            aria-label={saved ? 'Remove saved event' : 'Save event'}
            aria-pressed={saved}
          >
            <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
            <span className="jd-engage__count">{saveCount}</span>
          </button>
        </div>
      </div>

      <ul className="jd-facts">
        <li className="jd-fact">
          <CatIcon size={15} strokeWidth={2.25} aria-hidden />
          {cat.label}
        </li>
        <li className="jd-fact">
          <CalendarDays size={15} strokeWidth={2.25} aria-hidden />
          {start.valid ? `${start.month} ${start.day}` : 'TBA'}
        </li>
        <li className="jd-fact jd-fact--cost">
          <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
          {priceLabel}
        </li>
        {event.rsvp_count && event.rsvp_count > 0 ? (
          <li className="jd-fact">
            <Users size={15} strokeWidth={2.25} aria-hidden />
            {event.rsvp_count} going
          </li>
        ) : null}
        {hasLocation ? (
          <li className="jd-fact">
            <MapPin size={15} strokeWidth={2.25} aria-hidden />
            {event.city || event.region || event.venue}
          </li>
        ) : null}
      </ul>

      <HighlightStoriesSection
        channels={storyChannels}
        listingName={event.title}
        explorePath={eventPath}
        title="Feel the vibe"
        subtitle="Tap a highlight to watch"
        ctaLabel="View event"
        className="jd-stories"
        isOwner={isOwner}
        onAddHighlight={onAddHighlight}
      />

      <div className="ev-detail__ticket-block" id="event-ticket-panel">
        <EventTicketCard
          event={event}
          attending={attending}
          rsvpPending={rsvpPending}
          bookingStatus={bookingStatus}
          bookingTotal={bookingTotal}
          mockPaymentRef={mockPaymentRef}
          payPending={payPending}
          onRsvp={onRsvp}
          onCancelRsvp={onCancelRsvp}
          onPay={onPay}
          ticketQr={ticketQr}
        />
      </div>

      <EventDateShowcase event={event} className="ev-detail__date-block" />

      {event.description?.trim() || highlightLabels.length > 0 ? (
        <JourneySection title="About this event">
          {event.description?.trim() ? (
            <p className="jd-story__lead">{event.description.trim()}</p>
          ) : null}
          {highlightLabels.length > 0 ? (
            <ul className="jd-tips">
              {highlightLabels.map((tip) => (
                <li key={tip} className="jd-tip">
                  {tip}
                </li>
              ))}
            </ul>
          ) : null}
        </JourneySection>
      ) : null}

      {hasLocation ? (
        <JourneySection title="Venue">
          <p className="jd-story__lead">{[event.venue, cityLine].filter(Boolean).join(' · ')}</p>
          <div className="ev-detail__venue-acts">
            <a className="jd-btn" href={mapHref} target="_blank" rel="noopener noreferrer">
              <Navigation size={14} strokeWidth={2.25} aria-hidden />
              Directions
            </a>
            <a className="jd-btn" href={gcalUrl} target="_blank" rel="noopener noreferrer">
              <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
              Add to calendar
            </a>
          </div>
        </JourneySection>
      ) : null}

      <EventOrganizerCard event={event} className="ev-detail__organizer" />

      <ListingDelversMoments
        listingType="event"
        listingId={eventId}
        listingTitle={event.title}
        title="Moments from this event"
        className="ev-detail__moments"
        showWhenEmpty
        emptyMessage="Be the first to share a moment from this event."
      />
      <p className="ev-detail__moment-cta">
        <Link to={`/create/post?event=${eventId}`} className="text-link">
          Share your event moment
        </Link>
      </p>

      <ListingReviews
        reviews={reviews}
        listingType="event"
        listingId={eventId}
        rating={reviewRating}
        count={reviewCount}
        className="ev-detail__reviews"
        emptyMessage="Reviews appear after attendees check in."
      />

      {showReviewForm && myBookingId ? (
        <EventReviewForm bookingId={myBookingId} eventId={eventId} />
      ) : null}

      <EventCommentsSection
        eventId={eventId}
        commentsCount={commentsCount}
        sectionRef={commentsSectionRef}
        composerRef={commentComposerRef}
        className="jn-detail__comments"
      />

      <EventRelatedSection events={relatedEvents} className="ev-detail__related" />

      <div className="jd-mobilebar">
        <span className="jd-mobilebar__meta">
          <span className="jd-mobilebar__title">{event.title}</span>
          <span className="jd-mobilebar__sub">
            {start.valid ? `${start.weekday}, ${start.month} ${start.day}` : priceLabel}
          </span>
        </span>
        <div className="jd-mobilebar__actions">
          <button
            type="button"
            className={`jd-mobilebar__icon jd-mobilebar__icon--like${liked ? ' is-active' : ''}`}
            onClick={() => guardEngage(onLike)}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike event' : 'Like event'}
            aria-pressed={liked}
          >
            <Heart size={20} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button type="button" className="jd-mobilebar__icon" onClick={onShare} aria-label="Share event">
            <Share2 size={20} strokeWidth={2.25} aria-hidden />
          </button>
          {attending && bookingStatus === 'pending' && onPay ? (
            <button type="button" className="jd-mobilebar__btn" onClick={onPay} disabled={payPending}>
              <Ticket size={16} strokeWidth={2.25} aria-hidden />
              Pay now
            </button>
          ) : attending ? (
            <a href="#event-ticket-panel" className="jd-mobilebar__btn jd-mobilebar__btn--saved">
              <Ticket size={16} strokeWidth={2.25} aria-hidden />
              Going
            </a>
          ) : ticketingMode === 'external' ? (
            <a
              href={externalTicketHref(eventId)}
              className="jd-mobilebar__btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Ticket size={16} strokeWidth={2.25} aria-hidden />
              Tickets
            </a>
          ) : onRsvp ? (
            <button type="button" className="jd-mobilebar__btn" onClick={onRsvp} disabled={rsvpPending}>
              <Ticket size={16} strokeWidth={2.25} aria-hidden />
              {mobileCtaLabel}
            </button>
          ) : (
            <button
              type="button"
              className={`jd-mobilebar__btn${saved ? ' jd-mobilebar__btn--saved' : ''}`}
              onClick={() => guardEngage(onSave)}
              disabled={saveBusy}
            >
              <Bookmark size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
              {saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
