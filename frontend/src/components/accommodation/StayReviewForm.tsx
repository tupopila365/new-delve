import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { VerifyEmailPrompt } from '../auth/VerifyEmailPrompt'

type Props = {
  bookingId: number
  listingId: string | number
  onSubmitted?: () => void
}

export function StayReviewForm({ bookingId, listingId, onSubmitted }: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/accommodation/bookings/${bookingId}/review/`, {
        method: 'POST',
        body: JSON.stringify({ rating, body: body.trim() }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stay-reviews', listingId] })
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'stays'] })
      void qc.invalidateQueries({ queryKey: ['acc', listingId] })
      onSubmitted?.()
    },
  })

  if (!profile) return null
  if (!profile.email_verified) {
    return <VerifyEmailPrompt action="leave a review" email={profile.email} />
  }

  return (
    <div className="event-review-form">
      <h3 className="event-review-form__title">How was your stay?</h3>
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
