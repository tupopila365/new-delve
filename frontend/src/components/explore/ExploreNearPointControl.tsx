import { useEffect, useRef, useState } from 'react'
import { Crosshair, MapPin, Search, X } from 'lucide-react'
import { useExploreDestination } from '../../hooks/useExploreDestination'
import { useExploreNearPoint } from '../../hooks/useExploreNearPoint'
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader'
import './ExploreNearPointControl.css'

type Props = {
  className?: string
  /** Called when a near-point is set (so lists can switch to distance sort). */
  onPointSet?: () => void
}

export function ExploreNearPointControl({ className = '', onPointSet }: Props) {
  const { country } = useExploreDestination()
  const { point, towns, geoBusy, geoError, setNearPoint, useTown, useGeolocation, clear } =
    useExploreNearPoint()
  const { ready, hasKey } = useGoogleMapsLoader()
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!ready || !hasKey || !inputRef.current || !window.google?.maps?.places) return

    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current)
      autocompleteRef.current = null
    }

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['(cities)'],
      fields: ['geometry', 'name', 'formatted_address'],
      componentRestrictions: { country: country.toLowerCase() },
    })
    autocompleteRef.current = ac
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      const loc = place.geometry?.location
      if (!loc) return
      const label = place.name?.trim() || place.formatted_address?.trim() || 'Selected town'
      setNearPoint({
        latitude: loc.lat(),
        longitude: loc.lng(),
        label,
        source: 'places',
        country,
      })
      setQuery(label)
      onPointSet?.()
    })
    return () => {
      listener.remove()
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [ready, hasKey, country, setNearPoint, onPointSet])

  return (
    <div className={`explore-near ${className}`.trim()}>
      <div className="explore-near__row">
        <button
          type="button"
          className={`explore-near__btn${point?.source === 'geolocation' ? ' is-active' : ''}`}
          onClick={() => {
            useGeolocation(() => onPointSet?.())
          }}
          disabled={geoBusy}
        >
          <Crosshair size={14} strokeWidth={2.25} aria-hidden />
          {geoBusy ? 'Locating…' : 'Near me'}
        </button>

        {hasKey ? (
          <label className="explore-near__search">
            <Search size={14} strokeWidth={2.25} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a town…"
              aria-label="Search town for distance sort"
              autoComplete="off"
            />
          </label>
        ) : null}

        {point ? (
          <button type="button" className="explore-near__clear" onClick={clear} aria-label="Clear near point">
            <X size={14} strokeWidth={2.5} aria-hidden />
          </button>
        ) : null}
      </div>

      {towns.length > 0 ? (
        <div className="explore-near__towns" role="list" aria-label="Town centres">
          {towns.map((town) => (
            <button
              key={town.label}
              type="button"
              role="listitem"
              className={`explore-near__chip${point?.label === town.label && point.source === 'preset' ? ' is-active' : ''}`}
              onClick={() => {
                useTown(town)
                setQuery(town.label)
                onPointSet?.()
              }}
            >
              <MapPin size={12} strokeWidth={2.25} aria-hidden />
              {town.label}
            </button>
          ))}
        </div>
      ) : null}

      {point ? (
        <p className="explore-near__status" role="status">
          Sorting from <strong>{point.label}</strong>
          {point.source === 'geolocation' ? ' (your location)' : ''}
        </p>
      ) : (
        <p className="explore-near__hint">Pick Near me or a town to sort by distance.</p>
      )}

      {geoError ? <p className="explore-near__error">{geoError}</p> : null}
    </div>
  )
}
