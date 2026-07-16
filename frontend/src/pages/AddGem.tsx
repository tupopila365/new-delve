import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, LocateFixed, MapPin, Sparkles } from 'lucide-react'
import { apiFetch, ApiError, formatApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { HOME_HERO_BG } from '../data/homeDefaults'
import { QUINTOS_CATEGORIES, type TossLocation } from '../utils/coinToss'
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

export function AddGem() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  const [geo, setGeo] = useState<GeoFix>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('hidden')
  const [description, setDescription] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<AddResult | null>(null)

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
        setFormError('Your GPS signal is too weak to confirm you are here. Move to open sky and refresh.')
        return
      }

      setSubmitting(true)
      setFormError(null)
      try {
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
    [submitting, name, category, description, geo, accurateEnough, requestGeo],
  )

  return (
    <div className="coin-toss-page">
      <div className="coin-toss-page__scene" aria-hidden>
        <div
          className="coin-toss-page__scene-photo"
          style={{ backgroundImage: `url(${HOME_HERO_BG})` }}
        />
        <div className="coin-toss-page__scene-veil" />
      </div>

      <div className="coin-toss-page__stage">
        <Link to="/coin-toss" className="coin-toss-page__back">
          <ArrowLeft size={16} aria-hidden />
          Back to the toss
        </Link>

        {result ? (
          <section className="coin-toss-card__result" aria-live="polite">
            <p className="coin-toss-card__result-kicker">
              <CheckCircle2 size={14} aria-hidden /> {result.merged ? 'Upvote added' : 'Gem added'}
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
              <p className="coin-toss-page__kicker">Grow the Quintos</p>
              <h1 className="coin-toss-page__brand">Add your gem</h1>
              <p className="coin-toss-page__lead">
                Standing somewhere special? Drop it into the Quintos so the coin can send the next
                traveller here.
              </p>
            </header>

            <p className="coin-toss-page__status">
              {geoLoading ? (
                'Confirming you are here…'
              ) : geo ? (
                accurateEnough ? (
                  <>
                    <MapPin size={14} aria-hidden />
                    You are here · ±{Math.round(geo.accuracy)} m accuracy
                  </>
                ) : (
                  <>
                    <MapPin size={14} aria-hidden />
                    Weak signal · ±{Math.round(geo.accuracy)} m — move to open sky
                  </>
                )
              ) : (
                'Share your location to add a spot'
              )}
            </p>

            <form className="coin-toss-add" onSubmit={onSubmit}>
              <label className="coin-toss-add__field">
                <span className="coin-toss-add__label">Name of the spot</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hilltop sundowner rock"
                  maxLength={200}
                  autoComplete="off"
                />
              </label>

              <label className="coin-toss-add__field">
                <span className="coin-toss-add__label">What kind of place is it?</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {QUINTOS_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="coin-toss-add__field">
                <span className="coin-toss-add__label">Why should people go? (optional)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell travellers what makes it special…"
                  rows={3}
                  maxLength={2000}
                />
              </label>

              {formError ? <p className="coin-toss-card__error" role="alert">{formError}</p> : null}
              {geoError ? <p className="coin-toss-card__error" role="alert">{geoError}</p> : null}

              <div className="coin-toss-add__actions">
                <button
                  type="button"
                  className="coin-toss-page__btn"
                  onClick={requestGeo}
                  disabled={geoLoading}
                >
                  <LocateFixed size={16} aria-hidden />
                  Refresh location
                </button>
                <button
                  type="submit"
                  className="coin-toss-add__submit"
                  disabled={submitting || !accurateEnough}
                >
                  <Sparkles size={16} aria-hidden />
                  {submitting ? 'Adding…' : 'Add to the Quintos'}
                </button>
              </div>

              <p className="coin-toss-add__note">
                We stamp the spot with your live location, so you can only add places you are
                physically standing at. Your add counts as its first on-site upvote.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
