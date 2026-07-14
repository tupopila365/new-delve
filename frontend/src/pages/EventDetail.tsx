import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Ticket } from 'lucide-react'
import { ApiError, apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { useEventEngagement } from '../hooks/useEventEngagement'
import { normalizeReviews, type ReviewItem } from '../components/GuestReviewCard'
import { EventDetailView } from '../components/events'
import { HighlightAddFlow } from '../components/highlights/HighlightAddFlow'
import { normalizeHighlightsForSave } from '../components/highlights/highlightFormUtils'
import type { HighlightChannelInput } from '../components/highlights/types'
import { EmptyState } from '../components/ui'
import type { EventDetail as EventDetailType, EventListItem } from '../utils/eventListing'
import '../components/journeys/journey-detail.css'

type EventBooking = {
  id: number
  event: number
  status: string
  booking_ref: string
  total_price?: string | number | null
  mock_payment_ref?: string
  has_review?: boolean
}

type EventReviewsResponse = {
  reviews: ReviewItem[]
  rating_avg: number
  rating_count: number
}

type TicketResponse = {
  booking_ref: string
  qr_payload: string
}

export function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { canManageListings, activeBusiness } = useBusinessAccess()
  const qc = useQueryClient()
  const [addHighlightOpen, setAddHighlightOpen] = useState(false)
  const [savingHighlight, setSavingHighlight] = useState(false)
  const [highlightErr, setHighlightErr] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['event', id, profile?.username ?? ''],
    enabled: !!id,
    queryFn: () => apiFetch<EventDetailType>(`/api/events/${id}/`, { auth: Boolean(profile) }),
  })

  const engagementEvents = useMemo(() => (data ? [data] : []), [data])
  const engagement = useEventEngagement(engagementEvents)

  const { data: myBooking } = useQuery({
    queryKey: ['my-event-booking', id],
    queryFn: async () => {
      const rows = asArray<EventBooking>(
        await apiFetch<EventBooking[]>(`/api/events/bookings/?event=${encodeURIComponent(id!)}&status=active`),
      )
      return rows[0] ?? null
    },
    enabled: Boolean(profile && id),
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['event-reviews', id],
    queryFn: () => apiFetch<EventReviewsResponse>(`/api/events/${id}/reviews/`, { auth: false }),
    enabled: Boolean(id),
  })

  const { data: ticketData } = useQuery({
    queryKey: ['event-ticket', myBooking?.id],
    queryFn: () => apiFetch<TicketResponse>(`/api/events/bookings/${myBooking!.id}/ticket/`),
    enabled: Boolean(
      myBooking && (myBooking.status === 'confirmed' || myBooking.status === 'checked_in'),
    ),
  })

  const { data: relatedRaw } = useQuery({
    queryKey: ['events', 'related', id],
    enabled: Boolean(id && data),
    queryFn: () =>
      apiFetch<EventListItem[]>(`/api/events/${id}/related/`, {
        auth: Boolean(profile),
      }),
  })

  const reviews = useMemo(
    () => normalizeReviews(reviewsData?.reviews ?? []),
    [reviewsData?.reviews],
  )

  const relatedEvents = useMemo(
    () => asArray<EventListItem>(relatedRaw).slice(0, 6),
    [relatedRaw],
  )

  const rsvpMut = useMutation({
    mutationFn: () =>
      apiFetch<EventBooking>(`/api/events/${id}/rsvp/`, {
        method: 'POST',
        body: JSON.stringify({ tickets: 1 }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event', id] })
      void qc.invalidateQueries({ queryKey: ['my-event-booking', id] })
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'events'] })
    },
  })

  const cancelRsvpMut = useMutation({
    mutationFn: () =>
      apiFetch<EventBooking>(`/api/events/bookings/${myBooking!.id}/cancel/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event', id] })
      void qc.invalidateQueries({ queryKey: ['my-event-booking', id] })
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'events'] })
    },
  })

  const payMut = useMutation({
    mutationFn: () =>
      apiFetch<{ booking: EventBooking }>(`/api/events/bookings/${myBooking!.id}/mock_pay/`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event', id] })
      void qc.invalidateQueries({ queryKey: ['my-event-booking', id] })
      void qc.invalidateQueries({ queryKey: ['event-ticket', myBooking?.id] })
    },
  })

  const attending = Boolean(data?.attending_by_me || myBooking)
  const bookingStatus = myBooking?.status

  const canEdit = Boolean(
    profile &&
      data &&
      (data.organizer_username === profile.username ||
        (canManageListings && data.business && activeBusiness?.id === data.business)),
  )

  const showReviewForm = Boolean(myBooking?.status === 'checked_in' && !myBooking.has_review)

  async function saveEventHighlight(channel: HighlightChannelInput) {
    if (!id || !data) return
    setSavingHighlight(true)
    setHighlightErr(null)
    try {
      const next = normalizeHighlightsForSave([...(data.event_stories ?? []), channel])
      const fd = new FormData()
      fd.append('event_stories', JSON.stringify(next))
      await apiFetch<EventDetailType>(`/api/events/${id}/`, { method: 'PATCH', body: fd })
      await qc.invalidateQueries({ queryKey: ['event', id] })
      await qc.invalidateQueries({ queryKey: ['events'] })
      setAddHighlightOpen(false)
    } catch (e) {
      setHighlightErr(e instanceof ApiError ? e.message : 'Could not save this highlight.')
    } finally {
      setSavingHighlight(false)
    }
  }

  if (isLoading) {
    return (
      <div className="jn-detail-page ev-detail-page">
        <div className="skeleton" style={{ height: 320, borderRadius: 24, marginTop: 12 }} aria-busy="true" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="jn-detail-page ev-detail-page">
        <EmptyState
          iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
          title="We couldn't load this event"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </div>
    )
  }

  if (!data || !id) {
    return (
      <div className="jn-detail-page ev-detail-page">
        <EmptyState
          iconElement={<Ticket size={28} strokeWidth={2} aria-hidden />}
          title="Event not found"
          sub="This event may have been removed or the link is incorrect."
          cta={{ label: 'Browse events', to: '/events' }}
        />
      </div>
    )
  }

  return (
    <div className="jn-detail-page ev-detail-page">
      {engagement.shareMsg ? (
        <p className="jn-detail-page__toast" role="status">
          {engagement.shareMsg}
        </p>
      ) : null}
      {profile && !profile.email_verified ? (
        <p className="jn-detail-page__toast" role="status">
          <Link to="/verify-email">Verify your email</Link> to RSVP for this event.
        </p>
      ) : null}
      {rsvpMut.isError ? (
        <p className="jn-detail-page__toast" role="alert">
          {rsvpMut.error instanceof ApiError ? rsvpMut.error.message : 'Could not complete RSVP.'}
        </p>
      ) : null}
      {highlightErr ? (
        <p className="jn-detail-page__toast" role="alert">
          {highlightErr}
        </p>
      ) : null}

      <EventDetailView
        event={data}
        eventId={id}
        editHref={canEdit ? `/events/${id}/edit` : undefined}
        isOwner={canEdit}
        onAddHighlight={canEdit ? () => setAddHighlightOpen(true) : undefined}
        saved={engagement.isSaved(data)}
        saveCount={engagement.saveCount(data)}
        liked={engagement.isLiked(data)}
        likeCount={engagement.likeCount(data)}
        likeBusy={engagement.isLikeBusy(data.id)}
        saveBusy={engagement.isSaveBusy(data.id)}
        onLike={() => {
          if (engagement.requiresAuth) {
            navigate('/login')
            return
          }
          engagement.likeEvent(data)
        }}
        onSave={() => {
          if (engagement.requiresAuth) {
            navigate('/login')
            return
          }
          engagement.saveEvent(data)
        }}
        onShare={() => void engagement.shareEventPlain(data)}
        relatedEvents={relatedEvents}
        reviews={reviews}
        reviewRating={reviewsData?.rating_avg}
        reviewCount={reviewsData?.rating_count}
        showReviewForm={showReviewForm}
        myBookingId={myBooking?.id ?? null}
        ticketQr={ticketData ?? null}
        attending={attending}
        rsvpPending={rsvpMut.isPending}
        bookingStatus={bookingStatus}
        bookingTotal={myBooking?.total_price}
        mockPaymentRef={myBooking?.mock_payment_ref}
        payPending={payMut.isPending}
        onRsvp={profile?.email_verified ? () => rsvpMut.mutate() : undefined}
        onCancelRsvp={profile && myBooking ? () => cancelRsvpMut.mutate() : undefined}
        onPay={profile && myBooking?.status === 'pending' ? () => payMut.mutate() : undefined}
      />

      <HighlightAddFlow
        open={addHighlightOpen}
        onClose={() => setAddHighlightOpen(false)}
        onSave={saveEventHighlight}
        saving={savingHighlight}
      />
    </div>
  )
}
