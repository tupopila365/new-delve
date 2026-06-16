import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { GuestReviewCard } from '../components/GuestReviewCard'
import type { ListingReviewsPageState } from '../components/listing/types'
import '../components/listing/listing-detail.css'

export function ListingReviewsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state ?? {}) as ListingReviewsPageState
  const { title = 'Reviews', reviews = [], rating, count, backTo } = state

  const backHref = backTo ?? -1
  const ratingNum = rating != null ? parseFloat(String(rating)) : null
  const hasRating = ratingNum != null && !Number.isNaN(ratingNum)
  const reviewCount = count ?? reviews.length

  return (
    <div className="listing-page">
      <div className="listing-page__bar">
        {typeof backHref === 'string' ? (
          <Link className="listing-page__back" to={backHref} aria-label="Go back">
            <ArrowLeft size={18} strokeWidth={2.25} />
          </Link>
        ) : (
          <button
            type="button"
            className="listing-page__back"
            onClick={() => navigate(backHref)}
            aria-label="Go back"
          >
            <ArrowLeft size={18} strokeWidth={2.25} />
          </button>
        )}
        <h1 className="listing-page__title">{title}</h1>
      </div>

      {hasRating ? (
        <div className="listing-reviews__score-row">
          <p className="listing-reviews__score">★ {ratingNum!.toFixed(1)}</p>
          <p className="listing-reviews__score-meta">
            {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <div className="listing-reviews__list">
          {reviews.map((review, index) => (
            <GuestReviewCard key={`${review.name}-${index}`} r={review} />
          ))}
        </div>
      ) : (
        <p className="listing-muted" role="status">
          No reviews yet.
        </p>
      )}
    </div>
  )
}
