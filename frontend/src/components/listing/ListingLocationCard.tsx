import { MapPin, Navigation } from 'lucide-react'
import { ListingSection } from './ListingSection'
import {
  formatPlaceLine,
  hasValidCoords,
  openStreetMapEmbedUrl,
  resolveDirectionsUrl,
  resolveMapUrl,
} from '../../utils/placeMap'
import './listing-detail.css'

type Props = {
  title?: string
  /** Human-readable place line (address, city, venue, boarding point, etc.). */
  address?: string | null
  name?: string | null
  city?: string | null
  region?: string | null
  /** Precise pin — only when present do we embed a real map. */
  latitude?: number | null
  longitude?: number | null
  /** External maps link; derived from address/coords when omitted. */
  mapUrl?: string | null
  mapHint?: string
  viewMapLabel?: string
  directionsLabel?: string
  className?: string
  /** Shown when we only have a city/region, not a street address. */
  approximateHint?: string | null
  /** Prefer Google Maps links (default true). */
  preferGoogle?: boolean
}

export function ListingLocationCard({
  title = 'Location',
  address,
  name,
  city,
  region,
  latitude,
  longitude,
  mapUrl,
  mapHint,
  viewMapLabel = 'Open in Maps',
  directionsLabel = 'Directions',
  className = '',
  approximateHint,
  preferGoogle = true,
}: Props) {
  const place =
    address?.trim() ||
    formatPlaceLine(city, region) ||
    ''
  const approx = approximateHint?.trim() || ''
  const precise = hasValidCoords(latitude, longitude)
  const href = resolveMapUrl({
    address: place,
    latitude,
    longitude,
    mapUrl,
    preferGoogle,
  })
  const directionsHref = resolveDirectionsUrl({
    name,
    address: address || place,
    city,
    region,
    latitude,
    longitude,
  })

  if (!place && !precise && !href && !approx) return null

  const hint =
    mapHint ??
    (precise
      ? 'Exact pin — open in Google Maps for turn-by-turn directions'
      : 'Approximate area — ask the host for the exact pin if you need it')

  return (
    <ListingSection title={title} className={`listing-location ${className}`.trim()}>
      {place ? (
        <p className="listing-location__address">
          <MapPin size={14} strokeWidth={2.25} aria-hidden />
          {place}
        </p>
      ) : precise ? (
        <p className="listing-location__address">
          <MapPin size={14} strokeWidth={2.25} aria-hidden />
          {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
        </p>
      ) : null}

      {precise ? (
        <p className="listing-location__pin-badge" role="status">
          Exact pin
        </p>
      ) : approx ? (
        <p className="listing-location__approx">{approx}</p>
      ) : null}

      {precise ? (
        <div className="listing-location__map listing-location__map--live">
          <iframe
            title={`${title} map`}
            src={openStreetMapEmbedUrl(latitude!, longitude!)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}

      {href || directionsHref ? (
        <div className="listing-location__foot">
          <p className="listing-location__hint">{hint}</p>
          <div className="listing-location__acts">
            {directionsHref && precise ? (
              <a
                className="listing-location__btn listing-location__btn--primary"
                href={directionsHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={14} strokeWidth={2.25} aria-hidden />
                {directionsLabel}
              </a>
            ) : null}
            {href ? (
              <a className="listing-location__btn" href={href} target="_blank" rel="noopener noreferrer">
                <MapPin size={14} strokeWidth={2.25} aria-hidden />
                {viewMapLabel}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </ListingSection>
  )
}
