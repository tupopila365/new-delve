import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Globe2, MapPin, X } from 'lucide-react'
import { useExploreDestination } from '../../hooks/useExploreDestination'
import './ExploreDestinationSwitcher.css'

type Props = {
  /** Compact control for top nav bars. */
  compact?: boolean
  className?: string
}

export function ExploreDestinationSwitcher({ compact = false, className = '' }: Props) {
  const {
    country,
    countryLabel,
    region,
    regions,
    countries,
    currency,
    label,
    exploring,
    setCountry,
    setRegion,
    clearRegion,
    enterExplore,
    exitExplore,
  } = useExploreDestination()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      className={`explore-switch${compact ? ' explore-switch--compact' : ''}${exploring ? ' explore-switch--on' : ' explore-switch--off'} ${className}`.trim()}
      ref={rootRef}
    >
      <button
        type="button"
        className="explore-switch__trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? titleId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Globe2 size={compact ? 15 : 16} strokeWidth={2.25} aria-hidden />
        <span className="explore-switch__text">
          <span className="explore-switch__kicker">{exploring ? 'Exploring' : 'My Delve'}</span>
          <span className="explore-switch__value">{exploring ? label : 'Your feed'}</span>
        </span>
        <ChevronDown size={14} strokeWidth={2.5} aria-hidden className="explore-switch__chev" />
      </button>

      {open ? (
        <div className="explore-switch__panel" role="dialog" aria-labelledby={titleId}>
          <div className="explore-switch__head">
            <h2 id={titleId} className="explore-switch__title">
              {exploring ? 'Explore a destination' : 'Start exploring'}
            </h2>
            <button
              type="button"
              className="explore-switch__close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          {exploring ? (
            <p className="explore-switch__hint">
              You’re in Explore mode — stays, food, and discovery follow this destination. Prices
              show in {currency} (display only). Leave anytime to return to My Delve; your last
              trip stays saved.
            </p>
          ) : (
            <p className="explore-switch__hint">
              You’re in My Delve — your likes, saves, and personalized rails. Pick a country (or
              resume <strong>{label}</strong>) to enter Explore mode.
            </p>
          )}

          <label className="explore-switch__field">
            <span className="explore-switch__field-label">Country</span>
            <select
              className="explore-switch__select"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
              }}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {regions.length > 0 ? (
            <div className="explore-switch__regions">
              <p className="explore-switch__field-label" id={`${titleId}-regions`}>
                <MapPin size={12} strokeWidth={2.25} aria-hidden />
                Region in {countryLabel}
              </p>
              <div className="explore-switch__chips" role="group" aria-labelledby={`${titleId}-regions`}>
                <button
                  type="button"
                  className={`explore-switch__chip${!region ? ' is-active' : ''}`}
                  aria-pressed={!region}
                  onClick={() => clearRegion()}
                >
                  All regions
                </button>
                {regions.map((name) => {
                  const active = region === name
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`explore-switch__chip${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => setRegion(name)}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="explore-switch__empty-regions">Browsing all of {countryLabel}.</p>
          )}

          <p className="explore-switch__currency" aria-live="polite">
            Display currency · <strong>{currency}</strong>
          </p>

          {exploring ? (
            <div className="explore-switch__footer">
              <button type="button" className="explore-switch__done" onClick={() => setOpen(false)}>
                Done
              </button>
              <button
                type="button"
                className="explore-switch__exit"
                onClick={() => {
                  exitExplore()
                  setOpen(false)
                }}
              >
                Back to my Delve
              </button>
            </div>
          ) : (
            <div className="explore-switch__footer">
              <button
                type="button"
                className="explore-switch__done"
                onClick={() => {
                  enterExplore()
                  setOpen(false)
                }}
              >
                Explore {countryLabel}
              </button>
              <Link to="/explore" className="explore-switch__exit" onClick={() => setOpen(false)}>
                Open Explore page
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
