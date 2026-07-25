/**
 * Single market hero search: keyword query + Google Places location (regions).
 */

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useExploreDestination } from '../../hooks/useExploreDestination'
import { useExploreNearPoint } from '../../hooks/useExploreNearPoint'
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader'
import { EXPLORE_DESTINATION_CODES } from '../../lib/exploreDestination'
import {
  countryCodeFromName,
  parsePlaceSelection,
} from './areaPlacesShared'

type Props = {
  id: string
  /** CSS prefix matching market styles, e.g. `st-market`, `fd-market`, `gl-market`. */
  classPrefix: string
  placeholder: string
  ariaLabel?: string
  /** Debounced keyword search value owned by the page. */
  keyword: string
  onKeywordChange: (keyword: string) => void
  onLocationSet?: () => void
  onLocationCleared?: () => void
}

export function MarketSearchBar({
  id,
  classPrefix,
  placeholder,
  ariaLabel = 'Search',
  keyword,
  onKeywordChange,
  onLocationSet,
  onLocationCleared,
}: Props) {
  const { country, setCountry } = useExploreDestination()
  const { point, setNearPoint, clear } = useExploreNearPoint()
  const { ready, hasKey, error: mapsError } = useGoogleMapsLoader()
  const placesLive = Boolean(hasKey && ready && !mapsError)

  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const placePickedRef = useRef(false)
  const [text, setText] = useState(keyword)

  // Parent cleared keyword + location (Clear all / pills).
  useEffect(() => {
    if (!keyword && !point) {
      placePickedRef.current = false
      setText('')
    }
  }, [keyword, point])

  // Town chip / Near me set a point while the bar is empty — show the label.
  useEffect(() => {
    if (point?.label && !keyword && !text.trim()) {
      setText(point.label)
    }
  }, [point?.label, keyword, text])

  // Debounce free-text into keyword search (skip when a Place was just picked).
  useEffect(() => {
    if (placePickedRef.current) {
      placePickedRef.current = false
      return
    }
    const t = window.setTimeout(() => onKeywordChange(text.trim()), 350)
    return () => window.clearTimeout(t)
    // Only re-run when the typed text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyword callback is stable setState
  }, [text])

  useEffect(() => {
    if (!placesLive || !inputRef.current || !window.google?.maps?.places) return

    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current)
      autocompleteRef.current = null
    }

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

      placePickedRef.current = true
      setText(label)
      onKeywordChange('')
      setNearPoint({
        latitude: loc.lat(),
        longitude: loc.lng(),
        label,
        source: 'places',
        country: destCode,
        kind,
        placeCountryCode: placeCountryCode || destCode,
      })
      onLocationSet?.()
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
  }, [placesLive, country, setCountry, setNearPoint, onKeywordChange, onLocationSet])

  const clearAll = () => {
    placePickedRef.current = false
    setText('')
    onKeywordChange('')
    if (point) {
      clear()
      onLocationCleared?.()
    }
  }

  const onEnterWithoutPlaces = () => {
    const label = text.trim()
    if (!label) return
    const asCountry = countryCodeFromName(label)
    if (asCountry && (EXPLORE_DESTINATION_CODES as readonly string[]).includes(asCountry)) {
      placePickedRef.current = true
      setCountry(asCountry)
      onKeywordChange('')
      setNearPoint({
        latitude: 0,
        longitude: 0,
        label,
        source: 'places',
        country: asCountry,
        kind: 'country',
        placeCountryCode: asCountry,
      })
      onLocationSet?.()
    }
  }

  const showClear = Boolean(text || keyword || point)

  return (
    <label className={`${classPrefix}__search`}>
      <Search size={18} strokeWidth={2.25} aria-hidden />
      <input
        ref={inputRef}
        id={id}
        type="search"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          placePickedRef.current = false
          setText(e.target.value)
        }}
        aria-label={ariaLabel}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || placesLive) return
          e.preventDefault()
          onEnterWithoutPlaces()
        }}
      />
      {showClear ? (
        <button
          type="button"
          className={`${classPrefix}__search-clear`}
          onClick={clearAll}
          aria-label="Clear search"
        >
          <X size={14} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </label>
  )
}
