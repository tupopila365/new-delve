import { useEffect, useState } from 'react'
import { mediaUrl } from '../../api/client'
import type { VenuePhoto } from '../../data/foodVenueSocial'
import { photoCategoryLabel } from '../../data/foodVenueSocial'

type FoodVenueGalleryProps = {
  photos: VenuePhoto[]
  venueName: string
  openLabel?: string | null
}

function photoSrc(image: string): string {
  return mediaUrl(image) || image
}

export function FoodVenueGallery({ photos, venueName, openLabel }: FoodVenueGalleryProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  const main = photos[0]
  const side = photos.slice(1, 5)
  const hasMore = photos.length > 5

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
      if (e.key === 'ArrowRight') setActiveIdx((i) => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setActiveIdx((i) => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, photos.length])

  const openModal = (idx: number) => {
    setActiveIdx(idx)
    setModalOpen(true)
  }

  if (!main) return null

  return (
    <>
      <div className="fd-detail__gallery">
        <button
          type="button"
          className="fd-detail__gallery-main"
          onClick={() => openModal(0)}
          aria-label={`View photo 1 of ${photos.length} for ${venueName}`}
        >
          <img src={photoSrc(main.image)} alt={main.caption || venueName} />
          {main.caption ? <span className="fd-detail__gallery-cap">{photoCategoryLabel(main.category)}</span> : null}
        </button>

        {side.length > 0 ? (
          <div className="fd-detail__gallery-side">
            {side.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                className="fd-detail__gallery-thumb"
                onClick={() => openModal(i + 1)}
                aria-label={`View ${photoCategoryLabel(photo.category)} photo`}
              >
                <img src={photoSrc(photo.image)} alt={photo.caption || venueName} />
              </button>
            ))}
            {(hasMore || photos.length > side.length + 1) && (
              <button
                type="button"
                className="fd-detail__view-photos"
                onClick={() => openModal(0)}
              >
                View all photos
                <span>{photos.length}</span>
              </button>
            )}
          </div>
        ) : null}

        {photos.map((photo, i) => (
          <button
            key={`mobile-${photo.id}`}
            type="button"
            className="fd-detail__gallery-slide"
            onClick={() => openModal(i)}
            aria-hidden={i > 0 ? undefined : undefined}
          >
            <img src={photoSrc(photo.image)} alt={photo.caption || venueName} />
          </button>
        ))}

        {openLabel ? (
          <div className="fd-detail__gallery-status">
            <span>{openLabel}</span>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div
          className="fd-detail__photo-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Photos of ${venueName}`}
          onClick={() => setModalOpen(false)}
        >
          <div className="fd-detail__photo-modal-inner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="fd-detail__photo-modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Close gallery"
            >
              ×
            </button>
            <img
              className="fd-detail__photo-modal-img"
              src={photoSrc(photos[activeIdx].image)}
              alt={photos[activeIdx].caption || venueName}
            />
            <div className="fd-detail__photo-modal-meta">
              <span className="fd-detail__photo-modal-cat">
                {photoCategoryLabel(photos[activeIdx].category)}
              </span>
              {photos[activeIdx].caption ? (
                <span className="fd-detail__photo-modal-cap">{photos[activeIdx].caption}</span>
              ) : null}
              <span className="fd-detail__photo-modal-count">
                {activeIdx + 1} / {photos.length}
              </span>
            </div>
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  className="fd-detail__photo-modal-nav fd-detail__photo-modal-nav--prev"
                  aria-label="Previous photo"
                  onClick={() => setActiveIdx((i) => (i - 1 + photos.length) % photos.length)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="fd-detail__photo-modal-nav fd-detail__photo-modal-nav--next"
                  aria-label="Next photo"
                  onClick={() => setActiveIdx((i) => (i + 1) % photos.length)}
                >
                  ›
                </button>
              </>
            ) : null}
            <div className="fd-detail__photo-modal-thumbs">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={`fd-detail__photo-modal-thumb${i === activeIdx ? ' fd-detail__photo-modal-thumb--active' : ''}`}
                  onClick={() => setActiveIdx(i)}
                  aria-label={`Photo ${i + 1}`}
                >
                  <img src={photoSrc(p.image)} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
