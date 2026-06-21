import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Star } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { promotionHref, trackPromotion } from '../utils/promotionTrack'
import './Featured.css'

export type FeaturedItem = {
  id: string | number
  title: string
  href: string
  image?: string | null
  fallbackImage: string
  eyebrow?: string
  isFeaturedPartner?: boolean
  partnerLabel?: string
  promotionId?: number
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

function FeaturedCard({ item }: { item: FeaturedItem }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const src = item.image || item.fallbackImage
  const href = promotionHref(item.href, item.promotionId)

  useEffect(() => {
    if (!item.promotionId || !ref.current) return
    const node = ref.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackPromotion(item.promotionId!, 'impression')
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [item.promotionId])

  return (
    <Link
      ref={ref}
      to={href}
      className="featured-card"
      onClick={() => {
        if (item.promotionId) trackPromotion(item.promotionId, 'click')
      }}
    >
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
        {item.isFeaturedPartner && item.partnerLabel ? (
          <span className="featured-card__partner">{item.partnerLabel}</span>
        ) : item.eyebrow ? (
          <span className="featured-card__eyebrow">{item.eyebrow}</span>
        ) : null}
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
        {items.map((item) => (
          <FeaturedCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
