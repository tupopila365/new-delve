import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { mediaUrl } from '../../../api/client'
import type { FoodVenueFormValues } from './foodVenueTypes'

type Props = {
  values: FoodVenueFormValues
  onChange: (partial: Partial<FoodVenueFormValues>) => void
}

function galleryLines(values: FoodVenueFormValues) {
  return values.gallery_urls
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function FoodVenuePhotoEditor({ values, onChange }: Props) {
  const coverRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [galleryPreviews, setGalleryPreviews] = useState<{ key: string; src: string; kind: 'url' | 'file'; index: number }[]>([])

  useEffect(() => {
    if (values.cover_image_file) {
      const url = URL.createObjectURL(values.cover_image_file)
      setCoverPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    const remote = values.cover_image_url.trim()
    setCoverPreview(remote ? mediaUrl(remote) ?? remote : null)
  }, [values.cover_image_file, values.cover_image_url])

  useEffect(() => {
    const existing = galleryLines(values).map((src, index) => ({
      key: `url-${index}-${src}`,
      src: mediaUrl(src) ?? src,
      kind: 'url' as const,
      index,
    }))
    const pending = values.gallery_files.map((file, index) => ({
      key: `file-${file.name}-${file.size}-${index}`,
      src: URL.createObjectURL(file),
      kind: 'file' as const,
      index,
    }))
    setGalleryPreviews([...existing, ...pending])
    return () => pending.forEach((item) => URL.revokeObjectURL(item.src))
  }, [values.gallery_urls, values.gallery_files])

  const removeGalleryUrl = (index: number) => {
    const lines = galleryLines(values)
    lines.splice(index, 1)
    onChange({ gallery_urls: lines.join('\n') })
  }

  const removeGalleryFile = (index: number) => {
    const next = values.gallery_files.filter((_, i) => i !== index)
    onChange({ gallery_files: next })
  }

  return (
    <div className="transport-form__section food-photo-editor">
      <div className="food-photo-editor__cover">
        <p className="food-photo-editor__label">Cover photo</p>
        <div className="food-photo-editor__cover-preview">
          {coverPreview ? (
            <img src={coverPreview} alt="" className="transport-form__preview" />
          ) : (
            <div className="food-photo-editor__placeholder">No cover yet</div>
          )}
        </div>
        <div className="food-photo-editor__actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => coverRef.current?.click()}>
            <ImagePlus size={15} strokeWidth={2.25} aria-hidden />
            {coverPreview ? 'Change cover' : 'Upload cover'}
          </button>
          {coverPreview ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange({ cover_image_file: null, cover_image_url: '' })}
            >
              Remove
            </button>
          ) : null}
        </div>
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          aria-label="Upload cover photo"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            onChange({ cover_image_file: file })
            e.target.value = ''
          }}
        />
        <p className="transport-form__hint">Shown on list cards, search, and the hero on your venue page.</p>
      </div>

      <div className="food-photo-editor__gallery">
        <p className="food-photo-editor__label">Gallery</p>
        <div className="food-photo-editor__grid">
          {galleryPreviews.map((item) => (
            <div key={item.key} className="food-photo-editor__thumb">
              <img src={item.src} alt="" />
              <button
                type="button"
                className="food-photo-editor__remove"
                aria-label="Remove photo"
                onClick={() => {
                  if (item.kind === 'url') removeGalleryUrl(item.index)
                  else removeGalleryFile(item.index)
                }}
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="food-photo-editor__add"
            onClick={() => galleryRef.current?.click()}
            aria-label="Add gallery photos"
          >
            <ImagePlus size={22} strokeWidth={2} aria-hidden />
            <span>Add photos</span>
          </button>
        </div>
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="visually-hidden"
          aria-label="Upload gallery photos"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? [])
            if (!picked.length) return
            onChange({ gallery_files: [...values.gallery_files, ...picked] })
            e.target.value = ''
          }}
        />
        <p className="transport-form__hint">Add interior, menu, and dish shots — up to 12 recommended.</p>
      </div>
    </div>
  )
}
