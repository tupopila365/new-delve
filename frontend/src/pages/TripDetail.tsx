import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Route } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  findJourneyDemoTrip,
  mapApiJourneyToTrip,
  similarJourneyDemoFallback,
  type ApiJourney,
} from '../utils/journeyApi'
import { useJourneyEngagement } from '../hooks/useJourneyEngagement'
import { JourneyDetailView } from '../components/journeys/JourneyDetailView'
import { EmptyState } from '../components/ui'

export function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const fallbackTrip = useMemo(() => findJourneyDemoTrip(Number(id)), [id])

  const { data: apiJourney, isLoading } = useQuery({
    queryKey: ['journey', id, Boolean(profile)],
    queryFn: () => apiFetch<ApiJourney>(`/api/journeys/${id}/`, { auth: Boolean(profile) }),
    enabled: Boolean(id),
    retry: false,
  })

  const trip = useMemo(() => {
    if (apiJourney) return mapApiJourneyToTrip(apiJourney)
    return fallbackTrip
  }, [apiJourney, fallbackTrip])

  const engagementTrips = useMemo(() => (trip ? [trip] : []), [trip])
  const engagement = useJourneyEngagement(engagementTrips)

  const { data: similarApi = [] } = useQuery({
    queryKey: ['journey-similar', id],
    queryFn: () => apiFetch<ApiJourney[]>(`/api/journeys/${id}/similar/`, { auth: Boolean(profile) }),
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
      <div className="jn-detail-page">
        <div className="skeleton" style={{ height: 320, borderRadius: 24, marginTop: 12 }} aria-busy="true" />
      </div>
    )
  }

  if (!trip || !id) {
    return (
      <div className="jn-detail-page">
        <EmptyState
          iconElement={<Route size={28} strokeWidth={2} aria-hidden />}
          title="Journey not found"
          sub="This journey may have been removed or the link is incorrect."
          cta={{ label: 'Browse journeys', to: '/journeys' }}
        />
      </div>
    )
  }

  return (
    <div className="jn-detail-page">
      {engagement.shareMsg ? (
        <p className="jn-detail-page__toast" role="status">
          {engagement.shareMsg}
        </p>
      ) : null}
      <JourneyDetailView
        trip={trip}
        journeyId={id}
        saved={engagement.isSaved(trip)}
        saveCount={engagement.saveCount(trip)}
        onSave={() => engagement.saveTrip(trip)}
        onShare={() => void engagement.shareTrip(trip)}
        liked={engagement.isLiked(trip)}
        likeCount={engagement.likeCount(trip)}
        onLike={() => engagement.likeTrip(trip)}
        likeBusy={engagement.isLikeBusy(trip.id)}
        saveBusy={engagement.isSaveBusy(trip.id)}
        similarJourneys={similarJourneys}
      />
    </div>
  )
}
