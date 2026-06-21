import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { MiniRating } from './MiniRating'
import './Featured.css'

type Props = {
  title: string
  subtitle?: string
  href: string
  image?: string | null
  fallbackImage: string
  partnerLabel?: string
  location?: string
  meta?: string
  rating?: string | number | null
}

export function CategorySpotlightHero({
  title,
  subtitle,
  href,
  image,
  fallbackImage,
  partnerLabel = 'Featured Partner',
  location,
  meta,
  rating,
}: Props) {
  const src = image || fallbackImage

  return (
    <Link to={href} className="ta-spotlight category-spotlight" aria-label={`${partnerLabel}: ${title}`}>
      <img
        className="ta-spotlight__img"
        src={src}
        alt=""
        loading="eager"
        onError={(event) => {
          const img = event.currentTarget
          if (img.src !== fallbackImage) img.src = fallbackImage
        }}
      />
      <div className="ta-spotlight__scrim" aria-hidden />
      <div className="ta-spotlight__body">
        <span className="featured-card__partner category-spotlight__partner">{partnerLabel}</span>
        <h2 className="ta-spotlight__title">{title}</h2>
        {subtitle ? <p className="ta-spotlight__meta">{subtitle}</p> : null}
        {location ? (
          <p className="ta-spotlight__meta">
            <MapPin size={13} strokeWidth={2.25} aria-hidden />
            {location}
          </p>
        ) : null}
        {meta ? <p className="ta-spotlight__meta">{meta}</p> : null}
        {rating ? <MiniRating rating={rating} variant="onDark" className="ta-spotlight__rating" /> : null}
      </div>
    </Link>
  )
}
