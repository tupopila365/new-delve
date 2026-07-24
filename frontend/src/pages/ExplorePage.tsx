import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Home as HomeIcon, MapPin, Utensils } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useExploreDestination } from '../hooks/useExploreDestination'
import {
  countryName,
  displayCurrencyForExploreCountry,
  regionsForCountry,
  sanitizeRegionForCountry,
} from '../lib/exploreDestination'
import { HOME_ATMOSPHERE_BG } from '../data/homeDefaults'
import './explore-page.css'

const VERTICAL_LINKS = [
  { to: '/accommodation', label: 'Stays', hint: 'Rooms & lodges' },
  { to: '/food', label: 'Food', hint: 'Tables & tastes' },
  { to: '/guides', label: 'Guides', hint: 'Local leads' },
  { to: '/transport', label: 'Transport', hint: 'Cars & buses' },
  { to: '/search', label: 'Search', hint: 'Everything here' },
] as const

/**
 * Sprint 4 / Phase 4 — dedicated trip entry.
 * Pick country → optional region → Start exploring (forces Explore ON).
 */
export function ExplorePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const {
    country,
    region,
    countries,
    label,
    exploring,
    currency,
    startTrip,
    exitExplore,
    clearRegion,
  } = useExploreDestination()

  const [draftCountry, setDraftCountry] = useState(country)
  const [draftRegion, setDraftRegion] = useState(region)
  const [paramsApplied, setParamsApplied] = useState(false)

  useEffect(() => {
    setDraftCountry(country)
    setDraftRegion(region)
  }, [country, region])

  useEffect(() => {
    if (paramsApplied) return
    const c = (searchParams.get('country') || '').trim().toUpperCase()
    const r = (searchParams.get('region') || '').trim()
    const autoStart = searchParams.get('start') === '1' || searchParams.get('go') === '1'
    if (!c && !r && !autoStart) {
      setParamsApplied(true)
      return
    }
    const nextCountry = c || country
    const nextRegion = sanitizeRegionForCountry(nextCountry, r || (c ? '' : region))
    setDraftCountry(nextCountry)
    setDraftRegion(nextRegion)
    if (autoStart || c) {
      startTrip({ country: nextCountry, region: nextRegion })
    }
    setParamsApplied(true)
  }, [searchParams, paramsApplied, country, region, startTrip])

  const draftRegions = useMemo(() => regionsForCountry(draftCountry), [draftCountry])
  const draftLabel = useMemo(() => {
    const name = countryName(draftCountry)
    return draftRegion ? `${name} · ${draftRegion}` : name
  }, [draftCountry, draftRegion])
  const draftCurrency = displayCurrencyForExploreCountry(draftCountry)

  function onCountryChange(code: string) {
    const next = code.trim().toUpperCase()
    setDraftCountry(next)
    setDraftRegion(sanitizeRegionForCountry(next, draftRegion))
  }

  function beginTrip(thenTo?: string) {
    startTrip({ country: draftCountry, region: draftRegion })
    navigate(thenTo || '/accommodation')
  }

  function resumeTrip(thenTo?: string) {
    startTrip()
    navigate(thenTo || '/accommodation')
  }

  return (
    <div className="page-explore">
      <section className="explore-page-hero" aria-label="Start exploring">
        <div
          className="explore-page-hero__bg"
          style={{ backgroundImage: `url(${HOME_ATMOSPHERE_BG})` }}
          role="img"
          aria-label="Open landscape for a trip"
        />
        <div className="explore-page-hero__scrim" aria-hidden />
        <div className="explore-page-hero__inner">
          <p className="explore-page-hero__brand">DELVE</p>
          <h1 className="explore-page-hero__title">Where next?</h1>
          <p className="explore-page-hero__sub">
            {exploring
              ? `You’re exploring ${label}. Change the trip below, or jump into stays and food.`
              : 'Pick a destination to enter Explore mode — inventory, prices, and discovery follow the trip.'}
          </p>
        </div>
      </section>

      <div className="explore-page-body">
        {!exploring ? (
          <div className="explore-page-resume">
            <p className="explore-page-resume__copy">
              Last trip saved: <strong>{label}</strong>
              <span className="explore-page-resume__currency"> · {currency}</span>
            </p>
            <button type="button" className="explore-page-resume__btn" onClick={() => resumeTrip()}>
              Resume exploring
              <ArrowRight size={16} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        ) : (
          <div className="explore-page-active" role="status">
            <MapPin size={16} strokeWidth={2.35} aria-hidden />
            <span>
              Exploring <strong>{label}</strong>
            </span>
            <button
              type="button"
              className="explore-page-active__exit"
              onClick={() => {
                exitExplore()
                navigate('/')
              }}
            >
              Back to my Delve
            </button>
          </div>
        )}

        {!profile ? (
          <p className="explore-page-guest">
            Guests can explore freely.{' '}
            <Link to="/login">Sign in</Link> to keep saves and For You across devices.
          </p>
        ) : null}

        <section className="explore-page-picker" aria-labelledby="explore-pick-title">
          <h2 id="explore-pick-title" className="explore-page-picker__title">
            {exploring ? 'Change destination' : 'Choose a destination'}
          </h2>
          <p className="explore-page-picker__lead">
            Country first, then an optional region. Display currency becomes{' '}
            <strong>{draftCurrency}</strong>.
          </p>

          <label className="explore-page-field">
            <span className="explore-page-field__label">Country</span>
            <select
              className="explore-page-field__select"
              value={draftCountry}
              onChange={(e) => onCountryChange(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {draftRegions.length > 0 ? (
            <div className="explore-page-regions">
              <p className="explore-page-field__label" id="explore-regions-label">
                Region in {countryName(draftCountry)}
              </p>
              <div
                className="explore-page-regions__chips"
                role="group"
                aria-labelledby="explore-regions-label"
              >
                <button
                  type="button"
                  className={`explore-page-chip${!draftRegion ? ' is-active' : ''}`}
                  aria-pressed={!draftRegion}
                  onClick={() => setDraftRegion('')}
                >
                  All regions
                </button>
                {draftRegions.map((name) => {
                  const active = draftRegion === name
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`explore-page-chip${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => setDraftRegion(name)}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="explore-page-regions__empty">Browsing all of {countryName(draftCountry)}.</p>
          )}

          <div className="explore-page-actions">
            <button type="button" className="explore-page-cta" onClick={() => beginTrip()}>
              {exploring ? `Explore ${draftLabel}` : `Start exploring ${draftLabel}`}
              <ArrowRight size={18} strokeWidth={2.4} aria-hidden />
            </button>
            {exploring && region ? (
              <button
                type="button"
                className="explore-page-ghost"
                onClick={() => {
                  clearRegion()
                  setDraftRegion('')
                }}
              >
                Clear region
              </button>
            ) : null}
          </div>
        </section>

        <section className="explore-page-jumps" aria-labelledby="explore-jumps-title">
          <h2 id="explore-jumps-title" className="explore-page-jumps__title">
            Jump in
          </h2>
          <p className="explore-page-jumps__lead">
            Opens with Explore mode on for <strong>{draftLabel}</strong>.
          </p>
          <div className="explore-page-jumps__grid">
            {VERTICAL_LINKS.map((link) => (
              <button
                key={link.to}
                type="button"
                className="explore-page-jump"
                onClick={() => beginTrip(link.to)}
              >
                <span className="explore-page-jump__label">{link.label}</span>
                <span className="explore-page-jump__hint">{link.hint}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="explore-page-jump explore-page-jump--food"
            onClick={() => beginTrip('/food')}
          >
            <Utensils size={18} strokeWidth={2.2} aria-hidden />
            <span className="explore-page-jump__label">Food near a point</span>
            <span className="explore-page-jump__hint">Distance sort unlocks once Explore is on</span>
          </button>
        </section>

        <p className="explore-page-home-link">
          <Link to="/">
            <HomeIcon size={14} strokeWidth={2.3} aria-hidden />
            {exploring ? 'Keep exploring from Home' : 'Back to My Delve'}
          </Link>
        </p>
      </div>
    </div>
  )
}
