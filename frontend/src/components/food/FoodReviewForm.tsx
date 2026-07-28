import { ReviewForm } from '../reviews/ReviewForm'

type Props = {
  venueId: string | number
  onSubmitted?: () => void
}

export function FoodReviewForm({ venueId, onSubmitted }: Props) {
  return (
    <ReviewForm
      endpoint={`/api/food/venues/${venueId}/review/`}
      title="How was your visit?"
      subtitle="Share a quick rating to help other travellers choose where to eat."
      invalidateKeys={[
        ['food-reviews', venueId],
        ['food', String(venueId)],
        ['provider-food-venues'],
        ['listing-see-all', 'food', String(venueId)],
      ]}
      onSubmitted={onSubmitted}
    />
  )
}
