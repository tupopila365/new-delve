import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, LocateFixed } from 'lucide-react'
import { apiFetch, ApiError, formatApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ListingPhotoManager, type ListingPhotoDraft } from '../components/listing/photos'
import { resolveListingGalleryMedia, serializeGalleryForApi } from '../components/listing/photos/listingPhotoUtils'
import { QUINTOS_CATEGORIES, categoryLabel, type TossLocation } from '../utils/coinToss'
import '../components/coin-toss/coin-toss.css'

const ACCURACY_MAX_M = 150

type GeoFix = {
  latitude: number
  longitude: number
  accuracy: number
} | null

type AddResult = {
  detail?: string
  merged?: boolean
} & Partial<TossLocation>

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function AddGem() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const listId = useId()

  const [geo, setGeo] = useState<GeoFix>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('hidden')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<ListingPhotoDraft[]>([])
  const [matched, setMatched] = useState<TossLocation | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<AddResult | null>(null)

  const debouncedName = useDebouncedValue(name.trim(), 280)

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/login?next=/coin-toss/add', { replace: true })
    }
  }, [loading, profile, navigate])

  const requestGeo = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setGeoLoading(false)
      },
      (err) => {
        setGeoError(err.message || 'Could not read your location.')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }, [])

  useEffect(() => {
    requestGeo()
  }, [requestGeo])

  const accurateEnough = geo != null && geo.accuracy <= ACCURACY_MAX_M

  const { data: nameMatches = [], isFetching: searchingNames } = useQuery({
    queryKey: [
      'coin-toss-name-search',
      debouncedName,
      geo?.latitude ?? null,
      geo?.longitude ?? null,
    ],
    enabled: debouncedName.length >= 2 && !matched,
    queryFn: async () => {
      const params = new URLSearchParams({ q: debouncedName })
      if (geo) {
        params.set('latitude', String(geo.latitude))
        params.set('longitude', String(geo.longitude))
      }
      return apiFetch<TossLocation[]>(`/api/coin-toss/locations/?${params}`)
    },
    staleTime: 15_000,
  })

  useEffect(() => {
    if (matched) {
      setSuggestOpen(false)
      return
    }
    setSuggestOpen(debouncedName.length >= 2 && nameMatches.length > 0)
  }, [debouncedName, nameMatches.length, matched])

  const pickExisting = useCallback((spot: TossLocation) => {
    setMatched(spot)
    setName(spot.name)
    setCategory(spot.category || 'hidden')
    setDescription(spot.description || '')
    setSuggestOpen(false)
    setFormError(null)
  }, [])

  const clearMatch = useCallback(() => {
    setMatched(null)
  }, [])

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (submitting) return
      if (!name.trim()) {
        setFormError('Give your gem a name.')
        return
      }
      if (!geo) {
        setFormError('We need your location to confirm you are at the spot.')
        requestGeo()
        return
      }
      if (!accurateEnough) {
        setFormError('GPS is too weak. Move to open sky and refresh.')
        return
      }

      setSubmitting(true)
      setFormError(null)
      try {
        if (matched) {
          const res = await apiFetch<{ detail?: string; upvote_count?: number } & Partial<TossLocation>>(
            `/api/coin-toss/locations/${matched.id}/vote/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude: geo.latitude,
                longitude: geo.longitude,
              }),
            },
          )
          setResult({
            ...matched,
            ...res,
            merged: true,
            detail: res.detail || 'That gem is already on the map — we added your upvote.',
            upvote_count: res.upvote_count ?? matched.upvote_count,
          })
          return
        }

        const resolved = await resolveListingGalleryMedia(photos, { allowVideoCover: true })
        const fullMedia = [...resolved.gallery]
        if (resolved.cover && !fullMedia.some((m) => m.url === resolved.cover)) {
          fullMedia.unshift({ url: resolved.cover, kind: resolved.coverKind })
        }
        const media = serializeGalleryForApi(fullMedia).map((item) =>
          typeof item === 'string' ? { url: item, kind: 'image' as const } : item,
        )

        const res = await apiFetch<AddResult>('/api/coin-toss/locations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            category,
            description: description.trim(),
            latitude: geo.latitude,
            longitude: geo.longitude,
            accuracy_m: geo.accuracy,
            media,
          }),
        })
        setResult(res)
      } catch (err) {
        if (err instanceof ApiError) {
          setFormError(formatApiErrorMessage(err.body, err.message))
        } else {
          setFormError('Could not add your gem right now. Try again in a moment.')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [submitting, name, category, description, photos, geo, accurateEnough, requestGeo, matched],
  )

  return (
    <div className="coin-toss-page">
      <div className="coin-toss-page__grid" aria-hidden />

      <div className="coin-toss-page__stage">
        <Link to="/coin-toss" className="coin-toss-page__back">
          <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
          Coin Toss
        </Link>

        {result ? (
          <section className="coin-toss-card__result" aria-live="polite">
            <p className="coin-toss-card__result-kicker">
              {result.merged ? 'Already listed' : 'Gem added'}
            </p>
            <h2 className="coin-toss-card__result-name">{result.name || name}</h2>
            <p className="coin-toss-card__result-desc">{result.detail}</p>
            <div className="coin-toss-card__result-actions">
              <Link className="coin-toss-card__map" to="/coin-toss">
                Back to Coin Toss
              </Link>
              <button
                type="button"
                className="coin-toss-card__vote"
                onClick={() => {
                  setResult(null)
                  setName('')
                  setDescription('')
                  setPhotos([])
                  setMatched(null)
                  requestGeo()
                }}
              >
                Add another
              </button>
            </div>
          </section>
        ) : (
          <>
            <header className="coin-toss-page__hero">
              <h1 className="coin-toss-page__brand">Add a gem</h1>
              <p className="coin-toss-page__lead">
                We check the map first — if it already exists, upvote it instead of adding a copy.
              </p>
            </header>

            <p className="coin-toss-page__status">
              {geoLoading
                ? 'Confirming location…'
                : geo
                  ? accurateEnough
                    ? `Here · ±${Math.round(geo.accuracy)} m`
                    : `Weak signal · ±${Math.round(geo.accuracy)} m — open sky helps`
                  : 'Share location to continue'}
            </p>

            <form className="coin-toss-add" onSubmit={onSubmit}>
              <div className="coin-toss-add__field coin-toss-add__field--suggest">
                <label htmlFor={`${listId}-name`}>
                  <span className="coin-toss-add__label">Name</span>
                </label>
                <input
                  id={`${listId}-name`}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (matched && e.target.value.trim() !== matched.name) {
                      setMatched(null)
                    }
                  }}
                  onFocus={() => {
                    if (!matched && debouncedName.length >= 2 && nameMatches.length > 0) {
                      setSuggestOpen(true)
                    }
                  }}
                  placeholder="e.g. Hilltop sundowner rock"
                  maxLength={200}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={suggestOpen}
                  aria-controls={`${listId}-suggest`}
                  aria-autocomplete="list"
                />
                {searchingNames && debouncedName.length >= 2 && !matched ? (
                  <p className="coin-toss-add__suggest-status">Checking the map…</p>
                ) : null}
                {suggestOpen && nameMatches.length > 0 ? (
                  <ul
                    id={`${listId}-suggest`}
                    className="coin-toss-add__suggest"
                    role="listbox"
                    aria-label="Places already on the map"
                  >
                    {nameMatches.map((spot) => (
                      <li key={spot.id} role="option">
                        <button type="button" className="coin-toss-add__suggest-item" onClick={() => pickExisting(spot)}>
                          <span className="coin-toss-add__suggest-name">{spot.name}</span>
                          <span className="coin-toss-add__suggest-meta">
                            {categoryLabel(spot)}
                            {spot.city ? ` · ${spot.city}` : ''}
                            {typeof spot.upvote_count === 'number' ? ` · ${spot.upvote_count} upvotes` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {matched ? (
                  <div className="coin-toss-add__match" role="status">
                    <p>
                      <strong>{matched.name}</strong> is already on the map
                      {typeof matched.upvote_count === 'number' ? ` (${matched.upvote_count} upvotes)` : ''}.
                      Submit to upvote it from where you are.
                    </p>
                    <button type="button" className="coin-toss-page__btn" onClick={clearMatch}>
                      Not this place — add new
                    </button>
                  </div>
                ) : null}
              </div>

              {!matched ? (
                <>
                  <label className="coin-toss-add__field">
                    <span className="coin-toss-add__label">Kind of place</span>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      {QUINTOS_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="coin-toss-add__field">
                    <span className="coin-toss-add__label">Why go (optional)</span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What makes it worth finding…"
                      rows={3}
                      maxLength={2000}
                    />
                  </label>

                  <div className="coin-toss-add__field">
                    <span className="coin-toss-add__label">Photos &amp; videos</span>
                    <ListingPhotoManager
                      photos={photos}
                      onChange={setPhotos}
                      allowVideoCover
                      maxPhotos={8}
                      hint="Show the place in real life — the next toss will show these clips."
                    />
                  </div>
                </>
              ) : null}

              {formError ? <p className="coin-toss-card__error" role="alert">{formError}</p> : null}
              {geoError ? <p className="coin-toss-card__error" role="alert">{geoError}</p> : null}

              <div className="coin-toss-add__actions">
                <button
                  type="button"
                  className="coin-toss-page__btn"
                  onClick={requestGeo}
                  disabled={geoLoading}
                >
                  <LocateFixed size={15} strokeWidth={2.25} aria-hidden />
                  Refresh location
                </button>
                <button
                  type="submit"
                  className="coin-toss-add__submit"
                  disabled={submitting || !accurateEnough}
                >
                  {submitting
                    ? matched
                      ? 'Upvoting…'
                      : 'Adding…'
                    : matched
                      ? 'I’m here — upvote'
                      : 'Add to the Quintos'}
                </button>
              </div>

              <p className="coin-toss-add__note">
                Type a name and we search existing gems first. Remote adds don&apos;t count — we stamp your live GPS.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
