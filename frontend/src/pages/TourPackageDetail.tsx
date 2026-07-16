import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Compass } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useToggleGuideSave } from '../hooks/useGuideSave'
import { normalizeReviews, type ReviewItem } from '../components/GuestReviewCard'
import { TourPackageDetailView } from '../components/guide/TourPackageDetailView'
import type { TourPackage } from '../components/guide/types'
import { EmptyState } from '../components/ui'
import { normalizeTourPackages } from '../utils/tourPackages'
import type { GuideProfile } from '../utils/guideListing'
import '../components/journeys/journey-detail.css'
import '../components/guide/guide-detail.css'

function packageReviewMeta(
  pkg: TourPackage,
  guide: GuideProfile,
  travelerReviews: ReviewItem[],
): {
  reviews: ReviewItem[]
  rating: string | null
  count: number | null
  title: string
} {
  const packageReviews = pkg.reviews ?? []
  if (packageReviews.length > 0) {
    const avg =
      packageReviews.reduce((sum, r) => sum + Number(r.rating ?? 0), 0) / packageReviews.length
    return {
      reviews: packageReviews,
      rating: avg.toFixed(1),
      count: packageReviews.length,
      title: 'Reviews for this experience',
    }
  }

  if (travelerReviews.length > 0) {
    return {
      reviews: travelerReviews.slice(0, 12),
      rating: guide.rating_avg ?? null,
      count: guide.rating_count ?? travelerReviews.length,
      title: 'Guest reviews',
    }
  }

  const guideReviews = normalizeReviews(guide.guest_reviews).slice(0, 12)
  return {
    reviews: guideReviews,
    rating: guide.rating_avg ?? null,
    count: guide.rating_count ?? (guideReviews.length > 0 ? guideReviews.length : null),
    title: 'Guest reviews',
  }
}

export function TourPackageDetail() {
  const { guideId, packageSlug } = useParams<{ guideId: string; packageSlug: string }>()
  const { profile } = useAuth()
  const saveMut = useToggleGuideSave()
  const [shareMsg, setShareMsg] = useState('')

  const gid = guideId ? Number(guideId) : NaN
  const pkgId = packageSlug ? decodeURIComponent(packageSlug) : ''

  const { data: guide, isLoading, isError, refetch } = useQuery({
    queryKey: ['guide', guideId, profile?.username ?? 'anon'],
    enabled: Number.isFinite(gid),
    queryFn: () =>
      apiFetch<GuideProfile>(`/api/guides/profiles/${guideId}/`, { auth: Boolean(profile) }),
  })

  const { data: reviewsPayload } = useQuery({
    queryKey: ['guide-reviews', guideId],
    enabled: Number.isFinite(gid),
    queryFn: () =>
      apiFetch<{ reviews: unknown[]; rating_avg: number; rating_count: number }>(
        `/api/guides/profiles/${guideId}/reviews/`,
        { auth: false },
      ),
  })

  const packages = useMemo(() => normalizeTourPackages(guide?.tour_packages), [guide?.tour_packages])
  const pkg = useMemo(() => packages.find((p) => p.id === pkgId), [packages, pkgId])
  const travelerReviews = useMemo(
    () => normalizeReviews(reviewsPayload?.reviews),
    [reviewsPayload?.reviews],
  )

  const reviewMeta = useMemo(
    () => (guide && pkg ? packageReviewMeta(pkg, guide, travelerReviews) : null),
    [guide, pkg, travelerReviews],
  )

  const onShare = async () => {
    const title = pkg?.title ?? 'Experience'
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
      <div className="jn-detail-page gd-detail-page">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="Experience not found"
          sub="This guide package link is invalid."
          cta={{ label: 'Browse guides', to: '/guides' }}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="jn-detail-page gd-detail-page">
        <div className="skeleton" style={{ height: 320, borderRadius: 24, marginTop: 12 }} aria-busy="true" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="jn-detail-page gd-detail-page">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="We couldn't load this experience"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </div>
    )
  }

  if (!guide || !pkg || !guideId) {
    return (
      <div className="jn-detail-page gd-detail-page">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="Experience not found"
          sub="This guide package may have been removed or the link is incorrect."
          cta={{ label: 'Browse guides', to: '/guides' }}
        />
      </div>
    )
  }

  return (
    <div className="jn-detail-page gd-detail-page">
      {shareMsg ? (
        <p className="jn-detail-page__toast" role="status">
          {shareMsg}
        </p>
      ) : null}
      <TourPackageDetailView
        guide={guide}
        guideId={guideId}
        pkg={pkg}
        reviews={reviewMeta?.reviews ?? []}
        reviewRating={reviewMeta?.rating}
        reviewCount={reviewMeta?.count}
        reviewsTitle={reviewMeta?.title}
        saved={Boolean(guide.saved_by_me)}
        onSave={() => saveMut.mutate(Number(guideId))}
        onShare={() => void onShare()}
        profile={profile}
      />
    </div>
  )
}
