import {
  BadgeCheck,
  BadgeDollarSign,
  Clock,
  Languages,
  MapPin,
  MessageCircle,
  Navigation,
  Share2,
  Bookmark,
  Star,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GuidePackageReserveCard } from '../booking/guide'
import '../booking/guide/guide-booking.css'
import { ListingDelversMoments, ListingReviews } from '../listing'
import { messageProviderPath } from '../messages/messageProviderUtils'
import { openStreetMapSearchUrl } from '../../utils/foodListing'
import { mediaUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { JourneyHero } from '../journeys/JourneyHero'
import { JourneySection } from '../journeys/JourneySection'
import { HighlightStoriesSection } from '../highlights/HighlightStoriesSection'
import { ReportButton } from '../report/ReportButton'
import type { ReviewItem } from '../GuestReviewCard'
import type { TourPackage } from './types'
import { GuideCredentialsCard } from './GuideCredentialsCard'
import { GuideExperiencePicker } from './GuideExperiencePicker'
import { GuideProviderCard } from './GuideProviderCard'
import { GuideReviewForm } from './GuideReviewForm'
import { GuideRosterHero } from './GuideRosterHero'
import { buildGuideStoryChannels } from './guideStoriesUtils'
import { GuideSimilarGuides, type SimilarGuide } from './GuideSimilarGuides'
import {
  buildGuideDetailRows,
  buildGuideGallery,
  buildGuideHighlightItems,
  guideBioText,
  guideDisplayName,
  guideHasCredentials,
  guideRateLabel,
  guideRegionLine,
  guideSpecialityLabel,
  type GuideProfile,
  type LanguageRow,
  type PortfolioItem,
} from '../../utils/guideListing'
import '../journeys/journey-detail.css'
import './guide-detail.css'

type RequestProfile = {
  email_verified: boolean
} | null

type Props = {
  guide: GuideProfile
  guideId: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  packages: TourPackage[]
  reviews: ReviewItem[]
  portfolio: PortfolioItem[]
  certifications: string[]
  langsDetail: LanguageRow[]
  similarGuides: SimilarGuide[]
  selectedPackage: TourPackage | null
  onSelectPackage: (pkg: TourPackage | null) => void
  profile: RequestProfile
  canReview?: boolean
  onScrollToExperiences: () => void
}

export function GuideDetailView({
  guide,
  guideId,
  saved,
  onSave,
  onShare,
  packages,
  reviews,
  portfolio,
  certifications,
  langsDetail,
  similarGuides,
  selectedPackage,
  onSelectPackage,
  profile: _profileProp,
  canReview = false,
  onScrollToExperiences,
}: Props) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const displayName = guideDisplayName(guide)
  const regionLine = guideRegionLine(guide)
  const rateLabel = guideRateLabel(guide)
  const specialityLabel = guideSpecialityLabel(guide)
  const galleryImages = buildGuideGallery(guide, portfolio, packages).filter((img) =>
    Boolean(img.src?.trim()),
  )
  const hasGallery = galleryImages.length > 0
  const highlightItems = buildGuideHighlightItems(guide)
  const detailRows = buildGuideDetailRows(guide)
  const bio = guideBioText(guide)
  const responseH = guide.response_hours_typical ?? 0
  const showCredentials = guideHasCredentials(guide, certifications, langsDetail)
  const meetingPoint = guide.default_meeting_point?.trim() || ''
  const primaryRegion = guide.regions?.[0] ?? ''
  const mapHref = primaryRegion
    ? openStreetMapSearchUrl(displayName, primaryRegion, meetingPoint || regionLine || primaryRegion)
    : ''

  const guidePath = `/guides/${guideId}`
  const profileHref = `/u/${encodeURIComponent(guide.username)}`
  const storyChannels = useMemo(
    () => buildGuideStoryChannels(guide, { guideId, guidePath, portfolio, packages }),
    [guide, guideId, guidePath, portfolio, packages],
  )

  const avatarSrc = guide.photo
    ? /^https?:\/\//i.test(guide.photo)
      ? guide.photo
      : mediaUrl(guide.photo) || guide.photo
    : null
  const initial = displayName.charAt(0).toUpperCase() || 'G'

  const ratingRaw = guide.rating_avg
  const ratingNum = ratingRaw != null && ratingRaw !== '' ? Number(ratingRaw) : null
  const ratingLabel =
    ratingNum != null && Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : null

  function guardEngage(action: () => void) {
    if (!profile) {
      navigate('/login')
      return
    }
    action()
  }

  const scrollToReserve = () => {
    const el =
      document.getElementById('guide-reserve-panel') ||
      document.getElementById('guide-experiences')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const mobilePrice = selectedPackage
    ? `$${selectedPackage.price}`
    : guide.hourly_rate
      ? `From $${guide.hourly_rate}/hr`
      : rateLabel

  const mobileSub = selectedPackage
    ? `${selectedPackage.hours} ${selectedPackage.hours === 1 ? 'hour' : 'hours'} · ${selectedPackage.title}`
    : regionLine || displayName

  const mobileCtaLabel = selectedPackage
    ? 'Request date'
    : packages.length > 0
      ? 'Select experience'
      : 'Message guide'

  const handleMobileCta = () => {
    if (selectedPackage) {
      scrollToReserve()
      return
    }
    if (packages.length > 0) {
      onScrollToExperiences()
      return
    }
    window.location.href = messageProviderPath(guide.username, {
      type: 'guide',
      id: guideId,
      label: guide.headline,
    })
  }

  return (
    <>
      {hasGallery ? (
        <JourneyHero
          images={galleryImages}
          backTo="/guides"
          backLabel="Guides"
          saved={saved}
          onSave={() => guardEngage(onSave)}
          onShare={onShare}
        />
      ) : (
        <GuideRosterHero
          displayName={displayName}
          specialityLabel={specialityLabel}
          backTo="/guides"
          backLabel="Guides"
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
            <span className="jd-author__sub">
              @{guide.username}
              {ratingLabel ? ` · ★ ${ratingLabel}` : ''}
            </span>
          </span>
        </Link>

        <div className="jd-head__actions">
          <Link
            to={messageProviderPath(guide.username, {
              type: 'guide',
              id: guideId,
              label: guide.headline,
            })}
            className="jd-btn jd-btn--primary"
          >
            <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
            <span className="jd-btn--label">Message</span>
          </Link>
          <ReportButton
            className="jd-btn jd-btn--icon"
            iconOnly
            triggerLabel="Report guide"
            target={{
              target_type: 'listing',
              target_id: `guide:${guideId}`,
              target_label: guide.headline,
            }}
          />
        </div>
      </div>

      <div className="jd-titleblock">
        {hasGallery ? (
          <>
            <span className="jd-badge">{specialityLabel}</span>
            <h1 className="jd-title">{displayName}</h1>
          </>
        ) : (
          <h1 className="jd-title jd-title--roster-follow">{guide.headline?.trim() || specialityLabel}</h1>
        )}
        {hasGallery && guide.headline?.trim() ? (
          <p className="jd-route">{guide.headline.trim()}</p>
        ) : null}
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

      <div className="jd-engage" aria-label="Guide actions">
        <div className="jd-engage__primary">
          <button type="button" className="jd-engage__btn" onClick={onShare} aria-label="Share guide">
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
            aria-label={saved ? 'Remove saved guide' : 'Save guide'}
            aria-pressed={saved}
          >
            <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </div>

      <ul className="jd-facts">
        {guide.hourly_rate ? (
          <li className="jd-fact jd-fact--cost">
            <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
            From ${guide.hourly_rate}/hr
          </li>
        ) : null}
        {guide.years_guiding != null && guide.years_guiding > 0 ? (
          <li className="jd-fact">
            <BadgeCheck size={15} strokeWidth={2.25} aria-hidden />
            {guide.years_guiding} {guide.years_guiding === 1 ? 'year' : 'years'} guiding
          </li>
        ) : null}
        {guide.languages?.length ? (
          <li className="jd-fact">
            <Languages size={15} strokeWidth={2.25} aria-hidden />
            {guide.languages.length <= 2
              ? guide.languages.join(', ')
              : `${guide.languages.slice(0, 2).join(', ')} +${guide.languages.length - 2}`}
          </li>
        ) : null}
        {responseH > 0 ? (
          <li className="jd-fact">
            <Clock size={15} strokeWidth={2.25} aria-hidden />
            Responds in {responseH}h
          </li>
        ) : null}
        {ratingLabel ? (
          <li className="jd-fact">
            <Star size={15} strokeWidth={2.25} aria-hidden />
            {ratingLabel}
            {guide.rating_count ? ` (${guide.rating_count})` : ''}
          </li>
        ) : null}
      </ul>

      <HighlightStoriesSection
        channels={storyChannels}
        listingName={guide.headline || displayName}
        explorePath={guidePath}
        title="Guide moments"
        subtitle=""
        ctaLabel="View guide"
        className="jd-stories"
      />

      {packages.length > 0 ? (
        <div id="guide-experiences" className="gd-detail__experiences">
          <GuideExperiencePicker
            packages={packages}
            guideId={guideId}
            selectedId={selectedPackage?.id ?? null}
            onSelect={onSelectPackage}
          />
        </div>
      ) : null}

      <div className="gd-detail__reserve-block" id="guide-reserve-panel">
        {selectedPackage ? (
          <GuidePackageReserveCard
            guideId={guideId}
            packageSlug={selectedPackage.id}
            pkg={selectedPackage}
            guideDisplayName={displayName}
            maxGroupSize={20}
          />
        ) : (
          <div className="guide-reserve">
            <p className="guide-reserve__kicker">Book with this guide</p>
            <p className="guide-reserve__price">{rateLabel}</p>
            {regionLine ? <p className="guide-reserve__meta">{regionLine}</p> : null}
            {packages.length > 0 ? (
              <p className="guide-reserve__hint">
                Select an experience above, then check availability to request a date.
              </p>
            ) : (
              <>
                <p className="guide-reserve__hint">
                  Message the guide to discuss custom routes and hourly bookings.
                </p>
                <Link
                  to={messageProviderPath(guide.username, {
                    type: 'guide',
                    id: guideId,
                    label: guide.headline,
                  })}
                  className="btn btn-primary btn-block"
                  style={{ marginTop: 12 }}
                >
                  Message guide
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {(bio || highlightItems.length > 0 || detailRows.length > 0) && (
        <JourneySection title="About this guide">
          {bio ? <p className="jd-story__lead">{bio}</p> : null}
          {highlightItems.length > 0 ? (
            <ul className="jd-tips" style={{ marginTop: bio ? 14 : 0 }}>
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

      {showCredentials ? (
        <GuideCredentialsCard
          yearsGuiding={guide.years_guiding}
          licensed={guide.licensed_guide}
          certifications={certifications}
          languagesDetail={langsDetail}
          fallbackLanguages={guide.languages || []}
          className="gd-detail__credentials"
        />
      ) : null}

      {canReview ? (
        <section className="jd-section gd-detail__review-form">
          <GuideReviewForm guideId={guideId} />
        </section>
      ) : null}

      <ListingReviews
        title="Guest reviews"
        reviews={reviews}
        listingType="guide"
        listingId={guide.id}
        rating={guide.rating_avg}
        count={guide.rating_count}
        emptyMessage="Reviews will appear here after travellers complete experiences with this guide."
        className="gd-detail__reviews"
      />

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

      <ListingDelversMoments
        listingType="guide"
        listingId={guideId}
        listingTitle={guide.headline || displayName}
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

      <GuideProviderCard
        displayName={displayName}
        username={guide.username}
        bio={guide.bio}
        regionLine={regionLine}
        photo={guide.photo}
        guideId={guideId}
        headline={guide.headline}
        className="gd-detail__provider"
      />

      {similarGuides.length > 0 ? (
        <div className="gd-detail__similar">
          <GuideSimilarGuides guides={similarGuides} />
        </div>
      ) : null}

      <div className="jd-mobilebar">
        <span className="jd-mobilebar__meta">
          <span className="jd-mobilebar__title">{mobilePrice}</span>
          <span className="jd-mobilebar__sub">{mobileSub}</span>
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
          <button type="button" className="jd-mobilebar__btn" onClick={handleMobileCta}>
            {mobileCtaLabel}
          </button>
        </div>
      </div>
    </>
  )
}
