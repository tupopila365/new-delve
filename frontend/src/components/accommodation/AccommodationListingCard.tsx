import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  BedDouble,
  Bookmark,
  Building2,
  Heart,
  MapPin,
  PawPrint,
  Share2,
  Star,
  Users,
  Wifi,
} from 'lucide-react'
import { mediaUrl } from '../../api/client'
import './AccommodationListingCard.css'

export type AccommodationCardListing = {
  id: number
  title: string
  region: string
  city?: string | null
  price_per_night: string
  max_guests?: number | null
  bedrooms?: number | null
  cover_image: string | null
  property_type?: string | null
  pet_friendly?: boolean
  wifi?: boolean
  pool?: boolean
  parking?: boolean
  kitchen?: boolean
  breakfast?: boolean
  rating_avg?: string | null
  rating_count?: number | null
  likes_count?: number
  liked_by_me?: boolean
}

type Props = {
  listing: AccommodationCardListing
  typeLabel?: string | null
  liked: boolean
  saved: boolean
  likeCount: number
  likeBusy?: boolean
  onLike: (event: MouseEvent) => void
  onSave: (event: MouseEvent) => void
  onShare: (event: MouseEvent) => void
}

const FALLBACK_IMAGES: Record<string, string> = {
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  guesthouse: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
  apartment: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  lodge: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  hostel: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
  villa: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  resort: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
  bed_and_breakfast: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80',
  camping_glamping: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80',
  other: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
}

function fallbackImage(type?: string | null) {
  return FALLBACK_IMAGES[(type || '').toLowerCase()] ?? FALLBACK_IMAGES.other
}

function formatType(type?: string | null) {
  if (!type) return 'Stay'
  return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function location(listing: AccommodationCardListing) {
  return listing.city ? `${listing.city}, ${listing.region}` : listing.region
}

export function AccommodationListingCard({
  listing,
  typeLabel,
  liked,
  saved,
  likeCount,
  likeBusy,
  onLike,
  onSave,
  onShare,
}: Props) {
  const fallback = fallbackImage(listing.property_type)
  const src = mediaUrl(listing.cover_image) || fallback
  const rating = listing.rating_avg ? Number.parseFloat(listing.rating_avg).toFixed(1) : null
  const tags = [
    listing.wifi ? 'Wi-Fi' : null,
    listing.pet_friendly ? 'Pet friendly' : null,
    listing.pool ? 'Pool' : null,
    listing.parking ? 'Parking' : null,
    listing.breakfast ? 'Breakfast' : null,
  ].filter(Boolean).slice(0, 3)

  return (
    <article className="stay-card-v2">
      <Link to={`/accommodation/${listing.id}`} className="stay-card-v2__media" aria-label={`View ${listing.title}`}>
        <img
          src={src}
          alt={listing.title}
          loading="lazy"
          onError={(event) => {
            const image = event.currentTarget
            if (image.src !== fallback) image.src = fallback
          }}
        />
        <span className="stay-card-v2__type"><Building2 size={12} strokeWidth={2.35} aria-hidden />{typeLabel || formatType(listing.property_type)}</span>
        {rating ? <span className="stay-card-v2__rating"><Star size={12} strokeWidth={2.35} aria-hidden />{rating}</span> : null}
      </Link>

      <div className="stay-card-v2__body">
        <div className="stay-card-v2__topline">
          <div>
            <Link to={`/accommodation/${listing.id}`} className="stay-card-v2__title">{listing.title}</Link>
            <p className="stay-card-v2__location"><MapPin size={13} strokeWidth={2.25} aria-hidden />{location(listing)}</p>
          </div>
          <p className="stay-card-v2__price"><span>From</span>${listing.price_per_night}<small>/night</small></p>
        </div>

        <div className="stay-card-v2__facts" aria-label="Stay facts">
          {listing.bedrooms != null ? <span><BedDouble size={13} strokeWidth={2.25} aria-hidden />{listing.bedrooms} bed{listing.bedrooms === 1 ? '' : 's'}</span> : null}
          {listing.max_guests != null ? <span><Users size={13} strokeWidth={2.25} aria-hidden />{listing.max_guests} guests</span> : null}
          {listing.wifi ? <span><Wifi size={13} strokeWidth={2.25} aria-hidden />Wi-Fi</span> : null}
          {listing.pet_friendly ? <span><PawPrint size={13} strokeWidth={2.25} aria-hidden />Pets</span> : null}
        </div>

        {tags.length > 0 ? (
          <div className="stay-card-v2__tags">
            {tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        ) : null}

        <div className="stay-card-v2__actions">
          <button type="button" className={liked ? 'is-active' : ''} disabled={likeBusy} onClick={onLike} aria-label={liked ? 'Unlike stay' : 'Like stay'}>
            <Heart size={17} strokeWidth={2.35} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            {likeCount > 0 ? likeCount : 'Like'}
          </button>
          <button type="button" className={saved ? 'is-active' : ''} onClick={onSave} aria-label={saved ? 'Remove saved stay' : 'Save stay'}>
            <Bookmark size={17} strokeWidth={2.35} fill={saved ? 'currentColor' : 'none'} aria-hidden />
            {saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" onClick={onShare} aria-label="Share stay">
            <Share2 size={17} strokeWidth={2.35} aria-hidden />
            Share
          </button>
        </div>
      </div>
    </article>
  )
}
