import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  COUNTRY_ROWS,
  CURRENCY_OPTIONS,
  defaultCurrencyForCountry,
} from '../lib/countryCurrencyPreferences'

const ME_UPDATE = '/api/accounts/me/update/'

export function Settings() {
  const { profile, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [countryCode, setCountryCode] = useState(profile?.country_code ?? '')
  const [preferredCurrency, setPreferredCurrency] = useState(profile?.preferred_currency ?? '')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setBio(profile.bio ?? '')
    setRegion(profile.region ?? '')
    setCity(profile.city ?? '')
    setCountryCode(profile.country_code ?? '')
    setPreferredCurrency(profile.preferred_currency ?? '')
  }, [profile])

  if (!profile) {
    return (
      <div className="settings-page">
        <h1 className="display settings-page__title">Settings</h1>
        <p>
          <Link to="/login">Sign in</Link> to manage your settings.
        </p>
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await apiFetch(ME_UPDATE, {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: displayName,
          bio,
          region,
          city,
          country_code: countryCode.trim().toUpperCase() || '',
          preferred_currency: preferredCurrency.trim().toUpperCase() || '',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="display settings-page__title">Settings</h1>
        <p className="settings-page__sub">@{profile.username}</p>
      </header>

      {saved && (
        <div className="success-banner" role="status">
          Saved.
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="settings-page__fields">
        <section className="settings-page__section" aria-labelledby="prefs-region-pricing">
          <h2 id="prefs-region-pricing" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Region and pricing
          </h2>
          <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Choose where you are and which currency we should use when showing prices. You can change this anytime (for example if you use a VPN or live abroad).
          </p>

          <div className="field">
            <label className="label" htmlFor="s-country">
              Country
            </label>
            <select
              id="s-country"
              className="input"
              value={countryCode}
              onChange={(e) => {
                const next = e.target.value
                setCountryCode(next)
                const d = defaultCurrencyForCountry(next)
                if (d) setPreferredCurrency(d)
              }}
            >
              <option value="">Not set</option>
              {COUNTRY_ROWS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="s-currency">
              Preferred currency
            </label>
            <select
              id="s-currency"
              className="input"
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
            >
              <option value="">Not set</option>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="field">
          <label className="label" htmlFor="s-display-name">
            Display name
          </label>
          <input
            id="s-display-name"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={80}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="s-region">
            Region
          </label>
          <input
            id="s-region"
            className="input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. London"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="s-city">
            City
          </label>
          <input
            id="s-city"
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Shoreditch"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="s-bio">
            Bio
          </label>
          <textarea
            id="s-bio"
            className="input"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community a little about yourself…"
          />
        </div>
      </div>

      <button type="button" className="btn btn-primary btn-block" disabled={saving} onClick={() => void handleSave()}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
