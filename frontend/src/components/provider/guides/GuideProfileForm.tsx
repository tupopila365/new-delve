import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  EMPTY_GUIDE_PROFILE_FORM,
  SPECIALITY_OPTIONS,
  type GuideProfileFormValues,
  type LanguageDetailForm,
} from './guideProfileTypes'
import { GuidePhotoEditor } from './GuidePhotoEditor'
import { GuideStoriesEditor } from './GuideStoriesEditor'

type Props = {
  values: GuideProfileFormValues
  onChange: (values: GuideProfileFormValues) => void
  error?: string
  saving?: boolean
  onSubmit: () => void
  onCancel: () => void
  isEdit?: boolean
}

const SECTIONS = [
  { id: 'identity', label: 'Public identity' },
  { id: 'expertise', label: 'Expertise' },
  { id: 'credentials', label: 'Trust & credentials' },
  { id: 'pricing', label: 'Pricing & meeting' },
  { id: 'photos', label: 'Photos' },
  { id: 'stories', label: 'Stories' },
] as const

function emptyLang(): LanguageDetailForm {
  return { language: '', level: 'Fluent' }
}

export function GuideProfileForm({ values, onChange, error, saving, onSubmit, onCancel, isEdit }: Props) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('identity')

  function patch(partial: Partial<GuideProfileFormValues>) {
    onChange({ ...values, ...partial })
  }

  function toggleSpeciality(name: string) {
    const specialities = values.specialities.includes(name)
      ? values.specialities.filter((s) => s !== name)
      : [...values.specialities, name]
    patch({ specialities })
  }

  const canSave =
    values.headline.trim() &&
    values.bio.trim() &&
    values.regions.trim() &&
    values.languages.trim() &&
    values.hourly_rate.trim()

  return (
    <div className="guide-form" role="dialog" aria-modal="true" aria-labelledby="guide-profile-form-title">
      <button type="button" className="guide-form__backdrop" aria-label="Close" onClick={onCancel} />
      <div className="guide-form__panel">
        <header className="guide-form__head">
          <h2 id="guide-profile-form-title">{isEdit ? 'Edit guide profile' : 'Create guide profile'}</h2>
          <p>
            This is what travellers see on your public guide page — headline, credentials, meeting point, and
            portfolio.
          </p>
        </header>

        <nav className="guide-form__nav" aria-label="Profile sections">
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
          {section === 'identity' && (
            <div className="guide-form__section">
              <label className="guide-form__field">
                Headline
                <input
                  value={values.headline}
                  onChange={(e) => patch({ headline: e.target.value })}
                  placeholder="e.g. Sossusvlei & Namib desert"
                  maxLength={120}
                />
                <span className="guide-form__hint">Shown as the main title on your guide page.</span>
              </label>
              <label className="guide-form__field">
                Bio
                <textarea
                  rows={5}
                  value={values.bio}
                  onChange={(e) => patch({ bio: e.target.value })}
                  placeholder="Tell travellers about your experience, style, and what makes your tours special."
                  maxLength={2000}
                />
              </label>
              <label className="guide-form__check">
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(e) => patch({ is_active: e.target.checked })}
                />
                Profile visible to travellers
              </label>
            </div>
          )}

          {section === 'expertise' && (
            <div className="guide-form__section">
              <p className="guide-form__hint">Specialities appear as category chips and “Why book” highlights.</p>
              <div className="guide-form__chips">
                {SPECIALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`guide-form__chip${values.specialities.includes(opt) ? ' guide-form__chip--on' : ''}`}
                    onClick={() => toggleSpeciality(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <label className="guide-form__field">
                Regions served
                <input
                  value={values.regions}
                  onChange={(e) => patch({ regions: e.target.value })}
                  placeholder="Khomas, Erongo, Hardap"
                />
                <span className="guide-form__hint">Comma-separated — shown in location and map sections.</span>
              </label>
              <label className="guide-form__field">
                Languages spoken
                <input
                  value={values.languages}
                  onChange={(e) => patch({ languages: e.target.value })}
                  placeholder="English, Afrikaans, German"
                />
                <span className="guide-form__hint">Comma-separated — shown in quick info chips.</span>
              </label>
            </div>
          )}

          {section === 'credentials' && (
            <div className="guide-form__section">
              <div className="guide-form__row">
                <label className="guide-form__field">
                  Years guiding
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={values.years_guiding}
                    onChange={(e) => patch({ years_guiding: Number(e.target.value) })}
                  />
                </label>
                <label className="guide-form__field">
                  Typical response (hours)
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={values.response_hours_typical}
                    onChange={(e) => patch({ response_hours_typical: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label className="guide-form__check">
                <input
                  type="checkbox"
                  checked={values.licensed_guide}
                  onChange={(e) => patch({ licensed_guide: e.target.checked })}
                />
                Licensed guide
              </label>
              <label className="guide-form__field">
                Certifications
                <textarea
                  rows={3}
                  value={values.certifications}
                  onChange={(e) => patch({ certifications: e.target.value })}
                  placeholder="First aid certified&#10;4×4 recovery training"
                />
                <span className="guide-form__hint">One per line — shown in the credentials card.</span>
              </label>
              <p className="guide-form__label">Language levels</p>
              {values.languages_detail.map((row, i) => (
                <div key={i} className="guide-form__subcard">
                  <div className="guide-form__subcard-head">
                    <strong>Language {i + 1}</strong>
                    <button
                      type="button"
                      className="guide-form__icon-btn"
                      aria-label="Remove language"
                      onClick={() =>
                        patch({
                          languages_detail: values.languages_detail.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="guide-form__row">
                    <label className="guide-form__field">
                      Language
                      <input
                        value={row.language}
                        onChange={(e) => {
                          const languages_detail = [...values.languages_detail]
                          languages_detail[i] = { ...row, language: e.target.value }
                          patch({ languages_detail })
                        }}
                      />
                    </label>
                    <label className="guide-form__field">
                      Level
                      <input
                        value={row.level}
                        onChange={(e) => {
                          const languages_detail = [...values.languages_detail]
                          languages_detail[i] = { ...row, level: e.target.value }
                          patch({ languages_detail })
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="guide-form__add"
                onClick={() => patch({ languages_detail: [...values.languages_detail, emptyLang()] })}
              >
                <Plus size={14} /> Add language
              </button>
            </div>
          )}

          {section === 'pricing' && (
            <div className="guide-form__section">
              <label className="guide-form__field">
                Hourly rate (N$)
                <input
                  value={values.hourly_rate}
                  onChange={(e) => patch({ hourly_rate: e.target.value })}
                  placeholder="450"
                />
                <span className="guide-form__hint">Used for custom tours and sidebar pricing on your guide page.</span>
              </label>
              <label className="guide-form__field">
                Default meeting point
                <textarea
                  rows={3}
                  value={values.default_meeting_point}
                  onChange={(e) => patch({ default_meeting_point: e.target.value })}
                  placeholder="Sesriem gate visitor parking — look for the silver Land Cruiser."
                />
                <span className="guide-form__hint">Shown on guide and package pages in the location section.</span>
              </label>
            </div>
          )}

          {section === 'photos' && (
            <div className="guide-form__section">
              <GuidePhotoEditor values={values} onChange={patch} />
            </div>
          )}

          {section === 'stories' && (
            <div className="guide-form__section">
              <GuideStoriesEditor
                channels={values.guide_stories}
                onChange={(guide_stories) => patch({ guide_stories })}
              />
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
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export { EMPTY_GUIDE_PROFILE_FORM }
