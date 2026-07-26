import { useEffect, useRef, useState } from 'react'
import { ChevronDown, MapPin, Search } from 'lucide-react'
import {
  DEFAULT_MAP_CENTER,
  parseGoogleAddressComponents,
  resolveRegionFromPlace,
  roundCoord,
} from '../../../../utils/geocodeParse'
import { googleMapsPlaceUrl, hasValidCoords } from '../../../../utils/placeMap'
import { useGoogleMapsLoader } from '../../../../hooks/useGoogleMapsLoader'
import './VenueLocationPicker.css'

export type VenueLocationPickerValue = {
  latitude: number | null
  longitude: number | null
  google_place_id: string
  formatted_address: string
  region: string
  city: string
  address: string
}

type Props = {
  value: VenueLocationPickerValue
  onChange: (patch: Partial<VenueLocationPickerValue>) => void
  /** Search box placeholder (food vs stay copy). */
  searchPlaceholder?: string
  hint?: string
  /**
   * Optional ISO country codes to bias Autocomplete (e.g. `['na','za']`).
   * Omit for worldwide search — preferred for travellers listing anywhere.
   */
  countryCodes?: string[]
}

function toLatLng(value: VenueLocationPickerValue): google.maps.LatLngLiteral {
  if (hasValidCoords(value.latitude, value.longitude)) {
    return { lat: value.latitude!, lng: value.longitude! }
  }
  return DEFAULT_MAP_CENTER
}

function fallbackCity(parsedCity: string, formatted: string, placeName?: string): string {
  if (parsedCity.trim()) return parsedCity.trim()
  if (placeName?.trim()) return placeName.trim()
  const first = formatted.split(',')[0]?.trim()
  return first || ''
}

