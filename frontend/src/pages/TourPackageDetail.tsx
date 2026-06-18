import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Compass } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { normalizeReviews, type ReviewItem } from '../components/GuestReviewCard'
import { TourPackageDetailView } from '../components/guide/TourPackageDetailView'
import type { TourPackage } from '../components/guide/types'
import { DetailPage, DetailSkeleton } from '../components/detail'
import { EmptyState } from '../components/ui'
import type { ListingQuestionItem } from '../components/listing/ListingQuestionThread'
import { normalizeTourPackages } from '../utils/tourPackages'
import type { GuideProfile } from '../utils/guideListing'

const SEED_QUESTIONS: ListingQuestionItem[] = [
  { id: 'q1', author: 'Mila K.', body: 'Can you pick us up at the hotel?', ago: '3h ago' },
  { id: 'q2', author: 'Jonas T.', body: 'Is this suitable for families with kids?', ago: '1d ago' },
]

function packageReviewMeta(pkg: TourPackage, guide: GuideProfile): {
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
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  const gid = guideId ? Number(guideId) : NaN
  const pkgId = packageSlug ? decodeURIComponent(packageSlug) : ''

  const { data: guide, isLoading, isError, refetch } = useQuery({
    queryKey: ['guide', guideId],
    enabled: Number.isFinite(gid),
    queryFn: () => apiFetch<GuideProfile>(`/api/guides/profiles/${guideId}/`, { auth: false }),
  })

  const packages = useMemo(() => normalizeTourPackages(guide?.tour_packages), [guide?.tour_packages])
  const pkg = useMemo(() => packages.find((p) => p.id === pkgId), [packages, pkgId])

  const reviewMeta = useMemo(
    () => (guide && pkg ? packageReviewMeta(pkg, guide) : null),
    [guide, pkg],
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
      <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium acc-detail-page">
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
      <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium acc-detail-page">
        <DetailSkeleton className="gpkg-detail__skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium acc-detail-page">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="We couldn't load this experience"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </DetailPage>
    )
  }

  if (!guide || !pkg || !guideId) {
    return (
      <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium acc-detail-page">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="Experience not found"
          sub="This guide package may have been removed or the link is incorrect."
          cta={{ label: 'Browse guides', to: '/guides' }}
        />
      </DetailPage>
    )
  }

  return (
    <DetailPage prefix="gpkg-detail" className="gpkg-detail--premium acc-detail-page" toast={shareMsg || null}>
      <TourPackageDetailView
        guide={guide}
        guideId={guideId}
        pkg={pkg}
        reviews={reviewMeta?.reviews ?? []}
        reviewRating={reviewMeta?.rating}
        reviewCount={reviewMeta?.count}
        reviewsTitle={reviewMeta?.title}
        saved={saved}
        onSave={() => setSaved((v) => !v)}
        onShare={() => void onShare()}
        profile={profile}
        initialQuestions={SEED_QUESTIONS}
      />
    </DetailPage>
  )
}
