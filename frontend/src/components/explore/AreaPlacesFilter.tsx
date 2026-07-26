/**
 * Marketplace area filter via Google Places — country OR city/town.
 * Replaces hardcoded “All areas” dropdowns for worldwide use.
 */

import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { useExploreDestination } from '../../hooks/useExploreDestination'
import { useExploreNearPoint } from '../../hooks/useExploreNearPoint'
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader'
import { EXPLORE_DESTINATION_CODES, regionsForCountry } from '../../lib/exploreDestination'
import { listingDistanceKm } from '../../lib/geoDistance'
import {
  countryCodeFromName,
  countryNameFromCode,
  parsePlaceSelection,
} from './areaPlacesShared'
import './AreaPlacesFilter.css'

/** Default browse radius when a town / city pin is chosen. */
export const AREA_FILTER_RADIUS_KM = 80

type Props = {
  className?: string
  /** Compact select-row style (default) vs full explore-near panel. */
  variant?: 'inline' | 'panel'
  /** Hide the country/city text field (hero keeps one keyword search only). */
  showSearch?: boolean
  /** Visual tone — dark for market heroes, light for filter modals. */
  tone?: 'dark' | 'light'
  placeholder?: string
  onPointSet?: () => void
  onCleared?: () => void
}

export function AreaPlacesFilter({
  className = '',
  variant = 'inline',
  showSearch = true,
  tone = 'dark',
  placeholder = 'Search a country or city…',
  onPointSet,
  onCleared,
}: Props) {
  const { country, setCountry } = useExploreDestination()
  const { point, towns, geoBusy, geoError, setNearPoint, useTown, useGeolocation, clear } =
    useExploreNearPoint()
  const { ready, hasKey, error: mapsError } = useGoogleMapsLoader()
  const placesLive = Boolean(hasKey && ready && !mapsError)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [query, setQuery] = useState(point?.label ?? '')

  useEffect(() => {
    setQuery(point?.label ?? '')
  }, [point?.label])

  useEffect(() => {
    if (!showSearch || !placesLive || !inputRef.current || !window.google?.maps?.places) return

    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current)
      autocompleteRef.current = null
    }

    // (regions) = countries, admin areas, and localities/cities — worldwide, not locked to Explore.
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['(regions)'],
      fields: ['geometry', 'name', 'formatted_address', 'place_id', 'types', 'address_components'],
    })
    autocompleteRef.current = ac
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      const loc = place.geometry?.location
      if (!loc) return
      const { kind, label, placeCountryCode } = parsePlaceSelection(place)
      const destCode =
        placeCountryCode &&
        (EXPLORE_DESTINATION_CODES as readonly string[]).includes(placeCountryCode)
          ? placeCountryCode
          : country

      if (placeCountryCode && placeCountryCode !== country.toUpperCase()) {
        if ((EXPLORE_DESTINATION_CODES as readonly string[]).includes(placeCountryCode)) {
          setCountry(placeCountryCode)
        }
      }

      setNearPoint({
        latitude: loc.lat(),
        longitude: loc.lng(),
        label,
        source: 'places',
        country: destCode,
        kind,
        placeCountryCode: placeCountryCode || destCode,
      })
      setQuery(label)
      onPointSet?.()
    })
    return () => {
      try {
        listener?.remove?.()
      } catch {
        /* Maps listener already gone */
      }
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [showSearch, placesLive, country, setCountry, setNearPoint, onPointSet])

  const clearAll = () => {
    clear()
    setQuery('')
    onCleared?.()
  }

  const applyTown = (label: string, latitude: number, longitude: number) => {
    useTown({ label, latitude, longitude })
    setQuery(label)
    onPointSet?.()
  }

  const applyFreeText = (raw: string) => {
    const label = raw.trim()
    if (!label) return
    const asCountry = countryCodeFromName(label)
    if (asCountry) {
      if ((EXPLORE_DESTINATION_CODES as readonly string[]).includes(asCountry)) {
        setCountry(asCountry)
      }
      setNearPoint({
        latitude: 0,
        longitude: 0,
        label: countryNameFromCode(asCountry),
        source: 'places',
        country: asCountry,
        kind: 'country',
        placeCountryCode: asCountry,
      })
    } else {
      setNearPoint({
        latitude: 0,
        longitude: 0,
        label,
        source: 'places',
        country,
        kind: 'city',
        placeCountryCode: country,
      })
    }
    setQuery(label)
    onPointSet?.()
  }

  const statusText = (() => {
    if (!point) return null
    if (point.kind === 'country') return <>Showing places in <strong>{point.label}</strong></>
    if (point.kind === 'here') return <>Near <strong>your location</strong></>
    return (
      <>
        Within ~{AREA_FILTER_RADIUS_KM} km of <strong>{point.label}</strong>
      </>
    )
  })()

  if (variant === 'panel') {
    return (
      <div
        className={`area-places area-places--panel area-places--${tone} ${className}`.trim()}
      >
        <div className="area-places__row">
          <button
            type="button"
            className={`area-places__btn${point?.source === 'geolocation' ? ' is-active' : ''}`}
            onClick={() => useGeolocation(() => onPointSet?.())}
            disabled={geoBusy}
          >
            {geoBusy ? 'Locating…' : 'Near me'}
          </button>
          {showSearch ? (
            <label className="area-places__search">
              <Search size={14} strokeWidth={2.25} aria-hidden />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placesLive ? placeholder : 'Type a country or city…'}
                aria-label="Filter by country or city"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || placesLive) return
                  e.preventDefault()
                  applyFreeText(query)
                }}
              />
            </label>
          ) : null}
          {point ? (
            <button type="button" className="area-places__clear" onClick={clearAll} aria-label="Clear area">
              <X size={14} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
        </div>
        {towns.length > 0 ? (
          <div className="area-places__towns" role="list" aria-label="Recommended places">
            {towns.slice(0, 6).map((town) => (
              <button
                key={town.label}
                type="button"
                role="listitem"
                className={`area-places__chip${point?.label === town.label ? ' is-active' : ''}`}
                onClick={() => applyTown(town.label, town.latitude, town.longitude)}
              >
                <MapPin size={12} strokeWidth={2.25} aria-hidden />
                {town.label}
              </button>
            ))}
          </div>
        ) : null}
        {statusText ? (
          <p className="area-places__status" role="status">
            {statusText}
          </p>
        ) : (
          <p className="area-places__hint">
            {showSearch
              ? 'Search a country (e.g. Kenya) or a city (e.g. Nairobi).'
              : 'Near me, a town chip, or open Filters to search a country or city.'}
          </p>
        )}
        {mapsError && showSearch ? <p className="area-places__error">{mapsError}</p> : null}
        {geoError ? <p className="area-places__error">{geoError}</p> : null}
      </div>
    )
  }

  return (
    <div className={`area-places area-places--inline area-places--${tone} ${className}`.trim()}>
      <label className="area-places__search area-places__search--inline">
        <Search size={15} strokeWidth={2.25} aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={point ? point.label : placesLive ? placeholder : 'Country or city…'}
          aria-label="Filter by country or city"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || placesLive) return
            e.preventDefault()
            applyFreeText(query)
          }}
        />
        {point ? (
          <button type="button" className="area-places__clear-inline" onClick={clearAll} aria-label="Clear area">
            <X size={13} strokeWidth={2.5} aria-hidden />
          </button>
        ) : null}
      </label>
      {mapsError ? <p className="area-places__error">{mapsError}</p> : null}
    </div>
  )
}

