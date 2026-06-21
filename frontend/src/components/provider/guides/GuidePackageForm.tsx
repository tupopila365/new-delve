import { useState } from 'react'
import {
  EMPTY_GUIDE_PACKAGE_FORM,
  slugifyPackageId,
  type GuidePackageFormValues,
} from './guideProfileTypes'

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

  const canSave =
    values.title.trim() &&
    values.description.trim() &&
    values.hours > 0 &&
    values.price.trim() &&
    values.id.trim()

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
            <div className="guide-form__section">
              <label className="guide-form__field">
                Cover photo URL
                <input
                  value={values.photo_url}
                  onChange={(e) => patch({ photo_url: e.target.value })}
                  placeholder="https://…"
                />
              </label>
              {values.photo_url ? <img src={values.photo_url} alt="" className="guide-form__preview" /> : null}
              <label className="guide-form__field">
                Gallery photo URLs
                <textarea
                  rows={4}
                  value={values.gallery_urls}
                  onChange={(e) => patch({ gallery_urls: e.target.value })}
                  placeholder="One image URL per line"
                />
              </label>
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
