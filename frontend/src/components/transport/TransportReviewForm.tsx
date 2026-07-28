import { ReviewForm } from '../reviews/ReviewForm'

type Props = {
  bookingId: number
  listingId: string | number
  endpoint: 'vehicle' | 'bus'
  title?: string
  subtitle?: string
  onSubmitted?: () => void
}

export function TransportReviewForm({
  bookingId,
  listingId,
  endpoint,
  title = 'How was your trip?',
  subtitle,
  onSubmitted,
}: Props) {
  const reviewPath =
    endpoint === 'vehicle'
      ? `/api/transport/vehicle-bookings/${bookingId}/review/`
      : `/api/transport/bus/reservations/${bookingId}/review/`

  return (
    <ReviewForm
      endpoint={reviewPath}
      title={title}
      subtitle={subtitle}
      invalidateKeys={[
        ['vehicle-reviews', listingId],
        ['bus-trip-reviews', listingId],
        ['my-bookings', 'transport'],
        ['veh', listingId],
        ['trip', listingId],
      ]}
      onSubmitted={onSubmitted}
    />
  )
}
