import { useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useListingSeeAll } from '../hooks/useListingSeeAll'
import {
  ListingSeeAllGalleryView,
  ListingSeeAllLayout,
} from '../components/listing'

export function ListingGalleryPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const { data, isLoading, error } = useListingSeeAll(type, id)

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <ListingSeeAllLayout
      title={data?.gallery.title ?? 'Photos'}
      subtitle={data?.listingTitle}
      backTo={data?.backTo}
      loading={isLoading}
      notFound={notFound || (!isLoading && !data && Boolean(error))}
    >
      <ListingSeeAllGalleryView images={data?.gallery.images ?? []} />
    </ListingSeeAllLayout>
  )
}
