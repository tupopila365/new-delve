import { MapPin } from 'lucide-react'
import { ListingSection } from './ListingSection'
import './listing-detail.css'

type Props = {
  title?: string
  address?: string | null
  mapUrl: string
  mapHint?: string
  viewMapLabel?: string
  className?: string
}

export function ListingLocationCard({
  title = 'Location',
  address,
  mapUrl,
  mapHint = 'Opens in maps',
  viewMapLabel = 'View map',
  className = '',
}: Props) {
  return (
    <ListingSection title={title} className={`listing-location ${className}`.trim()}>
      {address?.trim() ? (
        <p className="listing-location__address">
          <MapPin size={14} strokeWidth={2.25} aria-hidden />
          {address.trim()}
        </p>
      ) : null}
      <div className="listing-location__map" role="img" aria-label="Map preview" />
      <div className="listing-location__foot">
        <p className="listing-location__hint">{mapHint}</p>
        <a className="listing-location__btn" href={mapUrl} target="_blank" rel="noopener noreferrer">
          <MapPin size={14} strokeWidth={2.25} aria-hidden />
          {viewMapLabel}
        </a>
      </div>
    </ListingSection>
  )
}
