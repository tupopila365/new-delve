import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { RoomPhotoCarousel } from '../components/RoomPhotoCarousel'
import { AccommodationGallery, buildGalleryItems } from '../components/AccommodationGallery'
import { GuestReviewCard, normalizeReviews } from '../components/GuestReviewCard'
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
  const q = [city, region].filter(Boolean).join(', ')
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
}

function parseHouseRules(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

type AccTopicId = 'policies' | 'rules' | 'about' | 'amenities' | 'rooms' | 'reviews' | 'faq' | 'location'

type FaqItem = { question: string; answer: string }

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

type RoomTypeItem = {
  name: string
  description: string
  max_guests: number | null
  bedrooms: number | null
  bed_summary: string
  price_per_night: string | null
  image: string | null
  images: string[]   // one or more room photos; always at least the cover if available
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
    // Support multiple room photos: backend may send images[], gallery[], or photos[]
    const rawImgs = o.images ?? o.gallery ?? o.photos
    let images: string[] = []
    if (Array.isArray(rawImgs)) {
      images = (rawImgs as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
    }
    if (images.length === 0 && image) images = [image]

    out.push({
      name,
      description,
      max_guests: parseOptionalUint(o.max_guests),
      bedrooms: parseOptionalUint(o.bedrooms),
      bed_summary,
      price_per_night: parseRoomPrice(o.price_per_night),
      image,
      images,
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

export function AccommodationDetail() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['acc', id],
    enabled: !!id,
    queryFn: () => apiFetch<Listing>(`/api/accommodation/listings/${id}/`, { auth: false }),
  })

  const faqs = useMemo(() => (data ? normalizeFaqs(data.faqs) : []), [data])
  const reviews = useMemo(() => (data ? normalizeReviews(data.guest_reviews) : []), [data])
  const roomTypes = useMemo(() => (data ? normalizeRoomTypes(data.room_types) : []), [data])
  const rules = useMemo(() => (data?.house_rules ? parseHouseRules(data.house_rules) : []), [data])
  const hasPolicies = Boolean(data?.check_in_from || data?.check_out_until || data?.cancellation_policy)

  const accTopics = useMemo(() => {
    if (!data) return [] as { id: AccTopicId; label: string }[]
    const t: { id: AccTopicId; label: string }[] = []
    if (hasPolicies) t.push({ id: 'policies', label: 'Policies' })
    if (rules.length > 0) t.push({ id: 'rules', label: 'Rules' })
    if (data.description?.trim()) t.push({ id: 'about', label: 'About' })
    if (data.amenities && data.amenities.length > 0) t.push({ id: 'amenities', label: 'Amenities' })
    if (roomTypes.length > 0) t.push({ id: 'rooms', label: 'Rooms' })
    t.push({ id: 'reviews', label: 'Reviews' })
    if (faqs.length > 0) t.push({ id: 'faq', label: 'FAQ' })
    t.push({ id: 'location', label: 'Location' })
    return t
  }, [data, hasPolicies, rules, roomTypes, faqs])

  const [activeTopic, setActiveTopic] = useState<AccTopicId>('reviews')
  const tabBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!data || accTopics.length === 0) return
    setActiveTopic((prev) =>
      accTopics.some((t) => t.id === prev) ? prev : accTopics[0].id,
    )
  }, [data?.id, accTopics])

  const switchTopic = (topicId: AccTopicId) => {
    setActiveTopic(topicId)
    tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  if (isLoading || !data) {
    return (
      <div className="td">
        <div className="skeleton acc-page__detail-skeleton" />
      </div>
    )
  }

  const mapHref = openStreetMapSearchUrl(data.city || '', data.region || '')
  const galleryItems = buildGalleryItems(data.media_gallery, data.cover_image)
  const amenityChips = [
    data.wifi ? 'Wi‑Fi' : null,
    data.parking ? 'Parking' : null,
    data.pool ? 'Pool' : null,
    data.kitchen ? 'Kitchen' : null,
    data.breakfast ? 'Breakfast' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="td">
      <section className="td-hero acc-td-hero" aria-label={data.title}>
        {galleryItems.length > 0 ? (
          <AccommodationGallery variant="hero" items={galleryItems} title={data.title} />
        ) : (
          <div className="acc-td-hero__placeholder" aria-label="No photos yet">
            <span>Photo coming from host</span>
          </div>
        )}
        <div className="td-hero__scrim" aria-hidden />
        <div className="td-hero__bar">
          <Link to="/accommodation" className="td-hero__back">
            ← Back
          </Link>
        </div>
        <div className="td-hero__footer">
          <h1 className="td-hero__title">{data.title}</h1>
          <div className="td-hero__chips">
            {(data.city || data.region) && (
              <span className="td-hero__chip">{[data.city, data.region].filter(Boolean).join(', ')}</span>
            )}
            {data.property_type ? <span className="td-hero__chip">{propertyTypeLabel(data.property_type)}</span> : null}
            <span className="td-hero__chip">${data.price_per_night}+ / night</span>
            <span className="td-hero__chip">
              {data.bedrooms} {data.bedrooms === 1 ? 'bedroom' : 'bedrooms'} · {data.max_guests} guests
            </span>
            {data.pet_friendly ? <span className="td-hero__chip">Pet-friendly</span> : null}
            {amenityChips.slice(0, 3).map((a) => (
              <span key={a} className="td-hero__chip">
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="td-author">
        <Link
          to={`/u/${encodeURIComponent(data.owner_username)}`}
          className="td-author__avatar td-author__avatar--init"
          aria-label={`Host @${data.owner_username}`}
        >
          {(data.owner_username[0] ?? '?').toUpperCase()}
        </Link>
        <div className="td-author__text">
          <p className="td-author__name">@{data.owner_username}</p>
          <p className="td-author__dates">
            Host listing
            {data.city || data.region
              ? ` · ${[data.city, data.region].filter(Boolean).join(', ')}`
              : ''}
          </p>
        </div>
        <span className="acc-detail__badge acc-detail__badge--td">Host listing</span>
      </div>

      <div className="td-stats">
        <div className="td-stat">
          <p className="td-stat__val">${data.price_per_night}</p>
          <p className="td-stat__key">From / night</p>
        </div>
        <div className="td-stat">
          <p className="td-stat__val">{data.bedrooms}</p>
          <p className="td-stat__key">{data.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</p>
        </div>
        <div className="td-stat">
          <p className="td-stat__val">{data.max_guests}</p>
          <p className="td-stat__key">Guests max</p>
        </div>
        {data.rating_avg != null ? (
          <div className="td-stat">
            <p className="td-stat__val">{data.rating_avg}</p>
            <p className="td-stat__key">
              Rating
              {data.rating_count != null && data.rating_count > 0 ? ` (${data.rating_count})` : ''}
            </p>
          </div>
        ) : (
          <div className="td-stat">
            <p className="td-stat__val">—</p>
            <p className="td-stat__key">Rating</p>
          </div>
        )}
      </div>

      <div className="acc-detail__lead">
        <p className="acc-detail__reassure acc-detail__reassure--td" role="note">
          Questions about access, noise, or what&apos;s included? Message the host through DELVE when messaging is live — for now, treat this page as the host&apos;s invitation; you&apos;re not obliged until you choose to book.
        </p>
        <p className="acc-detail__disclaimer acc-detail__disclaimer--td" role="note">
          Listing text is provided by the host. If deposits, house rules, or accessibility matter to you, double-check before any payment — in this demo, checkout is practice only.
        </p>
      </div>

      {accTopics.length > 0 && (
        <div ref={tabBarRef} className="td-tabs" role="tablist" aria-label="Listing sections">
          {accTopics.map(({ id: topicId, label }) => (
            <button
              key={topicId}
              type="button"
              role="tab"
              aria-selected={activeTopic === topicId}
              aria-controls={`acc-panel-${topicId}`}
              id={`acc-tab-${topicId}`}
              className={`td-tab${activeTopic === topicId ? ' td-tab--active' : ''}`}
              onClick={() => switchTopic(topicId)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="td-content">
          {activeTopic === 'policies' && hasPolicies ? (
            <div className="td-route-tab">
            <section
              id="acc-panel-policies"
              role="tabpanel"
              aria-labelledby="acc-tab-policies"
              className="acc-detail__card card"
            >
              <h2 className="acc-detail__section-label">Policies</h2>
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
            </div>
          ) : null}

          {activeTopic === 'rules' && rules.length > 0 ? (
            <div className="td-route-tab">
            <section
              id="acc-panel-rules"
              role="tabpanel"
              aria-labelledby="acc-tab-rules"
              className="acc-detail__card card"
            >
              <h2 className="acc-detail__section-label">House rules</h2>
              <ul className="acc-detail__rules-list">
                {rules.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            </div>
          ) : null}

          {activeTopic === 'about' && data.description?.trim() ? (
            <div className="td-route-tab">
            <div
              id="acc-panel-about"
              role="tabpanel"
              aria-labelledby="acc-tab-about"
              className="acc-detail__desc"
            >
              <h2 className="acc-detail__section-label acc-detail__section-label--prose">About this place</h2>
              <p>{data.description}</p>
            </div>
            </div>
          ) : null}

          {activeTopic === 'amenities' && (data.amenities?.length ?? 0) > 0 ? (
            <div className="td-route-tab">
            <div
              id="acc-panel-amenities"
              role="tabpanel"
              aria-labelledby="acc-tab-amenities"
              className="acc-detail__amenities"
            >
              <h2 className="acc-detail__section-label">Amenities</h2>
              <div className="chip-row">
                {data.amenities!.slice(0, 24).map((a) => (
                  <span key={a} className="chip">
                    {a}
                  </span>
                ))}
              </div>
            </div>
            </div>
          ) : null}

          {activeTopic === 'rooms' && roomTypes.length > 0 ? (
            <div className="td-route-tab">
            <section
              id="acc-panel-rooms"
              role="tabpanel"
              aria-labelledby="acc-tab-rooms"
              className="acc-detail__rooms"
            >
              <h2 id="acc-rooms-heading" className="acc-detail__section-label">
                Rooms you can book
              </h2>
              <p className="acc-detail__rooms-intro">
                The host offers more than one room or unit type. Layout, capacity, and nightly rate can differ from the
                headline &quot;from&quot; price — pick what fits your group when dates go live.
              </p>
              <div className="acc-detail__room-grid">
                {roomTypes.map((room, i) => {
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
                        <RoomPhotoCarousel images={room.images} name={room.name} />
                      </div>
                      <div className="acc-detail__room-body">
                        <h3 className="acc-detail__room-name">{room.name}</h3>
                        {metaBits.length > 0 ? <p className="acc-detail__room-meta">{metaBits.join(' · ')}</p> : null}
                        {room.description ? <p className="acc-detail__room-desc">{room.description}</p> : null}
                        <p className="acc-detail__room-price">
                          {room.price_per_night ? (
                            <>
                              <span className="acc-detail__room-price-amount">${room.price_per_night}</span>
                              <span className="acc-detail__room-price-unit"> / night</span>
                            </>
                          ) : (
                            <>
                              <span className="acc-detail__room-price-amount">From ${data.price_per_night}</span>
                              <span className="acc-detail__room-price-unit"> / night</span>
                              <span className="acc-detail__room-price-note"> (listing base)</span>
                            </>
                          )}
                        </p>
                        <Link
                          to={`/accommodation/${id}/book?room=${encodeURIComponent(room.name)}`}
                          className="btn btn-primary acc-detail__room-book"
                        >
                          Book this room
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
            </div>
          ) : null}

          {activeTopic === 'reviews' ? (
            <div className="td-route-tab">
            <section
              id="acc-panel-reviews"
              role="tabpanel"
              aria-labelledby="acc-tab-reviews"
              className="acc-detail__reviews"
            >
              <h2 className="acc-detail__section-label acc-detail__section-label--reviews">Reviews</h2>
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
            </div>
          ) : null}

          {activeTopic === 'faq' && faqs.length > 0 ? (
            <div className="td-route-tab">
            <section
              id="acc-panel-faq"
              role="tabpanel"
              aria-labelledby="acc-tab-faq"
              className="acc-detail__faq"
            >
              <h2 className="acc-detail__section-label">Common questions</h2>
              <div className="acc-detail__faq-list">
                {faqs.map((f, i) => (
                  <details key={`faq-${i}`} className="acc-detail__faq-item card">
                    <summary className="acc-detail__faq-q">{f.question}</summary>
                    <p className="acc-detail__faq-a">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
            </div>
          ) : null}

          {activeTopic === 'location' ? (
            <div className="td-route-tab">
            <section
              id="acc-panel-location"
              role="tabpanel"
              aria-labelledby="acc-tab-location"
              className="acc-detail__map-card card"
            >
              <h2 className="acc-detail__map-title">Where you&apos;ll be</h2>
              <p className="acc-detail__map-sub">{data.city ? `${data.city}, ` : ''}{data.region}</p>
              <p className="acc-detail__map-copy">
                Open the area on OpenStreetMap to plan your route — buses, rides, or self-drive from town centres and airports.
              </p>
              <a href={mapHref} className="btn btn-primary acc-detail__map-btn" target="_blank" rel="noopener noreferrer">
                View on map
              </a>
            </section>
            </div>
          ) : null}
      </div>
    </div>
  )
}
