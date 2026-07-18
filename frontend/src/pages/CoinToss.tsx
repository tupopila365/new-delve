import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, LocateFixed } from 'lucide-react'
import { apiFetch, formatApiErrorMessage, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { CoinTossCard } from '../components/coin-toss/CoinTossCard'
import { TossSpotDetail } from '../components/coin-toss/TossSpotDetail'
import {
  TOSS_DISTANCE_UNITS,
  TOSS_MOODS,
  TOSS_RADIUS_KM,
  TOSS_RADIUS_MILES,
  clampRadiusMiles,
  formatTossRadius,
  kmToMiles,
  milesToKm,
  readTossDistanceUnit,
  writeTossDistanceUnit,
  type TossDistanceUnit,
  type TossLocation,
} from '../utils/coinToss'
import '../components/coin-toss/coin-toss.css'

const SPIN_MS = 2400
const DEFAULT_MIN_UPVOTES = 3

type GeoState = {
  latitude: number
  longitude: number
} | null

export function CoinToss() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [geo, setGeo] = useState<GeoState>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<TossLocation | null>(null)
  const [tossError, setTossError] = useState<string | null>(null)
  const [voteBusyId, setVoteBusyId] = useState<number | null>(null)
  const [saveBusyId, setSaveBusyId] = useState<number | null>(null)
  const [spotMessage, setSpotMessage] = useState<{ id: number; text: string } | null>(null)
  const [moodId, setMoodId] = useState('any')
  const [radiusMiles, setRadiusMiles] = useState(TOSS_RADIUS_MILES.default)
  const [distanceUnit, setDistanceUnit] = useState<TossDistanceUnit>(() => readTossDistanceUnit())

  const mood = TOSS_MOODS.find((m) => m.id === moodId) ?? TOSS_MOODS[0]
  const radiusLabel = formatTossRadius(radiusMiles, distanceUnit)
  const sliderValue =
    distanceUnit === 'km'
      ? Math.max(TOSS_RADIUS_KM.min, Math.round(milesToKm(radiusMiles)))
      : Math.max(TOSS_RADIUS_MILES.min, Math.round(radiusMiles))
  const sliderMin = distanceUnit === 'km' ? TOSS_RADIUS_KM.min : TOSS_RADIUS_MILES.min
  const sliderMax = distanceUnit === 'km' ? TOSS_RADIUS_KM.max : TOSS_RADIUS_MILES.max

  const onDistanceUnitChange = (unit: TossDistanceUnit) => {
    setDistanceUnit(unit)
    writeTossDistanceUnit(unit)
  }

  const onRadiusSlider = (raw: number) => {
    const miles = distanceUnit === 'km' ? kmToMiles(raw) : raw
    setRadiusMiles(clampRadiusMiles(miles))
  }

  const { data: savedTosses = [] } = useQuery({
    queryKey: ['coin-toss-saved'],
    enabled: Boolean(profile),
    queryFn: () => apiFetch<TossLocation[]>('/api/coin-toss/saved/'),
  })

  const requestGeo = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setGeoLoading(false)
      },
      (err) => {
        setGeoError(err.message || 'Could not read your location.')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
    )
  }, [])

  useEffect(() => {
    requestGeo()
  }, [requestGeo])

  const patchSpot = useCallback(
    (id: number, patch: Partial<TossLocation>) => {
      if (winner?.id === id) {
        setWinner({ ...winner, ...patch })
      }
      qc.setQueryData<TossLocation[]>(['coin-toss-saved'], (prev) =>
        (prev ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
      )
    },
    [winner, qc],
  )

  const onToss = useCallback(async () => {
    if (isSpinning) return
    if (!geo) {
      setTossError('Share your location first so we know where you are.')
      requestGeo()
      return
    }

    setIsSpinning(true)
    setTossError(null)
    setWinner(null)
    setSpotMessage(null)

    const spinDone = new Promise<void>((resolve) => {
      window.setTimeout(resolve, SPIN_MS)
    })

    let nextWinner: TossLocation | null = null
    let nextError: string | null = null

    try {
      const body: Record<string, unknown> = {
        latitude: geo.latitude,
        longitude: geo.longitude,
        radius_miles: radiusMiles,
        min_upvotes: DEFAULT_MIN_UPVOTES,
      }
      if (mood.categories.length > 0) {
        body.categories = mood.categories
      }
      nextWinner = await apiFetch<TossLocation>('/api/coin-toss/toss/', {
        auth: Boolean(profile),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (err) {
      if (err instanceof ApiError) {
        nextError = formatApiErrorMessage(err.body, err.message)
      } else {
        nextError = 'Toss failed. Try again in a moment.'
      }
    }

    await spinDone
    setWinner(nextWinner)
    setTossError(nextError)
    setIsSpinning(false)
  }, [geo, isSpinning, requestGeo, radiusMiles, mood, profile])

  const onVoteSpot = useCallback(
    async (spot: TossLocation) => {
      if (!geo || voteBusyId != null) return
      if (!profile) {
        setSpotMessage({ id: spot.id, text: 'Sign in to upvote — only when you are standing at the spot.' })
        return
      }
      setVoteBusyId(spot.id)
      setSpotMessage(null)
      try {
        const res = await apiFetch<{ detail?: string; upvote_count?: number }>(
          `/api/coin-toss/locations/${spot.id}/vote/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: geo.latitude,
              longitude: geo.longitude,
            }),
          },
        )
        setSpotMessage({ id: spot.id, text: res.detail || 'Upvote recorded.' })
        if (typeof res.upvote_count === 'number') {
          patchSpot(spot.id, { upvote_count: res.upvote_count })
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setSpotMessage({ id: spot.id, text: formatApiErrorMessage(err.body, err.message) })
        } else {
          setSpotMessage({ id: spot.id, text: 'Could not record your upvote right now.' })
        }
      } finally {
        setVoteBusyId(null)
      }
    },
    [geo, voteBusyId, profile, patchSpot],
  )

  const onToggleSave = useCallback(
    async (spot: TossLocation) => {
      if (saveBusyId != null) return
      if (!profile) {
        setSpotMessage({ id: spot.id, text: 'Sign in to save tosses for later.' })
        return
      }
      setSaveBusyId(spot.id)
      setSpotMessage(null)
      try {
        const res = await apiFetch<{ saved: boolean; detail?: string }>(
          `/api/coin-toss/locations/${spot.id}/save/`,
          { method: 'POST' },
        )
        patchSpot(spot.id, { saved_by_me: res.saved })
        setSpotMessage({
          id: spot.id,
          text: res.detail || (res.saved ? 'Saved for later.' : 'Removed from saved.'),
        })
        await qc.invalidateQueries({ queryKey: ['coin-toss-saved'] })
      } catch (err) {
        if (err instanceof ApiError) {
          setSpotMessage({ id: spot.id, text: formatApiErrorMessage(err.body, err.message) })
        } else {
          setSpotMessage({ id: spot.id, text: 'Could not update saved tosses right now.' })
        }
      } finally {
        setSaveBusyId(null)
      }
    },
    [saveBusyId, profile, patchSpot, qc],
  )

  const savedBtn = profile ? (
    <a href="#coin-toss-saved" className="coin-toss-page__saved-corner">
      <Bookmark size={16} strokeWidth={2.25} aria-hidden />
      <span>Saved{savedTosses.length > 0 ? ` ${savedTosses.length}` : ''}</span>
    </a>
  ) : (
    <Link to="/login?next=/coin-toss" className="coin-toss-page__saved-corner">
      <Bookmark size={16} strokeWidth={2.25} aria-hidden />
      <span>Saved</span>
    </Link>
  )

  return (
    <div className="coin-toss-page">
      <div className="coin-toss-page__grid" aria-hidden />
      {savedBtn}

      <div className="coin-toss-page__stage">
        <header className="coin-toss-page__hero">
          <h1 className="coin-toss-page__brand">Coin Toss</h1>
          <p className="coin-toss-page__lead">
            Can&apos;t decide where to go? Flip the coin — it picks a nearby spot for you.
          </p>
        </header>

        <div className="coin-toss-page__filters">
          <div className="coin-toss-page__filter-row" role="group" aria-label="What kind of spot">
            {TOSS_MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`coin-toss-page__chip${moodId === m.id ? ' is-on' : ''}`}
                aria-pressed={moodId === m.id}
                onClick={() => setMoodId(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="coin-toss-page__distance" role="group" aria-labelledby="coin-toss-distance-label">
            <div className="coin-toss-page__distance-head">
              <span id="coin-toss-distance-label" className="coin-toss-page__distance-label">
                How far
              </span>
              <span className="coin-toss-page__distance-value" aria-live="polite">
                {radiusLabel}
              </span>
            </div>
            <input
              type="range"
              className="coin-toss-page__distance-slider"
              min={sliderMin}
              max={sliderMax}
              step={1}
              value={sliderValue}
              aria-valuemin={sliderMin}
              aria-valuemax={sliderMax}
              aria-valuenow={sliderValue}
              aria-valuetext={radiusLabel}
              aria-label={`Search within ${radiusLabel}`}
              onChange={(e) => onRadiusSlider(Number(e.target.value))}
            />
            <div className="coin-toss-page__distance-ends" aria-hidden>
              <span>
                {sliderMin} {distanceUnit === 'km' ? 'km' : 'mi'}
              </span>
              <span>
                {sliderMax} {distanceUnit === 'km' ? 'km' : 'mi'}
              </span>
            </div>
            <div className="coin-toss-page__filter-row" role="group" aria-label="Distance unit">
              {TOSS_DISTANCE_UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className={`coin-toss-page__chip coin-toss-page__chip--unit${distanceUnit === u.id ? ' is-on' : ''}`}
                  aria-pressed={distanceUnit === u.id}
                  onClick={() => onDistanceUnitChange(u.id)}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <CoinTossCard
          isSpinning={isSpinning}
          winner={winner}
          error={tossError}
          onToss={onToss}
          disabled={!geo}
          onVote={winner ? () => onVoteSpot(winner) : undefined}
          voteBusy={winner != null && voteBusyId === winner.id}
          voteMessage={winner && spotMessage?.id === winner.id ? spotMessage.text : null}
          canVote={Boolean(profile)}
          onSave={winner ? () => onToggleSave(winner) : undefined}
          saveBusy={winner != null && saveBusyId === winner.id}
          canSave={Boolean(profile)}
        />

        <div className="coin-toss-page__toolbar">
          <p className="coin-toss-page__status">
            {geoLoading ? (
              'Finding you…'
            ) : geo ? (
              <>
                {mood.label} · within {radiusLabel}
              </>
            ) : (
              'Share location to play'
            )}
          </p>
          <div className="coin-toss-page__actions">
            <button type="button" className="coin-toss-page__btn" onClick={requestGeo} disabled={geoLoading}>
              <LocateFixed size={15} strokeWidth={2.25} aria-hidden />
              {geo ? 'Refresh' : 'Share location'}
            </button>
            {winner || tossError ? (
              <button
                type="button"
                className="coin-toss-page__btn coin-toss-page__btn--solid"
                onClick={onToss}
                disabled={isSpinning || !geo}
              >
                Toss again
              </button>
            ) : null}
          </div>
        </div>

        {geoError ? <p className="coin-toss-card__error" role="alert">{geoError}</p> : null}

        {profile ? (
          <section id="coin-toss-saved" className="coin-toss-page__saved" aria-labelledby="coin-toss-saved-title">
            <h2 id="coin-toss-saved-title" className="coin-toss-page__how-title">
              Saved tosses
            </h2>
            {savedTosses.length === 0 ? (
              <p className="coin-toss-page__saved-empty">
                Save a result to come back later — handy if you want to go there and upvote when you arrive.
              </p>
            ) : (
              <ul className="coin-toss-page__saved-list">
                {savedTosses.map((spot) => (
                  <li key={spot.id} className="coin-toss-page__saved-item">
                    <TossSpotDetail
                      spot={{ ...spot, saved_by_me: true }}
                      kicker="Saved"
                      forceSaved
                      onVote={() => onVoteSpot(spot)}
                      voteBusy={voteBusyId === spot.id}
                      voteMessage={spotMessage?.id === spot.id ? spotMessage.text : null}
                      canVote={Boolean(profile)}
                      onSave={() => onToggleSave(spot)}
                      saveBusy={saveBusyId === spot.id}
                      canSave
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <p className="coin-toss-page__saved-empty">
            <Link to="/login?next=/coin-toss">Sign in</Link> to save tosses and reopen them later.
          </p>
        )}

        <div className="coin-toss-page__add">
          <Link to="/coin-toss/add" className="coin-toss-page__add-cta">
            Add a gem
          </Link>
          <p className="coin-toss-page__add-sub">Found somewhere good? Add it while you&apos;re there.</p>
        </div>

        <section className="coin-toss-page__how" aria-labelledby="coin-toss-how-title">
          <h2 id="coin-toss-how-title" className="coin-toss-page__how-title">
            How votes stay honest
          </h2>
          <ol className="coin-toss-page__steps">
            <li>
              <strong>Go there</strong>
              <span>Visit the spot in person.</span>
            </li>
            <li>
              <strong>Upvote on site</strong>
              <span>We check you&apos;re nearby — so remote taps don&apos;t count.</span>
            </li>
            <li>
              <strong>Pool entry</strong>
              <span>Needs {DEFAULT_MIN_UPVOTES}+ real upvotes before the coin can pick it.</span>
            </li>
            <li>
              <strong>Flag gaming</strong>
              <span>Three commercial flags pull a spot out of future tosses.</span>
            </li>
          </ol>
          {!profile ? (
            <p className="coin-toss-page__how-cta">
              <Link to="/login?next=/coin-toss">Sign in</Link> when you&apos;re ready to upvote a place you visited.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
