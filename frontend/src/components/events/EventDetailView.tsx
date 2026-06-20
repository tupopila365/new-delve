import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeDollarSign,
  CalendarDays,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Sparkles,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react'
import { DetailLayout } from '../detail'
import {
  ListingAskSection,
  ListingBookBar,
  ListingDelversMoments,
  ListingDetails,
  ListingHeroGallery,
  ListingHighlights,
  ListingIdentityHeader,
  ListingLocationCard,
  ListingQuickInfo,
} from '../listing'
import type { ListingQuestionItem } from '../listing/ListingQuestionThread'
import { VenueStoriesSection } from '../food/stories'
import {
  admissionLabel,
  buildEventDetailRows,
  buildEventGalleryImages,
  buildEventHighlights,
  buildEventMoments,
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
import { buildEventStoryChannels } from './eventStoriesUtils'
import { EventDateShowcase } from './EventDateShowcase'
import { EventOrganizerCard } from './EventOrganizerCard'
import { EventRelatedSection } from './EventRelatedSection'
import { EventTicketCard } from './EventTicketCard'
import './event-detail.css'

type Props = {
  event: EventDetail
  eventId: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  relatedEvents: EventListItem[]
  initialQuestions?: ListingQuestionItem[]
}

export function EventDetailView({
  event,
  eventId,
  saved,
  onSave,
  onShare,
  relatedEvents,
  initialQuestions,
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
  const hasTicketing = Boolean(event.ticket_url?.trim())
  const priceLabel = admissionLabel(event)
  const countdown = eventCountdownLabel(event.starts_at)
  const eventPath = `/events/${eventId}`
  const detailBackTo = eventPath
  const galleryImages = buildEventGalleryImages(event)
  const trustHighlights = buildEventTrustHighlights(event)
  const highlightLabels = buildEventHighlights(event)
  const detailRows = buildEventDetailRows(event)
  const delversMoments = buildEventMoments(event)
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

  const bookAction = hasTicketing ? (
    <a href={event.ticket_url!} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
      <Ticket size={16} strokeWidth={2.25} aria-hidden />
      Get tickets
    </a>
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
        actions={[
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
          {
            id: 'organizer',
            label: 'Message organizer',
            icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
            href: '/messages',
          },
        ]}
        className="ev-detail__identity acc-detail__identity"
      />

      <ListingQuickInfo
        chips={quickChips}
        highlights={trustHighlights}
        className="ev-detail__quick-info acc-detail__quick-info"
      />

      <VenueStoriesSection
        listingName={event.title}
        explorePath={eventPath}
        channels={storyChannels}
        title="Feel the vibe"
        subtitle="The event, plan your night & venue — tap to watch"
        ctaLabel="View event"
        className="ev-detail__stories acc-detail__section"
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
              address={locationAddress || 'Location details will be shared by the organizer.'}
              mapUrl={mapHref}
              viewMapLabel="Get directions"
              className="ev-detail__map-card acc-detail__map-card"
            />

            <EventOrganizerCard event={event} className="acc-detail__section" />

            <EventRelatedSection events={relatedEvents} className="acc-detail__section" />

            <ListingDelversMoments
              listingType="event"
              listingId={eventId}
              title="Delvers moments from this event"
              moments={delversMoments}
              className="ev-detail__moments acc-detail__moments"
              showWhenEmpty
              emptyMessage="Photos and tips will appear after people attend this event."
            />

            <ListingAskSection
              className="ev-detail__comments acc-detail__comments"
              title="Questions and local tips"
              placeholder="Ask about parking, tickets, dress code, food, or arrival time…"
              initialQuestions={initialQuestions}
            />
          </>
        }
        sidebar={<EventTicketCard event={event} />}
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
