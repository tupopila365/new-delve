import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { AccommodationDetailView } from '../components/accommodation'
import { DetailPage, DetailSkeleton } from '../components/detail'
import { EmptyState } from '../components/ui'
import type { AccommodationListing } from '../utils/accommodationListing'
import { PromotionOpenTracker } from '../components/promotion/PromotionOpenTracker'

const DEFAULT_QUESTIONS = [
  { id: 's1', author: 'Mila K.', body: 'Is early check-in possible?', ago: '2d ago' },
  { id: 's2', author: 'Alex R.', body: 'How far is the nearest shop on foot?', ago: '5d ago' },
]

export function AccommodationDetail() {
  const { id } = useParams()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['acc', id],
    enabled: !!id,
    queryFn: () => apiFetch<AccommodationListing>(`/api/accommodation/listings/${id}/`, { auth: false }),
  })

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

  return (
    <DetailPage prefix="acc-detail-page" className="td" toast={shareMsg || null}>
      <PromotionOpenTracker />
      <AccommodationDetailView
        data={data}
        listingId={id}
        saved={saved}
        onSave={() => setSaved((v) => !v)}
        onShare={() => onShare(data.title)}
        initialQuestions={DEFAULT_QUESTIONS}
      />
    </DetailPage>
  )
}
