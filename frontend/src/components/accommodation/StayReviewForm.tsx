import { ReviewForm } from '../reviews/ReviewForm'

type Props = {
  bookingId: number
  listingId: string | number
  onSubmitted?: () => void
}

export function StayReviewForm({ bookingId, listingId, onSubmitted }: Props) {
  return (
    <ReviewForm
      endpoint={`/api/accommodation/bookings/${bookingId}/review/`}
      title="How was your stay?"
      invalidateKeys={[
        ['stay-reviews', listingId],
        ['my-bookings', 'stays'],
        ['acc', listingId],
      ]}
      onSubmitted={onSubmitted}
    />
  )
}