export function VenueLocationPicker({
  value,
  onChange,
  searchPlaceholder = 'Search Google Maps for your place',
  hint = 'Search Google Maps, then click the map or drag the pin to fine-tune.',
  countryCodes,
}: Props) {
  const { ready, error, hasKey } = useGoogleMapsLoader()
  const mapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const valueRef = useRef(value)
  const [searchText, setSearchText] = useState(value.formatted_address || value.address || '')
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    setSearchText(value.formatted_address || value.address || '')
  }, [value.formatted_address, value.address])

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return

    const center = toLatLng(value)
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: hasValidCoords(value.latitude, value.longitude) ? 16 : 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      })
      markerRef.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: center,
        draggable: true,
      })
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current?.getPosition()
        if (!pos) return
        reverseGeocode(pos.lat(), pos.lng())
      })
      mapInstance.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng?.lat()
        const lng = e.latLng?.lng()
        if (lat == null || lng == null) return
        markerRef.current?.setPosition({ lat, lng })
        reverseGeocode(lat, lng)
      })
    } else {
      mapInstance.current.setCenter(center)
      markerRef.current?.setPosition(center)
      if (hasValidCoords(value.latitude, value.longitude)) {
        mapInstance.current.setZoom(16)
      }
    }
  }, [ready, value.latitude, value.longitude])

  useEffect(() => {
    if (!ready || !inputRef.current || !window.google?.maps?.places) return

    if (autocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      autocompleteRef.current = null
    }

    const options: google.maps.places.AutocompleteOptions = {
      fields: ['place_id', 'geometry', 'formatted_address', 'address_components', 'name'],
    }
    const codes = (countryCodes ?? [])
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean)
    if (codes.length > 0 && codes.length <= 5) {
      options.componentRestrictions = { country: codes.length === 1 ? codes[0] : codes }
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options)
    autocomplete.addListener('place_changed', () => {
      applyPlace(autocomplete.getPlace())
    })
    autocompleteRef.current = autocomplete

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [ready, countryCodes?.join(',')])

  function reverseGeocode(lat: number, lng: number, extras?: Partial<VenueLocationPickerValue>) {
    const roundedLat = roundCoord(lat)
    const roundedLng = roundCoord(lng)
    if (roundedLat == null || roundedLng == null) return

    if (!window.google?.maps) {
      onChange({
        latitude: roundedLat,
        longitude: roundedLng,
        ...extras,
      })
      return
    }

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat: roundedLat, lng: roundedLng } }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) {
        const prev = valueRef.current
        onChange({
          latitude: roundedLat,
          longitude: roundedLng,
          google_place_id: extras?.google_place_id ?? '',
          formatted_address:
            extras?.formatted_address ||
            `${roundedLat.toFixed(5)}, ${roundedLng.toFixed(5)}`,
          region: resolveRegionFromPlace(
            { region: extras?.region || prev.region, city: extras?.city || prev.city, country: '' },
            extras?.formatted_address || '',
          ),
          city: extras?.city || prev.city,
          address: extras?.address || prev.address,
        })
        return
      }
      applyGeocoderResult(results[0], roundedLat, roundedLng, extras)
    })
  }

  function applyGeocoderResult(
    result: google.maps.GeocoderResult,
    lat: number,
    lng: number,
    extras?: Partial<VenueLocationPickerValue>,
  ) {
    const parsed = parseGoogleAddressComponents(result.address_components ?? [])
    const formatted = extras?.formatted_address || result.formatted_address || ''
    const prev = valueRef.current
    setSearchText(formatted)
    onChange({
      latitude: roundCoord(lat),
      longitude: roundCoord(lng),
      google_place_id: extras?.google_place_id || result.place_id || '',
      formatted_address: formatted,
      region: resolveRegionFromPlace(
        {
          region: parsed.region || extras?.region || prev.region,
          city: parsed.city || extras?.city || prev.city,
          country: parsed.country,
        },
        formatted,
      ),
      city: fallbackCity(parsed.city || extras?.city || '', formatted) || prev.city,
      address: extras?.address || parsed.address || formatted,
    })
  }

  function applyPlace(place: google.maps.places.PlaceResult) {
    const loc = place.geometry?.location
    if (!loc) return
    const lat = roundCoord(loc.lat())
    const lng = roundCoord(loc.lng())
    if (lat == null || lng == null) return

    const parsed = parseGoogleAddressComponents(place.address_components ?? [])
    const formatted = place.formatted_address ?? place.name ?? ''
    setSearchText(formatted)
    markerRef.current?.setPosition({ lat, lng })
    mapInstance.current?.panTo({ lat, lng })
    mapInstance.current?.setZoom(16)

    // Place autocomplete often omits admin_area_1 for lodges — reverse-geocode fills region.
    reverseGeocode(lat, lng, {
      google_place_id: place.place_id ?? '',
      formatted_address: formatted,
      region: resolveRegionFromPlace(parsed, formatted),
      city: fallbackCity(parsed.city, formatted, place.name),
      address: parsed.address || formatted,
    })
  }

  const previewHref =
    hasValidCoords(value.latitude, value.longitude)
      ? googleMapsPlaceUrl(value.latitude!, value.longitude!)
      : null

  const hasPlace =
    Boolean(value.formatted_address?.trim()) ||
    hasValidCoords(value.latitude, value.longitude)

  return (
    <div className="venue-loc-picker">
      <p className="venue-loc-picker__lead">
        Pick your place on <strong>Google Maps</strong> — city, region, and pin fill in automatically.
      </p>

      {hasKey ? (
        <>
          <label className="venue-loc-picker__search">
            <Search size={16} strokeWidth={2.25} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={searchPlaceholder}
              disabled={!ready}
              autoComplete="off"
            />
          </label>
          {error ? <p className="venue-loc-picker__error">{error}</p> : null}
          {!ready && !error ? <p className="venue-loc-picker__loading">Loading Google Maps…</p> : null}
          <div ref={mapRef} className="venue-loc-picker__map" aria-label="Google Maps place picker" />
          <p className="venue-loc-picker__hint">{hint}</p>
        </>
      ) : (
        <p className="venue-loc-picker__fallback">
          Google Maps is unavailable — enter location details below. Set{' '}
          <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable place search.
        </p>
      )}

      {hasPlace ? (
        <div className="venue-loc-picker__summary">
          <MapPin size={15} strokeWidth={2.25} aria-hidden />
          <div className="venue-loc-picker__summary-body">
            <strong>{value.formatted_address || value.address || 'Pinned location'}</strong>
            {(value.city || value.region) && (
              <span>
                {[value.city, value.region].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
          {previewHref ? (
            <a href={previewHref} target="_blank" rel="noopener noreferrer">
              Open in Maps
            </a>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={`venue-loc-picker__manual-toggle${showManual || !hasKey ? ' is-open' : ''}`}
        onClick={() => setShowManual((v) => !v)}
        aria-expanded={showManual || !hasKey}
      >
        <ChevronDown size={16} strokeWidth={2.25} aria-hidden />
        {hasKey ? 'Edit address details' : 'Enter address manually'}
      </button>

      {(showManual || !hasKey) && (
        <div className="venue-loc-picker__manual">
          <div className="fv-field-row">
            <label className="fv-field">
              <span>Region</span>
              <input
                value={value.region}
                onChange={(e) => onChange({ region: e.target.value })}
                placeholder="Auto-filled from Google"
              />
            </label>
            <label className="fv-field">
              <span>City</span>
              <input
                value={value.city}
                onChange={(e) => onChange({ city: e.target.value })}
                placeholder="Auto-filled from Google"
              />
            </label>
          </div>
          <label className="fv-field">
            <span>Street address</span>
            <input
              value={value.address}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="Auto-filled from Google"
            />
          </label>
        </div>
      )}
    </div>
  )
}
