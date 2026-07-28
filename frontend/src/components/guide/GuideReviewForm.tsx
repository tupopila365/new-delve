import { ReviewForm } from '../reviews/ReviewForm'

type Props = {
  guideId: string | number
  onSubmitted?: () => void
}

export function GuideReviewForm({ guideId, onSubmitted }: Props) {
  return (
    <ReviewForm
      endpoint={`/api/guides/profiles/${guideId}/review/`}
      title="How was your tour?"
      subtitle="Share a quick rating to help other travellers choose a guide."
      invalidateKeys={[
        ['guide-reviews', guideId],
        ['guide', String(guideId)],
        ['provider-guide-profile'],
        ['my-bookings', 'guides'],
      ]}
      onSubmitted={onSubmitted}
    />
  )
}
