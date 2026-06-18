import type { LucideIcon } from 'lucide-react'
import { Building2, MapPin } from 'lucide-react'
import './booking-detail.css'

type Props = {
  title: string
  location?: string | null
  image?: string | null
  placeholderIcon?: LucideIcon
  className?: string
}

export function BookingReviewHeader({
  title,
  location,
  image,
  placeholderIcon: PlaceholderIcon = Building2,
  className = '',
}: Props) {
  return (
    <div className={`bk-review-header ${className}`.trim()}>
      {image ? (
        <img className="bk-review-header__thumb" src={image} alt={title} />
      ) : (
        <div className="bk-review-header__thumb bk-review-header__thumb--ph">
          <PlaceholderIcon size={24} strokeWidth={1.75} aria-hidden />
        </div>
      )}
      <div className="bk-review-header__head">
        <h2 className="bk-review-header__title">{title}</h2>
        {location ? (
          <p className="bk-review-header__location">
            <MapPin size={13} strokeWidth={2.25} aria-hidden />
            {location}
          </p>
        ) : null}
      </div>
    </div>
  )
}
