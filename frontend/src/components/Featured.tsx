import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Star } from 'lucide-react'
import './Featured.css'

export type FeaturedItem = {
  id: string | number
  title: string
  href: string
  image?: string | null
  fallbackImage: string
  eyebrow?: string
  location?: string
  meta?: string
  price?: string
  rating?: string | number | null
}

type Props = {
  title: string
  subtitle?: string
  items: FeaturedItem[]
  emptyText?: string
}

export function Featured({ title, subtitle, items, emptyText = 'Nothing featured yet.' }: Props) {
  if (items.length === 0) {
    return (
      <section className="featured-rail" aria-label={title}>
        <div className="featured-rail__head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        <p className="featured-rail__empty">{emptyText}</p>
      </section>
    )
  }

  return (
    <section className="featured-rail" aria-label={title}>
      <div className="featured-rail__head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className="featured-rail__scroll">
        {items.map((item) => {
          const src = item.image || item.fallbackImage
          return (
            <Link key={item.id} to={item.href} className="featured-card">
              <div className="featured-card__media">
                <img
                  src={src}
                  alt={item.title}
                  loading="lazy"
                  onError={(event) => {
                    const image = event.currentTarget
                    if (image.src !== item.fallbackImage) image.src = item.fallbackImage
                  }}
                />
                {item.eyebrow ? <span className="featured-card__eyebrow">{item.eyebrow}</span> : null}
                {item.rating ? (
                  <span className="featured-card__rating">
                    <Star size={12} strokeWidth={2.35} aria-hidden />
                    {item.rating}
                  </span>
                ) : null}
              </div>

              <div className="featured-card__body">
                <strong>{item.title}</strong>
                {item.location ? (
                  <span className="featured-card__location">
                    <MapPin size={12} strokeWidth={2.25} aria-hidden />
                    {item.location}
                  </span>
                ) : null}
                {item.meta ? <span className="featured-card__meta">{item.meta}</span> : null}
                <span className="featured-card__bottom">
                  {item.price ? <b>{item.price}</b> : <b>View details</b>}
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