type Locatable = {
  latitude?: unknown
  longitude?: unknown
  city?: string | null
  region?: string | null
  regions?: string[] | null
  title?: string | null
  headline?: string | null
  country_code?: string | null
  country?: string | null
}

type AreaPoint = {
  latitude: number
  longitude: number
  label: string
  kind?: ExploreNearPointKind
  placeCountryCode?: string
  country?: string
}

/** Country → whole-country match; city/near-me → radius (or name fallback). */
export function listingMatchesAreaPoint(
  listing: Locatable,
  point: AreaPoint | null | undefined,
  radiusKm: number = AREA_FILTER_RADIUS_KM,
): boolean {
  if (!point) return true

  if (point.kind === 'country') {
    const code = (point.placeCountryCode || point.country || '').trim().toUpperCase()
    const listingCode = (listing.country_code || '').trim().toUpperCase()
    if (code && listingCode) return listingCode === code

    const countryLabel = point.label.trim().toLowerCase()
    const hay = [
      listing.country,
      listing.country_code,
      listing.city,
      listing.region,
      ...(listing.regions ?? []),
      listing.title,
      listing.headline,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (countryLabel && hay.includes(countryLabel)) return true

    // Match known regions for that ISO country when listings only store region names.
    if (code) {
      const regions = regionsForCountry(code)
      const listingRegion = (listing.region || '').trim().toLowerCase()
      if (listingRegion && regions.some((r) => r.toLowerCase() === listingRegion)) return true
      for (const r of listing.regions ?? []) {
        if (regions.some((known) => known.toLowerCase() === r.trim().toLowerCase())) return true
      }
    }
    return false
  }

  const hasRealPin =
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    !(point.latitude === 0 && point.longitude === 0)

  if (hasRealPin) {
    const km = listingDistanceKm(point, listing)
    if (km != null) return km <= radiusKm
  }

  const needle = point.label.trim().toLowerCase()
  if (!needle) return true
  const hay = [
    listing.city,
    listing.region,
    ...(listing.regions ?? []),
    listing.title,
    listing.headline,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}
