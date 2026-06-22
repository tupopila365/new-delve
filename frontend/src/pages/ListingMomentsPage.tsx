import { useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useListingSeeAll } from '../hooks/useListingSeeAll'
import {
  ListingSeeAllLayout,
  ListingSeeAllMomentsView,
} from '../components/listing'

export function ListingMomentsPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const { data, isLoading, error } = useListingSeeAll(type, id)

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <ListingSeeAllLayout
      title={data?.moments.title ?? 'From Delvers'}
      subtitle={data?.listingTitle}
      backTo={data?.backTo}
      loading={isLoading}
      notFound={notFound || (!isLoading && !data && Boolean(error))}
    >
      <ListingSeeAllMomentsView
        moments={data?.moments.moments ?? []}
        queryKey={['listing-moments', type, id]}
      />
    </ListingSeeAllLayout>
  )
}
