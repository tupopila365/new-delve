import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeDollarSign,
  CalendarDays,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Sparkles,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react'
import { DetailLayout } from '../detail'
import {
  ListingBookBar,
  ListingDelversMoments,
  ListingDetails,
  ListingHeroGallery,
  ListingHighlights,
  ListingIdentityHeader,
  ListingLocationCard,
  ListingQuickInfo,
  ListingReviews,
} from '../listing'
import type { ListingQuestionItem } from '../listing/ListingQuestionThread'
import type { ReviewItem } from '../GuestReviewCard'
import { HighlightStoriesSection } from '../highlights/HighlightStoriesSection'
import {
  admissionLabel,
  buildEventDetailRows,
  buildEventGalleryImages,
  buildEventHighlights,
  buildEventTrustHighlights,
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
import { messageProviderPath } from '../messages/messageProviderUtils'
import { externalTicketHref, resolveTicketingMode } from '../../utils/eventTicketing'
import { buildEventStoryChannels } from './eventStoriesUtils'
import { EventAskSection } from './EventAskSection'
import { EventDateShowcase } from './EventDateShowcase'
import { EventOrganizerCard } from './EventOrganizerCard'
import { EventRelatedSection } from './EventRelatedSection'
import { EventReviewForm } from './EventReviewForm'
import { EventTicketCard } from './EventTicketCard'
import './event-detail.css'

type Props = {
  event: EventDetail
  eventId: string
  editHref?: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  relatedEvents: EventListItem[]
  questions?: ListingQuestionItem[]
  questionsLoading?: boolean
  canAnswerQuestions?: boolean
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
  onSave,
  onShare,
  relatedEvents,
  questions = [],
  questionsLoading = false,
  canAnswerQuestions = false,
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
  const cat = categoryMeta(event.category)
  const CatIcon = cat.Icon
  const start = formatEventDateLong(event.starts_at)
  const timeLabel = eventTimeRange(event)
  const organizerName = organizerLabel(event)
  const organizerProfileHref = event.organizer_username
    ? `/u/${encodeURIComponent(event.organizer_username)}`
    : '/messages'
  const locationLine = eventLocationLine(event)
  const cityLine = [event.city, event.region].filter(Boolean).join(', ')
  const hasLocation = Boolean(event.venue?.trim() || event.city || event.region)
  const ticketingMode = resolveTicketingMode(event)
  const priceLabel = admissionLabel(event)
  const countdown = eventCountdownLabel(event.starts_at)
  const eventPath = `/events/${eventId}`
  const detailBackTo = eventPath
  const galleryImages = buildEventGalleryImages(event)
  const trustHighlights = buildEventTrustHighlights(event)
  const highlightLabels = buildEventHighlights(event)
  const detailRows = buildEventDetailRows(event)
  const mapHref = openStreetMapSearchUrl(event.venue ?? '', event.city ?? '', event.region)
  const gcalUrl = buildGoogleCalendarUrl(event)

  const storyChannels = useMemo(
    () => buildEventStoryChannels(event, { eventId, eventPath }),
    [event, eventId, eventPath],
  )

  const highlightItems = highlightLabels.map((label) => ({
    id: label,
    label,
    icon: <Sparkles size={16} strokeWidth={2.25} aria-hidden />,
  }))

  const detailRowsWithIcons = detailRows.map((row) => {
    if (row.id === 'date') return { ...row, icon: <CalendarDays size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'time') return { ...row, icon: <Clock size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'venue' || row.id === 'location') return { ...row, icon: <MapPin size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'price') return { ...row, icon: <BadgeDollarSign size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'organizer') return { ...row, icon: <UserRound size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'category') return { ...row, icon: <CatIcon size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'capacity') return { ...row, icon: <Users size={14} strokeWidth={2.25} aria-hidden /> }
    return row
  })

  const quickChips = [
    {
      id: 'category',
      label: cat.label,
      icon: <CatIcon size={15} strokeWidth={2.25} aria-hidden />,
    },
    {
      id: 'date',
      label: start.valid ? `${start.month} ${start.day}` : 'Date TBA',
      icon: <CalendarDays size={15} strokeWidth={2.25} aria-hidden />,
    },
    {
      id: 'price',
      label: priceLabel,
      accent: true,
      icon: <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />,
    },
    ...(countdown
      ? [{ id: 'countdown', label: countdown, icon: <Sparkles size={15} strokeWidth={2.25} aria-hidden /> }]
      : []),
  ]

  const tagline = [
    start.valid ? `${start.weekday}, ${timeLabel}` : null,
    locationLine || null,
    `Hosted by ${organizerName}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const mobileTitle = start.valid ? `${start.weekday}, ${start.month} ${start.day}` : priceLabel
  const mobileSubtitle = [event.venue || cityLine, !event.is_free && event.price ? `N$${event.price}` : null]
    .filter(Boolean)
    .join(' · ')

  const bookAction = attending ? (
    bookingStatus === 'pending' && onPay ? (
      <button type="button" className="btn btn-primary" onClick={onPay}>
        <Ticket size={16} strokeWidth={2.25} aria-hidden />
        Pay now
      </button>
    ) : (
      <Link to="#event-ticket-panel" className="btn btn-primary">
        <Ticket size={16} strokeWidth={2.25} aria-hidden />
        You're going
      </Link>
    )
  ) : ticketingMode === 'external' ? (
    <a href={externalTicketHref(eventId)} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
      <Ticket size={16} strokeWidth={2.25} aria-hidden />
      Get tickets
    </a>
  ) : onRsvp ? (
    <button type="button" className="btn btn-primary" onClick={onRsvp} disabled={rsvpPending}>
      <Ticket size={16} strokeWidth={2.25} aria-hidden />
      {resolveTicketingMode(event) === 'on_platform' ? `Reserve · N$${event.price}` : 'RSVP'}
    </button>
  ) : (
    <Link to={organizerProfileHref} className="btn btn-primary">
      <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
      Contact organizer
    </Link>
  )

  const locationAddress = [
    event.venue?.trim(),
    event.address?.trim(),
    cityLine,
  ]
    .filter(Boolean)
    .join(' · ') || null

  return (
    <>
      <ListingHeroGallery
        className="ev-detail__gallery-wrap acc-detail__gallery-wrap"
        images={galleryImages}
        listingType="event"
        listingId={eventId}
        backTo="/events"
        backLabel="Events"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      <ListingIdentityHeader
        name={event.title}
        tagline={tagline}
        categoryLabel={cat.label}
        locationLabel={locationLine || null}
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        reportTarget={{
          target_type: 'listing',
          target_id: `event:${eventId}`,
          target_label: event.title,
        }}
        actions={[
          ...(editHref
            ? [
                {
                  id: 'edit',
                  label: 'Edit event',
                  icon: <Pencil size={14} strokeWidth={2.25} aria-hidden />,
                  href: editHref,
                },
              ]
            : []),
          {
            id: 'calendar',
            label: 'Add to calendar',
            icon: <CalendarDays size={14} strokeWidth={2.25} aria-hidden />,
            href: gcalUrl,
            accent: true,
          },
          ...(hasLocation
            ? [
                {
                  id: 'directions',
                  label: 'Directions',
                  icon: <Navigation size={14} strokeWidth={2.25} aria-hidden />,
                  href: mapHref,
                },
              ]
            : []),
          ...(event.organizer_username
            ? [
                {
                  id: 'organizer',
                  label: 'Message organizer',
                  icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
                  href: messageProviderPath(event.organizer_username, {
                    type: 'event' as const,
                    id: eventId,
                    label: event.title,
                  }),
                },
              ]
            : []),
        ]}
        className="ev-detail__identity acc-detail__identity"
      />

      <ListingQuickInfo
        chips={quickChips}
        highlights={trustHighlights}
        className="ev-detail__quick-info acc-detail__quick-info"
      />

      <HighlightStoriesSection
        channels={storyChannels}
        listingName={event.title}
        explorePath={eventPath}
        title="Feel the vibe"
        subtitle="Tap a highlight to watch"
        ctaLabel="View event"
        className="ev-detail__stories acc-detail__section"
        isOwner={isOwner}
        onAddHighlight={onAddHighlight}
      />

      <DetailLayout
        main={
          <>
            <EventDateShowcase event={event} className="acc-detail__section" />

            <ListingHighlights
              title="What to expect"
              items={highlightItems}
              className="ev-detail__highlights acc-detail__love"
            />

            <ListingDetails
              title="About this event"
              description={event.description?.trim() || null}
              rows={detailRowsWithIcons}
              className="ev-detail__about acc-detail__about"
            />

            <ListingLocationCard
              title="Venue and location"
              address={locationAddress || null}
              mapUrl={mapHref || null}
              approximateHint={
                event.address?.trim()
                  ? null
                  : locationAddress
                    ? 'Venue / area only — confirm the street address with the organizer.'
                    : 'Exact venue details will be shared by the organizer.'
              }
              viewMapLabel="Open in maps"
              className="ev-detail__map-card acc-detail__map-card"
            />

            <EventOrganizerCard event={event} className="acc-detail__section" />

            <EventRelatedSection events={relatedEvents} className="acc-detail__section" />

            <ListingDelversMoments
              listingType="event"
              listingId={eventId}
              listingTitle={event.title}
              title="Delvers moments from this event"
              className="ev-detail__moments acc-detail__moments"
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
              className="acc-detail__section"
              emptyMessage="Reviews appear after attendees check in."
            />

            {showReviewForm && myBookingId ? (
              <EventReviewForm bookingId={myBookingId} eventId={eventId} />
            ) : null}

            <EventAskSection
              eventId={eventId}
              className="ev-detail__comments acc-detail__comments"
              title="Questions and local tips"
              questions={questions}
              isLoading={questionsLoading}
              canAnswer={canAnswerQuestions}
            />
          </>
        }
        sidebar={
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
        }
      />

      <ListingBookBar
        title={mobileTitle}
        subtitle={mobileSubtitle || 'Event details'}
        action={bookAction}
        className="ev-detail__mobile-bar acc-detail__mobile-bar"
      />
    </>
  )
}
