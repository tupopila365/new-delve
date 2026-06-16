import { Link } from 'react-router-dom'
import { GuestReviewCard } from '../GuestReviewCard'
import type { ReviewItem } from '../GuestReviewCard'
import { ListingSection } from './ListingSection'
import './listing-detail.css'

type Props = {
  reviews: ReviewItem[]
  listingType: string
  listingId: string | number
  title?: string
  rating?: string | number | null
  count?: number | null
  maxVisible?: number
  backTo?: string
  emptyMessage?: string
  className?: string
}

export function ListingReviews({
  reviews,
  listingType,
  listingId,
  title = 'Reviews',
  rating,
  count,
  maxVisible = 3,
  backTo,
  emptyMessage = 'No reviews yet.',
  className = '',
}: Props) {
  const visible = reviews.slice(0, maxVisible)
  const reviewsPath = `/listing/${listingType}/${listingId}/reviews`
  const ratingNum = rating != null ? parseFloat(String(rating)) : null
  const hasRating = ratingNum != null && !Number.isNaN(ratingNum)
  const reviewCount = count ?? reviews.length

  return (
    <ListingSection
      title={title}
      action={
        reviews.length > 0 ? (
          <Link
            className="listing-section__link"
            to={reviewsPath}
            state={{ title, reviews, rating, count, backTo }}
          >
            See all
          </Link>
        ) : null
      }
      className={`listing-reviews ${className}`.trim()}
    >
      {hasRating ? (
        <div className="listing-reviews__score-row">
          <p className="listing-reviews__score">★ {ratingNum!.toFixed(1)}</p>
          <p className="listing-reviews__score-meta">
            {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      ) : reviews.length === 0 ? (
        <p className="listing-reviews__empty" role="status">
          {emptyMessage}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <div className="listing-reviews__list">
          {visible.map((review, index) => (
            <GuestReviewCard key={`${review.name}-${index}`} r={review} />
          ))}
        </div>
      ) : null}
    </ListingSection>
  )
}
