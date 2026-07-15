import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BadgeDollarSign,
  BedDouble,
  Bookmark,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Share2,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { mediaUrl } from '../../api/client'
import { messageProviderPath } from '../messages/messageProviderUtils'
import { StayAskSection } from './StayAskSection'
import { StayHostCard } from './StayHostCard'
import { StayRoomPicker } from './StayRoomPicker'
import { buildStayStoryChannels } from './stayStoriesUtils'
import { ListingDelversMoments, ListingFaq, ListingReviews } from '../listing'
import type { ListingQuestionItem } from '../listing/ListingQuestionThread'
import type { ListingRoomOption } from '../listing/types'
import type { ReviewItem } from '../GuestReviewCard'
import { JourneyHero } from '../journeys/JourneyHero'
import { JourneySection } from '../journeys/JourneySection'
import { HighlightStoriesSection } from '../highlights/HighlightStoriesSection'
import { ReportButton } from '../report/ReportButton'
import {
  amenityChipIcon,
  amenityDisplayLabel,
  buildListingImages,
  buildPolicyRows,
  buildRoomOffers,
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
  onShare: () => void
  questions?: ListingQuestionItem[]
  loadingQuestions?: boolean
  canAnswerQuestions?: boolean
  reviews?: ReviewItem[]
  ratingAvg?: string
  ratingCount?: number
}

