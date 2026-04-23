import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../api/client'
import { AccommodationGallery, buildGalleryItems } from '../components/AccommodationGallery'
import { MiniRating } from '../components/MiniRating'

const PROPERTY_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  guesthouse: 'Guest house',
  bed_and_breakfast: 'Bed & breakfast',
  apartment: 'Apartment / flat',
  lodge: 'Lodge',
  hostel: 'Hostel',
  villa: 'Villa / house',
  resort: 'Resort',
  camping_glamping: 'Camping / glamping',
  other: 'Other',
}

function propertyTypeLabel(v: string) {
  return PROPERTY_LABELS[v] ?? v
}

function openStreetMapSearchUrl(city: string, region: string) {
  const q = [city, region, 'Namibia'].filter(Boolean).join(', ')
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
}

function parseHouseRules(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

type FaqItem = { question: string; answer: string }
type ReviewItem = { name: string; place: string; rating: number; body: string; avatar: string | null }

/** Collapse long bodies; “Read more” reveals full text. */
const REVIEW_BODY_COLLAPSE_CHARS = 200

function reviewInitials(name: string): string {
  const parts = name
    .replace(/&/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${first}${last}`.toUpperCase().slice(0, 2)
}

function parseReviewAvatar(o: Record<string, unknown>): string | null {
  const raw = o.avatar ?? o.avatar_url ?? o.photo ?? o.profile_image
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  return s ? s : null
}

function normalizeFaqs(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return []
  const out: FaqItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as { question?: string; answer?: string }
    const q = typeof o.question === 'string' ? o.question.trim() : ''
    const a = typeof o.answer === 'string' ? o.answer.trim() : ''
    if (q && a) out.push({ question: q, answer: a })
  }
  return out
}

function parseReviewRating(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

function normalizeReviews(raw: unknown): ReviewItem[] {
  if (!Array.isArray(raw)) return []
  const out: ReviewItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    const place = typeof o.place === 'string' ? o.place.trim() : ''
    const body = typeof o.body === 'string' ? o.body.trim() : ''
    const rating = parseReviewRating(o.rating)
    const avatar = parseReviewAvatar(o)
    if (name && body) out.push({ name, place, body, rating, avatar })
  }
  return out
}

type RoomTypeItem = {
  name: string
  description: string
  max_guests: number | null
  bedrooms: number | null
  bed_summary: string
  price_per_night: string | null
  image: string | null
}

function parseOptionalUint(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.floor(v)
  if (typeof v === 'string') {
    const n = parseInt(v, 10)
    return Number.isNaN(n) || n < 0 ? null : n
  }
  return null
}

function parseRoomPrice(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string') {
    const s = v.trim()
    return s ? s : null
  }
  return null
}

function normalizeRoomTypes(raw: unknown): RoomTypeItem[] {
  if (!Array.isArray(raw)) return []
  const out: RoomTypeItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    if (!name) continue
    const description = typeof o.description === 'string' ? o.description.trim() : ''
    const bed_summary = typeof o.bed_summary === 'string' ? o.bed_summary.trim() : ''
    const imgRaw = o.image ?? o.photo
    const image = typeof imgRaw === 'string' && imgRaw.trim() ? imgRaw.trim() : null
    out.push({
      name,
      description,
      max_guests: parseOptionalUint(o.max_guests),
      bedrooms: parseOptionalUint(o.bedrooms),
      bed_summary,
      price_per_night: parseRoomPrice(o.price_per_night),
      image,
    })
  }
  return out
}

type Listing = {
  id: number
  title: string
  description: string
  region: string
  city: string
  price_per_night: string
  max_guests: number
  bedrooms: number
  amenities: string[]
  cover_image: string | null
  media_gallery?: { kind: string; src: string }[]
  check_in_from?: string
  check_out_until?: string
  house_rules?: string
  cancellation_policy?: string
  faqs?: unknown
  guest_reviews?: unknown
  room_types?: unknown
  owner_username: string
  property_type?: string
  pet_friendly?: boolean
  wifi?: boolean
  parking?: boolean
  pool?: boolean
  kitchen?: boolean
  breakfast?: boolean
  rating_avg?: string
  rating_count?: number
}

function GuestReviewCard({ r }: { r: ReviewItem }) {
  const [expanded, setExpanded] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const showPhoto = r.avatar && !avatarFailed
  const canToggle = r.body.length > REVIEW_BODY_COLLAPSE_CHARS
  const clamped = canToggle && !expanded

  return (
    <blockquote className="acc-detail__review card">
      <div className="acc-detail__review-layout">
        <div className="acc-detail__review-avatar-wrap">
          {showPhoto ? (
            <img
              className="acc-detail__review-avatar acc-detail__review-avatar--img"
              src={r.avatar!}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span className="acc-detail__review-avatar acc-detail__review-avatar--initials" aria-hidden>
              {reviewInitials(r.name)}
            </span>
          )}
        </div>
        <div className="acc-detail__review-main">
          <div className="acc-detail__review-head">
            <span className="acc-detail__review-name">{r.name}</span>
            {r.place ? <span className="acc-detail__review-place">{r.place}</span> : null}
            {r.rating > 0 ? (
              <span className="acc-detail__review-rating" aria-label={`${r.rating} out of 5`}>
                ★ {r.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <p className={`acc-detail__review-body${clamped ? ' acc-detail__review-body--clamped' : ''}`}>{r.body}</p>
          {canToggle ? (
            <button
              type="button"
              className="acc-detail__review-toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          ) : null}
        </div>
      </div>
    </blockquote>
  )
}

export function AccommodationDetail() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['acc', id],
    enabled: !!id,
    queryFn: () => apiFetch<Listing>(`/api/accommodation/listings/${id}/`, { auth: false }),
  })

  if (isLoading || !data) {
    return (
      <div className="acc-page acc-page--detail">
        <div className="skeleton acc-page__detail-skeleton" />
      </div>
    )
  }

  const faqs = normalizeFaqs(data.faqs)
  const reviews = normalizeReviews(data.guest_reviews)
  const roomTypes = normalizeRoomTypes(data.room_types)
  const rules = data.house_rules ? parseHouseRules(data.house_rules) : []
  const hasPolicies = Boolean(data.check_in_from || data.check_out_until || data.cancellation_policy)
  const mapHref = openStreetMapSearchUrl(data.city || '', data.region || '')

  return (
    <div className="acc-page acc-page--detail">
      <Link to="/accommodation" className="acc-page__back">
        ← Back to all stays
      </Link>

      <AccommodationGallery items={buildGalleryItems(data.media_gallery, data.cover_image)} title={data.title} />

      <div className="acc-detail__content">
        <h1 className="display acc-detail__title">{data.title}</h1>

        <div className="acc-detail__host-row">
          <span className="acc-detail__badge">Host listing</span>
          <span className="acc-detail__host-meta">
            {data.city ? `${data.city}, ` : ''}
            {data.region}
            <span className="acc-detail__host-dot" aria-hidden>
              ·
            </span>
            <Link to={`/u/${encodeURIComponent(data.owner_username)}`} className="acc-detail__host-link">
              @{data.owner_username}
            </Link>
          </span>
        </div>

        {(data.property_type || data.pet_friendly) && (
          <div className="acc-detail__facts">
            {data.property_type ? <span className="chip chip--muted">{propertyTypeLabel(data.property_type)}</span> : null}
            {data.pet_friendly ? <span className="chip">Pet-friendly</span> : null}
          </div>
        )}

        {(() => {
          const bits = [
            data.wifi ? 'Wi‑Fi' : null,
            data.parking ? 'Parking' : null,
            data.pool ? 'Pool' : null,
            data.kitchen ? 'Kitchen' : null,
            data.breakfast ? 'Breakfast' : null,
          ].filter(Boolean) as string[]
          if (!bits.length) return null
          return <p className="acc-detail__highlights">{bits.join(' · ')}</p>
        })()}

        <p className="acc-detail__capacity">
          {data.bedrooms} {data.bedrooms === 1 ? 'bedroom' : 'bedrooms'} · space for up to {data.max_guests} guests
        </p>

        {hasPolicies ? (
          <section className="acc-detail__card card" aria-labelledby="acc-policies-heading">
            <h2 id="acc-policies-heading" className="acc-detail__section-label">
              Policies
            </h2>
            <dl className="acc-detail__policy-grid">
              {data.check_in_from ? (
                <>
                  <dt>Check-in</dt>
                  <dd>From {data.check_in_from}</dd>
                </>
              ) : null}
              {data.check_out_until ? (
                <>
                  <dt>Check-out</dt>
                  <dd>By {data.check_out_until}</dd>
                </>
              ) : null}
            </dl>
            {data.cancellation_policy ? (
              <div className="acc-detail__policy-block">
                <h3 className="acc-detail__policy-sub">Cancellation</h3>
                <p className="acc-detail__policy-text">{data.cancellation_policy}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {rules.length > 0 ? (
          <section className="acc-detail__card card" aria-labelledby="acc-rules-heading">
            <h2 id="acc-rules-heading" className="acc-detail__section-label">
              House rules
            </h2>
            <ul className="acc-detail__rules-list">
              {rules.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="acc-detail__reassure" role="note">
          Questions about access, noise, or what&apos;s included? Message the host through DELVE when messaging is live — for now, treat this page as the host&apos;s invitation; you&apos;re not obliged until you choose to book.
        </p>

        {data.description && (
          <div className="acc-detail__desc">
            <h2 className="acc-detail__section-label acc-detail__section-label--prose">About this place</h2>
            <p>{data.description}</p>
          </div>
        )}

        <p className="acc-detail__disclaimer" role="note">
          Listing text is provided by the host. If deposits, house rules, or accessibility matter to you, double-check before any payment — in this demo, checkout is practice only.
        </p>

        {data.amenities?.length > 0 && (
          <div className="acc-detail__amenities">
            <h2 className="acc-detail__section-label">Amenities</h2>
            <div className="chip-row">
              {data.amenities.slice(0, 24).map((a) => (
                <span key={a} className="chip">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {roomTypes.length > 0 ? (
          <section className="acc-detail__rooms" aria-labelledby="acc-rooms-heading">
            <h2 id="acc-rooms-heading" className="acc-detail__section-label">
              Rooms you can book
            </h2>
            <p className="acc-detail__rooms-intro">
              The host offers more than one room or unit type. Layout, capacity, and nightly rate can differ from the
              headline &quot;from&quot; price — pick what fits your group when dates go live.
            </p>
            <div className="acc-detail__room-grid">
              {roomTypes.map((room, i) => {
                const imgSrc = mediaUrl(room.image)
                const metaBits = [
                  room.max_guests != null ? `Up to ${room.max_guests} guests` : null,
                  room.bedrooms != null
                    ? `${room.bedrooms} ${room.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`
                    : null,
                  room.bed_summary || null,
                ].filter(Boolean) as string[]
                return (
                  <article key={`${i}-${room.name}`} className="acc-detail__room card">
                    <div className="acc-detail__room-visual">
                      {imgSrc ? (
                        <img
                          className="acc-detail__room-img"
                          src={imgSrc}
                          alt={room.name}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="acc-detail__room-img acc-detail__room-img--placeholder" aria-hidden />
                      )}
                    </div>
                    <div className="acc-detail__room-body">
                      <h3 className="acc-detail__room-name">{room.name}</h3>
                      {metaBits.length > 0 ? <p className="acc-detail__room-meta">{metaBits.join(' · ')}</p> : null}
                      {room.description ? <p className="acc-detail__room-desc">{room.description}</p> : null}
                      <p className="acc-detail__room-price">
                        {room.price_per_night ? (
                          <>
                            <span className="acc-detail__room-price-amount">N${room.price_per_night}</span>
                            <span className="acc-detail__room-price-unit"> / night</span>
                          </>
                        ) : (
                          <>
                            <span className="acc-detail__room-price-amount">From N${data.price_per_night}</span>
                            <span className="acc-detail__room-price-unit"> / night</span>
                            <span className="acc-detail__room-price-note"> (listing base)</span>
                          </>
                        )}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="acc-detail__reviews" aria-labelledby="acc-reviews-heading">
          <h2 id="acc-reviews-heading" className="acc-detail__section-label acc-detail__section-label--reviews">
            Reviews
          </h2>
          <div className="acc-detail__reviews-summary card">
            {data.rating_avg != null ? (
              <>
                <div className="acc-detail__reviews-score">
                  <MiniRating rating={data.rating_avg} count={data.rating_count} />
                </div>
                <p className="acc-detail__reviews-summary-text">
                  {data.rating_count != null && data.rating_count > 0
                    ? `Based on ${data.rating_count} ${data.rating_count === 1 ? 'rating' : 'ratings'} from verified stays on DELVE.`
                    : 'Overall guest score from ratings on this listing.'}
                  {reviews.length > 0 ? ` Below are ${reviews.length} recent ${reviews.length === 1 ? 'comment' : 'comments'}.` : null}
                </p>
              </>
            ) : (
              <p className="acc-detail__reviews-summary-text acc-detail__reviews-summary-text--solo">
                {reviews.length > 0
                  ? 'No aggregate score on this listing yet — read guest comments below.'
                  : 'Ratings and written reviews will show here once guests have stayed and left feedback.'}
              </p>
            )}
          </div>
          {reviews.length > 0 ? (
            <div className="acc-detail__review-list">
              {reviews.map((r, i) => (
                <GuestReviewCard key={`${i}-${r.name}`} r={r} />
              ))}
            </div>
          ) : (
            <p className="acc-detail__reviews-empty" role="status">
              No written guest comments yet — the score above reflects overall ratings. Hosts can highlight reviews here as they grow on DELVE.
            </p>
          )}
        </section>

        {faqs.length > 0 ? (
          <section className="acc-detail__faq" aria-labelledby="acc-faq-heading">
            <h2 id="acc-faq-heading" className="acc-detail__section-label">
              Common questions
            </h2>
            <div className="acc-detail__faq-list">
              {faqs.map((f, i) => (
                <details key={`faq-${i}`} className="acc-detail__faq-item card">
                  <summary className="acc-detail__faq-q">{f.question}</summary>
                  <p className="acc-detail__faq-a">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        <section className="acc-detail__map-card card" aria-labelledby="acc-map-heading">
          <h2 id="acc-map-heading" className="acc-detail__map-title">
            Where you&apos;ll be
          </h2>
          <p className="acc-detail__map-sub">{data.city ? `${data.city}, ` : ''}{data.region}</p>
          <p className="acc-detail__map-copy">
            Open the area on OpenStreetMap to plan your route — buses, rides, or self-drive from town centres and airports.
          </p>
          <a href={mapHref} className="btn btn-primary acc-detail__map-btn" target="_blank" rel="noopener noreferrer">
            View on map
          </a>
        </section>
      </div>

      <div className="acc-detail__spacer" aria-hidden />

      <div className="acc-detail__sticky">
        <div className="acc-detail__bar card">
          <div className="acc-detail__bar-price">
            <span className="acc-detail__bar-label">From</span>
            <div className="acc-detail__bar-amount">
              N${data.price_per_night}
              <span className="acc-detail__bar-unit"> / night</span>
            </div>
            <p className="acc-detail__bar-hint">Next step is choosing dates — payment here is a safe demo only, never a real charge today.</p>
          </div>
          <Link to={`/accommodation/${data.id}/book`} className="btn btn-primary acc-detail__bar-cta">
            Choose dates
          </Link>
        </div>
      </div>
    </div>
  )
}
