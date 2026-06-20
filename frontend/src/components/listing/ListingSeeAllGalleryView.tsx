import type { ListingGalleryItem } from './types'

type Props = {
  images: ListingGalleryItem[]
  emptyMessage?: string
}

export function ListingSeeAllGalleryView({
  images,
  emptyMessage = 'No photos yet.',
}: Props) {
  if (images.length === 0) {
    return (
      <p className="listing-see-all__muted" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="listing-see-all__gallery">
      {images.map((item, index) => (
        <figure key={item.id ?? `${item.src}-${index}`} className="listing-see-all__photo">
          <img src={item.src} alt={item.alt ?? ''} loading="lazy" decoding="async" />
          {item.caption ? <figcaption>{item.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  )
}
