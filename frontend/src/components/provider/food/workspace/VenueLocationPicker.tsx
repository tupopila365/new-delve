import { useEffect, useRef, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { DEFAULT_MAP_CENTER, parseGoogleAddressComponents } from '../../../../utils/geocodeParse'
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
}

function toLatLng(value: VenueLocationPickerValue): google.maps.LatLngLiteral {
  if (hasValidCoords(value.latitude, value.longitude)) {
    return { lat: value.latitude!, lng: value.longitude! }
  }
  return DEFAULT_MAP_CENTER
}

export function VenueLocationPicker({ value, onChange }: Props) {
  const { ready, error, hasKey } = useGoogleMapsLoader()
  const mapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [searchText, setSearchText] = useState(value.formatted_address || value.address || '')

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
        fullscreenControl: false,
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
    if (autocompleteRef.current) return

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['place_id', 'geometry', 'formatted_address', 'address_components', 'name'],
      componentRestrictions: { country: 'na' },
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      applyPlace(place)
    })
    autocompleteRef.current = autocomplete
  }, [ready])

  function reverseGeocode(lat: number, lng: number) {
    if (!window.google?.maps) return
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) {
        onChange({
          latitude: lat,
          longitude: lng,
          google_place_id: '',
          formatted_address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        })
        return
      }
      applyGeocoderResult(results[0], lat, lng)
    })
  }

  function applyGeocoderResult(
    result: google.maps.GeocoderResult,
    lat: number,
    lng: number,
  ) {
    const parsed = parseGoogleAddressComponents(result.address_components ?? [])
    const formatted = result.formatted_address ?? ''
    setSearchText(formatted)
    onChange({
      latitude: lat,
      longitude: lng,
      google_place_id: result.place_id ?? '',
      formatted_address: formatted,
      region: parsed.region || value.region,
      city: parsed.city || value.city,
      address: parsed.address || formatted,
    })
  }

  function applyPlace(place: google.maps.places.PlaceResult) {
    const loc = place.geometry?.location
    if (!loc) return
    const lat = loc.lat()
    const lng = loc.lng()
    const parsed = parseGoogleAddressComponents(place.address_components ?? [])
    const formatted = place.formatted_address ?? place.name ?? ''
    setSearchText(formatted)
    markerRef.current?.setPosition({ lat, lng })
    mapInstance.current?.panTo({ lat, lng })
    mapInstance.current?.setZoom(16)
    onChange({
      latitude: lat,
      longitude: lng,
      google_place_id: place.place_id ?? '',
      formatted_address: formatted,
      region: parsed.region,
      city: parsed.city,
      address: parsed.address || formatted,
    })
  }

  const previewHref =
    hasValidCoords(value.latitude, value.longitude)
      ? googleMapsPlaceUrl(value.latitude!, value.longitude!)
      : null

  return (
    <div className="venue-loc-picker">
      {hasKey ? (
        <>
          <label className="venue-loc-picker__search">
            <Search size={16} strokeWidth={2.25} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search for your restaurant or address"
              disabled={!ready}
              autoComplete="off"
            />
          </label>
          {error ? <p className="venue-loc-picker__error">{error}</p> : null}
          {!ready && !error ? <p className="venue-loc-picker__loading">Loading map…</p> : null}
          <div ref={mapRef} className="venue-loc-picker__map" aria-label="Map pin picker" />
          <p className="venue-loc-picker__hint">
            Search above or click / drag the pin to set your exact location.
          </p>
        </>
      ) : (
        <p className="venue-loc-picker__fallback">
          Map search is unavailable — enter the address below. Set{' '}
          <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable the map picker.
        </p>
      )}

      {value.formatted_address ? (
        <div className="venue-loc-picker__summary">
          <MapPin size={15} strokeWidth={2.25} aria-hidden />
          <span>{value.formatted_address}</span>
          {previewHref ? (
            <a href={previewHref} target="_blank" rel="noopener noreferrer">
              Preview on Google Maps
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="fv-field-row">
        <label className="fv-field">
          <span>Region</span>
          <input
            value={value.region}
            onChange={(e) => onChange({ region: e.target.value })}
            placeholder="Khomas"
          />
        </label>
        <label className="fv-field">
          <span>City</span>
          <input
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Windhoek"
          />
        </label>
      </div>
      <label className="fv-field">
        <span>Street address</span>
        <input
          value={value.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="123 Independence Ave"
        />
      </label>
    </div>
  )
}
