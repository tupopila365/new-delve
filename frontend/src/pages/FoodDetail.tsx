import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'

type Venue = {
  id: number
  name: string
  description: string
  cuisine: string
  region: string
  city?: string | null
  address?: string | null
  price_level: number
  cover_image: string | null
  owner_username: string
  owner_display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
  phone?: string | null
  website?: string | null
  opening_hours?: string | null
  is_open?: boolean | null
  tagline?: string | null
  dine_in?: boolean | null
  takeaway?: boolean | null
  delivery?: boolean | null
  reservations?: boolean | null
  amenities?: string[]
}

const CUISINE_META: Record<string, { label: string; emoji: string }> = {
  local: { label: 'Local cuisine', emoji: '🍖' },
  grill: { label: 'Grill', emoji: '🔥' },
  seafood: { label: 'Seafood', emoji: '🦞' },
  cafe: { label: 'Café', emoji: '☕' },
  bakery: { label: 'Bakery', emoji: '🥐' },
  pizza: { label: 'Pizza', emoji: '🍕' },
  asian: { label: 'Asian', emoji: '🍜' },
  fast_food: { label: 'Fast food', emoji: '🍔' },
  bar: { label: 'Bar', emoji: '🍺' },
  other: { label: 'Restaurant', emoji: '🍽' },
}

function cuisineMeta(value: string) {
  return CUISINE_META[value] ?? { label: value, emoji: '🍽' }
}

function priceLabel(level: number): string {
  return '$'.repeat(Math.max(1, Math.min(4, level || 1)))
}

function priceName(level: number): string {
  return ['', 'Budget', 'Mid-range', 'Upscale', 'Fine dining'][Math.min(4, level || 1)] ?? ''
}

function openStreetMapUrl(name: string, city: string, region: string) {
  const q = [name, city, region].filter(Boolean).join(', ')
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
}

function parseOpeningHours(raw: string): string[] {
  return raw.split('\n').map((l) => l.trim()).filter(Boolean)
}

export function FoodDetail() {
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['food', id],
    enabled: !!id,
    queryFn: () => apiFetch<Venue>(`/api/food/venues/${id}/`, { auth: false }),
  })

  if (isLoading || !data) {
    return (
      <div className="fd-detail">
        <div className="skeleton fd-detail__skeleton" />
      </div>
    )
  }

  const meta = cuisineMeta(data.cuisine)
  const price = priceLabel(data.price_level)
  const priceName_ = priceName(data.price_level)
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const mapUrl = openStreetMapUrl(data.name, data.city ?? '', data.region)
  const ownerName = data.owner_display_name?.trim() || `@${data.owner_username}`
  const hours = data.opening_hours ? parseOpeningHours(data.opening_hours) : []

  const features = [
    data.dine_in ? 'Dine in' : null,
    data.takeaway ? 'Takeaway' : null,
    data.delivery ? 'Delivery' : null,
    data.reservations ? 'Reservations' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="fd-detail">
      <Link to="/food" className="fd-detail__back">← Back to food &amp; drink</Link>

      {/* Cover image */}
      {data.cover_image ? (
        <img
          className="fd-detail__cover"
          src={mediaUrl(data.cover_image) || ''}
          alt={data.name}
        />
      ) : (
        <div className="fd-detail__cover fd-detail__cover--placeholder">
          <span aria-hidden>{meta.emoji}</span>
        </div>
      )}

      <div className="fd-detail__content">

        {/* Top meta row */}
        <div className="fd-detail__meta-row">
          <span className="fd-detail__cuisine-chip">
            <span aria-hidden>{meta.emoji}</span> {meta.label}
          </span>
          <span
            className="fd-detail__price-chip"
            aria-label={`Price level: ${priceName_}`}
            title={priceName_}
          >
            {price}
          </span>
          {data.is_open === true && <span className="fd-detail__open-chip">Open now</span>}
          {data.is_open === false && <span className="fd-detail__closed-chip">Closed</span>}
          <Link
            to={`/u/${encodeURIComponent(data.owner_username)}`}
            className="fd-detail__owner-link"
          >
            By {ownerName}
          </Link>
        </div>

        {/* Name */}
        <h1 className="display fd-detail__name">{data.name}</h1>
        {data.tagline && <p className="fd-detail__tagline">{data.tagline}</p>}

        {/* Rating */}
        {data.rating_avg != null && (
          <div className="fd-detail__rating">
            <span className="fd-detail__rating-star">★</span>
            <span className="fd-detail__rating-val">
              {parseFloat(data.rating_avg).toFixed(1)}
            </span>
            {data.rating_count ? (
              <span className="fd-detail__rating-count">
                {data.rating_count} {data.rating_count === 1 ? 'rating' : 'ratings'}
              </span>
            ) : null}
          </div>
        )}

        {/* Location card */}
        <div className="fd-detail__location-card card">
          <div className="fd-detail__location-info">
            <p className="fd-detail__location-name">{locationLine || data.region}</p>
            {data.address && (
              <p className="fd-detail__location-address">{data.address}</p>
            )}
          </div>
          <a
            href={mapUrl}
            className="fd-detail__map-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on map"
          >
            <IconMap />
            <span>Map</span>
          </a>
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div className="chip-row fd-detail__features">
            {features.map((f) => (
              <span key={f} className="chip">{f}</span>
            ))}
          </div>
        )}

        {/* Amenities */}
        {data.amenities && data.amenities.length > 0 && (
          <div className="fd-detail__amenities">
            <h2 className="fd-detail__section-label">Amenities</h2>
            <div className="chip-row">
              {data.amenities.map((a) => (
                <span key={a} className="chip chip--muted">{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <section className="fd-detail__desc">
            <h2 className="fd-detail__section-label">About</h2>
            <p className="fd-detail__desc-text">{data.description}</p>
          </section>
        )}

        {/* Opening hours */}
        {hours.length > 0 && (
          <section className="fd-detail__hours card">
            <h2 className="fd-detail__section-label">Opening hours</h2>
            <ul className="fd-detail__hours-list">
              {hours.map((line, i) => (
                <li key={i} className="fd-detail__hours-row">{line}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Contact */}
        {(data.phone || data.website) && (
          <div className="fd-detail__contact card">
            <h2 className="fd-detail__section-label">Contact</h2>
            <div className="fd-detail__contact-items">
              {data.phone && (
                <a href={`tel:${data.phone}`} className="fd-detail__contact-link">
                  <IconPhone />
                  <span>{data.phone}</span>
                </a>
              )}
              {data.website && (
                <a
                  href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                  className="fd-detail__contact-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconGlobe />
                  <span>{data.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function IconMap() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.97-.97a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}
