import { useEffect, useRef } from 'react'
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader'
import { openStreetMapEmbedUrl } from '../../utils/placeMap'

type Props = {
  latitude: number
  longitude: number
  title?: string
  className?: string
}

/** Interactive Google Map pin for listing detail; falls back to OSM embed. */
export function ListingLocationGoogleMap({ latitude, longitude, title, className = '' }: Props) {
  const { ready, hasKey, error } = useGoogleMapsLoader()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)

  useEffect(() => {
    if (!ready || !hasKey || !mapRef.current || !window.google?.maps) return

    const center = { lat: latitude, lng: longitude }

    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      })
      markerRef.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: center,
        title: title || 'Stay location',
      })
    } else {
      mapInstance.current.setCenter(center)
      markerRef.current?.setPosition(center)
      if (title) markerRef.current?.setTitle(title)
    }
  }, [ready, hasKey, latitude, longitude, title])

  if (!hasKey || error) {
    return (
      <div className={`listing-location__map listing-location__map--live ${className}`.trim()}>
        {error ? <p className="listing-location__map-error">{error}</p> : null}
        <iframe
          title={title ? `${title} map` : 'Location map'}
          src={openStreetMapEmbedUrl(latitude, longitude)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    )
  }

  if (!ready) {
    return (
      <div
        className={`listing-location__map listing-location__map--live listing-location__map--loading ${className}`.trim()}
        role="status"
      >
        Loading map…
      </div>
    )
  }

  return (
    <div className={`listing-location__map listing-location__map--live listing-location__map--google ${className}`.trim()}>
      <div ref={mapRef} className="listing-location__map-canvas" aria-label={title ? `${title} on Google Maps` : 'Google Maps'} />
    </div>
  )
}