export function AccommodationDetailView({
  data,
  listingId,
  saved,
  liked,
  likeCount,
  onSave,
  onLike,
  onShare,
  questions = [],
  loadingQuestions = false,
  canAnswerQuestions = false,
  reviews = [],
  ratingAvg,
  ratingCount,
}: Props) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [selectedRoom, setSelectedRoom] = useState<ListingRoomOption | null>(null)

  const faqs = normalizeFaqs(data.faqs)
  const roomTypes = normalizeRoomTypes(data.room_types)
  const rules = data.house_rules ? parseHouseRules(data.house_rules) : []

  const listingImages = buildListingImages(data).filter((img) => Boolean(img.src?.trim()))
  const roomOffers = buildRoomOffers(data, roomTypes, listingId)
  const loveItems = whyGuestsLove(data)
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const sortedAmenities = sortAmenities(data.amenities ?? [])
  const mapHref = openStreetMapSearchUrl(data.city || '', data.region || '')
  const stayPath = `/accommodation/${listingId}`
  const profileHref = `/u/${encodeURIComponent(data.owner_username)}`
  const messageHref = messageProviderPath(data.owner_username, {
    type: 'accommodation',
    id: listingId,
    label: data.title,
  })

  const displayRating = ratingAvg ?? data.rating_avg
  const displayReviewCount = ratingCount ?? data.rating_count
  const ratingNum = displayRating != null && displayRating !== '' ? Number(displayRating) : null
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
  const displayLikeCount = likeCount ?? data.likes_count ?? 0

  const storyChannels = useMemo(
    () => buildStayStoryChannels(data, { listingId, stayPath }),
    [data, listingId, stayPath],
  )

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
    selectedRoom?.pricePerNight?.trim() ||
    selectedRoom?.fallbackPrice?.trim() ||
    data.price_per_night

  const mobilePrice = selectedRoom
    ? `N$${selectedPrice}`
    : `From N$${data.price_per_night}`

  const mobileSub = selectedRoom
    ? `${selectedRoom.name} · / night`
    : `${data.max_guests} guests · ${locationLine || 'Select room'}`

  const mobileCtaLabel = selectedRoom ? 'Check dates' : 'Select room'

  const handleMobileCta = () => {
    if (selectedRoom) {
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
        onShare={onShare}
      />

      <div className="jd-head">
        <Link to={profileHref} className="jd-author">
          <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
            {hostAvatar ? <img src={hostAvatar} alt="" /> : initial}
          </span>
          <span className="jd-author__copy">
            <span className="jd-author__name">{data.owner_display_name?.trim() || `@${data.owner_username}`}</span>
            <span className="jd-author__sub">
              Host
              {ratingLabel ? ` · ★ ${ratingLabel}` : ''}
            </span>
          </span>
        </Link>

        <div className="jd-head__actions">
          <Link to={messageHref} className="jd-btn jd-btn--primary">
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

      <div className="jd-titleblock">
        <span className="jd-badge">{typeLabel}</span>
        <h1 className="jd-title">{data.title}</h1>
        {locationLine ? (
          <p className="jd-hook">
            <MapPin
              size={15}
              strokeWidth={2.25}
              aria-hidden
              style={{ display: 'inline', verticalAlign: '-0.15em', marginRight: 6 }}
            />
            {locationLine}
          </p>
        ) : null}
      </div>

      <div className="jd-engage" aria-label="Stay actions">
        <div className="jd-engage__primary">
          <button
            type="button"
            className={`jd-engage__btn jd-engage__btn--like${liked ? ' is-active' : ''}`}
            onClick={() => guardEngage(onLike)}
            aria-label={liked ? 'Unlike stay' : 'Like stay'}
            aria-pressed={liked}
          >
            <Heart size={22} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            {displayLikeCount > 0 ? <span className="jd-engage__count">{displayLikeCount}</span> : null}
          </button>
          <button type="button" className="jd-engage__btn" onClick={onShare} aria-label="Share stay">
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
          {mapHref ? (
            <a
              href={mapHref}
              className="jd-engage__btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open area in maps"
            >
              <Navigation size={22} strokeWidth={2.25} aria-hidden />
            </a>
          ) : null}
        </div>
        <div className="jd-engage__secondary">
          <button
            type="button"
            className={`jd-engage__btn jd-engage__btn--save${saved ? ' is-active' : ''}`}
            onClick={() => guardEngage(onSave)}
            aria-label={saved ? 'Remove saved stay' : 'Save stay'}
            aria-pressed={saved}
          >
            <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </div>

      <ul className="jd-facts">
        <li className="jd-fact jd-fact--cost">
          <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
          From N${data.price_per_night} / night
        </li>
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
        {ratingLabel ? (
          <li className="jd-fact">
            <Star size={15} strokeWidth={2.25} aria-hidden />
            {ratingLabel}
            {displayReviewCount ? ` (${displayReviewCount})` : ''}
          </li>
        ) : null}
        {data.region ? (
          <li className="jd-fact">
            <MapPin size={15} strokeWidth={2.25} aria-hidden />
            {data.region}
          </li>
        ) : null}
      </ul>

      <div id="stay-rooms" className="acc-detail__rooms">
        <StayRoomPicker
          rooms={roomOffers}
          listingId={listingId}
          selectedId={selectedRoom ? String(selectedRoom.id ?? selectedRoom.name) : null}
          onSelect={setSelectedRoom}
          fallbackCoverSrc={data.cover_image}
          title={roomTypes.length > 0 ? 'Rooms & rates' : 'Book this stay'}
          subtitle={
            roomTypes.length > 0
              ? 'Compare rooms like tickets — select one, then check dates.'
              : 'Preview this stay and continue to booking.'
          }
        />
      </div>

      <div className="acc-detail__reserve-block" id="stay-reserve-panel">
        {selectedRoom ? (
          <div className="stay-reserve">
            <p className="stay-reserve__kicker">Continue with this room</p>
            <p className="stay-reserve__price">
              N${selectedPrice}
              <small> / night</small>
            </p>
            <p className="stay-reserve__meta">{selectedRoom.name}</p>
            <div className="stay-reserve__actions">
              <Link
                to={`/accommodation/${listingId}/room/${encodeURIComponent(selectedRoom.name)}`}
                className="btn btn-primary"
              >
                Check dates
              </Link>
              <Link to={selectedRoom.bookHref} className="jd-btn">
                Book now
              </Link>
            </div>
          </div>
        ) : (
          <div className="stay-reserve">
            <p className="stay-reserve__kicker">Reserve a stay</p>
            <p className="stay-reserve__price">
              From N${data.price_per_night}
              <small> / night</small>
            </p>
            <p className="stay-reserve__hint">Choose a room above to continue with dates and guests.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={scrollToRooms}>
              Select room
            </button>
          </div>
        )}
      </div>

      {storyChannels.length > 0 ? (
        <HighlightStoriesSection
          channels={storyChannels}
          listingName={data.title}
          explorePath={stayPath}
          title="Stay moments"
          subtitle="Spaces & highlights — tap to watch"
          ctaLabel="View stay"
          className="jd-stories"
        />
      ) : null}

      {(data.description?.trim() || loveItems.length > 0 || policyRows.length > 0) && (
        <JourneySection title="About this stay">
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
          {policyRows.length > 0 ? (
            <ul className="jd-story__rows" style={{ marginTop: 14 }}>
              {policyRows.map((row) => (
                <li key={row.label} className="jd-story__row">
                  <span className="jd-story__row-label">
                    {row.icon}
                    {row.label}
                  </span>
                  <span className="jd-story__row-value">{row.value}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </JourneySection>
      )}

      {sortedAmenities.length > 0 ? (
        <JourneySection title="Amenities">
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
        </JourneySection>
      ) : null}

      {rules.length > 0 ? (
        <JourneySection title="House rules">
          <ul className="jd-rules">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </JourneySection>
      ) : null}

      {(locationLine || mapHref) && (
        <JourneySection title="Location">
          <p className="jd-story__lead">
            {locationLine || 'Area shared after booking confirmation.'}
          </p>
          <p className="jd-hook" style={{ marginTop: 8 }}>
            Area only — exact address is usually shared after booking.
          </p>
          {mapHref ? (
            <div className="acc-detail__venue-acts">
              <a className="jd-btn" href={mapHref} target="_blank" rel="noopener noreferrer">
                <Navigation size={14} strokeWidth={2.25} aria-hidden />
                Open in maps
              </a>
            </div>
          ) : null}
        </JourneySection>
      )}

      <StayHostCard
        username={data.owner_username}
        listingId={listingId}
        listingTitle={data.title}
        regionLine={locationLine}
        displayName={data.owner_display_name}
        photo={data.owner_avatar}
        className="acc-detail__provider"
      />

      <ListingDelversMoments
        listingType="accommodation"
        listingId={listingId}
        listingTitle={data.title}
        title="From Delvers"
        className="acc-detail__moments"
        showWhenEmpty
        emptyMessage="No guest moments yet."
      />
      <p className="acc-detail__moment-cta">
        <Link to={`/create/post?listing=${listingId}`} className="text-link">
          Share a moment from this stay
        </Link>
      </p>

      <StayAskSection
        listingId={listingId}
        className="acc-detail__questions"
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

      <div className="jd-mobilebar">
        <span className="jd-mobilebar__meta">
          <span className="jd-mobilebar__title">{mobilePrice}</span>
          <span className="jd-mobilebar__sub">{mobileSub}</span>
        </span>
        <div className="jd-mobilebar__actions">
          <button
            type="button"
            className={`jd-mobilebar__icon jd-mobilebar__icon--like${liked ? ' is-active' : ''}`}
            onClick={() => guardEngage(onLike)}
            aria-label={liked ? 'Unlike' : 'Like'}
            aria-pressed={liked}
          >
            <Heart size={18} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button
            type="button"
            className={`jd-mobilebar__icon${saved ? ' is-active' : ''}`}
            onClick={() => guardEngage(onSave)}
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            <Bookmark size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button type="button" className="jd-mobilebar__btn" onClick={handleMobileCta}>
            {mobileCtaLabel}
          </button>
        </div>
      </div>
    </>
  )
}
