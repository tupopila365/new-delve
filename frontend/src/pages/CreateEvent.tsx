import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

const CATEGORIES = [
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'sports', label: 'Sports', emoji: '🏆' },
  { value: 'culture', label: 'Culture', emoji: '🎭' },
  { value: 'business', label: 'Business', emoji: '💼' },
  { value: 'food', label: 'Food & drink', emoji: '🍽' },
  { value: 'other', label: 'Other', emoji: '✨' },
]

type CreatedEvent = { id: number }

export function CreateEvent() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [isFree, setIsFree] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  function onCoverChange(file: File | null) {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : null)
  }

  const canSubmit = title.trim().length > 0 && startsAt.length > 0

  const mut = useMutation({
    mutationFn: async () => {
      if (!canSubmit) throw new Error('Title and start date are required.')
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('description', description.trim())
      fd.append('category', category)
      fd.append('starts_at', new Date(startsAt).toISOString())
      if (endsAt) fd.append('ends_at', new Date(endsAt).toISOString())
      fd.append('venue', venue.trim())
      fd.append('city', city.trim())
      fd.append('region', region.trim())
      fd.append('is_published', 'true')
      if (coverFile) fd.append('cover_image', coverFile)
      return apiFetch<CreatedEvent>('/api/events/', { method: 'POST', body: fd })
    },
    onSuccess: async (data) => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      await qc.invalidateQueries({ queryKey: ['events'] })
      navigate(`/events/${data.id}`)
    },
    onError: (e) => {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed to create event.')
    },
  })

  if (!profile) {
    return (
      <div className="ce-page">
        <h1 className="display ce-page__title">Create an event</h1>
        <p className="page-sub">
          You need to <Link to="/login">sign in</Link> to create events.
        </p>
      </div>
    )
  }

  return (
    <div className="ce-page">
      <div className="ce-page__bar">
        <button type="button" className="up__back" onClick={() => navigate(-1)} aria-label="Go back">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="ce-page__title">Create event</h1>
      </div>

      <form
        className="ce-form"
        onSubmit={(e) => {
          e.preventDefault()
          setErr(null)
          mut.mutate()
        }}
        noValidate
      >
        {/* Cover image */}
        <div className="ce-form__cover-wrap">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            aria-label="Cover image"
            onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)}
          />
          {coverPreview ? (
            <div className="ce-form__cover-preview">
              <img src={coverPreview} alt="Cover preview" />
              <button
                type="button"
                className="ce-form__cover-remove"
                aria-label="Remove cover image"
                onClick={() => { onCoverChange(null); if (fileRef.current) fileRef.current.value = '' }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="ce-form__cover-btn"
              onClick={() => fileRef.current?.click()}
              aria-label="Add cover image"
            >
              <span className="ce-form__cover-icon" aria-hidden>🖼️</span>
              <span>Add cover photo</span>
              <span className="ce-form__cover-hint">JPG, PNG — optional</span>
            </button>
          )}
        </div>

        {/* Title */}
        <div className="ce-form__field">
          <label className="ce-form__label" htmlFor="ce-title">
            Event title <span aria-hidden>*</span>
          </label>
          <input
            id="ce-title"
            type="text"
            className="input ce-form__input"
            placeholder="e.g. Live Jazz Night at The Venue"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            autoComplete="off"
          />
        </div>

        {/* Category */}
        <div className="ce-form__field">
          <label className="ce-form__label" htmlFor="ce-category">
            Category
          </label>
          <div className="ce-form__chips" role="group" aria-label="Event category">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`ce-form__chip${category === c.value ? ' ce-form__chip--active' : ''}`}
                onClick={() => setCategory(c.value)}
                aria-pressed={category === c.value}
              >
                <span aria-hidden>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date/time */}
        <div className="ce-form__row">
          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="ce-starts">
              Start date &amp; time <span aria-hidden>*</span>
            </label>
            <input
              id="ce-starts"
              type="datetime-local"
              className="input ce-form__input"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="ce-ends">
              End date &amp; time <span className="ce-form__label-opt">(optional)</span>
            </label>
            <input
              id="ce-ends"
              type="datetime-local"
              className="input ce-form__input"
              value={endsAt}
              min={startsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        {/* Venue */}
        <div className="ce-form__field">
          <label className="ce-form__label" htmlFor="ce-venue">
            Venue
          </label>
          <input
            id="ce-venue"
            type="text"
            className="input ce-form__input"
            placeholder="e.g. The Warehouse, Windhoek"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            maxLength={200}
          />
        </div>

        {/* City + Region */}
        <div className="ce-form__row">
          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="ce-city">
              City
            </label>
            <input
              id="ce-city"
              type="text"
              className="input ce-form__input"
              placeholder="e.g. Windhoek"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="ce-region">
              Region
            </label>
            <input
              id="ce-region"
              type="text"
              className="input ce-form__input"
              placeholder="e.g. Khomas"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div className="ce-form__field">
          <label className="ce-form__label" htmlFor="ce-desc">
            Description <span className="ce-form__label-opt">(optional)</span>
          </label>
          <textarea
            id="ce-desc"
            className="input ce-form__textarea"
            placeholder="Tell people what to expect — lineup, dress code, parking, etc."
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Free entry toggle */}
        <label className="ce-form__toggle">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
          />
          <span className="ce-form__toggle-box" aria-hidden />
          <span className="ce-form__toggle-label">Free entry</span>
        </label>

        {/* Error */}
        {err && (
          <p className="ce-form__err" role="alert">
            {err}
          </p>
        )}

        {/* Actions */}
        <div className="ce-form__actions">
          <button
            type="submit"
            className="btn btn-primary ce-form__submit"
            disabled={!canSubmit || mut.isPending}
          >
            {mut.isPending ? 'Publishing…' : 'Publish event'}
          </button>
          <Link to="/events" className="btn btn-ghost ce-form__cancel">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
