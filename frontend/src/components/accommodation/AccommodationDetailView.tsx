import { Link } from 'react-router-dom'
import {
  BedDouble,
  Clock,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { StayAskSection } from './StayAskSection'
import { DetailLayout } from '../detail'
import {
  ListingAmenities,
  ListingBookBar,
  ListingDelversMoments,
  ListingDetails,
  ListingFaq,
  ListingHeroGallery,
  ListingHighlights,
  ListingIdentityHeader,
  ListingLocationCard,
  ListingQuickInfo,
  ListingReviews,
  ListingRoomPicker,
  ListingRules,
} from '../listing'
import type { ListingQuestionItem } from '../listing/ListingQuestionThread'
import type { ListingMomentItem } from '../listing/types'
import type { ReviewItem } from '../GuestReviewCard'
import {
  amenityChipIcon,
  buildListingImages,
  buildPolicyRows,
  buildRoomOffers,
  buildTrustHighlights,
  loveItemIcon,
  normalizeFaqs,
  normalizeRoomTypes,
  openStreetMapSearchUrl,
  parseHouseRules,
  propertyTypeLabel,
  sortAmenities,
  whyGuestsLove,
  type AccommodationListing,
} from '../../utils/accommodationListing'

type Props = {
  data: AccommodationListing
  listingId: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  questions?: ListingQuestionItem[]
  loadingQuestions?: boolean
  canAnswerQuestions?: boolean
  moments?: ListingMomentItem[]
  reviews?: ReviewItem[]
  ratingAvg?: string
  ratingCount?: number
}

export function AccommodationDetailView({
  data,
  listingId,
  saved,
  onSave,
  onShare,
  questions = [],
  loadingQuestions = false,
  canAnswerQuestions = false,
  moments = [],
  reviews = [],
  ratingAvg,
  ratingCount,
}: Props) {
  const faqs = normalizeFaqs(data.faqs)
  const roomTypes = normalizeRoomTypes(data.room_types)
  const rules = data.house_rules ? parseHouseRules(data.house_rules) : []

  const detailBackTo = `/accommodation/${listingId}`
  const listingImages = buildListingImages(data)
  const roomOffers = buildRoomOffers(data, roomTypes, listingId)
  const loveItems = whyGuestsLove(data)
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const sortedAmenities = sortAmenities(data.amenities ?? [])
  const bookHref = `/accommodation/${listingId}/book`
  const mapHref = openStreetMapSearchUrl(data.city || '', data.region || '')

  const displayRating = ratingAvg ?? data.rating_avg
  const displayReviewCount = ratingCount ?? data.rating_count

  const policyRows = buildPolicyRows(data, {
    clock: <Clock size={14} strokeWidth={2.25} aria-hidden />,
    shield: <ShieldCheck size={14} strokeWidth={2.25} aria-hidden />,
  })

  const trustItems = buildTrustHighlights(data)

  const highlightItems = loveItems.map((label) => {
    const Icon = loveItemIcon(label)
    return {
      id: label,
      label,
      icon: <Icon size={16} strokeWidth={2.25} aria-hidden />,
    }
  })

  const amenityItems = sortedAmenities.map((label) => {
    const Icon = amenityChipIcon(label)
    return {
      id: label,
      label,
      icon: Icon ? <Icon size={14} strokeWidth={2.25} aria-hidden /> : undefined,
    }
  })

  return (
    <>
      <ListingHeroGallery
        className="acc-detail__gallery-wrap"
        images={listingImages}
        listingType="accommodation"
        listingId={listingId}
        backTo="/accommodation"
        backLabel="Stays"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      <ListingIdentityHeader
        name={data.title}
        tagline={`Hosted by @${data.owner_username}`}
        categoryLabel={data.property_type ? propertyTypeLabel(data.property_type) : null}
        rating={displayRating}
        reviewCount={displayReviewCount}
        locationLabel={locationLine || null}
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        reportTarget={{
          target_type: 'listing',
          target_id: `accommodation:${listingId}`,
          target_label: data.title,
        }}
        actions={[
          {
            id: 'message-host',
            label: 'Message host',
            icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
            href: `/messages/u/${encodeURIComponent(data.owner_username)}`,
            accent: true,
          },
        ]}
        className="acc-detail__identity"
      />

      <ListingQuickInfo
        chips={[
          {
            id: 'bedrooms',
            label: `${data.bedrooms} ${data.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`,
            icon: <BedDouble size={15} strokeWidth={2.25} aria-hidden />,
          },
          {
            id: 'guests',
            label: `${data.max_guests} guests`,
            icon: <Users size={15} strokeWidth={2.25} aria-hidden />,
          },
          {
            id: 'price',
            label: `From N$${data.price_per_night} / night`,
            accent: true,
          },
        ]}
        highlights={trustItems}
        className="acc-detail__quick-info"
      />

      <ListingRoomPicker
        title={roomTypes.length > 0 ? 'Rooms & offers' : 'Book a room'}
        subtitle={
          roomTypes.length > 0
            ? 'Tap a room to see photos, details, and book.'
            : 'Preview this stay and continue to booking.'
        }
        rooms={roomOffers}
        listingType="accommodation"
        listingId={listingId}
        detailBackTo={detailBackTo}
        className="acc-detail__rooms"
      />

      <DetailLayout
        main={
          <>
            <ListingHighlights items={highlightItems} className="acc-detail__love" />

            {data.description?.trim() || policyRows.length > 0 ? (
              <ListingDetails
                title="About this stay"
                description={data.description?.trim() || null}
                rows={policyRows}
                className="acc-detail__about"
              />
            ) : null}

            <ListingAmenities items={amenityItems} className="acc-detail__amenities-block" />

            <ListingRules rules={rules} className="acc-detail__rules-block" />

            <ListingLocationCard
              address={locationLine || null}
              mapUrl={mapHref}
              viewMapLabel="View map"
              className="acc-detail__map-card"
            />

            <ListingDelversMoments
              listingType="accommodation"
              listingId={listingId}
              title="From Delvers"
              moments={moments}
              className="acc-detail__moments"
              showWhenEmpty
              emptyMessage="No guest moments yet."
            />

            <StayAskSection
              listingId={listingId}
              className="acc-detail__comments"
              questions={questions}
              isLoading={loadingQuestions}
              canAnswer={canAnswerQuestions}
            />

            <ListingReviews
              listingType="accommodation"
              listingId={listingId}
              reviews={reviews}
              rating={displayRating}
              count={displayReviewCount}
              emptyMessage="Ratings and written reviews will appear here after guests complete their stay."
              className="acc-detail__reviews"
            />

            <ListingFaq items={faqs} title="FAQ" className="acc-detail__faq" />
          </>
        }
      />

      <ListingBookBar
        title={`N$${data.price_per_night} / night`}
        subtitle={`${data.max_guests} guests · ${locationLine}`}
        action={
          <Link to={bookHref} className="btn btn-primary">
            Request booking
          </Link>
        }
        className="acc-detail__mobile-bar"
      />
    </>
  )
}
