import { useEffect, useId, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Globe2, MapPin } from 'lucide-react'
import { apiFetch, ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import {
  COUNTRY_ROWS,
  CURRENCY_OPTIONS,
  defaultCurrencyForCountry,
} from '../../lib/countryCurrencyPreferences'
import {
  clearHomeCountrySkipped,
  markHomeCountrySkipped,
  needsHomeCountryOnboarding,
} from '../../lib/homeCountry'
import { useExploreDestination } from '../../hooks/useExploreDestination'
import './HomeCountryOnboarding.css'

const AUTH_PATHS = new Set(['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'])

export function HomeCountryGate() {
  const { profile, loading, refreshProfile } = useAuth()
  const { label: exploreLabel } = useExploreDestination()
  const location = useLocation()
  const titleId = useId()

  const [country, setCountry] = useState('')
  const [currency, setCurrency] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const onAuthRoute = AUTH_PATHS.has(location.pathname)
  const open =
    !loading &&
    !dismissed &&
    !onAuthRoute &&
    needsHomeCountryOnboarding(profile)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !profile) return null

  async function save() {
    if (!country.trim()) {
      setError('Pick the country where you’re based.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const code = country.trim().toUpperCase()
      const cur = (currency || defaultCurrencyForCountry(code) || '').trim().toUpperCase()
      await apiFetch('/api/accounts/me/update/', {
        method: 'PATCH',
        body: JSON.stringify({
          country_code: code,
          preferred_currency: cur,
        }),
      })
      clearHomeCountrySkipped(profile.username)
      await refreshProfile()
      setDismissed(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function skip() {
    markHomeCountrySkipped(profile.username)
    setDismissed(true)
  }

  return (
    <div className="home-country-gate" role="presentation">
      <div
        className="home-country-gate__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="home-country-gate__icon" aria-hidden>
          <Globe2 size={22} strokeWidth={2.25} />
        </div>
        <h2 id={titleId} className="home-country-gate__title">
          Where are you based?
        </h2>
        <p className="home-country-gate__lead">
          This is your <strong>home country</strong> — who you are on DELVE. It stays on your profile
          and doesn’t change when you Explore somewhere else.
        </p>

        <label className="home-country-gate__field">
          <span className="home-country-gate__label">Home country</span>
          <select
            className="home-country-gate__select"
            value={country}
            disabled={busy}
            onChange={(e) => {
              const next = e.target.value
              setCountry(next)
              const d = defaultCurrencyForCountry(next)
              if (d) setCurrency(d)
            }}
          >
            <option value="">Select country</option>
            {COUNTRY_ROWS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="home-country-gate__field">
          <span className="home-country-gate__label">Preferred currency</span>
          <select
            className="home-country-gate__select"
            value={currency}
            disabled={busy || !country}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="">Select currency</option>
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <p className="home-country-gate__explore-note">
          <MapPin size={13} strokeWidth={2.25} aria-hidden />
          You’re currently exploring <strong>{exploreLabel}</strong>. Marketplace prices follow
          Explore — change that anytime from the nav switcher.
        </p>

        {error ? (
          <p className="home-country-gate__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="home-country-gate__actions">
          <button
            type="button"
            className="home-country-gate__primary"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? 'Saving…' : 'Save home country'}
          </button>
          <button
            type="button"
            className="home-country-gate__skip"
            disabled={busy}
            onClick={skip}
          >
            Skip for now
          </button>
        </div>
        <p className="home-country-gate__fine">
          You can update this later in Settings → Prefs.
        </p>
      </div>
    </div>
  )
}
