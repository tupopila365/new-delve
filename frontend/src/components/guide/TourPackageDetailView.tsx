import { Link, useNavigate } from 'react-router-dom'
import {
  BadgeDollarSign,
  Bookmark,
  Clock,
  Languages,
  MapPin,
  MessageCircle,
  Navigation,
  Share2,
  UserRound,
} from 'lucide-react'
import { guidePackageBookPath, nextAvailableGuideDate } from '../booking/bookingUtils'
import { GuidePackageReserveCard } from '../booking/guide'
import '../booking/guide/guide-booking.css'
import { loginHrefWithReturn } from '../../utils/authRedirect'
import { ListingDelversMoments, ListingReviews } from '../listing'
import { messageProviderPath } from '../messages/messageProviderUtils'
import { mediaUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { JourneyHero } from '../journeys/JourneyHero'
import { JourneySection } from '../journeys/JourneySection'
import { ReportButton } from '../report/ReportButton'
import type { ReviewItem } from '../GuestReviewCard'
import { openStreetMapSearchUrl } from '../../utils/foodListing'
import {
  buildPackageDetailRows,
  buildPackageGallery,
  buildPackageHighlightItems,
  guideDisplayName,
  guideRegionLine,
  packageDescriptionText,
  type GuideProfile,
} from '../../utils/guideListing'
import type { TourPackage } from './types'
import { GuideProviderCard } from './GuideProviderCard'
import { GuideRosterHero } from './GuideRosterHero'
import '../journeys/journey-detail.css'
import './guide-detail.css'

type RequestProfile = {
  email_verified: boolean
} | null

type Props = {
  guide: GuideProfile
  guideId: string
  pkg: TourPackage
  reviews: ReviewItem[]
  reviewRating?: string | number | null
  reviewCount?: number | null
  reviewsTitle?: string
  reviewsEmptyMessage?: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  profile: RequestProfile
}

export function TourPackageDetailView({
  guide,
  guideId,
  pkg,
  reviews,
  reviewRating,
  reviewCount,
  reviewsTitle = 'Guest reviews',
  reviewsEmptyMessage = 'Reviews will appear after travellers complete this experience.',
  saved,
  onSave,
  onShare,
  profile: _profileProp,
}: Props) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const displayName = guideDisplayName(guide)
  const regionLine = guideRegionLine(guide)
  const meetingPoint = guide.default_meeting_point?.trim() || ''
  const primaryRegion = guide.regions?.[0] ?? ''
  const galleryImages = buildPackageGallery(pkg, guide).filter((img) => Boolean(img.src?.trim()))
  const hasGallery = galleryImages.length > 0
  const highlightItems = buildPackageHighlightItems(guide, pkg)
  const detailRows = buildPackageDetailRows(guide, pkg)
  const description = packageDescriptionText(pkg)
  const mapHref = primaryRegion
    ? openStreetMapSearchUrl(pkg.title, primaryRegion, meetingPoint || regionLine || primaryRegion)
    : ''

  const suggestedDate = nextAvailableGuideDate()
  const bookHref = guidePackageBookPath(guideId, pkg.id, { date: suggestedDate, groupSize: 2 })
  const guidePath = `/guides/${guideId}`
  const profileHref = `/u/${encodeURIComponent(guide.username)}`

  const avatarSrc = guide.photo
    ? /^https?:\/\//i.test(guide.photo)
      ? guide.photo
      : mediaUrl(guide.photo) || guide.photo
    : null
  const initial = displayName.charAt(0).toUpperCase() || 'G'

  function guardEngage(action: () => void) {
    if (!profile) {
      navigate('/login')
      return
    }
    action()
  }

  const scrollToReserve = () => {
    document.getElementById('guide-reserve-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {hasGallery ? (
        <JourneyHero
          images={galleryImages}
          backTo={guidePath}
          backLabel="Guide profile"
          saved={saved}
          onSave={() => guardEngage(onSave)}
          onShare={onShare}
        />
      ) : (
        <GuideRosterHero
          displayName={pkg.title}
          specialityLabel="Experience"
          backTo={guidePath}
          backLabel="Guide profile"
          saved={saved}
          onSave={() => guardEngage(onSave)}
          onShare={onShare}
        />
      )}

      <div className="jd-head">
        <Link to={profileHref} className="jd-author">
          {avatarSrc ? (
            <img className="jd-author__avatar" src={avatarSrc} alt="" />
          ) : (
            <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
              {initial}
            </span>
          )}
          <span className="jd-author__copy">
            <span className="jd-author__name">{displayName}</span>
            <span className="jd-author__sub">Your guide · @{guide.username}</span>
          </span>
        </Link>

        <div className="jd-head__actions">
          <Link to={guidePath} className="jd-btn">
            <UserRound size={14} strokeWidth={2.25} aria-hidden />
            <span className="jd-btn--label">View guide</span>
          </Link>
          <Link
            to={messageProviderPath(guide.username, {
              type: 'guide',
              id: guideId,
              label: pkg.title || guide.headline,
            })}
            className="jd-btn jd-btn--primary"
          >
            <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
            <span className="jd-btn--label">Message</span>
          </Link>
          <ReportButton
            className="jd-btn jd-btn--icon"
            iconOnly
            triggerLabel="Report experience"
            target={{
              target_type: 'listing',
              target_id: `guide-package:${guideId}-${pkg.id}`,
              target_label: pkg.title,
            }}
          />
        </div>
      </div>

      <div className="jd-titleblock">
        <span className="jd-badge">Experience</span>
        <h1 className="jd-title">{pkg.title}</h1>
        <p className="jd-route">
          With{' '}
          <Link to={guidePath} style={{ color: 'inherit' }}>
            {displayName}
          </Link>
        </p>
        {regionLine ? (
          <p className="jd-hook">
            <MapPin
              size={15}
              strokeWidth={2.25}
              aria-hidden
              style={{ display: 'inline', verticalAlign: '-0.15em', marginRight: 6 }}
            />
            {regionLine}
          </p>
        ) : null}
      </div>

      <div className="jd-engage" aria-label="Experience actions">
        <div className="jd-engage__primary">
          <button type="button" className="jd-engage__btn" onClick={onShare} aria-label="Share experience">
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
          {mapHref ? (
            <a
              href={mapHref}
              className="jd-engage__btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open meeting area in maps"
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
            aria-label={saved ? 'Remove saved experience' : 'Save experience'}
            aria-pressed={saved}
          >
            <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </div>

      <ul className="jd-facts">
        <li className="jd-fact">
          <Clock size={15} strokeWidth={2.25} aria-hidden />
          {pkg.hours} {pkg.hours === 1 ? 'hour' : 'hours'}
        </li>
        <li className="jd-fact jd-fact--cost">
          <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
          ${pkg.price} total
        </li>
        {guide.languages?.length ? (
          <li className="jd-fact">
            <Languages size={15} strokeWidth={2.25} aria-hidden />
            {guide.languages.slice(0, 3).join(', ')}
          </li>
        ) : null}
        {regionLine ? (
          <li className="jd-fact">
            <MapPin size={15} strokeWidth={2.25} aria-hidden />
            {regionLine}
          </li>
        ) : null}
      </ul>

      <div className="gd-detail__reserve-block" id="guide-reserve-panel">
        <GuidePackageReserveCard
          guideId={guideId}
          packageSlug={pkg.id}
          pkg={pkg}
          guideDisplayName={displayName}
          maxGroupSize={pkg.maxGroupSize ?? guide.max_group_size ?? 20}
        />
      </div>

      {(description || highlightItems.length > 0 || detailRows.length > 0) && (
        <JourneySection title="About this experience">
          {description ? <p className="jd-story__lead">{description}</p> : null}
          {highlightItems.length > 0 ? (
            <ul className="jd-tips" style={{ marginTop: description ? 14 : 0 }}>
              {highlightItems.map((item) => (
                <li key={item.id} className="jd-tip">
                  {item.icon ? <span style={{ marginRight: 6 }}>{item.icon}</span> : null}
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
          {detailRows.length > 0 ? (
            <ul className="jd-story__rows">
              {detailRows.map((row) => (
                <li key={row.id} className="jd-story__row">
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

      <JourneySection title="Meeting area">
        <p className="jd-story__lead">
          {meetingPoint || regionLine || 'Exact meeting point is confirmed with your guide.'}
        </p>
        {!meetingPoint?.trim() ? (
          <p className="jd-hook" style={{ marginTop: 8 }}>
            Meeting area only — exact point is confirmed with your guide.
          </p>
        ) : null}
        {mapHref ? (
          <div className="gd-detail__venue-acts">
            <a className="jd-btn" href={mapHref} target="_blank" rel="noopener noreferrer">
              <Navigation size={14} strokeWidth={2.25} aria-hidden />
              Open in maps
            </a>
          </div>
        ) : null}
      </JourneySection>

      <GuideProviderCard
        displayName={displayName}
        username={guide.username}
        bio={guide.bio}
        regionLine={regionLine}
        photo={guide.photo}
        guideId={guideId}
        headline={pkg.title || guide.headline}
        className="gd-detail__provider"
      />

      <ListingReviews
        title={reviewsTitle}
        reviews={reviews}
        listingType="guide-package"
        listingId={`${guideId}-${pkg.id}`}
        rating={reviewRating ?? guide.rating_avg}
        count={reviewCount ?? guide.rating_count}
        emptyMessage={reviewsEmptyMessage}
        className="gd-detail__reviews"
      />

      <ListingDelversMoments
        listingType="guide"
        listingId={guideId}
        listingTitle={guide.headline || guide.username}
        title="From Delvers"
        className="gd-detail__moments"
        showWhenEmpty
        emptyMessage="No traveller moments yet — only travellers who completed a tour can post here."
      />
      {guide.attended ? (
        <p className="gd-detail__moment-cta">
          <Link to={`/create/post?guide=${guideId}`} className="text-link">
            Share a moment from this guide
          </Link>
        </p>
      ) : null}

      {!profile ? (
        <p className="jd-hook" role="note" style={{ margin: '8px 0 16px' }}>
          <a href={loginHrefWithReturn(bookHref)}>Sign in</a> to submit a booking request — you can
          browse without an account.
        </p>
      ) : null}

      <div className="jd-mobilebar">
        <span className="jd-mobilebar__meta">
          <span className="jd-mobilebar__title">${pkg.price}</span>
          <span className="jd-mobilebar__sub">
            {pkg.hours} {pkg.hours === 1 ? 'hour' : 'hours'} · {pkg.title}
          </span>
        </span>
        <div className="jd-mobilebar__actions">
          <button
            type="button"
            className={`jd-mobilebar__icon${saved ? ' is-active' : ''}`}
            onClick={() => guardEngage(onSave)}
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            <Bookmark size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
          {profile ? (
            <button type="button" className="jd-mobilebar__btn" onClick={scrollToReserve}>
              Request date
            </button>
          ) : (
            <a href={loginHrefWithReturn(bookHref)} className="jd-mobilebar__btn">
              Sign in
            </a>
          )}
        </div>
      </div>
    </>
  )
}
