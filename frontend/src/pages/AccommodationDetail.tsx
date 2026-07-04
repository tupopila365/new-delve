import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { AccommodationDetailView } from '../components/accommodation'
import { DetailPage, DetailSkeleton } from '../components/detail'
import { EmptyState } from '../components/ui'
import { normalizeReviews, type ReviewItem } from '../components/GuestReviewCard'
import type { ListingQuestionItem } from '../components/listing/ListingQuestionThread'
import { useToggleStaySave } from '../hooks/useStaySave'
import type { AccommodationListing } from '../utils/accommodationListing'
import { PromotionOpenTracker } from '../components/promotion/PromotionOpenTracker'

type StayQuestionApi = {
  id: number
  author: string
  body: string
  ago: string
  answers?: { id: number; author: string; body: string; ago: string; is_official?: boolean }[]
}

type StayReviewsResponse = {
  reviews: ReviewItem[]
  rating_avg: number
  rating_count: number
}

export function AccommodationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { canManageListings, activeBusiness } = useBusinessAccess()
  const [shareMsg, setShareMsg] = useState('')
  const saveMut = useToggleStaySave()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['acc', id, profile?.username ?? 'anon'],
    enabled: !!id,
    queryFn: () =>
      apiFetch<AccommodationListing>(`/api/accommodation/listings/${id}/`, {
        auth: Boolean(profile),
      }),
  })

  const { data: questionsRaw, isLoading: loadingQuestions } = useQuery({
    queryKey: ['stay-questions', id],
    queryFn: () => apiFetch<StayQuestionApi[]>(`/api/accommodation/listings/${id}/questions/`, { auth: false }),
    enabled: Boolean(id),
  })
  const questionRows = asArray<StayQuestionApi>(questionsRaw)

  const { data: reviewsData } = useQuery({
    queryKey: ['stay-reviews', id],
    queryFn: () => apiFetch<StayReviewsResponse>(`/api/accommodation/listings/${id}/reviews/`, { auth: false }),
    enabled: Boolean(id),
  })

  const questions = useMemo((): ListingQuestionItem[] => {
    return questionRows.map((q) => ({
      id: q.id,
      author: q.author,
      body: q.body,
      ago: q.ago,
      answers: (q.answers ?? []).map((a) => ({
        id: a.id,
        author: a.author,
        body: a.body,
        ago: a.ago,
        isOfficial: a.is_official,
      })),
    }))
  }, [questionRows])

  const reviews = useMemo(
    () => normalizeReviews(reviewsData?.reviews ?? []),
    [reviewsData?.reviews],
  )

  const canAnswer =
    Boolean(profile) &&
    Boolean(data) &&
    (profile?.username === data?.owner_username ||
      (canManageListings && activeBusiness?.owner_username === data?.owner_username))

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

  if (isLoading) {
    return (
      <DetailPage prefix="acc-detail-page" className="td">
        <DetailSkeleton className="acc-page__detail-skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="acc-detail-page" className="td">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="We couldn't load this stay"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  if (!data || !id) {
    return (
      <DetailPage prefix="acc-detail-page" className="td">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="Stay not found"
          sub="This listing may have been removed or the link is incorrect."
          cta={{ label: 'Browse stays', to: '/accommodation' }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  const ratingAvg = reviewsData?.rating_avg ?? data.rating_avg
  const ratingCount = reviewsData?.rating_count ?? data.rating_count

  return (
    <DetailPage prefix="acc-detail-page" className="td" toast={shareMsg || null}>
      <PromotionOpenTracker />
      <AccommodationDetailView
        data={data}
        listingId={id}
        saved={Boolean(data.saved_by_me)}
        onSave={onSave}
        onShare={() => onShare(data.title)}
        questions={questions}
        loadingQuestions={loadingQuestions}
        canAnswerQuestions={canAnswer}
        reviews={reviews}
        ratingAvg={ratingAvg != null ? String(ratingAvg) : undefined}
        ratingCount={ratingCount}
      />
    </DetailPage>
  )
}
