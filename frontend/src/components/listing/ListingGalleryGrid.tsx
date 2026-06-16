import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListingSection } from './ListingSection'
import type { ListingGalleryItem } from './types'
import './listing-detail.css'

type Props = {
  images: ListingGalleryItem[]
  listingType: string
  listingId: string | number
  title?: string
  maxVisible?: number
  backTo?: string
  className?: string
  variant?: 'hero' | 'grid'
}

export function ListingGalleryGrid({
  images,
  listingType,
  listingId,
  title = 'Photos',
  maxVisible = 6,
  backTo,
  className = '',
  variant = 'grid',
}: Props) {
  const [active, setActive] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  if (images.length === 0) return null

  const visible = images.slice(0, maxVisible)
  const extra = images.length - visible.length
  const galleryPath = `/listing/${listingType}/${listingId}/gallery`
  const seeAll =
    images.length > 1 ? (
      <Link className="listing-section__link" to={galleryPath} state={{ title, images, backTo }}>
        See all
      </Link>
    ) : null

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))
    setActive(Math.min(idx, images.length - 1))
  }

  if (variant === 'hero') {
    return (
      <ListingSection bleed className={`listing-gallery listing-gallery--hero ${className}`.trim()}>
        <div className="listing-gallery__carousel" ref={trackRef} onScroll={onScroll}>
          {images.map((item, index) => (
            <div key={item.id ?? `${item.src}-${index}`} className="listing-gallery__slide">
              <img src={item.src} alt={item.alt ?? ''} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
            </div>
          ))}
        </div>
        {images.length > 1 ? (
          <>
            <Link
              className="listing-gallery__count"
              to={galleryPath}
              state={{ title, images, backTo }}
            >
              {active + 1}/{images.length}
            </Link>
            <div className="listing-gallery__dots" aria-hidden>
              {images.slice(0, Math.min(images.length, 8)).map((_, index) => (
                <span
                  key={index}
                  className={`listing-gallery__dot${index === active ? ' listing-gallery__dot--on' : ''}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </ListingSection>
    )
  }

  return (
    <ListingSection title={title} action={seeAll} className={`listing-gallery ${className}`.trim()}>
      <div className="listing-gallery__grid">
        {visible.map((item, index) => {
          const isLast = index === visible.length - 1
          const showOverlay = isLast && extra > 0

          return (
            <div key={item.id ?? `${item.src}-${index}`} className="listing-gallery__cell">
              <img src={item.src} alt={item.alt ?? ''} loading="lazy" decoding="async" />
              {showOverlay ? (
                <Link
                  className="listing-gallery__more"
                  to={galleryPath}
                  state={{ title, images, backTo }}
                  aria-label={`View all ${images.length} photos`}
                >
                  +{extra}
                </Link>
              ) : null}
            </div>
          )
        })}
      </div>
    </ListingSection>
  )
}
