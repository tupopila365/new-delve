import { Link } from 'react-router-dom'
import {
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Truck,
  Utensils,
} from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { DetailLayout } from '../detail'
import {
  ListingAmenities,
  ListingAskSection,
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
import { MessageProviderLink } from '../messages'
import { VenueStoriesSection } from './stories'
import {
  buildFoodAmenities,
  buildFoodGalleryImages,
  buildFoodHighlights,
  buildFoodPolicyRows,
  buildFoodTrustHighlights,
  cuisineIcon,
  cuisineLabel,
  normalizeFoodReviews,
  openStreetMapSearchUrl,
  priceLevelLabel,
  priceLevelName,
  type FoodVenueListing,
} from '../../utils/foodListing'

type Props = {
  data: FoodVenueListing
  venueId: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  initialQuestions?: ListingQuestionItem[]
}

export function FoodDetailView({
  data,
  venueId,
  saved,
  onSave,
  onShare,
  initialQuestions,
}: Props) {
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const mapHref = openStreetMapSearchUrl(data.name, data.city ?? '', data.region)
  const detailBackTo = `/food/${venueId}`
  const galleryImages = buildFoodGalleryImages(data)
  const highlights = buildFoodHighlights(data)
  const amenities = buildFoodAmenities(data)
  const policyRows = buildFoodPolicyRows(data)
  const reviews = normalizeFoodReviews(data.reviews, data.name)
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

  const delversMoments = (data.delvers_moments ?? []).map((m) => ({
    id: String(m.id),
    image: m.image ? mediaUrl(m.image) || m.image : undefined,
    author: m.author_username,
    body: m.body,
    taggedListing: data.name,
  }))

  const bookAction = data.reservations ? (
    <MessageProviderLink
      username={data.owner_username}
      label="Request table"
      role="host"
      variant="primary"
    />
  ) : data.phone ? (
    <a href={`tel:${data.phone}`} className="btn btn-primary">
      Call venue
    </a>
  ) : (
    <a href={mapHref} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
      Get directions
    </a>
  )

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
        rating={data.rating_avg}
        reviewCount={data.rating_count}
        locationLabel={locationLine || null}
        isOpen={data.is_open}
        hoursLabel={
          data.is_open === true ? 'Open now' : data.is_open === false ? 'Closed' : null
        }
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        actions={[
          {
            id: 'message-venue',
            label: 'Message venue',
            icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
            href: `/messages/u/${encodeURIComponent(data.owner_username)}`,
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
              address={data.address?.trim() || locationLine || null}
              mapUrl={mapHref}
              viewMapLabel="View map"
              className="fd-detail__map-card acc-detail__map-card"
            />

            <ListingDelversMoments
              listingType="food"
              listingId={venueId}
              title="From Delvers"
              moments={delversMoments}
              className="fd-detail__moments acc-detail__moments"
              showWhenEmpty
              emptyMessage="No traveller photos yet — share yours on Delvers after you visit."
            />

            <ListingAskSection
              className="fd-detail__comments acc-detail__comments"
              title="Ask a question"
              placeholder="Ask about the menu, reservations, dietary options…"
              initialQuestions={initialQuestions}
            />

            <ListingReviews
              listingType="food"
              listingId={venueId}
              reviews={reviews}
              rating={data.rating_avg}
              count={data.rating_count}
              emptyMessage="Reviews will appear here once guests leave feedback."
              className="fd-detail__reviews acc-detail__reviews"
            />
          </>
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
