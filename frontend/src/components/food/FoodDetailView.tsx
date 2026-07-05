import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Truck,
  Utensils,
} from 'lucide-react'
import { apiFetch } from '../../api/client'
import { normalizeReviews } from '../GuestReviewCard'
import { DetailLayout } from '../detail'
import {
  ListingAmenities,
  ListingQuestionsSection,
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
import { messageProviderPath } from '../messages/messageProviderUtils'
import { VenueStoriesSection } from './stories'
import {
  buildFoodAmenities,
  buildFoodGalleryImages,
  buildFoodHighlights,
  buildFoodPolicyRows,
  buildFoodTrustHighlights,
  cuisineIcon,
  cuisineLabel,
  parseCoord,
  priceLevelLabel,
  priceLevelName,
  resolveDirectionsUrl,
  type FoodVenueListing,
} from '../../utils/foodListing'
import { FoodReviewForm } from './FoodReviewForm'
import { FoodReserveCard } from './FoodReserveCard'
import type { MyFoodReservation } from '../../hooks/useMyFoodReservations'
import { useAuth } from '../../auth/AuthContext'

type ReserveProps = {
  date: string
  time: string
  partySize: number
  notes: string
  onDateChange: (v: string) => void
  onTimeChange: (v: string) => void
  onPartySizeChange: (v: number) => void
  onNotesChange: (v: string) => void
  onReserve: () => void
  isPending: boolean
  err: string | null
  onDismissErr: () => void
  profile: { email_verified: boolean } | null
}

type Props = {
  data: FoodVenueListing
  venueId: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  canAnswer?: boolean
  hasReviewed?: boolean
  canReview?: boolean
  canReserve?: boolean
  reservation?: MyFoodReservation | null
  reserve?: ReserveProps
}

export function FoodDetailView({
  data,
  venueId,
  saved,
  onSave,
  onShare,
  canAnswer = false,
  hasReviewed = false,
  canReview = false,
  canReserve = false,
  reservation = null,
  reserve,
}: Props) {
  const { profile } = useAuth()
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const latitude = parseCoord(data.latitude)
  const longitude = parseCoord(data.longitude)
  const displayAddress = data.formatted_address?.trim() || data.address?.trim() || locationLine || null
  const directionsHref = resolveDirectionsUrl({
    name: data.name,
    address: data.address,
    city: data.city,
    region: data.region,
    latitude,
    longitude,
  })
  const detailBackTo = `/food/${venueId}`
  const galleryImages = buildFoodGalleryImages(data)
  const highlights = buildFoodHighlights(data)
  const amenities = buildFoodAmenities(data)
  const policyRows = buildFoodPolicyRows(data)
  const { data: reviewPayload } = useQuery({
    queryKey: ['food-reviews', venueId],
    queryFn: () =>
      apiFetch<{ reviews: unknown[]; rating_avg: number | string | null; rating_count: number }>(
        `/api/food/venues/${venueId}/reviews/`,
        { auth: false },
      ),
  })
  const reviews = normalizeReviews(reviewPayload?.reviews ?? [])
  const rating = reviewPayload?.rating_avg ?? data.rating_avg
  const reviewCount = reviewPayload?.rating_count ?? data.rating_count
  const trustItems = buildFoodTrustHighlights(data)
  const CuisineIcon = cuisineIcon(data.cuisine)
  const price = priceLevelLabel(data.price_level)
  const priceName = priceLevelName(data.price_level)

  const highlightItems = highlights.map((label) => ({
    id: label,
    label,
    icon: <Star size={16} strokeWidth={2.25} aria-hidden />,
  }))

  const amenityItems = amenities.map((label) => ({
    id: label,
    label,
    icon: label.toLowerCase().includes('delivery') || label.toLowerCase().includes('takeaway')
      ? <Truck size={14} strokeWidth={2.25} aria-hidden />
      : <Utensils size={14} strokeWidth={2.25} aria-hidden />,
  }))

  const policyRowsWithIcons = policyRows.map((row) => {
    if (row.id === 'hours') return { ...row, icon: <Clock size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'phone') return { ...row, icon: <Phone size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'address') return { ...row, icon: <MapPin size={14} strokeWidth={2.25} aria-hidden /> }
    return row
  })

  const bookAction = canReserve ? (
    <a href="#food-reserve-panel" className="btn btn-primary">
      Request table
    </a>
  ) : data.phone ? (
    <a href={`tel:${data.phone}`} className="btn btn-primary">
      Call venue
    </a>
  ) : directionsHref ? (
    <a href={directionsHref} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
      Get directions
    </a>
  ) : null

  return (
    <>
      <ListingHeroGallery
        className="fd-detail__gallery-wrap acc-detail__gallery-wrap"
        images={galleryImages}
        listingType="food"
        listingId={venueId}
        backTo="/food"
        backLabel="Food & drink"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      <ListingIdentityHeader
        name={data.name}
        tagline={data.tagline?.trim() || `By @${data.owner_username}`}
        categoryLabel={cuisineLabel(data.cuisine)}
        rating={rating}
        reviewCount={reviewCount}
        locationLabel={locationLine || null}
        isOpen={data.is_open}
        hoursLabel={
          data.is_open === true ? 'Open now' : data.is_open === false ? 'Closed' : null
        }
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        reportTarget={{
          target_type: 'listing',
          target_id: `food:${venueId}`,
          target_label: data.name,
        }}
        actions={[
          {
            id: 'message-venue',
            label: 'Message venue',
            icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
            href: messageProviderPath(data.owner_username, {
              type: 'food',
              id: venueId,
              label: data.name,
            }),
            accent: true,
          },
        ]}
        className="fd-detail__identity acc-detail__identity"
      />

      <ListingQuickInfo
        chips={[
          {
            id: 'cuisine',
            label: cuisineLabel(data.cuisine),
            icon: <CuisineIcon size={15} strokeWidth={2.25} aria-hidden />,
          },
          {
            id: 'price',
            label: `${price} · ${priceName}`,
            accent: true,
          },
          ...(data.popular_dish
            ? [{ id: 'dish', label: `Known for ${data.popular_dish}`, icon: <Star size={15} strokeWidth={2.25} aria-hidden /> }]
            : []),
        ]}
        highlights={trustItems}
        className="fd-detail__quick-info acc-detail__quick-info"
      />

      <VenueStoriesSection
        venue={data}
        venueId={venueId}
        title="From the kitchen"
        subtitle="Our story, menu, guest moments & more"
        className="fd-detail__stories"
      />

      <DetailLayout
        main={
          <>
            <ListingHighlights items={highlightItems} className="fd-detail__highlights acc-detail__love" />

            {data.description?.trim() || policyRowsWithIcons.length > 0 ? (
              <ListingDetails
                title="About this venue"
                description={data.description?.trim() || null}
                rows={policyRowsWithIcons}
                className="fd-detail__about acc-detail__about"
              />
            ) : null}

            {amenityItems.length > 0 ? (
              <ListingAmenities items={amenityItems} className="fd-detail__amenities acc-detail__amenities-block" />
            ) : null}

            <ListingLocationCard
              address={displayAddress}
              latitude={latitude}
              longitude={longitude}
              mapUrl={directionsHref || null}
              approximateHint={
                latitude != null && longitude != null
                  ? null
                  : data.address?.trim()
                    ? null
                    : 'Area only — street address may be shared by the venue.'
              }
              viewMapLabel={latitude != null && longitude != null ? 'Get directions' : 'Open in maps'}
              mapHint={
                latitude != null && longitude != null
                  ? 'Exact pin · opens Google Maps directions'
                  : 'Opens map search for this area'
              }
              className="fd-detail__map-card acc-detail__map-card"
            />

            <ListingDelversMoments
              listingType="food"
              listingId={venueId}
              listingTitle={data.name}
              title="From Delvers"
              className="fd-detail__moments acc-detail__moments"
              showWhenEmpty
              emptyMessage="No traveller photos yet — share yours on Delvers after you visit."
            />

            <ListingQuestionsSection
              className="fd-detail__comments acc-detail__comments"
              title="Ask a question"
              placeholder="Ask about the menu, reservations, dietary options…"
              questionsPath={`/api/food/venues/${venueId}/questions/`}
              answerPath={(questionId) => `/api/food/questions/${questionId}/answers/`}
              queryKey={['food-questions', venueId]}
              canAnswer={canAnswer}
              officialLabel="Venue"
            />

            <ListingReviews
              listingType="food"
              listingId={venueId}
              reviews={reviews}
              rating={rating}
              count={reviewCount}
              emptyMessage="Reviews will appear here once guests leave feedback."
              className="fd-detail__reviews acc-detail__reviews"
            />

            {profile && canReview ? (
              <FoodReviewForm venueId={venueId} />
            ) : profile && !hasReviewed && data.reservations && profile.username !== data.owner_username ? (
              <p className="stay-hint fd-detail__review-hint">
                Reviews unlock after your table visit is marked seated or completed.
              </p>
            ) : null}
          </>
        }
        sidebar={
          canReserve && reserve ? (
            <FoodReserveCard
              venue={data}
              date={reserve.date}
              time={reserve.time}
              partySize={reserve.partySize}
              notes={reserve.notes}
              onDateChange={reserve.onDateChange}
              onTimeChange={reserve.onTimeChange}
              onPartySizeChange={reserve.onPartySizeChange}
              onNotesChange={reserve.onNotesChange}
              onReserve={reserve.onReserve}
              isPending={reserve.isPending}
              err={reserve.err}
              onDismissErr={reserve.onDismissErr}
              profile={reserve.profile}
              reservation={reservation}
            />
          ) : null
        }
      />

      <ListingBookBar
        title={`${price} · ${priceName}`}
        subtitle={`${cuisineLabel(data.cuisine)} · ${locationLine}${data.is_open === true ? ' · Open now' : ''}`}
        action={bookAction}
        className="fd-detail__mobile-bar acc-detail__mobile-bar"
      />
    </>
  )
}
