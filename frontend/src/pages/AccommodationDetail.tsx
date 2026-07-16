import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AccommodationDetailView } from '../components/accommodation'
import { EmptyState } from '../components/ui'
import { normalizeReviews, type ReviewItem } from '../components/GuestReviewCard'
import { useToggleStaySave } from '../hooks/useStaySave'
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
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [shareMsg, setShareMsg] = useState('')
  const saveMut = useToggleStaySave()
  const queryClient = useQueryClient()

  const likeMut = useMutation({
    mutationFn: (listingId: number) =>
      apiFetch<{ liked: boolean; likes_count: number }>(`/api/accommodation/listings/${listingId}/like/`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['acc', id] })
      void queryClient.invalidateQueries({ queryKey: ['accommodation'] })
    },
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['acc', id, profile?.username ?? 'anon'],
    enabled: !!id,
    queryFn: () =>
      apiFetch<AccommodationListing>(`/api/accommodation/listings/${id}/`, {
        auth: Boolean(profile),
      }),
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['stay-reviews', id],
    queryFn: () => apiFetch<StayReviewsResponse>(`/api/accommodation/listings/${id}/reviews/`, { auth: false }),
    enabled: Boolean(id),
  })

  const reviews = useMemo(
    () => normalizeReviews(reviewsData?.reviews ?? []),
    [reviewsData?.reviews],
  )

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

  return (
    <div className="jn-detail-page acc-detail-page">
      {shareMsg ? (
        <p className="jn-detail-page__toast" role="status">
          {shareMsg}
        </p>
      ) : null}
      <PromotionOpenTracker />
      <AccommodationDetailView
        data={data}
        listingId={id}
        saved={Boolean(data.saved_by_me)}
        liked={Boolean(data.liked_by_me)}
        likeCount={data.likes_count}
        onSave={onSave}
        onLike={onLike}
        onShare={() => onShare(data.title)}
        reviews={reviews}
        ratingAvg={ratingAvg != null ? String(ratingAvg) : undefined}
        ratingCount={ratingCount}
      />
    </div>
  )
}
