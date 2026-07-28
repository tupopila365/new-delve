import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  BedDouble,
  Clock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { mediaUrl } from '../../api/client'
import { useDisplayMoney } from '../../hooks/useDisplayMoney'
import { messageProviderPath } from '../messages/messageProviderUtils'
import { StayHostCard } from './StayHostCard'
import { AccommodationRoomBooking } from './AccommodationRoomBooking'
import { StayRoomPicker } from './StayRoomPicker'
import { ListingDelversMoments, ListingFaq, ListingLocationCard, ListingReviews } from '../listing'
import { ListingDealsStrip } from '../deals'
import type { ListingRoomOption } from '../listing/types'
import type { ReviewItem } from '../GuestReviewCard'
import { JourneyHero } from '../journeys/JourneyHero'
import { JourneySection } from '../journeys/JourneySection'
import { ReportButton } from '../report/ReportButton'
import { SellerTrustBadges } from '../marketplace/SellerTrustBadges'
import { ShareSheet } from '../share'
import {
  amenityChipIcon,
  amenityDisplayLabel,
  buildListingImages,
  buildPolicyRows,
  buildRoomOffers,
  loveItemIcon,
  normalizeFaqs,
  normalizeRoomTypes,
  hasValidCoords,
  parseCoord,
  normalizeHouseRules,
  propertyTypeLabel,
  sortAmenities,
  whyGuestsLove,
  type AccommodationListing,
} from '../../utils/accommodationListing'
import '../journeys/journey-detail.css'
import './accommodation-detail.css'

type Props = {
  data: AccommodationListing
  listingId: string
  saved: boolean
  liked: boolean
  likeCount?: number
  onSave: () => void
  onLike: () => void
  reviews?: ReviewItem[]
  ratingAvg?: string
  ratingCount?: number
}

