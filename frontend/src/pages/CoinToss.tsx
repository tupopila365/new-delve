import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, LocateFixed, MapPin, PlusCircle, RefreshCw, ShieldCheck, ThumbsUp } from 'lucide-react'
import { apiFetch, formatApiErrorMessage, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { CoinTossCard } from '../components/coin-toss/CoinTossCard'
import { HOME_HERO_BG } from '../data/homeDefaults'
import type { TossLocation } from '../utils/coinToss'
import '../components/coin-toss/coin-toss.css'

const SPIN_MS = 2400
const DEFAULT_RADIUS_MILES = 5
const DEFAULT_MIN_UPVOTES = 3

type GeoState = {
  latitude: number
  longitude: number
} | null

export function CoinToss() {
  const { profile } = useAuth()
  const [geo, setGeo] = useState<GeoState>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<TossLocation | null>(null)
  const [tossError, setTossError] = useState<string | null>(null)
  const [voteBusy, setVoteBusy] = useState(false)
  const [voteMessage, setVoteMessage] = useState<string | null>(null)

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

  const onToss = useCallback(async () => {
    if (isSpinning) return
    if (!geo) {
      setTossError('Allow location access so we can find spots near you.')
      requestGeo()
      return
    }

    setIsSpinning(true)
    setTossError(null)
    setWinner(null)
    setVoteMessage(null)

    const spinDone = new Promise<void>((resolve) => {
      window.setTimeout(resolve, SPIN_MS)
    })

    let nextWinner: TossLocation | null = null
    let nextError: string | null = null

    try {
      nextWinner = await apiFetch<TossLocation>('/api/coin-toss/toss/', {
        auth: false,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: geo.latitude,
          longitude: geo.longitude,
          radius_miles: DEFAULT_RADIUS_MILES,
          min_upvotes: DEFAULT_MIN_UPVOTES,
        }),
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
  }, [geo, isSpinning, requestGeo])

  const onVoteWinner = useCallback(async () => {
    if (!winner || !geo || voteBusy) return
    if (!profile) {
      setVoteMessage('Sign in to upvote — and only when you are standing at the spot.')
      return
    }
    setVoteBusy(true)
    setVoteMessage(null)
    try {
      const res = await apiFetch<{ detail?: string; upvote_count?: number }>(
        `/api/coin-toss/locations/${winner.id}/vote/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: geo.latitude,
            longitude: geo.longitude,
          }),
        },
      )
      setVoteMessage(res.detail || 'Upvote recorded. Thanks for keeping the pool honest.')
      if (typeof res.upvote_count === 'number') {
        setWinner({ ...winner, upvote_count: res.upvote_count })
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setVoteMessage(formatApiErrorMessage(err.body, err.message))
      } else {
        setVoteMessage('Could not record your upvote right now.')
      }
    } finally {
      setVoteBusy(false)
    }
  }, [winner, geo, voteBusy, profile])

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
        <header className="coin-toss-page__hero">
          <p className="coin-toss-page__kicker">Surprise nearby</p>
          <h1 className="coin-toss-page__brand">Coin Toss</h1>
          <p className="coin-toss-page__lead">
            One tap. One fair spin. A community-loved spot near you — never boosted by ads.
          </p>
        </header>

        <p className="coin-toss-page__status">
          {geoLoading ? (
            'Finding where you are…'
          ) : geo ? (
            <>
              <LocateFixed size={14} aria-hidden />
              Ready within ~{DEFAULT_RADIUS_MILES} miles · needs {DEFAULT_MIN_UPVOTES}+ local upvotes
            </>
          ) : (
            'Share your location to play'
          )}
        </p>

        <div className="coin-toss-page__actions">
          <button type="button" className="coin-toss-page__btn" onClick={requestGeo} disabled={geoLoading}>
            <LocateFixed size={16} aria-hidden />
            {geo ? 'Refresh location' : 'Share location'}
          </button>
          <button
            type="button"
            className="coin-toss-page__btn coin-toss-page__btn--ghost"
            onClick={onToss}
            disabled={isSpinning || !geo}
          >
            <RefreshCw size={16} aria-hidden />
            Toss again
          </button>
        </div>

        {geoError ? <p className="coin-toss-card__error" role="alert">{geoError}</p> : null}

        <Link to="/coin-toss/add" className="coin-toss-page__add-cta">
          <span className="coin-toss-page__add-icon" aria-hidden>
            <PlusCircle size={22} />
          </span>
          <span className="coin-toss-page__add-body">
            <span className="coin-toss-page__add-title">Add your favourite gem</span>
            <span className="coin-toss-page__add-sub">
              Standing somewhere special? Drop it into the Quintos for the next traveller.
            </span>
          </span>
        </Link>

        <CoinTossCard
          isSpinning={isSpinning}
          winner={winner}
          error={tossError}
          onToss={onToss}
          disabled={!geo}
          onVote={onVoteWinner}
          voteBusy={voteBusy}
          voteMessage={voteMessage}
          canVote={Boolean(profile)}
        />

        <section className="coin-toss-page__how" aria-labelledby="coin-toss-how-title">
          <h2 id="coin-toss-how-title" className="coin-toss-page__how-title">
            How community votes work
          </h2>
          <p className="coin-toss-page__how-lead">
            The coin only picks places people have actually stood at and loved — not paid listings.
          </p>
          <ol className="coin-toss-page__steps">
            <li>
              <span className="coin-toss-page__step-icon" aria-hidden>
                <MapPin size={16} />
              </span>
              <div>
                <strong>Go there</strong>
                <p>Open the spot from your toss, visit it in person, and stay nearby.</p>
              </div>
            </li>
            <li>
              <span className="coin-toss-page__step-icon" aria-hidden>
                <ThumbsUp size={16} />
              </span>
              <div>
                <strong>Upvote while you are there</strong>
                <p>
                  Sign in, then tap <em>I am here — upvote</em> on the result. We check your phone
                  location against the spot so remote spam does not count.
                </p>
              </div>
            </li>
            <li>
              <span className="coin-toss-page__step-icon" aria-hidden>
                <Heart size={16} />
              </span>
              <div>
                <strong>Help the next traveller</strong>
                <p>
                  Spots need at least {DEFAULT_MIN_UPVOTES} honest upvotes before they enter the
                  toss pool. More real visits = more chance someone else discovers it.
                </p>
              </div>
            </li>
            <li>
              <span className="coin-toss-page__step-icon" aria-hidden>
                <ShieldCheck size={16} />
              </span>
              <div>
                <strong>Keep it fair</strong>
                <p>
                  Flag spots that feel commercially gamed. Three flags automatically pull them out of
                  future tosses.
                </p>
              </div>
            </li>
          </ol>
          {!profile ? (
            <p className="coin-toss-page__how-cta">
              <Link to="/login?next=/coin-toss">Sign in</Link> when you are ready to upvote a place
              you visited.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
