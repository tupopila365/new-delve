import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader'
import { formatDistanceKm, listingDistanceKm } from '../../lib/geoDistance'
import { googleMapsPlaceUrl, hasValidCoords, parseCoord } from '../../utils/placeMap'
import type { ExploreNearPoint } from '../../lib/exploreNearPoint'
import './ExploreResultsMap.css'

export type ExploreMapItem = {
  id: number | string
  title: string
  href: string
  latitude?: unknown
  longitude?: unknown
  subtitle?: string | null
}

type Props = {
  /** When set, shows a ★ origin marker and distance labels. Optional for browse-all map. */
  origin?: ExploreNearPoint | null
  items: ExploreMapItem[]
  className?: string
  legendLabel?: string
}

type PinnedItem = ExploreMapItem & {
  lat: number
  lng: number
  km: number | null
  distanceLabel: string | null
}

export function ExploreResultsMap({ origin, items, className = '', legendLabel }: Props) {
  const { ready, hasKey, error } = useGoogleMapsLoader()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])

  const pinned = useMemo(() => {
    const rows: PinnedItem[] = []
    for (const item of items) {
      const lat = parseCoord(item.latitude)
      const lng = parseCoord(item.longitude)
      if (!hasValidCoords(lat, lng)) continue
      const km = origin ? listingDistanceKm(origin, item) : null
      rows.push({
        ...item,
        lat,
        lng,
        km,
        distanceLabel: formatDistanceKm(km),
      })
    }
    rows.sort((a, b) => {
      if (a.km == null && b.km == null) return 0
      if (a.km == null) return 1
      if (b.km == null) return -1
      return a.km - b.km
    })
    return rows
  }, [items, origin])

  const pinKey = useMemo(
    () => pinned.map((p) => `${p.id}:${p.lat}:${p.lng}`).join('|'),
    [pinned],
  )

  const fallbackCenter = useMemo(() => {
    if (origin) return { lat: origin.latitude, lng: origin.longitude }
    if (pinned.length === 0) return { lat: 0, lng: 0 }
    const lat = pinned.reduce((sum, p) => sum + p.lat, 0) / pinned.length
    const lng = pinned.reduce((sum, p) => sum + p.lng, 0) / pinned.length
    return { lat, lng }
  }, [origin, pinned])

  useEffect(() => {
    if (!ready || !hasKey || !mapRef.current || !window.google?.maps) return
    if (pinned.length === 0) return

    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: fallbackCenter,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
    } else {
      mapInstance.current.setCenter(fallbackCenter)
    }

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const bounds = new window.google.maps.LatLngBounds()

    if (origin) {
      const originMarker = new window.google.maps.Marker({
        map: mapInstance.current,
        position: { lat: origin.latitude, lng: origin.longitude },
        title: origin.label,
        label: { text: '★', color: '#fff', fontSize: '11px' },
      })
      markersRef.current.push(originMarker)
      bounds.extend({ lat: origin.latitude, lng: origin.longitude })
    }

    for (const item of pinned) {
      const marker = new window.google.maps.Marker({
        map: mapInstance.current,
        position: { lat: item.lat, lng: item.lng },
        title: item.title,
      })
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font:650 13px/1.35 system-ui,sans-serif;max-width:180px">
          <strong>${escapeHtml(item.title)}</strong>
          ${item.distanceLabel ? `<div style="opacity:.7;margin-top:2px">${escapeHtml(item.distanceLabel)}</div>` : ''}
          <a href="${escapeAttr(item.href)}" style="display:inline-block;margin-top:6px">View</a>
        </div>`,
      })
      marker.addListener('click', () => info.open({ map: mapInstance.current!, anchor: marker }))
      markersRef.current.push(marker)
      bounds.extend({ lat: item.lat, lng: item.lng })
    }

    if (pinned.length > 0) {
      mapInstance.current.fitBounds(bounds, 48)
      if (pinned.length === 1 && !origin) {
        mapInstance.current.setZoom(13)
      }
    }
  }, [ready, hasKey, origin, fallbackCenter.lat, fallbackCenter.lng, pinKey, pinned])

  if (pinned.length === 0) {
    return (
      <p className={`explore-map__empty ${className}`.trim()}>
        No pinned results yet — listings need an exact map pin to appear here.
      </p>
    )
  }

  if (!hasKey || error) {
    return (
      <div className={`explore-map__fallback-wrap ${className}`.trim()}>
        {error ? <p className="explore-map__error">{error}</p> : null}
        <ul className="explore-map__fallback">
          {pinned.map((item) => (
            <li key={String(item.id)}>
              <Link to={item.href}>
                <MapPin size={14} strokeWidth={2.25} aria-hidden />
                <span>
                  <strong>{item.title}</strong>
                  {item.distanceLabel ? <em>{item.distanceLabel}</em> : null}
                  {item.subtitle ? <span>{item.subtitle}</span> : null}
                </span>
              </Link>
              <a
                href={googleMapsPlaceUrl(item.lat, item.lng)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Maps
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const legend =
    legendLabel ??
    (origin
      ? `★ ${origin.label} · ${pinned.length} pinned ${pinned.length === 1 ? 'result' : 'results'}`
      : `${pinned.length} pinned ${pinned.length === 1 ? 'stay' : 'stays'} on the map`)

  return (
    <div className={`explore-map ${className}`.trim()}>
      <div ref={mapRef} className="explore-map__canvas" aria-label="Results map" />
      <p className="explore-map__legend">{legend}</p>
    </div>
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, '&#39;')
}
