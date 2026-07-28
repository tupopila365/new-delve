import { ReviewForm } from '../reviews/ReviewForm'
import '../events/event-detail.css'

type Props = {
  listingId: string | number
  onSubmitted?: () => void
}

export function ActivityReviewForm({ listingId, onSubmitted }: Props) {
  return (
    <ReviewForm
      endpoint={`/api/activities/listings/${listingId}/review/`}
      title="How was the activity?"
      subtitle="Share a quick rating to help other travellers choose an experience."
      invalidateKeys={[
        ['activity-reviews', String(listingId)],
        ['activity', String(listingId)],
        ['listing-see-all', 'activity', String(listingId)],
      ]}
      onSubmitted={onSubmitted}
    />
  )
}
