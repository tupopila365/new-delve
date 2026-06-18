import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Utensils } from 'lucide-react'
import { apiFetch } from '../api/client'
import { FoodDetailView } from '../components/food'
import { DetailPage, DetailSkeleton } from '../components/detail'
import { EmptyState } from '../components/ui'
import type { FoodVenueListing } from '../utils/foodListing'

const DEFAULT_QUESTIONS = [
  { id: 'f1', author: 'Tina M.', body: 'Do you have vegetarian options?', ago: '1d ago' },
  { id: 'f2', author: 'Jonas P.', body: 'Is outdoor seating available?', ago: '4d ago' },
]

export function FoodDetail() {
  const { id } = useParams()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['food', id],
    enabled: !!id,
    queryFn: () => apiFetch<FoodVenueListing>(`/api/food/venues/${id}/`, { auth: false }),
  })

  const onShare = async (venueName: string) => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg(`Link to ${venueName} copied`)
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  if (isLoading) {
    return (
      <DetailPage prefix="fd-detail" className="td acc-detail-page">
        <DetailSkeleton className="acc-page__detail-skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="fd-detail" className="td acc-detail-page">
        <EmptyState
          iconElement={<Utensils size={28} strokeWidth={1.75} />}
          title="We couldn't load this venue"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  if (!data || !id) {
    return (
      <DetailPage prefix="fd-detail" className="td acc-detail-page">
        <EmptyState
          iconElement={<Utensils size={28} strokeWidth={1.75} />}
          title="Venue not found"
          sub="This listing may have been removed or the link is incorrect."
          cta={{ label: 'Browse food & drink', to: '/food' }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  return (
    <DetailPage prefix="fd-detail" className="td acc-detail-page" toast={shareMsg || null}>
      <FoodDetailView
        data={data}
        venueId={id}
        saved={saved}
        onSave={() => setSaved((v) => !v)}
        onShare={() => onShare(data.name)}
        initialQuestions={DEFAULT_QUESTIONS}
      />
    </DetailPage>
  )
}
