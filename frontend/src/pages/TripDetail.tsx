import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Route } from 'lucide-react'
import { apiFetch } from '../api/client'
import {
  findJourneyDemoTrip,
  mapApiJourneyToTrip,
  similarJourneyDemoFallback,
  type ApiJourney,
} from '../utils/journeyApi'
import { useJourneyEngagement } from '../hooks/useJourneyEngagement'
import { JourneyDetailView } from '../components/journeys/JourneyDetailView'
import { DetailPage } from '../components/detail'
import { EmptyState } from '../components/ui'

export function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const fallbackTrip = useMemo(() => findJourneyDemoTrip(Number(id)), [id])

  const { data: apiJourney, isLoading } = useQuery({
    queryKey: ['journey', id],
    queryFn: () => apiFetch<ApiJourney>(`/api/journeys/${id}/`, { auth: false }),
    enabled: Boolean(id),
    retry: false,
  })

  const trip = useMemo(() => {
    if (apiJourney) return mapApiJourneyToTrip(apiJourney)
    return fallbackTrip
  }, [apiJourney, fallbackTrip])

  const engagement = useJourneyEngagement(trip ? [trip] : [])

  const { data: similarApi = [] } = useQuery({
    queryKey: ['journey-similar', id],
    queryFn: () => apiFetch<ApiJourney[]>(`/api/journeys/${id}/similar/`, { auth: false }),
    enabled: Boolean(id) && Boolean(trip),
    retry: false,
  })

  const similarJourneys = useMemo(() => {
    if (!trip) return []
    if (similarApi.length > 0) return similarApi.map(mapApiJourneyToTrip)
    return similarJourneyDemoFallback(trip, trip.id)
  }, [trip, similarApi])

  if (isLoading && !fallbackTrip) {
    return (
      <DetailPage prefix="td" className="td--premium acc-detail-page">
        <div className="skeleton" style={{ height: 320, borderRadius: 12 }} aria-busy="true" />
      </DetailPage>
    )
  }

  if (!trip || !id) {
    return (
      <DetailPage prefix="td" className="td--premium acc-detail-page">
        <EmptyState
          iconElement={<Route size={28} strokeWidth={2} aria-hidden />}
          title="Journey not found"
          sub="This journey may have been removed or the link is incorrect."
          cta={{ label: 'Browse journeys', to: '/journeys' }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  return (
    <DetailPage prefix="td" className="td--premium acc-detail-page" toast={engagement.shareMsg || null}>
      <JourneyDetailView
        trip={trip}
        journeyId={id}
        saved={engagement.isSaved(trip)}
        onSave={() => engagement.saveTrip(trip)}
        onShare={() => void engagement.shareTrip(trip)}
        liked={engagement.isLiked(trip)}
        likeCount={engagement.likeCount(trip)}
        onLike={() => engagement.likeTrip(trip)}
        similarJourneys={similarJourneys}
      />
    </DetailPage>
  )
}