export function AccommodationDetailView({
  data,
  listingId,
  saved,
  onSave,
  reviews = [],
  ratingAvg,
  ratingCount,
}: Props) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { format } = useDisplayMoney()
  const [selectedRoom, setSelectedRoom] = useState<ListingRoomOption | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  const faqs = normalizeFaqs(data.faqs)
  const roomTypes = normalizeRoomTypes(data.room_types)
  const rules = normalizeHouseRules(data.house_rules)

  const listingImages = buildListingImages(data).filter((img) => Boolean(img.src?.trim()))
  const roomOffers = buildRoomOffers(data, roomTypes, listingId)
  const bookingRoom = selectedRoom ?? roomOffers[0] ?? null
  const loveItems = whyGuestsLove(data)
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const sharePreviewImage =
    listingImages[0]?.src || data.cover_image || null
  const openShare = () => setShareOpen(true)
  const latitude = parseCoord(data.latitude)
  const longitude = parseCoord(data.longitude)
  const precisePin = hasValidCoords(latitude, longitude)
  const displayAddress =
    data.formatted_address?.trim() || data.address?.trim() || locationLine || null
  const sortedAmenities = sortAmenities(data.amenities ?? [])
  const hasDeals = Array.isArray(data.deals) && data.deals.length > 0
  const stayPath = `/accommodation/${listingId}`
  const profileHref = `/u/${encodeURIComponent(data.owner_username)}`
  const messageHref = messageProviderPath(data.owner_username, {
    type: 'accommodation',
    id: listingId,
    label: data.title,
  })

  const displayRating = ratingAvg ?? data.rating_avg
  const displayReviewCount = ratingCount ?? data.rating_count
  const hasReviews = displayReviewCount != null && Number(displayReviewCount) > 0
  const ratingNum =
    hasReviews && displayRating != null && displayRating !== '' ? Number(displayRating) : null
  const ratingLabel =
    ratingNum != null && Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : null

  const policyRows = buildPolicyRows(data, {
    clock: <Clock size={14} strokeWidth={2.25} aria-hidden />,
    shield: <ShieldCheck size={14} strokeWidth={2.25} aria-hidden />,
  })

  const typeLabel = data.property_type ? propertyTypeLabel(data.property_type) : 'Stay'
  const hostName = data.owner_display_name?.trim() || data.owner_username
  const initial = hostName.charAt(0).toUpperCase() || 'H'
  const hostAvatar = data.owner_avatar ? mediaUrl(data.owner_avatar) || data.owner_avatar : null

  function guardEngage(action: () => void) {
    if (!profile) {
      navigate('/login')
      return
    }
    action()
  }

  const scrollToRooms = () => {
    document.getElementById('stay-rooms')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToReserve = () => {
    const el =
      document.getElementById('stay-reserve-panel') || document.getElementById('stay-rooms')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selectedPrice =
    bookingRoom?.pricePerNight?.trim() ||
    bookingRoom?.fallbackPrice?.trim() ||
    data.price_per_night

  const mobilePrice = bookingRoom
    ? format(selectedPrice)
    : format(data.price_per_night, { from: true })

  const mobileSub = bookingRoom
    ? `${bookingRoom.name} · / night`
    : `${data.max_guests} guests · ${locationLine || 'Select room'}`

  const mobileCtaLabel = bookingRoom ? 'Check availability' : 'Select room'

  const handleMobileCta = () => {
    if (bookingRoom) {
      scrollToReserve()
      return
    }
    scrollToRooms()
  }

  return (
    <>
      <JourneyHero
        images={listingImages}
        backTo="/accommodation"
        backLabel="Stays"
        saved={saved}
        onSave={() => guardEngage(onSave)}
        onShare={openShare}
      />

      <div className="jd-titleblock">
        <span className="jd-badge">{typeLabel}</span>
        <h1 className="jd-title">{data.title}</h1>
        <div className="acc-detail__identity-meta">
          {locationLine ? (
            <span className="jd-hook">
              <MapPin size={15} strokeWidth={2.25} aria-hidden />
              {locationLine}
            </span>
          ) : null}
          {ratingLabel ? (
            <span className="acc-detail__verified-rating">
              <BadgeCheck size={15} strokeWidth={2.3} aria-hidden />
              {ratingLabel} verified
              {displayReviewCount ? ` · ${displayReviewCount} ${displayReviewCount === 1 ? 'stay' : 'stays'}` : ''}
            </span>
          ) : null}
        </div>
      </div>

      <div className="jd-head">
        <Link to={profileHref} className="jd-author">
          <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
            {hostAvatar ? <img src={hostAvatar} alt="" /> : initial}
          </span>
          <span className="jd-author__copy">
            <span className="jd-author__name">{data.owner_display_name?.trim() || `@${data.owner_username}`}</span>
            <span className="jd-author__sub">Local host</span>
            <SellerTrustBadges username={data.owner_username} compact />
          </span>
        </Link>

        <div className="jd-head__actions">
          <Link to={messageHref} className="jd-btn">
            <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
            <span className="jd-btn--label">Message</span>
          </Link>
          <ReportButton
            className="jd-btn jd-btn--icon"
            iconOnly
            triggerLabel="Report stay"
            target={{
              target_type: 'listing',
              target_id: `accommodation:${listingId}`,
              target_label: data.title,
            }}
          />
        </div>
      </div>

      <ul className="jd-facts">
        <li className="jd-fact">
          <Users size={15} strokeWidth={2.25} aria-hidden />
          {data.max_guests} guests
        </li>
        {data.bedrooms > 0 ? (
          <li className="jd-fact">
            <BedDouble size={15} strokeWidth={2.25} aria-hidden />
            {data.bedrooms} {data.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
          </li>
        ) : null}
      </ul>

      <div className="acc-detail__content-layout">
        {bookingRoom ? (
        <aside className="acc-detail__booking-column">
        <section
          className="acc-detail__trip-ledger"
          id="stay-reserve-panel"
          aria-labelledby="trip-ledger-title"
        >
          <div className="acc-detail__trip-ledger-head">
            <h2 id="trip-ledger-title">Plan your stay.</h2>
            <p><span>Selected room</span>{bookingRoom.name}</p>
          </div>
          <AccommodationRoomBooking
            room={bookingRoom}
            listingId={listingId}
            listingTitle={data.title}
            maxListingGuests={data.max_guests}
            className="acc-room-booking--ledger"
            initialCtaLabel="Check availability"
          />
          {hasDeals ? (
            <details className="acc-detail__deals-disclosure">
              <summary>Deals & discounts</summary>
              <ListingDealsStrip deals={data.deals} />
            </details>
          ) : null}
        </section>
        </aside>
        ) : null}

      <main className="acc-detail__main-column">
      <div id="stay-rooms" className="acc-detail__rooms">
        <StayRoomPicker
          rooms={roomOffers}
          listingId={listingId}
          selectedId={bookingRoom ? String(bookingRoom.id ?? bookingRoom.name) : null}
          onSelect={(room) => setSelectedRoom(room ?? roomOffers[0] ?? null)}
          fallbackCoverSrc={data.cover_image}
          title={roomTypes.length > 0 ? 'Rooms & rates' : 'Book this stay'}
          subtitle={
            roomTypes.length > 0 ? '' : 'Preview this stay and continue to booking.'
          }
        />
      </div>

      {(data.description?.trim() || loveItems.length > 0) && (
        <JourneySection title="Why stay here">
          {data.description?.trim() ? (
            <p className="jd-story__lead">{data.description.trim()}</p>
          ) : null}
          {loveItems.length > 0 ? (
            <ul className="jd-tips" style={{ marginTop: data.description?.trim() ? 14 : 0 }}>
              {loveItems.map((label) => {
                const Icon = loveItemIcon(label)
                return (
                  <li key={label} className="jd-tip">
                    <Icon size={14} strokeWidth={2.25} aria-hidden style={{ marginRight: 6 }} />
                    {label}
                  </li>
                )
              })}
            </ul>
          ) : null}
        </JourneySection>
      )}

      <ListingDelversMoments
        listingType="accommodation"
        listingId={listingId}
        listingTitle={data.title}
        title="From Delvers"
        className="acc-detail__from-delvers"
        showWhenEmpty
        emptyMessage="No moments yet. Travellers can share one after a completed stay."
      />

      <div className="acc-detail__verified-reviews">
        <p className="acc-detail__reviews-trust-cue">
          <BadgeCheck size={16} strokeWidth={2.3} aria-hidden />
          Completed stays only
        </p>
        <ListingReviews
          listingType="accommodation"
          listingId={listingId}
          reviews={reviews}
          title="Verified stay reviews"
          rating={hasReviews ? displayRating : null}
          count={displayReviewCount}
          emptyMessage="Ratings and written reviews will appear here after guests complete their stay."
          className="acc-detail__reviews"
        />
      </div>

      <div className="acc-detail__disclosures" aria-label="Stay details">
      {sortedAmenities.length > 0 ? (
        <details className="acc-detail__disclosure">
          <summary>Amenities</summary>
          <ul className="jd-amenity-grid">
            {sortedAmenities.map((raw) => {
              const label = amenityDisplayLabel(raw)
              const Icon = amenityChipIcon(raw)
              return (
                <li key={raw} className="jd-amenity-chip">
                  {Icon ? <Icon size={14} strokeWidth={2.25} aria-hidden /> : null}
                  {label}
                </li>
              )
            })}
          </ul>
        </details>
      ) : null}

      {rules.length > 0 || policyRows.length > 0 ? (
        <details className="acc-detail__disclosure">
          <summary>Rules</summary>
          <ul className="jd-rules">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          {policyRows.length > 0 ? (
            <ul className="jd-story__rows">
              {policyRows.map((row) => (
                <li key={row.label} className="jd-story__row">
                  <span className="jd-story__row-label">{row.icon}{row.label}</span>
                  <span className="jd-story__row-value">{row.value}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </details>
      ) : null}

      {(displayAddress || precisePin) && (
        <details className="acc-detail__disclosure">
          <summary>Location</summary>
        <ListingLocationCard
          title="Location"
          name={data.title}
          address={displayAddress}
          city={data.city}
          region={data.region}
          latitude={latitude}
          longitude={longitude}
          approximateHint={
            precisePin
              ? null
              : 'Area only — exact address is usually shared after booking. Ask the host for a pin if you need directions.'
          }
          className="acc-detail__location"
        />
        </details>
      )}

      <details className="acc-detail__disclosure">
        <summary>Host</summary>
        <StayHostCard
          username={data.owner_username}
          listingId={listingId}
          listingTitle={data.title}
          regionLine={locationLine}
          displayName={data.owner_display_name}
          photo={data.owner_avatar}
          className="acc-detail__provider"
        />
      </details>

      {faqs.length > 0 ? (
        <details className="acc-detail__disclosure">
          <summary>FAQ</summary>
          <ListingFaq items={faqs} title="FAQ" className="acc-detail__faq" />
        </details>
      ) : null}
      </div>
      </main>
      </div>

      <div className="jd-mobilebar">
        <span className="jd-mobilebar__meta">
          <span className="jd-mobilebar__title">{mobilePrice}</span>
          <span className="jd-mobilebar__sub">{mobileSub}</span>
        </span>
        <div className="jd-mobilebar__actions">
          <button type="button" className="jd-mobilebar__btn" onClick={handleMobileCta}>
            {mobileCtaLabel}
          </button>
        </div>
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        share={{
          path: stayPath,
          title: data.title || 'DELVE stay',
          text: `Check out ${data.title || 'this stay'} on DELVE`,
          previewImage: sharePreviewImage,
          previewLabel: locationLine ? `Stay · ${locationLine}` : 'Stay on DELVE',
        }}
      />
    </>
  )
}
