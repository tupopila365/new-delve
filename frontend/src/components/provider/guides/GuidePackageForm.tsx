import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { mediaUrl } from '../../../api/client'
import {
  EMPTY_GUIDE_PACKAGE_FORM,
  slugifyPackageId,
  type GuidePackageFormValues,
} from './guideProfileTypes'
import '../transport/transport-listing.css'

type Props = {
  values: GuidePackageFormValues
  onChange: (values: GuidePackageFormValues) => void
  error?: string
  saving?: boolean
  onSubmit: () => void
  onCancel: () => void
  isEdit?: boolean
}

const SECTIONS = [
  { id: 'experience', label: 'Experience' },
  { id: 'pricing', label: 'Duration & price' },
  { id: 'photos', label: 'Photos' },
] as const

export function GuidePackageForm({ values, onChange, error, saving, onSubmit, onCancel, isEdit }: Props) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('experience')

  function patch(partial: Partial<GuidePackageFormValues>) {
    const next = { ...values, ...partial }
    if (!isEdit && partial.title && !values.id) {
      next.id = slugifyPackageId(partial.title)
    }
    onChange(next)
  }

  const coverRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [galleryPreviews, setGalleryPreviews] = useState<
    { key: string; src: string; kind: 'url' | 'file'; index: number }[]
  >([])

  useEffect(() => {
    if (values.photo_file) {
      const url = URL.createObjectURL(values.photo_file)
      setCoverPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    const remote = values.photo_url.trim()
    setCoverPreview(remote ? mediaUrl(remote) ?? remote : null)
  }, [values.photo_file, values.photo_url])

  useEffect(() => {
    const existing = values.gallery_urls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((src, index) => ({
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

  const canSave =
    values.title.trim() &&
    values.description.trim() &&
    values.hours > 0 &&
    values.price.trim() &&
    values.id.trim() &&
    (Boolean(values.photo_url.trim()) || Boolean(values.photo_file))

  return (
    <div className="guide-form" role="dialog" aria-modal="true" aria-labelledby="guide-package-form-title">
      <button type="button" className="guide-form__backdrop" aria-label="Close" onClick={onCancel} />
      <div className="guide-form__panel">
        <header className="guide-form__head">
          <h2 id="guide-package-form-title">{isEdit ? 'Edit tour package' : 'Create tour package'}</h2>
          <p>
            Packages appear on your guide page and have their own detail page with photos, duration, price, and
            reviews.
          </p>
        </header>

        <nav className="guide-form__nav" aria-label="Package sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`guide-form__nav-btn${section === s.id ? ' guide-form__nav-btn--active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {error ? <p className="guide-form__error">{error}</p> : null}

        <div className="guide-form__body">
          {section === 'experience' && (
            <div className="guide-form__section">
              <label className="guide-form__field">
                Package title
                <input
                  value={values.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="e.g. Dunes & deadvlei half-day"
                  maxLength={120}
                />
              </label>
              <label className="guide-form__field">
                URL slug
                <input
                  value={values.id}
                  onChange={(e) => patch({ id: e.target.value })}
                  placeholder="dunes-half"
                  disabled={isEdit}
                />
                <span className="guide-form__hint">
                  Used in the public URL: /guides/your-id/packages/{values.id || 'slug'}
                </span>
              </label>
              <label className="guide-form__field">
                Description
                <textarea
                  rows={6}
                  value={values.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="What travellers will do, pace, inclusions, and what to bring."
                  maxLength={2000}
                />
              </label>
            </div>
          )}

          {section === 'pricing' && (
            <div className="guide-form__section">
              <div className="guide-form__row">
                <label className="guide-form__field">
                  Duration (hours)
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={values.hours}
                    onChange={(e) => patch({ hours: Number(e.target.value) })}
                  />
                </label>
                <label className="guide-form__field">
                  Price per person (N$)
                  <input
                    value={values.price}
                    onChange={(e) => patch({ price: e.target.value })}
                    placeholder="1800"
                  />
                </label>
              </div>
            </div>
          )}

          {section === 'photos' && (
            <div className="guide-form__section food-photo-editor">
              <p className="guide-form__hint">
                A cover photo is required. Gallery photos appear on the package detail page and story rings.
              </p>
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
                      onClick={() => patch({ photo_file: null, photo_url: '' })}
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
                  aria-label="Upload package cover"
                  onChange={(e) => {
                    patch({ photo_file: e.target.files?.[0] ?? null })
                    e.target.value = ''
                  }}
                />
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
                          if (item.kind === 'url') {
                            const lines = values.gallery_urls
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                            lines.splice(item.index, 1)
                            patch({ gallery_urls: lines.join('\n') })
                          } else {
                            patch({
                              gallery_files: values.gallery_files.filter((_, i) => i !== item.index),
                            })
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
                  aria-label="Upload package gallery"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? [])
                    if (!picked.length) return
                    patch({ gallery_files: [...values.gallery_files, ...picked] })
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <footer className="guide-form__foot">
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--primary"
            disabled={!canSave || saving}
            onClick={onSubmit}
          >
            {saving ? 'Saving…' : 'Save package'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export { EMPTY_GUIDE_PACKAGE_FORM }
