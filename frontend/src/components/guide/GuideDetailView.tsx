import {
  BadgeCheck,
  BadgeDollarSign,
  Clock,
  Languages,
  MessageCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GuidePackageReserveCard } from '../booking/guide'
import { guidePackageBookPath } from '../booking/bookingUtils'
import '../booking/guide/guide-booking.css'
import { DetailLayout } from '../detail'
import {
  ListingAskSection,
  ListingBookBar,
  ListingDetails,
  ListingHeroGallery,
  ListingHighlights,
  ListingIdentityHeader,
  ListingLocationCard,
  ListingQuickInfo,
  ListingReviews,
} from '../listing'
import type { ListingQuestionItem } from '../listing/ListingQuestionThread'
import { messageProviderPath } from '../messages/messageProviderUtils'
import { loginHrefWithReturn } from '../../utils/authRedirect'
import { openStreetMapSearchUrl } from '../../utils/foodListing'
import type { ReviewItem } from '../GuestReviewCard'
import type { TourPackage } from './types'
import { GuideCredentialsCard } from './GuideCredentialsCard'
import { GuideExperiencePicker } from './GuideExperiencePicker'
import { buildGuideStoryChannels } from './guideStoriesUtils'
import { GuideSimilarGuides, type SimilarGuide } from './GuideSimilarGuides'
import { VenueStoriesSection } from '../food/stories'
import {
  buildGuideDetailRows,
  buildGuideGallery,
  buildGuideHighlightItems,
  buildGuideTrustHighlights,
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
  initialQuestions?: ListingQuestionItem[]
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
  profile,
  initialQuestions,
  onScrollToExperiences,
}: Props) {
  const displayName = guideDisplayName(guide)
  const regionLine = guideRegionLine(guide)
  const rateLabel = guideRateLabel(guide)
  const specialityLabel = guideSpecialityLabel(guide)
  const galleryImages = buildGuideGallery(guide, portfolio, packages)
  const highlightItems = buildGuideHighlightItems(guide)
  const trustHighlights = buildGuideTrustHighlights(guide)
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
  const storyChannels = useMemo(
    () => buildGuideStoryChannels(guide, { guideId, guidePath, portfolio, packages }),
    [guide, guideId, guidePath, portfolio, packages],
  )

  const mobileSubtitle = [guide.hourly_rate ? `From $${guide.hourly_rate}/hr` : null, regionLine || null]
    .filter(Boolean)
    .join(' · ')

  const quickChips = [
    guide.hourly_rate
      ? {
          id: 'rate',
          label: `From $${guide.hourly_rate}/hr`,
          icon: <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />,
          accent: true,
        }
      : null,
    guide.languages?.length
      ? {
          id: 'languages',
          label: guide.languages.slice(0, 3).join(', '),
          icon: <Languages size={15} strokeWidth={2.25} aria-hidden />,
        }
      : null,
    responseH > 0
      ? {
          id: 'response',
          label: `Responds in ${responseH}h`,
          icon: <Clock size={15} strokeWidth={2.25} aria-hidden />,
        }
      : null,
    guide.years_guiding != null && guide.years_guiding > 0
      ? {
          id: 'years',
          label: `${guide.years_guiding} ${guide.years_guiding === 1 ? 'year' : 'years'} guiding`,
          icon: <BadgeCheck size={15} strokeWidth={2.25} aria-hidden />,
        }
      : null,
  ].filter((chip): chip is NonNullable<typeof chip> => chip != null)

  const sidebar: ReactNode = (
    <div id="guide-request-panel">
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
              Select an experience below, then check availability to request a booking.
            </p>
          ) : (
            <>
              <p className="guide-reserve__hint">
                Message the guide to discuss custom routes and hourly bookings.
              </p>
              <Link
                to={messageProviderPath(guide.username)}
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
  )

  return (
    <>
      <ListingHeroGallery
        className="gd-detail__gallery-wrap acc-detail__gallery-wrap"
        images={galleryImages}
        listingType="guide"
        listingId={guideId}
        backTo="/guides"
        backLabel="Guides"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      <ListingIdentityHeader
        name={guide.headline}
        tagline={`${displayName} · @${guide.username}`}
        categoryLabel={specialityLabel}
        rating={guide.rating_avg}
        reviewCount={guide.rating_count}
        locationLabel={regionLine || null}
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        reportTarget={{
          target_type: 'listing',
          target_id: `guide:${guideId}`,
          target_label: guide.headline,
        }}
        actions={[
          {
            id: 'message-guide',
            label: 'Message guide',
            icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
            href: messageProviderPath(guide.username),
            accent: true,
          },
        ]}
        className="gd-detail__identity acc-detail__identity"
      />

      <ListingQuickInfo
        chips={quickChips}
        highlights={trustHighlights}
        className="gd-detail__quick-info acc-detail__quick-info"
      />

      <VenueStoriesSection
        listingName={guide.headline}
        explorePath={guidePath}
        channels={storyChannels}
        title="Guide moments"
        subtitle="Experiences, portfolio & highlights — tap to watch"
        ctaLabel="View guide"
        className="gd-detail__stories acc-detail__section"
      />

      <DetailLayout
        main={
          <>
            {highlightItems.length > 0 ? (
              <ListingHighlights
                title="Why book this guide"
                items={highlightItems}
                className="gd-detail__highlights acc-detail__love"
              />
            ) : null}

            <ListingDetails
              title="About this guide"
              description={bio}
              rows={detailRows}
              className="gd-detail__about acc-detail__about"
            />

            {packages.length > 0 ? (
              <div id="guide-experiences">
                <GuideExperiencePicker
                  packages={packages}
                  guideId={guideId}
                  selectedId={selectedPackage?.id ?? null}
                  onSelect={onSelectPackage}
                  className="gd-detail__packages acc-detail__section"
                />
              </div>
            ) : null}

            {showCredentials ? (
              <GuideCredentialsCard
                yearsGuiding={guide.years_guiding}
                licensed={guide.licensed_guide}
                certifications={certifications}
                languagesDetail={langsDetail}
                fallbackLanguages={guide.languages || []}
                className="gd-detail__credentials acc-detail__section"
              />
            ) : null}

            <ListingReviews
              title="Guest reviews"
              reviews={reviews}
              listingType="guide"
              listingId={guide.id}
              rating={guide.rating_avg}
              count={guide.rating_count}
              emptyMessage="Reviews will appear here after travellers complete experiences with this guide."
              className="gd-detail__reviews acc-detail__comments"
            />

            {mapHref ? (
              <ListingLocationCard
                title="Meeting area"
                address={meetingPoint || regionLine || null}
                mapUrl={mapHref}
                mapHint="Opens in OpenStreetMap"
                className="gd-detail__location acc-detail__section"
              />
            ) : null}

            <ListingAskSection
              title="Ask this guide"
              placeholder="Routes, availability, languages, pickup, group size, or what to bring…"
              initialQuestions={initialQuestions}
              className="gd-detail__questions acc-detail__comments"
            />

            {similarGuides.length > 0 ? (
              <section className="detail-section gd-detail__similar-block acc-detail__section">
                <GuideSimilarGuides guides={similarGuides} />
              </section>
            ) : null}
          </>
        }
        sidebar={sidebar}
      />

      <ListingBookBar
        title={guide.headline}
        subtitle={mobileSubtitle || displayName}
        action={
          selectedPackage ? (
            profile ? (
              <Link
                to={guidePackageBookPath(guideId, selectedPackage.id)}
                className="btn btn-primary"
              >
                Request experience
              </Link>
            ) : (
              <a
                href={loginHrefWithReturn(guidePackageBookPath(guideId, selectedPackage.id))}
                className="btn btn-primary"
              >
                Sign in to request
              </a>
            )
          ) : (
            <button type="button" className="btn btn-primary" onClick={onScrollToExperiences}>
              {packages.length > 0 ? 'Pick experience' : 'Message guide'}
            </button>
          )
        }
        className="gd-detail__mobile-bar"
      />
    </>
  )
}
