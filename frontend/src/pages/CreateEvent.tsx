import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { MediaCoverEditor } from '../components/create'
import { EventCategoryPicker } from '../components/events/EventCategoryPicker'
import { EmptyState } from '../components/ui'

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
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)

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
      if (isFree) fd.append('is_free', 'true')
      if (coverFile) fd.append('cover_image', coverFile)
      return apiFetch<CreatedEvent>('/api/events/', { method: 'POST', body: fd })
    },
    onSuccess: async (data) => {
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
        <EmptyState
          icon="🎟️"
          title="Sign in to create an event"
          sub="List markets, music nights, meetups, and gatherings for travellers and locals."
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </div>
    )
  }

  return (
    <div className="ce-page">
      <form
        className="ce-form"
        onSubmit={(e) => {
          e.preventDefault()
          setErr(null)
          mut.mutate()
        }}
        noValidate
      >
        <section className="ce-form__section" aria-labelledby="ce-cover-title">
          <h2 id="ce-cover-title" className="ce-form__section-title">
            Cover
          </h2>
          <MediaCoverEditor
            label="Event cover photo or video"
            value={coverPreview}
            onChange={setCoverPreview}
            onFileReady={setCoverFile}
            defaultAspect="16:9"
          />
        </section>

        <section className="ce-form__section" aria-labelledby="ce-basics-title">
          <h2 id="ce-basics-title" className="ce-form__section-title">
            Basics
          </h2>

          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="ce-title">
              Event title <span aria-hidden>*</span>
            </label>
            <input
              id="ce-title"
              type="text"
              className="input ce-form__input"
              placeholder="Live jazz night, food market, beach cleanup…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              autoComplete="off"
            />
          </div>

          <EventCategoryPicker value={category} onChange={setCategory} />
        </section>

        <section className="ce-form__section" aria-labelledby="ce-when-title">
          <h2 id="ce-when-title" className="ce-form__section-title">
            When
          </h2>

          <div className="ce-form__row">
            <div className="ce-form__field">
              <label className="ce-form__label" htmlFor="ce-starts">
                Start <span aria-hidden>*</span>
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
                End <span className="ce-form__label-opt">optional</span>
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
        </section>

        <section className="ce-form__section" aria-labelledby="ce-where-title">
          <h2 id="ce-where-title" className="ce-form__section-title">
            Where
          </h2>

          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="ce-venue">
              Venue
            </label>
            <input
              id="ce-venue"
              type="text"
              className="input ce-form__input"
              placeholder="The Warehouse, community hall, beach…"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="ce-form__row">
            <div className="ce-form__field">
              <label className="ce-form__label" htmlFor="ce-city">
                City
              </label>
              <input
                id="ce-city"
                type="text"
                className="input ce-form__input"
                placeholder="Windhoek"
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
                placeholder="Khomas"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ce-form__section" aria-labelledby="ce-about-title">
          <h2 id="ce-about-title" className="ce-form__section-title">
            About
          </h2>

          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="ce-desc">
              Description <span className="ce-form__label-opt">optional</span>
            </label>
            <textarea
              id="ce-desc"
              className="input ce-form__textarea"
              placeholder="What should people expect? Dress code, lineup, tickets at door…"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <label className="ce-form__toggle">
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
            <span className="ce-form__toggle-box" aria-hidden />
            <span className="ce-form__toggle-label">Free entry</span>
          </label>
        </section>

        {err ? (
          <p className="ce-form__err" role="alert">
            {err}
          </p>
        ) : null}

        <div className="ce-form__actions">
          <button type="submit" className="btn btn-primary ce-form__submit" disabled={!canSubmit || mut.isPending}>
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
