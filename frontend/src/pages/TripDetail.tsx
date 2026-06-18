import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Route } from 'lucide-react'
import { mockTrips } from '../data/mockTrips'
import { findUserTrip } from '../data/userTrips'
import { JourneyDetailView } from '../components/journeys/JourneyDetailView'
import { DetailPage } from '../components/detail'
import { EmptyState } from '../components/ui'
import type { ListingQuestionItem } from '../components/listing/ListingQuestionThread'

const SEED_QUESTIONS: ListingQuestionItem[] = [
  { id: 'q1', author: 'Mila K.', body: 'Was the road safe in the wet season?', ago: '4h ago' },
  { id: 'q2', author: 'Jonas T.', body: 'Did you need a 4x4 for every section?', ago: '1d ago' },
]

export function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const trip = findUserTrip(Number(id)) ?? mockTrips.find((t) => t.id === Number(id))

  const [liked, setLiked] = useState(trip?.liked_by_me ?? false)
  const [likeCount, setLikeCount] = useState(trip?.likes_count ?? 0)
  const [saved, setSaved] = useState(trip?.saved_by_me ?? false)
  const [shareMsg, setShareMsg] = useState('')

  const similarJourneys = useMemo(() => {
    if (!trip) return []
    return mockTrips
      .filter((t) => t.id !== trip.id)
      .filter(
        (t) =>
          t.countries.some((c) => trip.countries.includes(c)) ||
          t.tags.some((tag) => trip.tags.includes(tag)),
      )
      .slice(0, 3)
  }, [trip])

  const handleLike = () =>
    setLiked((v) => {
      setLikeCount((c) => c + (v ? -1 : 1))
      return !v
    })

  const handleSave = () => setSaved((v) => !v)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
    window.setTimeout(() => setShareMsg(''), 1800)
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
    <DetailPage prefix="td" className="td--premium acc-detail-page" toast={shareMsg || null}>
      <JourneyDetailView
        trip={trip}
        journeyId={id}
        saved={saved}
        onSave={handleSave}
        onShare={handleShare}
        liked={liked}
        likeCount={likeCount}
        onLike={handleLike}
        similarJourneys={similarJourneys}
        initialQuestions={SEED_QUESTIONS}
      />
    </DetailPage>
  )
}
