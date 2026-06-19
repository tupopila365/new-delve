import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Ticket } from 'lucide-react'
import { apiFetch } from '../api/client'
import { DetailPage, DetailSkeleton } from '../components/detail'
import { EventDetailView } from '../components/events'
import { EmptyState } from '../components/ui'
import type { EventDetail, EventListItem } from '../utils/eventListing'

const DEFAULT_QUESTIONS = [
  { id: 'c1', author: 'Mila K.', body: 'Is parking available near the venue?', ago: '2h ago' },
  { id: 'c2', author: 'Jonas T.', body: 'What time should we arrive if doors open on time?', ago: '5h ago' },
]

export function EventDetail() {
  const { id } = useParams()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: () => apiFetch<EventDetail>(`/api/events/${id}/`, { auth: false }),
  })

  const { data: relatedRaw } = useQuery({
    queryKey: ['events', 'related', data?.category],
    enabled: Boolean(data?.category),
    queryFn: () =>
      apiFetch<EventListItem[]>(`/api/events/?category=${encodeURIComponent(data!.category)}`, {
        auth: false,
      }),
  })

  const relatedEvents = useMemo(
    () => (relatedRaw ?? []).filter((e) => String(e.id) !== String(id)).slice(0, 3),
    [relatedRaw, id],
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

  if (isLoading) {
    return (
      <DetailPage prefix="ev-detail" className="ev-detail--premium td acc-detail-page">
        <DetailSkeleton className="acc-page__detail-skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="ev-detail" className="ev-detail--premium td acc-detail-page">
        <EmptyState
          iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
          title="We couldn't load this event"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  if (!data || !id) {
    return (
      <DetailPage prefix="ev-detail" className="ev-detail--premium td acc-detail-page">
        <EmptyState
          iconElement={<Ticket size={28} strokeWidth={2} aria-hidden />}
          title="Event not found"
          sub="This event may have been removed or the link is incorrect."
          cta={{ label: 'Browse events', to: '/events' }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  return (
    <DetailPage prefix="ev-detail" className="ev-detail--premium td acc-detail-page" toast={shareMsg || null}>
      <EventDetailView
        event={data}
        eventId={id}
        saved={saved}
        onSave={() => setSaved((v) => !v)}
        onShare={() => onShare(data.title)}
        relatedEvents={relatedEvents}
        initialQuestions={DEFAULT_QUESTIONS}
      />
    </DetailPage>
  )
}
