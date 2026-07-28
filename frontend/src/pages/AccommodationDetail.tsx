import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { AccommodationDetailView } from '../components/accommodation'
import { EmptyState } from '../components/ui'
import { normalizeReviews, type ReviewItem } from '../components/GuestReviewCard'
import { useToggleStaySave } from '../hooks/useStaySave'
import { recordForYouSignal } from '../lib/forYou'
import { listingTasteTags, recordForYouDeep, recordSessionView } from '../lib/forYouDeep'
import { recordStayPageView } from '../lib/stayPageViews'
import type { AccommodationListing } from '../utils/accommodationListing'
import { PromotionOpenTracker } from '../components/promotion/PromotionOpenTracker'
import '../components/journeys/journey-detail.css'
import '../components/accommodation/accommodation-detail.css'

type StayReviewsResponse = {
  reviews: ReviewItem[]
  rating_avg: number
  rating_count: number
}

export function AccommodationDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()
  const { canManageListings, activeBusiness } = useBusinessAccess()
  const saveMut = useToggleStaySave()
  const queryClient = useQueryClient()
  const previewMode = searchParams.get('preview') === '1'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['acc', id, profile?.username ?? 'anon', previewMode ? 'provider-preview' : 'public'],
    enabled: Boolean(id && (!previewMode || profile)),
    queryFn: () =>
      apiFetch<AccommodationListing>(
        previewMode
          ? `/api/accommodation/provider-listings/${id}/`
          : `/api/accommodation/listings/${id}/`,
        { auth: Boolean(profile) },
      ),
  })

  const dataListingTags = useMemo(() => (data ? listingTasteTags(data) : []), [data])

  useEffect(() => {
    if (!id || !data || previewMode) return
    recordSessionView('stays', id, dataListingTags)
    recordForYouSignal('stays', 'view')
    recordStayPageView(id)
  }, [id, data, dataListingTags, previewMode])

  const likeMut = useMutation({
    mutationFn: (listingId: number) =>
      apiFetch<{ liked: boolean; likes_count: number }>(`/api/accommodation/listings/${listingId}/like/`, {
        method: 'POST',
      }),
    onSuccess: (res) => {
      if (res?.liked && id) {
        recordForYouSignal('stays', 'like')
        recordForYouDeep({
          vertical: 'stays',
          id,
          kind: 'like',
          tags: dataListingTags,
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['acc', id] })
      void queryClient.invalidateQueries({ queryKey: ['accommodation'] })
    },
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['stay-reviews', id],
    queryFn: () => apiFetch<StayReviewsResponse>(`/api/accommodation/listings/${id}/reviews/`, { auth: false }),
    enabled: Boolean(id && (!previewMode || data?.is_active)),
  })

  const reviews = useMemo(
    () => normalizeReviews(reviewsData?.reviews ?? []),
    [reviewsData?.reviews],
  )

  const onSave = () => {
    if (!profile) {
      navigate('/login')
      return
    }
    if (!id) return
    saveMut.mutate(Number(id))
  }

  const onLike = () => {
    if (!profile) {
      navigate('/login')
      return
    }
    if (!id) return
    likeMut.mutate(Number(id))
  }

  if (previewMode && authLoading) {
    return (
      <div className="jn-detail-page acc-detail-page">
        <div className="skeleton" style={{ height: 320, borderRadius: 24, marginTop: 12 }} aria-busy="true" />
      </div>
    )
  }

  if (previewMode && !profile) {
    return <Navigate to="/login" replace state={{ from: `/accommodation/${id}?preview=1` }} />
  }

  if (isLoading) {
    return (
      <div className="jn-detail-page acc-detail-page">
        <div className="skeleton" style={{ height: 320, borderRadius: 24, marginTop: 12 }} aria-busy="true" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="jn-detail-page acc-detail-page">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="We couldn't load this stay"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="acc-detail__empty"
        />
      </div>
    )
  }

  if (!data || !id) {
    return (
      <div className="jn-detail-page acc-detail-page">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="Stay not found"
          sub="This listing may have been removed or the link is incorrect."
          cta={{ label: 'Browse stays', to: '/accommodation' }}
          className="acc-detail__empty"
        />
      </div>
    )
  }

  const ratingAvg = reviewsData?.rating_avg ?? data.rating_avg
  const ratingCount = reviewsData?.rating_count ?? data.rating_count
  const canManage =
    Boolean(profile) &&
    (profile?.username === data.owner_username ||
      (canManageListings && activeBusiness?.owner_username === data.owner_username))
  const manageHighlightsHref = canManage
    ? `/provider/stays?tab=highlights&listing=${id}`
    : undefined

  return (
    <div className="jn-detail-page acc-detail-page">
      <PromotionOpenTracker />
      <AccommodationDetailView
        data={data}
        listingId={id}
        saved={Boolean(data.saved_by_me)}
        liked={Boolean(data.liked_by_me)}
        likeCount={data.likes_count}
        onSave={onSave}
        onLike={onLike}
        reviews={reviews}
        ratingAvg={ratingAvg != null ? String(ratingAvg) : undefined}
        ratingCount={ratingCount}
        manageHighlightsHref={manageHighlightsHref}
      />
    </div>
  )
}
