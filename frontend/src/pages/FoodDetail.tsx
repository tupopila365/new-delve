import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { FoodVenueGallery } from '../components/food/FoodVenueGallery'
import {
  CommentBox,
  DelversMoments,
  DetailActionCard,
  DetailHeroWrap,
  DetailLayout,
  DetailPage,
  DetailSkeleton,
  MobileStickyCTA,
  SocialActionRow,
} from '../components/detail'
import {
  photoCategoryLabel,
  resolveVenuePhotos,
  type DelversMoment,
  type VenueComment,
  type VenuePhoto,
  type VenuePhotoCategory,
  type VenueReview,
  type VenueReviewBreakdown,
} from '../data/foodVenueSocial'

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
  popular_dish?: string | null
  dine_in?: boolean | null
  takeaway?: boolean | null
  delivery?: boolean | null
  reservations?: boolean | null
  amenities?: string[]
  photos?: VenuePhoto[]
  review_breakdown?: VenueReviewBreakdown
  reviews?: VenueReview[]
  comments?: VenueComment[]
  delvers_moments?: DelversMoment[]
  comment_count?: number
  delvers_post_count?: number
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

const BREAKDOWN_LABELS: { key: keyof VenueReviewBreakdown; label: string }[] = [
  { key: 'food_quality', label: 'Food quality' },
  { key: 'service', label: 'Service' },
  { key: 'value', label: 'Value' },
  { key: 'atmosphere', label: 'Atmosphere' },
]

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

function knownForTags(data: Venue): string[] {
  const tags: string[] = []
  if (data.popular_dish?.trim()) tags.push(data.popular_dish.trim())
  if (data.rating_avg && parseFloat(data.rating_avg) >= 4.4) tags.push('Local favourite')
  if (data.reservations) tags.push('Book ahead')
  if (data.dine_in) tags.push('Good for groups')
  if (data.takeaway) tags.push('Quick takeaway')
  if (data.delivery) tags.push('Delivery available')

  const fill = ['Signature plates', 'Worth a detour', 'Traveller pick', 'Ask for the special']
  for (const t of fill) {
    if (tags.length >= 4) break
    if (!tags.includes(t)) tags.push(t)
  }
  return tags.slice(0, 4)
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return '1 day ago'
  if (d < 7) return `${d} days ago`
  return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })
}

function photoSrc(image: string): string {
  return mediaUrl(image) || image
}

