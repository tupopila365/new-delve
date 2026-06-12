import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { GuestReviewCard, normalizeReviews } from '../components/GuestReviewCard'
import type { TourPackage } from '../components/guide/GuideTourPackages'
import { MiniRating } from '../components/MiniRating'
import { normalizeTourPackages } from '../utils/tourPackages'

type Guide = {
  id: number
  user?: number
  headline: string
  bio: string
  hourly_rate: string | null
  languages: string[]
  regions: string[]
  photo: string | null
  username: string
  display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
  tour_packages?: unknown
  guest_reviews?: unknown
}

export function TourPackageDetail() {
  const { guideId, packageSlug } = useParams<{ guideId: string; packageSlug: string }>()
  const { profile } = useAuth()

  const gid = guideId ? Number(guideId) : NaN
  const pkgId = packageSlug ? decodeURIComponent(packageSlug) : ''

  const { data: g, isLoading } = useQuery({
    queryKey: ['guide', guideId],
    enabled: Number.isFinite(gid),
    queryFn: () => apiFetch<Guide>(`/api/guides/profiles/${guideId}/`, { auth: false }),
  })

  const packages = useMemo(() => normalizeTourPackages(g?.tour_packages), [g?.tour_packages])
  const pkg: TourPackage | undefined = useMemo(
    () => packages.find((p) => p.id === pkgId),
    [packages, pkgId],
  )

  const displayName = g?.display_name?.trim() || g?.username || 'Guide'

  if (!Number.isFinite(gid) || !pkgId) {
    return (
      <div className="td tp-detail">
        <div className="td-route-tab tp-detail__body tp-detail__body--center">
          <p className="td-empty-tab">Invalid package link.</p>
          <Link to="/guides" className="btn btn-ghost btn-block">
            Back to guides
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || !g) {
    return (
      <div className="td tp-detail">
        <div className="skeleton gd-detail__skeleton" />
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="td tp-detail">
        <div className="td-route-tab tp-detail__body tp-detail__body--center">
          <p className="td-empty-tab">
            This tour isn&apos;t on this profile anymore, or the link may be outdated.
          </p>
          <Link to={`/guides/${gid}`} className="btn btn-primary btn-block">
            View guide profile
          </Link>
          <Link to="/guides" className="btn btn-ghost btn-block">
            All guides
          </Link>
        </div>
      </div>
    )
  }

  const heroImg = pkg.photo ? mediaUrl(pkg.photo) || pkg.photo : g.photo ? mediaUrl(g.photo) || g.photo : ''
  const bookHref = `/guides/${gid}?package=${encodeURIComponent(pkg.id)}`

  const galleryUrls = useMemo(() => {
    const uniq: string[] = []
    const add = (raw?: string | null) => {
      if (!raw?.trim()) return
      const abs = mediaUrl(raw.trim()) || raw.trim()
      if (!uniq.includes(abs)) uniq.push(abs)
    }
    add(pkg.photo)
    pkg.photos?.forEach((p) => add(p))
    return uniq
  }, [pkg.photo, pkg.photos])

  /** Show mosaic when extra package photos exist or more than one image total. */
  const showGallery = (pkg.photos && pkg.photos.length > 0) || galleryUrls.length > 1

  const packageReviews = pkg.reviews ?? []
  const guideReviews = normalizeReviews(g.guest_reviews)
  const displayedReviews =
    packageReviews.length > 0 ? packageReviews : guideReviews.slice(0, 12)
  const reviewsAreForTour = packageReviews.length > 0

  const reviewAvg =
    packageReviews.length > 0
      ? (
          packageReviews.reduce((a, r) => a + Number(r.rating ?? 0), 0) / packageReviews.length
        ).toFixed(1)
      : null

  return (
    <div className="td tp-detail">
      <section className="td-hero gd-td-hero tp-detail__hero" aria-label={pkg.title}>
        {heroImg ? (
          <img className="td-hero__img" src={heroImg} alt={pkg.title} decoding="async" />
        ) : (
          <div className="gd-td-hero__placeholder">
            <span>Tour preview</span>
          </div>
        )}
        <div className="td-hero__scrim" aria-hidden />
        <div className="td-hero__bar tp-detail__bar">
          <Link to={`/guides/${gid}`} className="td-hero__back">
            ← Guide
          </Link>
          <Link to="/guides" className="td-hero__back">
            All guides
          </Link>
        </div>
        <div className="td-hero__footer tp-detail__hero-footer">
          <p className="tp-detail__eyebrow">Tour package · {pkg.hours} {pkg.hours === 1 ? 'hour' : 'hours'}</p>
          <h1 className="td-hero__title">{pkg.title}</h1>
          <div className="td-hero__chips">
            <span className="td-hero__chip">${pkg.price}</span>
            <span className="td-hero__chip">Hosted by @{g.username}</span>
            {(g.regions ?? []).slice(0, 3).map((r) => (
              <span key={r} className="td-hero__chip">
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="td-author gd-td-author">
        {g.photo ? (
          <img className="td-author__avatar" src={mediaUrl(g.photo) || ''} alt={displayName} />
        ) : (
          <span className="td-author__avatar td-author__avatar--init">{displayName.charAt(0).toUpperCase()}</span>
        )}
        <div className="td-author__text">
          <p className="td-author__name">{displayName}</p>
          <p className="td-author__dates">
            @{g.username} · {g.headline}
          </p>
        </div>
      </div>

      <div className="td-stats">
        <div className="td-stat">
          <p className="td-stat__val">${pkg.price}</p>
          <p className="td-stat__key">Package total</p>
        </div>
        <div className="td-stat">
          <p className="td-stat__val">{pkg.hours}</p>
          <p className="td-stat__key">{pkg.hours === 1 ? 'Hour' : 'Hours'} on trail</p>
        </div>
        <div className="td-stat">
          <p className="td-stat__val">{g.rating_avg != null ? Number.parseFloat(g.rating_avg).toFixed(1) : '—'}</p>
          <p className="td-stat__key">
            Host rating
            {g.rating_count != null && g.rating_count > 0 ? ` (${g.rating_count})` : ''}
          </p>
        </div>
        <div className="td-stat">
          <p className="td-stat__val">{g.hourly_rate ? `$${g.hourly_rate}` : '—'}</p>
          <p className="td-stat__key">Also books / hr</p>
        </div>
      </div>

      <div className="td-route-tab tp-detail__body">
        {pkg.description ? (
          <>
            <h2 className="gd-detail__section-label">About this tour</h2>
            <p className="tp-detail__desc">{pkg.description}</p>
          </>
        ) : (
          <>
            <h2 className="gd-detail__section-label">What you&apos;re booking</h2>
            <p className="tp-detail__desc">
              A fixed-price, {pkg.hours}-hour experience with {displayName}. Questions and special requests can go through the
              guide when you send a booking — availability is always subject to confirmation.
            </p>
          </>
        )}

        <div className="tp-detail__actions">
          <Link to={bookHref} className="btn btn-primary btn-block">
            {profile?.email_verified ? 'Continue to booking' : 'Book this tour'}
          </Link>
          <Link to={`/guides/${gid}`} className="btn btn-ghost btn-block">
            Full guide profile
          </Link>
        </div>

        {!profile ? (
          <p className="acc-detail__disclaimer acc-detail__disclaimer--td tp-detail__note" role="note">
            Sign in from the booking step to submit a practice request — you can browse this page without an account.
          </p>
        ) : null}
      </div>

      {showGallery ? (
        <div className="td-photos tp-detail__photos" aria-labelledby="tp-gallery-heading">
          <h2 id="tp-gallery-heading" className="gd-detail__section-label tp-detail__section-h2">
            Photos from this tour
          </h2>
          <div className="td-gallery tp-detail__gallery">
            {galleryUrls.map((src, i) => (
              <figure
                key={`${src}-${i}`}
                className={`tp-detail__gallery-fig td-gallery__item${i === 0 ? ' td-gallery__item--big' : ''}`}
              >
                <img src={src} alt={`${pkg.title} — photo ${i + 1}`} loading="lazy" decoding="async" />
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      <div className="td-route-tab tp-detail__reviews-wrap" aria-labelledby="tp-reviews-heading">
        <h2 id="tp-reviews-heading" className="gd-detail__section-label tp-detail__section-h2">
          {reviewsAreForTour ? 'Reviews for this tour' : 'Guest reviews'}
        </h2>
        {!reviewsAreForTour && guideReviews.length > 0 ? (
          <p className="tp-detail__reviews-intro">
            Showing feedback for @{g.username} — when tour-specific reviews are added, they appear here first.
          </p>
        ) : null}

        <div className="acc-detail__reviews-summary card tp-detail__reviews-summary">
          {reviewAvg != null || g.rating_avg != null ? (
            <>
              <div className="acc-detail__reviews-score">
                <MiniRating
                  rating={reviewAvg ?? g.rating_avg ?? null}
                  count={
                    reviewsAreForTour
                      ? packageReviews.length
                      : g.rating_count != null && g.rating_count > 0
                        ? g.rating_count
                        : displayedReviews.length
                  }
                />
              </div>
              <p className="acc-detail__reviews-summary-text">
                {reviewsAreForTour
                  ? `${packageReviews.length} ${packageReviews.length === 1 ? 'review' : 'reviews'} for this itinerary on DELVE.`
                  : g.rating_count != null && g.rating_count > 0
                    ? `${g.rating_count} total ${g.rating_count === 1 ? 'rating' : 'ratings'} for this guide across tours.`
                    : 'Overall guest score when booking this guide.'}
                {reviewsAreForTour
                  ? null
                  : guideReviews.length > 0 && displayedReviews.length > 0
                    ? ` Below are examples from travelers who toured with ${displayName}.`
                    : null}
              </p>
            </>
          ) : (
            <p className="acc-detail__reviews-summary-text acc-detail__reviews-summary-text--solo">
              {reviewsAreForTour ? 'Reviews will grow as guests complete this tour.' : 'Ratings appear as guests finish tours.'}
            </p>
          )}
        </div>

        {displayedReviews.length > 0 ? (
          <div className="acc-detail__review-list tp-detail__review-list">
            {displayedReviews.map((r, i) => (
              <GuestReviewCard key={`${r.name}-${i}`} r={r} />
            ))}
          </div>
        ) : (
          <p className="acc-detail__reviews-empty" role="status">
            No written reviews to show yet — book a trial run and yours could be among the first.
          </p>
        )}
      </div>
    </div>
  )
}
