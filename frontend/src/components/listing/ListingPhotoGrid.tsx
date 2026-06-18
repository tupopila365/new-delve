import { useState } from 'react'
import { Images } from 'lucide-react'
import { ListingPhotoLightbox } from './ListingPhotoLightbox'
import type { ListingGalleryItem } from './types'
import '../accommodation/accommodation-room.css'

type Props = {
  images: ListingGalleryItem[]
  title?: string
  className?: string
}

function gridLayoutClass(count: number): string {
  if (count <= 1) return 'listing-photo-grid--single'
  if (count === 2) return 'listing-photo-grid--duo'
  return 'listing-photo-grid--mosaic'
}

export function ListingPhotoGrid({ images, title = 'Photos', className = '' }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (images.length === 0) {
    return (
      <div className={`listing-photo-grid listing-photo-grid--empty ${className}`.trim()}>
        <Images size={28} strokeWidth={1.75} aria-hidden />
        <p>No photos for this room yet.</p>
      </div>
    )
  }

  const layoutClass = gridLayoutClass(images.length)

  return (
    <>
      <div className={`listing-photo-grid ${layoutClass} ${className}`.trim()}>
        {images.map((item, index) => (
          <button
            key={item.id ?? `${item.src}-${index}`}
            type="button"
            className={`listing-photo-grid__cell${index === 0 && images.length >= 3 ? ' listing-photo-grid__cell--lead' : ''}`}
            onClick={() => setLightboxIndex(index)}
            aria-label={`View photo ${index + 1} of ${images.length}`}
          >
            <img src={item.src} alt={item.alt ?? title} loading={index < 4 ? 'eager' : 'lazy'} decoding="async" />
          </button>
        ))}
      </div>

      {lightboxIndex != null ? (
        <ListingPhotoLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      ) : null}
    </>
  )
}
