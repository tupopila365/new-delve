import { useRef, useState } from 'react'
import { ImagePlus, Play, Star, X } from 'lucide-react'
import { mediaUrl } from '../../../api/client'
import type { ListingPhotoDraft } from './types'
import { MAX_LISTING_PHOTOS } from './types'
import { ListingMediaStudioSheet } from './ListingMediaStudioSheet'
import { photoKind } from './listingPhotoUtils'
import './listing-photos.css'

type Props = {
  photos: ListingPhotoDraft[]
  onChange: (photos: ListingPhotoDraft[]) => void
  maxPhotos?: number
  /** Short line under the grid — keep minimal. */
  hint?: string
}

type StudioMode = { kind: 'add' } | { kind: 'edit'; index: number }

function displaySrc(src: string): string {
  return mediaUrl(src) ?? src
}

function tilePreview(photo: ListingPhotoDraft): string {
  if (photoKind(photo) === 'video' && photo.posterSrc) {
    return displaySrc(photo.posterSrc)
  }
  return displaySrc(photo.src)
}

export function ListingPhotoManager({ photos, onChange, maxPhotos = MAX_LISTING_PHOTOS, hint }: Props) {
  const addRef = useRef<HTMLInputElement>(null)
  const [studio, setStudio] = useState<StudioMode | null>(null)

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index))
  }

  function setAsCover(index: number) {
    if (index <= 0) return
    const item = photos[index]
    if (photoKind(item) === 'video') return
    const next = [...photos]
    const [picked] = next.splice(index, 1)
    next.unshift(picked)
    onChange(next)
  }

  function saveFromStudio(draft: ListingPhotoDraft) {
    if (!studio) return
    if (studio.kind === 'add') {
      onChange([...photos, draft])
      return
    }
    const existing = photos[studio.index]
    const next = photos.map((p, i) =>
      i === studio.index
        ? {
            ...draft,
            id: existing.id,
            file: draft.file ?? existing.file ?? null,
          }
        : p,
    )
    onChange(next)
  }

  function onQuickPick(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (file.type.startsWith('video/') && photos.length === 0) return
    const kind = file.type.startsWith('video/') ? 'video' : 'image'
    const url = URL.createObjectURL(file)
    onChange([
      ...photos,
      { id: `photo-${Date.now()}`, src: url, kind, file },
    ])
  }

  const atMax = photos.length >= maxPhotos
  const editing = studio?.kind === 'edit' ? photos[studio.index] : null
  const studioSlot = photos.length === 0 && studio?.kind === 'add' ? 'cover' : 'gallery'
  const quickAccept =
    photos.length === 0
      ? 'image/*'
      : 'image/*,video/mp4,video/webm,video/quicktime'

  return (
    <section className="listing-photos" aria-label="Photos">
      <div className="listing-photos__grid">
        {photos.map((photo, index) => {
          const kind = photoKind(photo)
          const isVideo = kind === 'video'
          return (
            <div key={photo.id} className={`listing-photos__tile${isVideo ? ' listing-photos__tile--video' : ''}`}>
              <button
                type="button"
                className="listing-photos__tile-btn"
                onClick={() => setStudio({ kind: 'edit', index })}
                aria-label={
                  index === 0
                    ? 'Edit cover photo'
                    : isVideo
                      ? `Edit video ${index + 1}`
                      : `Edit photo ${index + 1}`
                }
              >
                <img src={tilePreview(photo)} alt="" />
                {isVideo ? (
                  <span className="listing-photos__play" aria-hidden>
                    <Play size={14} strokeWidth={2.5} fill="currentColor" />
                  </span>
                ) : null}
                {index === 0 ? <span className="listing-photos__badge">Cover</span> : null}
                {isVideo ? <span className="listing-photos__badge listing-photos__badge--video">Video</span> : null}
              </button>
              <div className="listing-photos__tile-actions">
                {index > 0 && !isVideo ? (
                  <button
                    type="button"
                    className="listing-photos__icon-btn"
                    aria-label="Set as cover"
                    onClick={() => setAsCover(index)}
                  >
                    <Star size={13} strokeWidth={2.25} aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="listing-photos__icon-btn listing-photos__icon-btn--danger"
                  aria-label={isVideo ? 'Remove video' : 'Remove photo'}
                  onClick={() => removeAt(index)}
                >
                  <X size={13} strokeWidth={2.5} aria-hidden />
                </button>
              </div>
            </div>
          )
        })}

        {!atMax ? (
          <>
            <button
              type="button"
              className="listing-photos__add"
              onClick={() => setStudio({ kind: 'add' })}
              aria-label="Add media with editor"
            >
              <ImagePlus size={22} strokeWidth={2} aria-hidden />
              <span>Add</span>
            </button>
            <button
              type="button"
              className="listing-photos__add listing-photos__add--quick visually-hidden-focusable"
              onClick={() => addRef.current?.click()}
              aria-label="Quick add media"
            />
            <input
              ref={addRef}
              type="file"
              accept={quickAccept}
              className="visually-hidden"
              onChange={(e) => {
                onQuickPick(e.target.files)
                e.target.value = ''
              }}
            />
          </>
        ) : null}
      </div>

      {hint ? <p className="listing-photos__hint">{hint}</p> : null}
      {photos.length === 0 ? (
        <p className="listing-photos__empty">Add a cover photo first, then photos or short videos for the gallery.</p>
      ) : null}

      <ListingMediaStudioSheet
        key={studio?.kind === 'edit' ? `edit-${studio.index}` : studio ? 'add' : 'closed'}
        open={studio !== null}
        slot={studio?.kind === 'edit' && editing && studio.index === 0 ? 'cover' : studioSlot}
        title={
          studio?.kind === 'edit'
            ? photoKind(editing ?? { id: '', src: '' }) === 'video'
              ? 'Edit video'
              : 'Edit photo'
            : studioSlot === 'cover'
              ? 'Add cover photo'
              : 'Add to gallery'
        }
        submitLabel={studio?.kind === 'edit' ? 'Save' : studioSlot === 'cover' ? 'Add cover' : 'Add'}
        initial={editing}
        onClose={() => setStudio(null)}
        onSave={saveFromStudio}
      />
    </section>
  )
}
