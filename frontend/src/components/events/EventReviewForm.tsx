import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'

type Props = {
  bookingId: number
  eventId: string | number
  onSubmitted?: () => void
}

export function EventReviewForm({ bookingId, eventId, onSubmitted }: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/events/bookings/${bookingId}/review/`, {
        method: 'POST',
        body: JSON.stringify({ rating, body: body.trim() }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event-reviews', eventId] })
      void qc.invalidateQueries({ queryKey: ['my-event-booking', eventId] })
      onSubmitted?.()
    },
  })

  if (!profile) return null

  return (
    <div className="event-review-form">
      <h3 className="event-review-form__title">How was the event?</h3>
      <p className="event-review-form__sub">Share a quick rating to help other travellers.</p>
      <div className="event-review-form__stars" role="group" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={n <= rating ? 'event-review-form__star event-review-form__star--on' : 'event-review-form__star'}
            onClick={() => setRating(n)}
            aria-label={`${n} stars`}
          >
            <Star size={18} strokeWidth={2.25} aria-hidden />
          </button>
        ))}
      </div>
      <textarea
        className="event-review-form__input"
        rows={3}
        placeholder="What stood out? (optional)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button type="button" className="btn btn-primary btn-sm" disabled={mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? 'Submitting…' : 'Submit review'}
      </button>
    </div>
  )
}
