import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bookmark,
  Clock,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Phone,
  Share2,
  Star,
  Truck,
  Utensils,
} from 'lucide-react'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { normalizeReviews } from '../GuestReviewCard'
import { JourneyHero } from '../journeys/JourneyHero'
import { JourneySection } from '../journeys/JourneySection'
import { ListingDelversMoments, ListingReviews } from '../listing'
import { messageProviderPath } from '../messages/messageProviderUtils'
import { ReportButton } from '../report/ReportButton'
import {
  buildFoodAmenities,
  buildFoodGalleryImages,
  buildFoodHighlights,
  cuisineIcon,
  cuisineLabel,
  parseCoord,
  priceLevelLabel,
  priceLevelName,
  resolveDirectionsUrl,
  type FoodVenueListing,
} from '../../utils/foodListing'
import { VenueStoriesSection } from './stories'
import { FoodReviewForm } from './FoodReviewForm'
import { FoodReserveCard } from './FoodReserveCard'
import type { MyFoodReservation } from '../../hooks/useMyFoodReservations'
import '../journeys/journey-detail.css'
import './food-detail.css'

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
  editHref?: string
  liked: boolean
  saved: boolean
  likeBusy?: boolean
  saveBusy?: boolean
  likeCount?: number
  saveCount?: number
  onLike: () => void
  onSave: () => void
  onShare: () => void
  hasReviewed?: boolean
  canReview?: boolean
  canReserve?: boolean
  reservation?: MyFoodReservation | null
  reserve?: ReserveProps
}

function hoursPreview(openingHours: string | null | undefined): string | null {
  if (!openingHours?.trim()) return null
  const lines = openingHours
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return null
  if (lines.length === 1) return lines[0]
  return `${lines[0]} · +${lines.length - 1} more`
}

