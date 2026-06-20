import { useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useListingSeeAll } from '../hooks/useListingSeeAll'
import {
  ListingSeeAllLayout,
  ListingSeeAllReviewsView,
} from '../components/listing'

export function ListingReviewsPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const { data, isLoading, error } = useListingSeeAll(type, id)

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <ListingSeeAllLayout
      title={data?.reviews.title ?? 'Reviews'}
      subtitle={data?.listingTitle}
      backTo={data?.backTo}
      loading={isLoading}
      notFound={notFound || (!isLoading && !data && Boolean(error))}
    >
      <ListingSeeAllReviewsView
        reviews={data?.reviews.reviews ?? []}
        rating={data?.reviews.rating}
        count={data?.reviews.count}
      />
    </ListingSeeAllLayout>
  )
}
