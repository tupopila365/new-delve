import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Utensils } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { FoodDetailView } from '../components/food'
import { PromotionOpenTracker } from '../components/promotion/PromotionOpenTracker'
import type { MyFoodReservation } from '../hooks/useMyFoodReservations'
import { EmptyState } from '../components/ui'
import { friendlyApiMessage } from '../utils/friendlyError'
import type { FoodVenueListing } from '../utils/foodListing'
import { useFoodEngagement } from '../hooks/useFoodEngagement'
import '../components/journeys/journey-detail.css'
import '../components/food/food-detail.css'

function combineDateTime(date: string, time: string) {
  if (!date || !time) return ''
  return new Date(`${date}T${time}`).toISOString()
}

export function FoodDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { canManageListings, activeBusiness } = useBusinessAccess()
  const [shareMsg, setShareMsg] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [partySize, setPartySize] = useState(2)
  const [notes, setNotes] = useState('')
  const [reservation, setReservation] = useState<MyFoodReservation | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['food', id, profile?.username ?? 'anon'],
    enabled: !!id,
    queryFn: () => apiFetch<FoodVenueListing>(`/api/food/venues/${id}/`, { auth: Boolean(profile) }),
  })

  const engagementVenues = useMemo(() => (data ? [data] : []), [data])
  const engagement = useFoodEngagement(engagementVenues)

  const { data: myReservations = [] } = useQuery({
    queryKey: ['my-bookings', 'food'],
    queryFn: () => apiFetch<MyFoodReservation[]>('/api/food/reservations/'),
    enabled: Boolean(profile) && Boolean(data?.reservations),
  })

  const activeReservation = useMemo(() => {
    if (reservation && !['cancelled', 'refunded'].includes(reservation.status)) return reservation
    const venueId = Number(id)
    return (
      myReservations.find(
        (r) =>
          r.venue === venueId && !['cancelled', 'refunded', 'checked_out'].includes(r.status),
      ) ?? null
    )
  }, [reservation, myReservations, id])

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<MyFoodReservation>('/api/food/reservations/', {
        method: 'POST',
        body: JSON.stringify({
          venue: Number(id),
          reserved_for: combineDateTime(date, time),
          party_size: partySize,
          special_requests: notes.trim(),
        }),
      }),
    onSuccess: (row) => {
      setReservation(row)
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'food'] })
    },
    onError: (e) => setErr(friendlyApiMessage(e, "We couldn't send that request. Try again.")),
  })

  const onShare = async (venueName: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: venueName, url: window.location.href })
        setShareMsg('Shared')
        window.setTimeout(() => setShareMsg(''), 1600)
        return
      }
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg(`Link to ${venueName} copied`)
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  const handleReserve = () => {
    setErr(null)
    if (!profile) {
      navigate('/login')
      return
    }
    if (!profile.email_verified) {
      navigate('/verify-email')
      return
    }
    if (!date) {
      setErr('Choose a date for your reservation.')
      return
    }
    if (!time) {
      setErr('Choose a time for your reservation.')
      return
    }
    const reservedFor = new Date(combineDateTime(date, time))
    if (Number.isNaN(reservedFor.getTime()) || reservedFor <= new Date()) {
      setErr('Choose a date and time in the future.')
      return
    }
    createMut.mutate()
  }

  if (isLoading) {
    return (
      <div className="jn-detail-page fd-detail-page">
        <div className="skeleton" style={{ height: 280, borderRadius: 16, marginTop: 12 }} aria-hidden />
        <div className="skeleton" style={{ height: 120, borderRadius: 16, marginTop: 14 }} aria-hidden />
        <div className="skeleton" style={{ height: 200, borderRadius: 16, marginTop: 14 }} aria-hidden />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="jn-detail-page fd-detail-page">
        <EmptyState
          iconElement={<Utensils size={28} strokeWidth={1.75} />}
          title="We couldn't load this venue"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </div>
    )
  }

  if (!data || !id) {
    return (
      <div className="jn-detail-page fd-detail-page">
        <EmptyState
          iconElement={<Utensils size={28} strokeWidth={1.75} />}
          title="Venue not found"
          sub="This listing may have been removed or the link is incorrect."
          cta={{ label: 'Browse food & drink', to: '/food' }}
        />
      </div>
    )
  }

  const canAnswer =
    Boolean(profile) &&
    (profile?.username === data.owner_username ||
      (canManageListings && activeBusiness?.owner_username === data.owner_username))

  const canReserve = Boolean(data.reservations)
  const editHref = canAnswer ? `/provider/food/${id}` : undefined

  const onSave = () => {
    if (!profile) {
      navigate('/login')
      return
    }
    engagement.saveVenue(data)
  }

  const onLike = () => {
    if (!profile) {
      navigate('/login')
      return
    }
    engagement.likeVenue(data)
  }

  return (
    <div className="jn-detail-page fd-detail-page">
      <PromotionOpenTracker />
      {shareMsg || engagement.shareMsg ? (
        <p className="jn-detail-page__toast" role="status">
          {shareMsg || engagement.shareMsg}
        </p>
      ) : null}
      <FoodDetailView
        data={data}
        venueId={id}
        editHref={editHref}
        liked={engagement.isLiked(data)}
        saved={engagement.isSaved(data)}
        likeBusy={engagement.isLikeBusy(data.id)}
        saveBusy={engagement.isSaveBusy(data.id)}
        likeCount={engagement.likeCount(data)}
        saveCount={engagement.saveCount(data)}
        onLike={onLike}
        onSave={onSave}
        onShare={() => onShare(data.name)}
        canAnswer={canAnswer}
        hasReviewed={Boolean(data.has_reviewed)}
        canReview={Boolean(data.can_review)}
        canReserve={canReserve}
        reservation={canReserve ? activeReservation : null}
        reserve={{
          date,
          time,
          partySize,
          notes,
          onDateChange: setDate,
          onTimeChange: setTime,
          onPartySizeChange: setPartySize,
          onNotesChange: setNotes,
          onReserve: handleReserve,
          isPending: createMut.isPending,
          err,
          onDismissErr: () => setErr(null),
          profile: profile ?? null,
        }}
      />
    </div>
  )
}