export function FoodDetailView({
  data,
  venueId,
  editHref,
  liked,
  saved,
  likeBusy = false,
  saveBusy = false,
  likeCount: likeCountProp,
  saveCount: saveCountProp,
  onLike,
  onSave,
  onShare,
  hasReviewed = false,
  canReview = false,
  canReserve = false,
  reservation = null,
  reserve,
}: Props) {
  const navigate = useNavigate()
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
  const galleryImages = buildFoodGalleryImages(data)
  const highlights = buildFoodHighlights(data)
  const amenities = buildFoodAmenities(data)
  const CuisineIcon = cuisineIcon(data.cuisine)
  const price = priceLevelLabel(data.price_level)
  const priceName = priceLevelName(data.price_level)
  const hoursLine = hoursPreview(data.opening_hours)
  const hostName = data.owner_display_name?.trim() || data.owner_username
  const hostInitial = hostName.charAt(0).toUpperCase() || '?'
  const likeCount = likeCountProp ?? data.likes_count ?? 0
  const saveCount = saveCountProp ?? data.saves_count ?? 0
  const websiteHref = data.website?.trim()
    ? data.website.startsWith('http')
      ? data.website.trim()
      : `https://${data.website.trim()}`
    : null

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
  const ratingNum = rating != null && rating !== '' ? Number(rating) : null
  const ratingLabel =
    (reviewCount ?? 0) > 0 && ratingNum != null && Number.isFinite(ratingNum) && ratingNum > 0
      ? ratingNum.toFixed(1)
      : null

  function guardEngage(action: () => void) {
    if (!profile) {
      navigate('/login')
      return
    }
    action()
  }

  const mobileCta = canReserve ? (
    <a href="#food-reserve-panel" className="jd-mobilebar__btn">
      <Utensils size={16} strokeWidth={2.25} aria-hidden />
      {reservation ? 'Your table' : 'Request table'}
    </a>
  ) : data.phone ? (
    <a href={`tel:${data.phone}`} className="jd-mobilebar__btn">
      <Phone size={16} strokeWidth={2.25} aria-hidden />
      Call
    </a>
  ) : directionsHref ? (
    <a href={directionsHref} className="jd-mobilebar__btn" target="_blank" rel="noopener noreferrer">
      <Navigation size={16} strokeWidth={2.25} aria-hidden />
      Directions
    </a>
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
  )

  return (
    <>
      <JourneyHero
        images={galleryImages}
        backTo="/food"
        backLabel="Food & drink"
        liked={liked}
        saved={saved}
        likeBusy={likeBusy}
        saveBusy={saveBusy}
        onLike={() => guardEngage(onLike)}
        onSave={() => guardEngage(onSave)}
        onShare={onShare}
      />

      <div className="jd-head">
        {data.owner_username ? (
          <Link to={`/u/${encodeURIComponent(data.owner_username)}`} className="jd-author">
            <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
              {hostInitial}
            </span>
            <span className="jd-author__copy">
              <span className="jd-author__name">{hostName}</span>
              <span className="jd-author__sub">
                @{data.owner_username}
                {data.is_open === true ? ' · Open now' : data.is_open === false ? ' · Closed' : ''}
              </span>
            </span>
          </Link>
        ) : (
          <div className="jd-author">
            <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
              {hostInitial}
            </span>
            <span className="jd-author__copy">
              <span className="jd-author__name">{hostName}</span>
              <span className="jd-author__sub">Venue host</span>
            </span>
          </div>
        )}

        <div className="jd-head__actions">
          {editHref ? (
            <Link to={editHref} className="jd-btn">
              <Pencil size={14} strokeWidth={2.25} aria-hidden />
              <span className="jd-btn--label">Edit</span>
            </Link>
          ) : data.owner_username ? (
            <Link
              to={messageProviderPath(data.owner_username, {
                type: 'food',
                id: venueId,
                label: data.name,
              })}
              className="jd-btn jd-btn--primary"
            >
              <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
              <span className="jd-btn--label">Message</span>
            </Link>
          ) : null}
          <ReportButton
            className="jd-btn jd-btn--icon"
            iconOnly
            triggerLabel="Report venue"
            target={{
              target_type: 'listing',
              target_id: `food:${venueId}`,
              target_label: data.name,
            }}
          />
        </div>
      </div>

      <div className="jd-titleblock">
        <div className="fd-detail__badges">
          <span className="jd-badge">{cuisineLabel(data.cuisine)}</span>
          {data.is_open === true ? <span className="fd-detail__status is-open">Open now</span> : null}
          {data.is_open === false ? <span className="fd-detail__status is-closed">Closed</span> : null}
        </div>
        <h1 className="jd-title">{data.name}</h1>
        {data.tagline?.trim() ? <p className="jd-hook">{data.tagline.trim()}</p> : null}
        <p className="jd-route fd-detail__route">
          <CuisineIcon size={17} strokeWidth={2.25} aria-hidden />
          {cuisineLabel(data.cuisine)}
          <span aria-hidden>·</span>
          {price} · {priceName}
          {locationLine ? (
            <>
              <span aria-hidden>·</span>
              {locationLine}
            </>
          ) : null}
        </p>
        {ratingLabel ? (
          <p className="fd-detail__rating">
            <Star size={15} strokeWidth={2.25} fill="currentColor" aria-hidden />
            <strong>{ratingLabel}</strong>
            <span>{`${reviewCount} review${reviewCount === 1 ? '' : 's'}`}</span>
          </p>
        ) : null}
      </div>

      <div className="jd-engage" aria-label="Venue actions">
        <div className="jd-engage__primary">
          <button
            type="button"
            className={`jd-engage__btn jd-engage__btn--like${liked ? ' is-active' : ''}`}
            onClick={() => guardEngage(onLike)}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike venue' : 'Like venue'}
            aria-pressed={liked}
          >
            <Heart size={22} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            {likeCount > 0 ? <span className="jd-engage__count">{likeCount}</span> : null}
          </button>
          <button type="button" className="jd-engage__btn" onClick={onShare} aria-label="Share venue">
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
          {data.phone ? (
            <a href={`tel:${data.phone}`} className="jd-engage__btn" aria-label="Call venue">
              <Phone size={22} strokeWidth={2.25} aria-hidden />
            </a>
          ) : null}
          {directionsHref ? (
            <a
              href={directionsHref}
              className="jd-engage__btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get directions"
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
            disabled={saveBusy}
            aria-label={saved ? 'Remove saved venue' : 'Save venue'}
            aria-pressed={saved}
          >
            <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
            {saveCount > 0 ? <span className="jd-engage__count">{saveCount}</span> : null}
          </button>
        </div>
      </div>

      <ul className="jd-facts">
        <li className="jd-fact">
          <CuisineIcon size={15} strokeWidth={2.25} aria-hidden />
          {cuisineLabel(data.cuisine)}
        </li>
        <li className="jd-fact jd-fact--cost">
          <Utensils size={15} strokeWidth={2.25} aria-hidden />
          {price} · {priceName}
        </li>
        {hoursLine ? (
          <li className="jd-fact">
            <Clock size={15} strokeWidth={2.25} aria-hidden />
            {hoursLine}
          </li>
        ) : null}
        {data.popular_dish?.trim() ? (
          <li className="jd-fact">
            <Star size={15} strokeWidth={2.25} aria-hidden />
            Known for {data.popular_dish.trim()}
          </li>
        ) : null}
        {data.delivery ? (
          <li className="jd-fact">
            <Truck size={15} strokeWidth={2.25} aria-hidden />
            Delivery
          </li>
        ) : data.takeaway ? (
          <li className="jd-fact">
            <Truck size={15} strokeWidth={2.25} aria-hidden />
            Takeaway
          </li>
        ) : null}
        {locationLine ? (
          <li className="jd-fact">
            <MapPin size={15} strokeWidth={2.25} aria-hidden />
            {locationLine}
          </li>
        ) : null}
      </ul>

      <VenueStoriesSection
        venue={data}
        venueId={venueId}
        title="From the kitchen"
        subtitle="Story, menu highlights & guest moments"
        className="jd-stories fd-detail__stories"
      />

      {canReserve && reserve ? (
        <div className="fd-detail__reserve-block" id="food-reserve-panel">
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
            className="fd-detail__reserve"
          />
        </div>
      ) : null}

      {data.description?.trim() || highlights.length > 0 ? (
        <JourneySection title="About this place">
          {data.description?.trim() ? (
            <p className="jd-story__lead">{data.description.trim()}</p>
          ) : null}
          {highlights.length > 0 ? (
            <ul className="jd-tips">
              {highlights.map((tip) => (
                <li key={tip} className="jd-tip">
                  {tip}
                </li>
              ))}
            </ul>
          ) : null}
        </JourneySection>
      ) : null}

      {amenities.length > 0 ? (
        <JourneySection title="Good to know">
          <ul className="fd-detail__amenity-chips">
            {amenities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </JourneySection>
      ) : null}

      {displayAddress || hoursLine || data.phone || websiteHref ? (
        <JourneySection title="Visit">
          {displayAddress ? <p className="jd-story__lead">{displayAddress}</p> : null}
          {data.opening_hours?.trim() ? (
            <div className="fd-detail__hours">
              <p className="fd-detail__hours-label">
                <Clock size={14} strokeWidth={2.25} aria-hidden />
                Opening hours
              </p>
              <pre className="fd-detail__hours-body">{data.opening_hours.trim()}</pre>
            </div>
          ) : null}
          <div className="fd-detail__visit-acts">
            {directionsHref ? (
              <a className="jd-btn" href={directionsHref} target="_blank" rel="noopener noreferrer">
                <Navigation size={14} strokeWidth={2.25} aria-hidden />
                Directions
              </a>
            ) : null}
            {data.phone ? (
              <a className="jd-btn" href={`tel:${data.phone}`}>
                <Phone size={14} strokeWidth={2.25} aria-hidden />
                Call
              </a>
            ) : null}
            {websiteHref ? (
              <a className="jd-btn" href={websiteHref} target="_blank" rel="noopener noreferrer">
                <Globe size={14} strokeWidth={2.25} aria-hidden />
                Website
                <ExternalLink size={12} strokeWidth={2.25} aria-hidden />
              </a>
            ) : null}
          </div>
        </JourneySection>
      ) : null}

      <ListingDelversMoments
        listingType="food"
        listingId={venueId}
        listingTitle={data.name}
        title="From Delvers"
        className="fd-detail__moments"
        showWhenEmpty
        emptyMessage="No traveller photos yet — share yours on Delvers after you visit."
      />
      <p className="fd-detail__moment-cta">
        <Link to={`/create/post?food=${venueId}`} className="text-link">
          Share a moment from this place
        </Link>
      </p>

      <ListingReviews
        listingType="food"
        listingId={venueId}
        reviews={reviews}
        rating={rating}
        count={reviewCount}
        emptyMessage="Reviews will appear here once guests leave feedback."
        className="fd-detail__reviews"
      />

      {profile && canReview ? (
        <FoodReviewForm venueId={venueId} />
      ) : profile && !hasReviewed && data.reservations && profile.username !== data.owner_username ? (
        <p className="fd-detail__review-hint">
          Reviews unlock after your table visit is marked seated or completed.
        </p>
      ) : null}

      <div className="jd-mobilebar">
        <span className="jd-mobilebar__meta">
          <span className="jd-mobilebar__title">{data.name}</span>
          <span className="jd-mobilebar__sub">
            {price} · {cuisineLabel(data.cuisine)}
            {data.is_open === true ? ' · Open' : ''}
          </span>
        </span>
        <div className="jd-mobilebar__actions">
          <button
            type="button"
            className={`jd-mobilebar__icon jd-mobilebar__icon--like${liked ? ' is-active' : ''}`}
            onClick={() => guardEngage(onLike)}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike venue' : 'Like venue'}
            aria-pressed={liked}
          >
            <Heart size={20} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button
            type="button"
            className={`jd-mobilebar__icon${saved ? ' is-active' : ''}`}
            onClick={() => guardEngage(onSave)}
            disabled={saveBusy}
            aria-label={saved ? 'Remove saved venue' : 'Save venue'}
            aria-pressed={saved}
          >
            <Bookmark size={20} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button type="button" className="jd-mobilebar__icon" onClick={onShare} aria-label="Share venue">
            <Share2 size={20} strokeWidth={2.25} aria-hidden />
          </button>
          {mobileCta}
        </div>
      </div>
    </>
  )
}
