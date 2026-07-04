import { Link } from 'react-router-dom'
import {
  BadgeDollarSign,
  Clock,
  Languages,
  MapPin,
  MessageCircle,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { guidePackageBookPath, nextAvailableGuideDate } from '../booking/bookingUtils'
import { GuidePackageReserveCard } from '../booking/guide'
import { loginHrefWithReturn } from '../../utils/authRedirect'
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
import type { ReviewItem } from '../GuestReviewCard'
import { openStreetMapSearchUrl } from '../../utils/foodListing'
import {
  buildGuideTrustHighlights,
  buildPackageDetailRows,
  buildPackageGallery,
  buildPackageHighlightItems,
  guideDisplayName,
  guideRegionLine,
  packageDescriptionText,
  type GuideProfile,
} from '../../utils/guideListing'
import type { TourPackage } from './types'

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
  initialQuestions?: ListingQuestionItem[]
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
  profile,
  initialQuestions,
}: Props) {
  const displayName = guideDisplayName(guide)
  const regionLine = guideRegionLine(guide)
  const meetingPoint = guide.default_meeting_point?.trim() || ''
  const primaryRegion = guide.regions?.[0] ?? ''
  const galleryImages = buildPackageGallery(pkg, guide)
  const highlightItems = buildPackageHighlightItems(guide, pkg)
  const trustHighlights = buildGuideTrustHighlights(guide)
  const detailRows = buildPackageDetailRows(guide, pkg)
  const description = packageDescriptionText(pkg)
  const mapHref = primaryRegion
    ? openStreetMapSearchUrl(pkg.title, primaryRegion, meetingPoint || regionLine || primaryRegion)
    : ''

  const mobileSubtitle = `$${pkg.price} · ${pkg.hours} ${pkg.hours === 1 ? 'hour' : 'hours'}`
  const suggestedDate = nextAvailableGuideDate()
  const bookHref = guidePackageBookPath(guideId, pkg.id, { date: suggestedDate, groupSize: 2 })

  const sidebar: ReactNode = (
    <GuidePackageReserveCard
      guideId={guideId}
      packageSlug={pkg.id}
      pkg={pkg}
      guideDisplayName={displayName}
      maxGroupSize={20}
    />
  )

  return (
    <>
      <ListingHeroGallery
        className="gpkg-detail__gallery-wrap acc-detail__gallery-wrap"
        images={galleryImages}
        listingType="guide-package"
        listingId={`${guideId}-${pkg.id}`}
        backTo={`/guides/${guideId}`}
        backLabel="Guide profile"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      <ListingIdentityHeader
        name={pkg.title}
        tagline={`With ${displayName} · @${guide.username}`}
        categoryLabel="Experience"
        rating={reviewRating ?? guide.rating_avg}
        reviewCount={reviewCount ?? guide.rating_count}
        locationLabel={regionLine || null}
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        reportTarget={{
          target_type: 'listing',
          target_id: `guide-package:${guideId}-${pkg.id}`,
          target_label: pkg.title,
        }}
        actions={[
          {
            id: 'view-guide',
            label: 'View guide',
            icon: <UserRound size={14} strokeWidth={2.25} aria-hidden />,
            href: `/guides/${guideId}`,
          },
          {
            id: 'message-guide',
            label: 'Message',
            icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
            href: messageProviderPath(guide.username, {
              type: 'guide',
              id: guideId,
              label: pkg.title || guide.headline,
            }),
            accent: true,
          },
        ]}
        className="gpkg-detail__identity acc-detail__identity"
      />

      <ListingQuickInfo
        chips={[
          {
            id: 'hours',
            label: `${pkg.hours} ${pkg.hours === 1 ? 'hour' : 'hours'}`,
            icon: <Clock size={15} strokeWidth={2.25} aria-hidden />,
          },
          {
            id: 'price',
            label: `$${pkg.price} total`,
            icon: <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />,
            accent: true,
          },
          ...(guide.languages?.length
            ? [
                {
                  id: 'languages',
                  label: guide.languages.slice(0, 3).join(', '),
                  icon: <Languages size={15} strokeWidth={2.25} aria-hidden />,
                },
              ]
            : []),
          ...(regionLine
            ? [
                {
                  id: 'region',
                  label: regionLine,
                  icon: <MapPin size={15} strokeWidth={2.25} aria-hidden />,
                },
              ]
            : []),
        ]}
        highlights={trustHighlights}
        className="gpkg-detail__quick-info acc-detail__quick-info"
      />

      <DetailLayout
        main={
          <>
            {highlightItems.length > 0 ? (
              <ListingHighlights
                title="Highlights"
                items={highlightItems}
                className="gpkg-detail__highlights acc-detail__love"
              />
            ) : null}

            <ListingDetails
              title="About this experience"
              description={description}
              rows={detailRows}
              className="gpkg-detail__about acc-detail__about"
            />

            <ListingLocationCard
              title="Meeting area"
              address={meetingPoint || regionLine || null}
              mapUrl={mapHref || null}
              approximateHint={
                meetingPoint?.trim()
                  ? null
                  : 'Meeting area only — exact point is confirmed with your guide.'
              }
              viewMapLabel="Open in maps"
              className="gpkg-detail__location acc-detail__section"
            />

            <ListingReviews
              title={reviewsTitle}
              reviews={reviews}
              listingType="guide-package"
              listingId={`${guideId}-${pkg.id}`}
              rating={reviewRating ?? guide.rating_avg}
              count={reviewCount ?? guide.rating_count}
              emptyMessage={reviewsEmptyMessage}
              className="gpkg-detail__reviews acc-detail__comments"
            />

            <ListingAskSection
              title="Questions before booking?"
              placeholder="Availability, pickup, languages, route, group size, or what to bring…"
              initialQuestions={initialQuestions}
              className="gpkg-detail__questions acc-detail__comments"
            />

            {!profile ? (
              <p className="gpkg-detail__note listing-section" role="note">
                <a href={loginHrefWithReturn(bookHref)}>Sign in</a> to submit a booking request — you can browse without an account.
              </p>
            ) : null}
          </>
        }
        sidebar={sidebar}
      />

      <ListingBookBar
        title={pkg.title}
        subtitle={mobileSubtitle}
        action={
          profile ? (
            <Link to={bookHref} className="btn btn-primary">
              Request experience
            </Link>
          ) : (
            <a href={loginHrefWithReturn(bookHref)} className="btn btn-primary">
              Sign in to request
            </a>
          )
        }
        className="gpkg-detail__mobile-bar"
      />
    </>
  )
}
