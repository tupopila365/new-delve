import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  Binoculars,
  Camera,
  CheckCircle,
  Clock,
  Compass,
  Languages,
  MapPin,
  MessageCircle,
  Route,
  UserRound,
  Users,
  Utensils,
  XCircle,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { GuideRequestPanel } from '../components/booking'
import { useAuth } from '../auth/AuthContext'
import { GuestReviewCard, normalizeReviews } from '../components/GuestReviewCard'
import { GuideAskButton } from '../components/guide/GuideAskButton'
import type { TourPackage } from '../components/guide/GuideTourPackages'
import {
  DetailHeroWrap,
  DetailLayout,
  DetailPage,
  DetailSkeleton,
  MobileStickyCTA,
  SocialActionRow,
  TrustBadgeRow,
} from '../components/detail'
import { MiniRating } from '../components/MiniRating'
import { EmptyState } from '../components/ui'
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
  specialities?: string[]
  licensed_guide?: boolean
  default_meeting_point?: string
}

type Highlight = { label: string; Icon: LucideIcon }

function openMapSearchUrl(query: string): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`
}

function guideDisplayName(g: Guide): string {
  return g.display_name?.trim() || g.username
}

function guideTrustBadges(g: Guide): string[] {
  const badges: string[] = []
  if (g.licensed_guide) badges.push('Licensed guide')
  else badges.push('Hosted by a local guide')
  const rating = parseFloat(g.rating_avg ?? '0')
  if (g.rating_avg != null && rating >= 4.5) badges.push('Highly rated')
  else if (g.rating_count && g.rating_count >= 5) badges.push('Traveller rated')
  return badges.slice(0, 2)
}

function buildHighlights(g: Guide, pkg: TourPackage): Highlight[] {
  const items: Highlight[] = [
    { label: 'Local-led experience', Icon: Compass },
    { label: 'Private or small group', Icon: Users },
  ]
  const text = `${pkg.title} ${pkg.description ?? ''} ${(g.specialities ?? []).join(' ')}`.toLowerCase()

  if (text.includes('photo') || text.includes('sunrise') || text.includes('view')) {
    items.push({ label: 'Photography-friendly', Icon: Camera })
  }
  if (text.includes('culture') || text.includes('history') || text.includes('architecture')) {
    items.push({ label: 'Cultural stops', Icon: Compass })
  }
  if (text.includes('food') || text.includes('coffee') || text.includes('picnic')) {
    items.push({ label: 'Food stops', Icon: Utensils })
  }
  if (text.includes('wildlife') || text.includes('safari') || text.includes('nature')) {
    items.push({ label: 'Wildlife viewing', Icon: Binoculars })
  }
  if (text.includes('family') || (g.specialities ?? []).some((s) => s.toLowerCase().includes('family'))) {
    items.push({ label: 'Family-friendly', Icon: Users })
  }
  if (pkg.hours >= 4) {
    items.push({ label: 'Scenic route', Icon: Route })
  }

  const unique: Highlight[] = []
  for (const item of items) {
    if (!unique.some((u) => u.label === item.label)) unique.push(item)
    if (unique.length >= 6) break
  }
  return unique
}

function PackageHeroImage({ src, title }: { src: string; title: string }) {
  if (src) {
    return <img className="gpkg-detail__hero-img" src={src} alt={title} decoding="async" />
  }
  return (
    <div className="gpkg-detail__hero-placeholder" aria-hidden>
      <Route size={48} strokeWidth={1.5} className="gpkg-detail__hero-placeholder-icon" />
    </div>
  )
}

function GuideAvatar({ photo, name }: { photo: string | null; name: string }) {
  const resolved = mediaUrl(photo)
  if (resolved) {
    return <img className="gpkg-detail__guide-avatar" src={resolved} alt={name} />
  }
  return (
    <div className="gpkg-detail__guide-avatar gpkg-detail__guide-avatar--placeholder" aria-hidden>
      <UserRound size={28} strokeWidth={1.75} />
    </div>
  )
}

export function TourPackageDetail() {
  const { guideId, packageSlug } = useParams<{ guideId: string; packageSlug: string }>()
  const { profile } = useAuth()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  const gid = guideId ? Number(guideId) : NaN
  const pkgId = packageSlug ? decodeURIComponent(packageSlug) : ''

  const { data: g, isLoading, isError, refetch } = useQuery({
    queryKey: ['guide', guideId],
    enabled: Number.isFinite(gid),
    queryFn: () => apiFetch<Guide>(`/api/guides/profiles/${guideId}/`, { auth: false }),
  })

  const packages = useMemo(() => normalizeTourPackages(g?.tour_packages), [g?.tour_packages])
  const pkg: TourPackage | undefined = useMemo(
    () => packages.find((p) => p.id === pkgId),
    [packages, pkgId],
  )

  const otherPackages = useMemo(
    () => packages.filter((p) => p.id !== pkgId),
    [packages, pkgId],
  )

  const galleryUrls = useMemo(() => {
    if (!pkg) return [] as string[]
    const uniq: string[] = []
    const add = (raw?: string | null) => {
      if (!raw?.trim()) return
      const abs = mediaUrl(raw.trim()) || raw.trim()
      if (!uniq.includes(abs)) uniq.push(abs)
    }
    add(pkg.photo)
    pkg.photos?.forEach((p) => add(p))
    return uniq
  }, [pkg])

  const onShare = async (title: string) => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg(`Link to ${title} copied`)
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  if (!Number.isFinite(gid) || !pkgId) {
    return (
      <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="Experience not found"
          sub="This guide package link is invalid."
          cta={{ label: 'Browse guides', to: '/guides' }}
        />
      </DetailPage>
    )
  }

  if (isLoading) {
    return (
      <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium">
        <DetailSkeleton className="gpkg-detail__skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="We couldn't load this experience"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </DetailPage>
    )
  }

  if (!g || !pkg) {
    return (
      <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="Experience not found"
          sub="This guide package may have been removed or the link is incorrect."
          cta={{ label: 'Browse guides', to: '/guides' }}
        />
      </DetailPage>
    )
  }

  const displayName = guideDisplayName(g)
  const heroImg = galleryUrls[0] ?? ''
  const regionLine = (g.regions ?? []).slice(0, 2).join(' · ')
  const langLine = (g.languages ?? []).slice(0, 3).join(', ')
  const highlights = buildHighlights(g, pkg)
  const trustBadges = guideTrustBadges(g)
  const meetingPoint = g.default_meeting_point?.trim() || ''
  const mapQuery = meetingPoint || regionLine

  const packageReviews = pkg.reviews ?? []
  const guideReviews = normalizeReviews(g.guest_reviews)
  const displayedReviews = packageReviews.length > 0 ? packageReviews : guideReviews.slice(0, 12)
  const reviewsAreForTour = packageReviews.length > 0

  const reviewAvg =
    packageReviews.length > 0
      ? (packageReviews.reduce((a, r) => a + Number(r.rating ?? 0), 0) / packageReviews.length).toFixed(1)
      : null

  const requestLabel = 'Request experience'

  const scrollToRequest = () => {
    document.getElementById('guide-request-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const bookingCard = (
    <div id="guide-request-panel">
      <GuideRequestPanel
        mode="package"
        guideId={gid}
        guideUserId={g.user}
        guideHeadline={g.headline}
        guideDisplayName={displayName}
        guideUsername={g.username}
        regionLine={regionLine}
        languages={g.languages}
        rateLabel={
          <>
            <span>${pkg.price}</span>
            <small>
              {' '}
              · {pkg.hours} {pkg.hours === 1 ? 'hour' : 'hours'}
            </small>
          </>
        }
        fixedPackage={pkg}
        defaultMeetingPoint={meetingPoint}
        profile={profile}
        maxGroupSize={20}
      />
    </div>
  )

  return (
    <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium" toast={shareMsg || null}>
      <DetailHeroWrap
        className="gpkg-detail__hero-wrap"
        backTo={`/guides/${gid}`}
        backLabel="Guide profile"
        saved={saved}
        onSave={() => setSaved((v) => !v)}
        onShare={() => onShare(pkg.title)}
      >
        <section className="gpkg-detail__hero" aria-label={pkg.title}>
          <PackageHeroImage src={heroImg} title={pkg.title} />
        </section>
      </DetailHeroWrap>

      <section className="gpkg-detail__identity detail-section">
        <p className="gpkg-detail__eyebrow">Guide package</p>
        <div className="gpkg-detail__meta-row">
          <span className="gpkg-detail__pill">
            <Clock size={13} strokeWidth={2.25} aria-hidden />
            {pkg.hours} {pkg.hours === 1 ? 'hour' : 'hours'}
          </span>
          <span className="gpkg-detail__pill gpkg-detail__pill--price">
            <BadgeDollarSign size={13} strokeWidth={2.25} aria-hidden />${pkg.price}
          </span>
          {regionLine ? (
            <span className="gpkg-detail__pill">
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {regionLine}
            </span>
          ) : null}
          {langLine ? (
            <span className="gpkg-detail__pill">
              <Languages size={13} strokeWidth={2.25} aria-hidden />
              {langLine}
            </span>
          ) : null}
          {reviewAvg != null || g.rating_avg != null ? (
            <span className="gpkg-detail__pill gpkg-detail__pill--rating">
              <MiniRating
                rating={reviewAvg ?? g.rating_avg ?? null}
                count={
                  reviewsAreForTour
                    ? packageReviews.length
                    : g.rating_count != null && g.rating_count > 0
                      ? g.rating_count
                      : undefined
                }
              />
            </span>
          ) : null}
        </div>

        <h1 className="display gpkg-detail__title">{pkg.title}</h1>
        {pkg.description ? (
          <p className="gpkg-detail__tagline">{pkg.description.split('.')[0]}.</p>
        ) : (
          <p className="gpkg-detail__tagline">
            A {pkg.hours}-hour experience with {displayName}.
          </p>
        )}

        <TrustBadgeRow items={trustBadges} className="gpkg-detail__trust-row" />

        <SocialActionRow saved={saved} onSave={() => setSaved((v) => !v)} onShare={() => onShare(pkg.title)} />
      </section>

      <section className="gpkg-detail__guide-card detail-section">
        <div className="gpkg-detail__guide-card-inner">
          <GuideAvatar photo={g.photo} name={displayName} />
          <div className="gpkg-detail__guide-card-body">
            <p className="gpkg-detail__guide-card-label">Hosted by</p>
            <p className="gpkg-detail__guide-card-name">{displayName}</p>
            <p className="gpkg-detail__guide-card-headline">{g.headline}</p>
            {g.rating_avg != null ? (
              <div className="gpkg-detail__guide-card-rating">
                <MiniRating rating={g.rating_avg} count={g.rating_count} />
              </div>
            ) : null}
            {g.licensed_guide ? (
              <p className="gpkg-detail__guide-card-trust">
                <BadgeCheck size={14} strokeWidth={2.25} aria-hidden />
                Licensed guide
              </p>
            ) : (
              <p className="gpkg-detail__guide-card-trust">Guide profile on DELVE</p>
            )}
          </div>
        </div>
        <div className="gpkg-detail__guide-card-actions">
          <Link to={`/guides/${gid}`} className="btn btn-ghost">
            View guide profile
          </Link>
          {g.user && profile?.email_verified ? (
            <GuideAskButton guideUserId={g.user} label="Message guide" />
          ) : null}
        </div>
      </section>

      <DetailLayout className="gpkg-detail__layout" main={
          <>
            <section className="detail-section gpkg-detail__overview">
              <h2 className="gpkg-detail__section-title">Experience overview</h2>
              {pkg.description ? (
                <p className="gpkg-detail__overview-text">{pkg.description}</p>
              ) : (
                <p className="gpkg-detail__overview-text gpkg-detail__overview-text--fallback">
                  This guide has not added a full description yet. You can still request details before booking.
                </p>
              )}
            </section>

            <section className="detail-section gpkg-detail__highlights">
              <h2 className="gpkg-detail__section-title">Highlights</h2>
              <div className="gpkg-detail__highlight-grid">
                {highlights.map(({ label, Icon }) => (
                  <div key={label} className="gpkg-detail__highlight-card">
                    <Icon size={18} strokeWidth={2.25} aria-hidden />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="detail-section gpkg-detail__itinerary">
              <h2 className="gpkg-detail__section-title">What you&apos;ll do</h2>
              <div className="gpkg-detail__itinerary-fallback">
                <Route size={20} strokeWidth={2} aria-hidden className="gpkg-detail__itinerary-icon" />
                <p>
                  The detailed route will be confirmed with the guide after your request.
                  {meetingPoint ? ` Meeting point: ${meetingPoint}.` : ''}
                </p>
              </div>
            </section>

            <section className="detail-section gpkg-detail__inclusions">
              <h2 className="gpkg-detail__section-title">What&apos;s included</h2>
              <p className="gpkg-detail__inclusions-fallback">
                <CheckCircle size={16} strokeWidth={2.25} aria-hidden />
                Confirm inclusions with the guide before booking.
              </p>
              <h3 className="gpkg-detail__subsection-title">Not included</h3>
              <p className="gpkg-detail__inclusions-fallback">
                <XCircle size={16} strokeWidth={2.25} aria-hidden />
                Meals, tips, and personal expenses are typically not included unless confirmed.
              </p>
            </section>

            <section className="detail-section gpkg-detail__details">
              <h2 className="gpkg-detail__section-title">Details to know</h2>
              <dl className="gpkg-detail__details-grid">
                <div className="gpkg-detail__detail-item">
                  <dt>
                    <Clock size={15} strokeWidth={2.25} aria-hidden />
                    Duration
                  </dt>
                  <dd>
                    {pkg.hours} {pkg.hours === 1 ? 'hour' : 'hours'}
                  </dd>
                </div>
                <div className="gpkg-detail__detail-item">
                  <dt>
                    <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
                    Price
                  </dt>
                  <dd>${pkg.price} package total</dd>
                </div>
                {langLine ? (
                  <div className="gpkg-detail__detail-item">
                    <dt>
                      <Languages size={15} strokeWidth={2.25} aria-hidden />
                      Languages
                    </dt>
                    <dd>{langLine}</dd>
                  </div>
                ) : null}
                {regionLine ? (
                  <div className="gpkg-detail__detail-item">
                    <dt>
                      <MapPin size={15} strokeWidth={2.25} aria-hidden />
                      Region
                    </dt>
                    <dd>{regionLine}</dd>
                  </div>
                ) : null}
                {g.hourly_rate ? (
                  <div className="gpkg-detail__detail-item">
                    <dt>
                      <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
                      Hourly rate
                    </dt>
                    <dd>From ${g.hourly_rate}/hr for custom requests</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {meetingPoint || regionLine ? (
              <section className="detail-section gpkg-detail__meeting">
                <h2 className="gpkg-detail__section-title">Meeting point</h2>
                {meetingPoint ? (
                  <p className="gpkg-detail__meeting-text">{meetingPoint}</p>
                ) : (
                  <p className="gpkg-detail__meeting-text">Region: {regionLine}</p>
                )}
                <p className="gpkg-detail__meeting-note">
                  Exact pickup details may be confirmed after your request.
                </p>
                {mapQuery ? (
                  <a
                    href={openMapSearchUrl(mapQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gpkg-detail__map-link"
                  >
                    <MapPin size={14} strokeWidth={2.25} aria-hidden />
                    Open in map
                  </a>
                ) : null}
              </section>
            ) : null}

            <section className="detail-section gpkg-detail__photos">
              <h2 className="gpkg-detail__section-title">Photos</h2>
              {galleryUrls.length > 0 ? (
                <div className="gpkg-detail__gallery">
                  {galleryUrls.map((src, i) => (
                    <figure key={`${src}-${i}`} className="gpkg-detail__gallery-fig">
                      <img src={src} alt={`${pkg.title} — photo ${i + 1}`} loading="lazy" decoding="async" />
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="gpkg-detail__empty-text">
                  Photos from this experience will appear once the guide adds them.
                </p>
              )}
            </section>

            <section className="detail-section gpkg-detail__reviews">
              <h2 className="gpkg-detail__section-title">
                {reviewsAreForTour ? 'Reviews for this experience' : 'Guest reviews'}
              </h2>
              {!reviewsAreForTour && guideReviews.length > 0 ? (
                <p className="gpkg-detail__reviews-intro">
                  Showing feedback for this guide — tour-specific reviews appear here when available.
                </p>
              ) : null}
              <div className="acc-detail__reviews-summary card gpkg-detail__reviews-summary">
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
                        ? `${packageReviews.length} ${packageReviews.length === 1 ? 'review' : 'reviews'} for this experience on DELVE.`
                        : g.rating_count != null && g.rating_count > 0
                          ? `${g.rating_count} total ${g.rating_count === 1 ? 'rating' : 'ratings'} for this guide.`
                          : 'Overall guest score for this guide.'}
                    </p>
                  </>
                ) : (
                  <p className="acc-detail__reviews-summary-text acc-detail__reviews-summary-text--solo">
                    Reviews will appear after travellers complete this experience.
                  </p>
                )}
              </div>
              {displayedReviews.length > 0 ? (
                <div className="acc-detail__review-list">
                  {displayedReviews.map((r, i) => (
                    <GuestReviewCard key={`${r.name}-${i}`} r={r} />
                  ))}
                </div>
              ) : (
                <p className="acc-detail__reviews-empty" role="status">
                  Reviews will appear after travellers complete this experience.
                </p>
              )}
            </section>

            <section className="detail-section gpkg-detail__questions">
              <h2 className="gpkg-detail__section-title">Questions before booking?</h2>
              <p className="gpkg-detail__questions-sub">
                Ask about availability, pickup, language, route, group size, or what to bring.
              </p>
              <div className="gpkg-detail__questions-actions">
                {g.user && profile?.email_verified ? (
                  <GuideAskButton guideUserId={g.user} label="Message guide" />
                ) : (
                  <Link to="/login" className="btn btn-ghost">
                    <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
                    Sign in to message guide
                  </Link>
                )}
                <button type="button" className="btn btn-primary" onClick={scrollToRequest}>
                  {requestLabel}
                </button>
              </div>
            </section>

            {otherPackages.length > 0 ? (
              <section className="detail-section gpkg-detail__more">
                <h2 className="gpkg-detail__section-title">More experiences from this guide</h2>
                <ul className="gpkg-detail__more-list">
                  {otherPackages.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/guides/${gid}/packages/${encodeURIComponent(p.id)}`}
                        className="gpkg-detail__more-card"
                      >
                        <div className="gpkg-detail__more-card-body">
                          <p className="gpkg-detail__more-card-title">{p.title}</p>
                          <p className="gpkg-detail__more-card-meta">
                            <Clock size={12} strokeWidth={2.25} aria-hidden />
                            {p.hours} {p.hours === 1 ? 'hr' : 'hrs'}
                            <span aria-hidden> · </span>
                            <BadgeDollarSign size={12} strokeWidth={2.25} aria-hidden />${p.price}
                          </p>
                        </div>
                        <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {!profile ? (
              <p className="gpkg-detail__note" role="note">
                Sign in from the request step to submit a practice booking — you can browse this page without an account.
              </p>
            ) : null}
          </>
        }
        sidebar={bookingCard}
      />

      <MobileStickyCTA
        title={pkg.title}
        subtitle={`$${pkg.price} · ${pkg.hours} ${pkg.hours === 1 ? 'hour' : 'hours'}`}
        action={
          <button type="button" className="btn btn-primary" onClick={scrollToRequest}>
            {requestLabel}
          </button>
        }
        className="gpkg-detail__mobile-bar"
      />
    </DetailPage>
  )
}
