import { GuestReviewCard } from '../GuestReviewCard'
import type { ReviewItem } from '../GuestReviewCard'

type Props = {
  reviews: ReviewItem[]
  rating?: string | number | null
  count?: number | null
  emptyMessage?: string
}

export function ListingSeeAllReviewsView({
  reviews,
  rating,
  count,
  emptyMessage = 'No reviews yet.',
}: Props) {
  const ratingNum = rating != null ? parseFloat(String(rating)) : null
  const hasRating = ratingNum != null && !Number.isNaN(ratingNum)
  const reviewCount = count ?? reviews.length

  return (
    <>
      {hasRating ? (
        <div className="listing-see-all__score">
          <strong>★ {ratingNum!.toFixed(1)}</strong>
          <span>
            {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <div className="listing-see-all__reviews">
          {reviews.map((review, index) => (
            <GuestReviewCard key={`${review.name}-${index}`} r={review} />
          ))}
        </div>
      ) : (
        <p className="listing-see-all__muted" role="status">
          {emptyMessage}
        </p>
      )}
    </>
  )
}