export function FoodDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [localComments, setLocalComments] = useState<VenueComment[]>([])
  const [photoFilter, setPhotoFilter] = useState<VenuePhotoCategory | 'all'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['food', id],
    enabled: !!id,
    queryFn: () => apiFetch<Venue>(`/api/food/venues/${id}/`, { auth: false }),
  })

  const onShare = async (venueName: string) => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg(`Link to ${venueName} copied`)
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  const postComment = () => {
    const body = commentDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'Guest'
    setLocalComments((prev) => [
      {
        id: Date.now(),
        author_name: author,
        body,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ])
    setCommentDraft('')
  }

  if (isLoading || !data) {
    return (
      <DetailPage prefix="fd-detail">
        <DetailSkeleton className="fd-detail__skeleton" />
      </DetailPage>
    )
  }

  const meta = cuisineMeta(data.cuisine)
  const price = priceLabel(data.price_level)
  const priceName_ = priceName(data.price_level)
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const mapUrl = openStreetMapUrl(data.name, data.city ?? '', data.region)
  const ownerName = data.owner_display_name?.trim() || `@${data.owner_username}`
  const hours = data.opening_hours ? parseOpeningHours(data.opening_hours) : []
  const photos = resolveVenuePhotos(data.photos, data.cover_image, data.cuisine)
  const knownFor = knownForTags(data)
  const openLabel = data.is_open === true ? 'Open now' : data.is_open === false ? 'Closed' : null
  const ratingVal = data.rating_avg ? parseFloat(data.rating_avg).toFixed(1) : null
  const breakdown = data.review_breakdown
  const reviews = data.reviews ?? []
  const delversMoments = data.delvers_moments ?? []
  const commentCount = (data.comment_count ?? 0) + localComments.length
  const delversCount = data.delvers_post_count ?? delversMoments.length

  const ownerPhotos =
    photoFilter === 'all' ? photos : photos.filter((p) => p.category === photoFilter)

  const photoCategories: Array<VenuePhotoCategory | 'all'> = [
    'all',
    ...([...new Set(photos.map((p) => p.category))] as VenuePhotoCategory[]),
  ]

  const allComments = [...localComments, ...(data.comments ?? [])]

  const features = [
    data.dine_in ? 'Dine in' : null,
    data.takeaway ? 'Takeaway' : null,
    data.delivery ? 'Delivery' : null,
    data.reservations ? 'Reservations' : null,
  ].filter(Boolean) as string[]

  const websiteHref = data.website
    ? data.website.startsWith('http')
      ? data.website
      : `https://${data.website}`
    : null

  return (
    <DetailPage prefix="fd-detail" toast={shareMsg || null}>
      <DetailHeroWrap
        className="fd-detail__gallery-wrap"
        backTo="/food"
        backLabel="Food & drink"
        saved={saved}
        onSave={() => setSaved((v) => !v)}
        onShare={() => onShare(data.name)}
      >
        <FoodVenueGallery photos={photos} venueName={data.name} openLabel={openLabel} />
      </DetailHeroWrap>

      <DetailLayout
        main={
          <>
          <section className="fd-detail__identity detail-section">
            <div className="fd-detail__meta-row">
              <span className="fd-detail__cuisine-chip">
                <span aria-hidden>{meta.emoji}</span> {meta.label}
              </span>
              <span className="fd-detail__price-chip" aria-label={`Price level: ${priceName_}`} title={priceName_}>
                {price}
              </span>
              {data.is_open === true && <span className="fd-detail__open-chip">Open now</span>}
              {data.is_open === false && <span className="fd-detail__closed-chip">Closed</span>}
              <Link to={`/u/${encodeURIComponent(data.owner_username)}`} className="fd-detail__owner-link">
                By {ownerName}
              </Link>
            </div>

            <h1 className="display fd-detail__name">{data.name}</h1>
            {data.tagline && <p className="fd-detail__tagline">{data.tagline}</p>}

            {ratingVal && (
              <div className="fd-detail__rating">
                <span className="fd-detail__rating-star">★</span>
                <span className="fd-detail__rating-val">{ratingVal}</span>
                {data.rating_count ? (
                  <span className="fd-detail__rating-count">
                    {data.rating_count} {data.rating_count === 1 ? 'review' : 'reviews'}
                  </span>
                ) : null}
              </div>
            )}

            <SocialActionRow saved={saved} onSave={() => setSaved((v) => !v)} onShare={() => onShare(data.name)}>
              <Link to="/community">Ask locals</Link>
            </SocialActionRow>
          </section>

          <section className="detail-section fd-detail__known-for">
            <h2 className="fd-detail__section-title">Known for</h2>
            <div className="fd-detail__known-grid">
              {knownFor.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>

          <div className="fd-detail__location-card detail-section">
            <div className="fd-detail__location-info">
              <h2 className="fd-detail__section-title fd-detail__section-title--inline">Location</h2>
              <p className="fd-detail__location-name">{locationLine || data.region}</p>
              {data.address && <p className="fd-detail__location-address">{data.address}</p>}
            </div>
            <a href={mapUrl} className="fd-detail__map-btn" target="_blank" rel="noopener noreferrer" aria-label="View on map">
              <IconMap />
              <span>Map</span>
            </a>
          </div>

          {data.description && (
            <section className="fd-detail__desc detail-section">
              <h2 className="fd-detail__section-title">About</h2>
              <p className="fd-detail__desc-text">{data.description}</p>
            </section>
          )}

          <section className="detail-section fd-detail__owner-photos">
            <h2 className="fd-detail__section-title">Owner photos</h2>
            <p className="fd-detail__section-sub">Official images from the restaurant — food, menu, interior, and more.</p>
            <div className="fd-detail__photo-filters" role="group" aria-label="Photo categories">
              {photoCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`fd-detail__photo-filter${photoFilter === cat ? ' fd-detail__photo-filter--active' : ''}`}
                  onClick={() => setPhotoFilter(cat)}
                >
                  {cat === 'all' ? 'All' : photoCategoryLabel(cat)}
                </button>
              ))}
            </div>
            <div className="fd-detail__owner-grid">
              {ownerPhotos.map((photo) => (
                <figure key={photo.id} className="fd-detail__owner-photo">
                  <img src={photoSrc(photo.image)} alt={photo.caption || data.name} loading="lazy" />
                  <figcaption>{photoCategoryLabel(photo.category)}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          {(features.length > 0 || (data.amenities && data.amenities.length > 0)) && (
            <section className="detail-section fd-detail__features-block">
              {features.length > 0 && (
                <>
                  <h2 className="fd-detail__section-title">Features</h2>
                  <div className="chip-row fd-detail__features">
                    {features.map((f) => (
                      <span key={f} className="chip">
                        {f}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {data.amenities && data.amenities.length > 0 && (
                <div className="fd-detail__amenities">
                  <h2 className="fd-detail__section-title">Amenities</h2>
                  <div className="chip-row">
                    {data.amenities.map((a) => (
                      <span key={a} className="chip chip--muted">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {hours.length > 0 && (
            <section className="fd-detail__hours detail-section">
              <h2 className="fd-detail__section-title">Opening hours</h2>
              <ul className="fd-detail__hours-list">
                {hours.map((line, i) => (
                  <li key={i} className="fd-detail__hours-row">
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <DelversMoments
            title="Delvers moments here"
            moments={delversMoments.map((m) => ({
              id: m.id,
              image: m.image ? photoSrc(m.image) : null,
              author: m.author_username,
              body: m.body,
            }))}
            className="fd-detail__moments"
          />

          {reviews.length > 0 && breakdown && (
            <section className="detail-section fd-detail__reviews">
              <h2 className="fd-detail__section-title">Reviews</h2>
              {ratingVal && data.rating_count ? (
                <p className="fd-detail__reviews-summary">
                  ★ {ratingVal} · {data.rating_count} reviews
                </p>
              ) : null}

              <div className="fd-detail__breakdown">
                {BREAKDOWN_LABELS.map(({ key, label }) => (
                  <div key={key} className="fd-detail__breakdown-row">
                    <span className="fd-detail__breakdown-label">{label}</span>
                    <div className="fd-detail__breakdown-bar" aria-hidden>
                      <span style={{ width: `${(breakdown[key] / 5) * 100}%` }} />
                    </div>
                    <span className="fd-detail__breakdown-val">{breakdown[key].toFixed(1)}</span>
                  </div>
                ))}
              </div>

              <div className="fd-detail__review-list">
                {reviews.map((r) => (
                  <article key={r.id} className="fd-detail__review-card">
                    <div className="fd-detail__review-head">
                      <strong>{r.author_name}</strong>
                      <span>· {timeAgo(r.created_at)}</span>
                      <span className="fd-detail__review-stars" aria-label={`${r.rating} stars`}>
                        {'★'.repeat(r.rating)}
                      </span>
                    </div>
                    <p>&ldquo;{r.body}&rdquo;</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <CommentBox
            className="fd-detail__comments"
            draft={commentDraft}
            onDraftChange={setCommentDraft}
            onPost={postComment}
            comments={allComments.map((c) => ({
              id: c.id,
              author: c.author_name,
              body: c.body,
              ago: timeAgo(c.created_at),
            }))}
          />

          {(data.phone || data.website) && (
            <div className="fd-detail__contact detail-section">
              <h2 className="fd-detail__section-title">Contact</h2>
              <div className="fd-detail__contact-items">
                {data.phone && (
                  <a href={`tel:${data.phone}`} className="fd-detail__contact-link">
                    <IconPhone />
                    <span>{data.phone}</span>
                  </a>
                )}
                {websiteHref && (
                  <a href={websiteHref} className="fd-detail__contact-link" target="_blank" rel="noopener noreferrer">
                    <IconGlobe />
                    <span>{data.website!.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            </div>
          )}
          </>
        }
        sidebar={
          <DetailActionCard kicker="Ready to eat?" title={data.name}>
            {ratingVal && (
              <div className="fd-detail__action-stats">
                <span>★ {ratingVal}</span>
                <span>{commentCount} comments</span>
                <span>{delversCount} Delvers posts</span>
              </div>
            )}

            <div className="fd-detail__action-meta">
              <span>{price}</span>
              {ratingVal && <span>★ {ratingVal}</span>}
              {data.is_open === true && <span>Open now</span>}
              {data.is_open === false && <span>Closed</span>}
            </div>

            {data.popular_dish && (
              <p className="fd-detail__action-known">Known for {data.popular_dish}</p>
            )}

            {data.reservations ? (
              <button type="button" className="btn btn-primary fd-detail__primary-action">
                Reserve table
              </button>
            ) : (
              <a href={mapUrl} className="btn btn-primary fd-detail__primary-action" target="_blank" rel="noopener noreferrer">
                Get directions
              </a>
            )}

            <div className="fd-detail__action-grid">
              {data.phone && <a href={`tel:${data.phone}`}>Call</a>}
              {websiteHref && (
                <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                  Website
                </a>
              )}
              <button type="button" onClick={() => onShare(data.name)}>
                Share
              </button>
              <button type="button" onClick={() => setSaved((v) => !v)}>
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </DetailActionCard>
        }
      />

      <MobileStickyCTA
        title={data.name}
        subtitle={`${price} · ${data.is_open ? 'Open now' : 'Check hours'}`}
        action={
          <a href={mapUrl} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            Directions
          </a>
        }
        className="fd-detail__mobile-bar"
      />
    </DetailPage>
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
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.97-.97a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
