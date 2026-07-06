import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Ticket } from 'lucide-react'
import { ApiError, apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { normalizeReviews, type ReviewItem } from '../components/GuestReviewCard'
import { DetailPage, DetailSkeleton } from '../components/detail'
import { EventDetailView } from '../components/events'
import { HighlightAddFlow } from '../components/highlights/HighlightAddFlow'
import { normalizeHighlightsForSave } from '../components/highlights/highlightFormUtils'
import type { HighlightChannelInput } from '../components/highlights/types'
import { EmptyState } from '../components/ui'
import type { ListingQuestionItem } from '../components/listing/ListingQuestionThread'
import type { EventDetail, EventListItem } from '../utils/eventListing'
import { resolveTicketingMode } from '../utils/eventTicketing'

type EventBooking = {
  id: number
  event: number
  status: string
  booking_ref: string
  total_price?: string | number | null
  mock_payment_ref?: string
  has_review?: boolean
}

type EventQuestionApi = {
  id: number
  author: string
  body: string
  ago: string
  answers?: { id: number; author: string; body: string; ago: string; is_official?: boolean }[]
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
  const { profile } = useAuth()
  const { canManageListings, activeBusiness } = useBusinessAccess()
  const qc = useQueryClient()
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null)
  const [shareMsg, setShareMsg] = useState('')
  const [addHighlightOpen, setAddHighlightOpen] = useState(false)
  const [savingHighlight, setSavingHighlight] = useState(false)
  const [highlightErr, setHighlightErr] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['event', id, profile?.username ?? ''],
    enabled: !!id,
    queryFn: () => apiFetch<EventDetail>(`/api/events/${id}/`, { auth: Boolean(profile) }),
  })

  const { data: myBooking } = useQuery({
    queryKey: ['my-event-booking', id],
    queryFn: async () => {
      const rows = asArray<EventBooking>(await apiFetch<EventBooking[]>('/api/events/bookings/'))
      return rows.find((b) => String(b.event) === String(id) && b.status !== 'cancelled') ?? null
    },
    enabled: Boolean(profile && id),
  })

  const { data: questionsRaw, isLoading: loadingQuestions } = useQuery({
    queryKey: ['event-questions', id],
    queryFn: () => apiFetch<EventQuestionApi[]>(`/api/events/${id}/questions/`, { auth: false }),
    enabled: Boolean(id),
  })
  const questionRows = asArray<EventQuestionApi>(questionsRaw)

  const { data: reviewsData } = useQuery({
    queryKey: ['event-reviews', id],
    queryFn: () => apiFetch<EventReviewsResponse>(`/api/events/${id}/reviews/`, { auth: false }),
    enabled: Boolean(id),
  })

  const { data: ticketData } = useQuery({
    queryKey: ['event-ticket', myBooking?.id],
    queryFn: () => apiFetch<TicketResponse>(`/api/events/bookings/${myBooking!.id}/ticket/`),
    enabled: Boolean(
      myBooking &&
        (myBooking.status === 'confirmed' || myBooking.status === 'checked_in'),
    ),
  })

  const { data: relatedRaw } = useQuery({
    queryKey: ['events', 'related', data?.category],
    enabled: Boolean(data?.category),
    queryFn: () =>
      apiFetch<EventListItem[]>(`/api/events/?category=${encodeURIComponent(data!.category)}`, {
        auth: Boolean(profile),
      }),
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

  const saveMut = useMutation({
    mutationFn: () =>
      apiFetch<{ saved: boolean; saves_count: number }>(`/api/events/${id}/save/`, { method: 'POST' }),
    onSuccess: (result) => {
      setSavedOverride(result.saved)
      void qc.invalidateQueries({ queryKey: ['event', id] })
      void qc.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const rsvpMut = useMutation({
    mutationFn: () =>
      apiFetch<EventBooking>(`/api/events/${id}/rsvp/`, { method: 'POST', body: JSON.stringify({ tickets: 1 }) }),
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
      apiFetch<{ booking: EventBooking }>(`/api/events/bookings/${myBooking!.id}/mock_pay/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event', id] })
      void qc.invalidateQueries({ queryKey: ['my-event-booking', id] })
      void qc.invalidateQueries({ queryKey: ['event-ticket', myBooking?.id] })
    },
  })

  const relatedEvents = useMemo(
    () => asArray<EventListItem>(relatedRaw).filter((e) => String(e.id) !== String(id)).slice(0, 3),
    [relatedRaw, id],
  )

  const saved = savedOverride ?? Boolean(data?.saved_by_me)
  const attending = Boolean(data?.attending_by_me || myBooking)
  const bookingStatus = myBooking?.status

  const canEdit = Boolean(
    profile &&
      data &&
      (data.organizer_username === profile.username ||
        (canManageListings && data.business && activeBusiness?.id === data.business)),
  )

  const canAnswerQuestions = Boolean(canEdit)

  const showReviewForm = Boolean(
    myBooking?.status === 'checked_in' && !myBooking.has_review,
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

  async function saveEventHighlight(channel: HighlightChannelInput) {
    if (!id || !data) return
    setSavingHighlight(true)
    setHighlightErr(null)
    try {
      const next = normalizeHighlightsForSave([...(data.event_stories ?? []), channel])
      const fd = new FormData()
      fd.append('event_stories', JSON.stringify(next))
      await apiFetch<EventDetail>(`/api/events/${id}/`, { method: 'PATCH', body: fd })
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
      {!profile ? (
        <p className="acc-detail__toast" role="status">
          <Link to="/login">Sign in</Link> to RSVP, ask questions, and share moments.
        </p>
      ) : !profile.email_verified ? (
        <p className="acc-detail__toast" role="status">
          <Link to="/verify-email">Verify your email</Link> to RSVP for this event.
        </p>
      ) : null}
      {rsvpMut.isError ? (
        <p className="acc-detail__toast acc-detail__toast--error" role="alert">
          {rsvpMut.error instanceof ApiError ? rsvpMut.error.message : 'Could not complete RSVP.'}
        </p>
      ) : null}
      {highlightErr ? (
        <p className="acc-detail__toast acc-detail__toast--error" role="alert">
          {highlightErr}
        </p>
      ) : null}
      <EventDetailView
        event={data}
        eventId={id}
        editHref={canEdit ? `/events/${id}/edit` : undefined}
        isOwner={canEdit}
        onAddHighlight={canEdit ? () => setAddHighlightOpen(true) : undefined}
        saved={saved}
        onSave={() => profile && saveMut.mutate()}
        onShare={() => onShare(data.title)}
        relatedEvents={relatedEvents}
        questions={questions}
        questionsLoading={loadingQuestions}
        canAnswerQuestions={canAnswerQuestions}
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
    </DetailPage>
  )
}
