import { ReviewForm } from '../reviews/ReviewForm'

type Props = {
  bookingId: number
  eventId: string | number
  onSubmitted?: () => void
}

export function EventReviewForm({ bookingId, eventId, onSubmitted }: Props) {
  return (
    <ReviewForm
      endpoint={`/api/events/bookings/${bookingId}/review/`}
      title="How was the event?"
      invalidateKeys={[
        ['event-reviews', eventId],
        ['my-event-booking', eventId],
      ]}
      onSubmitted={onSubmitted}
    />
  )
}
