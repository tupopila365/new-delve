import { DetailHeroWrap } from '../detail/DetailHeroWrap'
import { ListingGalleryGrid } from './ListingGalleryGrid'
import type { ListingGalleryItem } from './types'
import './listing-detail.css'

type Props = {
  images: ListingGalleryItem[]
  listingType: string
  listingId: string | number
  backTo: string
  backLabel?: string
  saved?: boolean
  onSave?: () => void
  onShare?: () => void
  className?: string
}

export function ListingHeroGallery({
  images,
  listingType,
  listingId,
  backTo,
  backLabel = 'Back',
  saved,
  onSave,
  onShare,
  className = '',
}: Props) {
  return (
    <DetailHeroWrap
      className={className}
      backTo={backTo}
      backLabel={backLabel}
      saved={saved}
      onSave={onSave}
      onShare={onShare}
    >
      <ListingGalleryGrid
        listingType={listingType}
        listingId={listingId}
        images={images}
        backTo={backTo}
        variant="hero"
      />
    </DetailHeroWrap>
  )
}
