import { MapPin } from 'lucide-react'
import { ListingSection } from './ListingSection'
import {
  hasValidCoords,
  openStreetMapEmbedUrl,
  resolveMapUrl,
} from '../../utils/placeMap'
import './listing-detail.css'

type Props = {
  title?: string
  /** Human-readable place line (address, city, venue, boarding point, etc.). */
  address?: string | null
  /** Precise pin — only when present do we embed a real map. */
  latitude?: number | null
  longitude?: number | null
  /** External maps link; derived from address/coords when omitted. */
  mapUrl?: string | null
  mapHint?: string
  viewMapLabel?: string
  className?: string
  /** Shown when we only have a city/region, not a street address. */
  approximateHint?: string | null
}

export function ListingLocationCard({
  title = 'Location',
  address,
  latitude,
  longitude,
  mapUrl,
  mapHint,
  viewMapLabel = 'Open in maps',
  className = '',
  approximateHint,
}: Props) {
  const place = address?.trim() || ''
  const approx = approximateHint?.trim() || ''
  const precise = hasValidCoords(latitude, longitude)
  const href = resolveMapUrl({ address: place, latitude, longitude, mapUrl })

  if (!place && !precise && !href && !approx) return null

  const hint =
    mapHint ?? (precise ? 'Exact pin on OpenStreetMap' : 'Opens OpenStreetMap search')

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

      {!precise && approx ? <p className="listing-location__approx">{approx}</p> : null}

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

      {href ? (
        <div className="listing-location__foot">
          <p className="listing-location__hint">{hint}</p>
          <a className="listing-location__btn" href={href} target="_blank" rel="noopener noreferrer">
            <MapPin size={14} strokeWidth={2.25} aria-hidden />
            {viewMapLabel}
          </a>
        </div>
      ) : null}
    </ListingSection>
  )
}
