import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { VerifyEmailPrompt } from '../auth/VerifyEmailPrompt'

export type ReviewFormProps = {
  /** API path that accepts `{ rating, body }` for this review. */
  endpoint: string
  title: string
  subtitle?: string
  /** Query keys to invalidate once the review is stored. */
  invalidateKeys: readonly unknown[][]
  onSubmitted?: () => void
}

/** Star rating + optional comment, shared by every module's review form. */
export function ReviewForm({
  endpoint,
  title,
  subtitle = 'Share a quick rating to help other travellers.',
  invalidateKeys,
  onSubmitted,
}: ReviewFormProps) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ rating, body: body.trim() }),
      }),
    onSuccess: () => {
      for (const queryKey of invalidateKeys) {
        void qc.invalidateQueries({ queryKey })
      }
      onSubmitted?.()
    },
  })

  if (!profile) return null
  if (!profile.email_verified) {
    return <VerifyEmailPrompt action="leave a review" email={profile.email} />
  }

  return (
    <div className="event-review-form">
      <h3 className="event-review-form__title">{title}</h3>
      <p className="event-review-form__sub">{subtitle}</p>
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
