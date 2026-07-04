import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { mediaUrl } from '../../../api/client'
import type { GuideProfileFormValues } from './guideProfileTypes'
import '../transport/transport-listing.css'

type Props = {
  values: GuideProfileFormValues
  onChange: (partial: Partial<GuideProfileFormValues>) => void
}

export function GuidePhotoEditor({ values, onChange }: Props) {
  const photoRef = useRef<HTMLInputElement>(null)
  const portfolioRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [portfolioPreviews, setPortfolioPreviews] = useState<
    { key: string; src: string; kind: 'url' | 'file'; index: number }[]
  >([])

  useEffect(() => {
    if (values.photo_file) {
      const url = URL.createObjectURL(values.photo_file)
      setPhotoPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    const remote = values.photo_url.trim()
    setPhotoPreview(remote ? mediaUrl(remote) ?? remote : null)
  }, [values.photo_file, values.photo_url])

  useEffect(() => {
    const existing = values.portfolio
      .filter((p) => p.src.trim())
      .map((p, index) => ({
        key: `url-${index}-${p.src}`,
        src: mediaUrl(p.src) ?? p.src,
        kind: 'url' as const,
        index,
      }))
    const pending = values.portfolio_files.map((file, index) => ({
      key: `file-${file.name}-${file.size}-${index}`,
      src: URL.createObjectURL(file),
      kind: 'file' as const,
      index,
    }))
    setPortfolioPreviews([...existing, ...pending])
    return () => pending.forEach((item) => URL.revokeObjectURL(item.src))
  }, [values.portfolio, values.portfolio_files])

  return (
    <div className="food-photo-editor">
      <div className="food-photo-editor__cover">
        <p className="food-photo-editor__label">Profile photo</p>
        <div className="food-photo-editor__cover-preview">
          {photoPreview ? (
            <img src={photoPreview} alt="" className="transport-form__preview" />
          ) : (
            <div className="food-photo-editor__placeholder">No photo yet</div>
          )}
        </div>
        <div className="food-photo-editor__actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => photoRef.current?.click()}>
            <ImagePlus size={15} strokeWidth={2.25} aria-hidden />
            {photoPreview ? 'Change photo' : 'Upload photo'}
          </button>
          {photoPreview ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange({ photo_file: null, photo_url: '' })}
            >
              Remove
            </button>
          ) : null}
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          aria-label="Upload profile photo"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            onChange({ photo_file: file })
            e.target.value = ''
          }}
        />
        <p className="guide-form__hint">Shown on list cards, search, and your public guide page.</p>
      </div>

      <div className="food-photo-editor__gallery">
        <p className="food-photo-editor__label">Portfolio</p>
        <div className="food-photo-editor__grid">
          {portfolioPreviews.map((item) => (
            <div key={item.key} className="food-photo-editor__thumb">
              <img src={item.src} alt="" />
              <button
                type="button"
                className="food-photo-editor__remove"
                aria-label="Remove photo"
                onClick={() => {
                  if (item.kind === 'url') {
                    onChange({ portfolio: values.portfolio.filter((_, i) => i !== item.index) })
                  } else {
                    onChange({ portfolio_files: values.portfolio_files.filter((_, i) => i !== item.index) })
                  }
                }}
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="food-photo-editor__add"
            onClick={() => portfolioRef.current?.click()}
            aria-label="Add portfolio photos"
          >
            <ImagePlus size={22} strokeWidth={2} aria-hidden />
            <span>Add photos</span>
          </button>
        </div>
        <input
          ref={portfolioRef}
          type="file"
          accept="image/*"
          multiple
          className="visually-hidden"
          aria-label="Upload portfolio photos"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? [])
            if (!picked.length) return
            onChange({ portfolio_files: [...values.portfolio_files, ...picked] })
            e.target.value = ''
          }}
        />
        <p className="guide-form__hint">Trail and experience shots for your gallery and story rings.</p>
      </div>
    </div>
  )
}
