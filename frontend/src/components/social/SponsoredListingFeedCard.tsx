import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import '../Featured.css'
import './sponsored-feed.css'

export type SponsoredListingFeedItem = {
  id: string | number
  feed_item_type: 'sponsored_listing'
  is_sponsored?: boolean
  sponsor_label?: string
  listing_type: string
  listing_id: number
  listing_title: string
  listing_subtitle?: string
  listing_image?: string | null
  listing_meta?: string
  listing_price?: string
  listing_href: string
}

const FALLBACK = '/images/default-journey.jpg'

export function SponsoredListingFeedCard({ item }: { item: SponsoredListingFeedItem }) {
  const image = mediaUrl(item.listing_image) || FALLBACK
  const label = item.sponsor_label?.trim() || 'Sponsored'

  return (
    <article className="ds-post ds-post--sponsored-listing">
      <span className="featured-card__partner ds-post__sponsored">{label}</span>
      <Link to={item.listing_href} className="ds-sponsored-listing">
        <div className="ds-sponsored-listing__media">
          <img
            src={image}
            alt=""
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget
              if (img.src !== FALLBACK) img.src = FALLBACK
            }}
          />
        </div>
        <div className="ds-sponsored-listing__body">
          <span className="ds-sponsored-listing__type">{item.listing_meta || item.listing_type}</span>
          <strong>{item.listing_title}</strong>
          {item.listing_subtitle ? (
            <span className="ds-sponsored-listing__location">
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {item.listing_subtitle}
            </span>
          ) : null}
          <span className="ds-sponsored-listing__cta">
            {item.listing_price || 'View details'}
            <ArrowRight size={14} strokeWidth={2.4} aria-hidden />
          </span>
        </div>
      </Link>
    </article>
  )
}
