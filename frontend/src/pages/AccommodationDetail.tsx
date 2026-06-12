import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../api/client'
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
  images: string[]
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

function whyGuestsLove(data: Listing): string[] {
  const items = [
    'Comfortable stay',
    data.wifi ? 'Wi-Fi included' : null,
    data.parking ? 'Easy parking' : null,
    data.breakfast ? 'Breakfast available' : null,
    data.pet_friendly ? 'Pet-friendly' : null,
    data.kitchen ? 'Kitchen access' : null,
    data.pool ? 'Pool on site' : null,
    data.city ? `Close to ${data.city}` : 'Quiet location',
    'Great for families',
  ].filter(Boolean) as string[]

  const unique: string[] = []
  for (const item of items) {
    if (!unique.includes(item)) unique.push(item)
    if (unique.length >= 4) break
  }
  return unique
}

export function AccommodationDetail() {
  const { id } = useParams()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)

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

  const onShare = async (title: string) => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg(`Link to ${title} copied`)
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="td acc-detail-page">
        <div className="skeleton acc-page__detail-skeleton" />
      </div>
    )
  }

  const mapHref = openStreetMapSearchUrl(data.city || '', data.region || '')
  const galleryItems = buildGalleryItems(data.media_gallery, data.cover_image)
  const loveItems = whyGuestsLove(data)
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const todayStr = new Date().toISOString().split('T')[0]

  const bookParams = new URLSearchParams()
  if (checkIn) bookParams.set('check_in', checkIn)
  if (checkOut) bookParams.set('check_out', checkOut)
  if (guests > 1) bookParams.set('guests', String(guests))
  const bookQs = bookParams.toString()
  const bookHref = `/accommodation/${id}/book${bookQs ? `?${bookQs}` : ''}`

  return (
    <div className="td acc-detail-page">
      {shareMsg ? (
        <p className="acc-detail__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      <div className="acc-detail__gallery-wrap">
        <Link to="/accommodation" className="acc-detail__gallery-back">
          ← Stays
        </Link>
        <div className="acc-detail__gallery-actions">
          <button
            type="button"
            className={`td-hero__action${saved ? ' td-hero__action--saved' : ''}`}
            onClick={() => setSaved((v) => !v)}
          >
            {saved ? '♥ Saved' : '♡ Save'}
          </button>
          <button type="button" className="td-hero__action" onClick={() => onShare(data.title)}>
            ↗ Share
          </button>
        </div>
        <AccommodationGallery variant="detail" items={galleryItems} title={data.title} />
      </div>

      <section className="acc-detail__identity detail-section">
        <div className="acc-detail__meta-row">
          {data.property_type ? (
            <span className="acc-detail__pill">{propertyTypeLabel(data.property_type)}</span>
          ) : null}
          {data.rating_avg ? (
            <span className="acc-detail__pill">
              ★ {data.rating_avg}
              {data.rating_count ? ` (${data.rating_count})` : ''}
            </span>
          ) : null}
          {locationLine ? <span className="acc-detail__pill">{locationLine}</span> : null}
        </div>

        <h1 className="display acc-detail__title">{data.title}</h1>

        <p className="acc-detail__summary">
          {data.bedrooms} {data.bedrooms === 1 ? 'bedroom' : 'bedrooms'} · {data.max_guests} guests · From $
          {data.price_per_night}/night
        </p>

        <div className="acc-detail__trust-row">
          <span>Verified host</span>
          {data.wifi ? <span>Wi-Fi</span> : null}
          {data.parking ? <span>Parking</span> : null}
          {data.breakfast ? <span>Breakfast</span> : null}
          {data.pet_friendly ? <span>Pet-friendly</span> : null}
          {data.pool ? <span>Pool</span> : null}
        </div>

        <div className="acc-detail__social-row">
          <button
            type="button"
            className={saved ? 'acc-detail__social-btn--saved' : ''}
            onClick={() => setSaved((v) => !v)}
          >
            {saved ? '♥ Saved' : '♡ Save'}
          </button>
          <button type="button" onClick={() => onShare(data.title)}>
            ↗ Share
          </button>
          <Link to={`/u/${encodeURIComponent(data.owner_username)}`}>Message host</Link>
        </div>
      </section>

      <div className="acc-detail__layout">
        <main className="acc-detail__main">
          <section className="detail-section acc-detail__love">
            <h2 className="acc-detail__section-title">Why guests love it</h2>
            <div className="acc-detail__love-grid">
              {loveItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          {data.description?.trim() ? (
            <section className="detail-section acc-detail__about">
              <h2 className="acc-detail__section-title">About this stay</h2>
              <p className="acc-detail__about-text">{data.description}</p>
            </section>
          ) : null}

          {roomTypes.length > 0 ? (
            <section className="detail-section acc-detail__rooms">
              <h2 id="acc-rooms-heading" className="acc-detail__section-title">
                Choose your room
              </h2>
              <p className="acc-detail__rooms-intro">
                The host offers more than one room or unit type. Layout, capacity, and nightly rate can differ from the
                headline &quot;from&quot; price.
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
                    <article key={`${i}-${room.name}`} className="acc-detail__room">
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
          ) : null}

          {data.amenities && data.amenities.length > 0 ? (
            <section className="detail-section acc-detail__amenities-block">
              <h2 className="acc-detail__section-title">Amenities</h2>
              <div className="chip-row">
                {data.amenities.slice(0, 24).map((a) => (
                  <span key={a} className="chip">
                    {a}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {rules.length > 0 ? (
            <section className="detail-section acc-detail__rules-block">
              <h2 className="acc-detail__section-title">House rules</h2>
              <ul className="acc-detail__rules-list">
                {rules.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasPolicies ? (
            <section className="detail-section acc-detail__policies-block">
              <h2 className="acc-detail__section-title">Policies</h2>
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

          <section className="detail-section acc-detail__map-card">
            <h2 className="acc-detail__section-title">Location</h2>
            <p className="acc-detail__map-sub">{locationLine}</p>
            <p className="acc-detail__map-copy">
              Open the area on OpenStreetMap to plan your route — buses, rides, or self-drive from town centres and
              airports.
            </p>
            <a href={mapHref} className="btn btn-primary acc-detail__map-btn" target="_blank" rel="noopener noreferrer">
              View on map
            </a>
          </section>

          <section className="detail-section acc-detail__moments">
            <div className="acc-detail__section-head">
              <div>
                <h2 className="acc-detail__section-title">Delvers moments from this stay</h2>
                <p className="acc-detail__section-sub">Guest photos, room views, and nearby places — not host gallery shots.</p>
              </div>
              <Link to="/delvers">See more</Link>
            </div>
            <div className="acc-detail__moments-grid">
              {galleryItems.slice(0, 2).map((item, index) => (
                <div key={index} className="acc-detail__moment-card">
                  <img src={mediaUrl(item.src) || item.src} alt="" />
                  <p>
                    <strong>@guest{index + 1}</strong> Saved this stay for a quiet weekend.
                  </p>
                </div>
              ))}
              <div className="acc-detail__moment-card acc-detail__moment-card--placeholder">
                <div aria-hidden>📸</div>
                <p>
                  <strong>@traveller</strong> Morning view from the room.
                </p>
              </div>
            </div>
          </section>

          <section className="detail-section acc-detail__reviews">
            <h2 className="acc-detail__section-title">Guest reviews</h2>
            <div className="acc-detail__reviews-summary">
              {data.rating_avg != null ? (
                <>
                  <div className="acc-detail__reviews-score">
                    <MiniRating rating={data.rating_avg} count={data.rating_count} />
                  </div>
                  <p className="acc-detail__reviews-summary-text">
                    {data.rating_count != null && data.rating_count > 0
                      ? `Based on ${data.rating_count} ${data.rating_count === 1 ? 'rating' : 'ratings'} from verified stays on DELVE.`
                      : 'Overall guest score from ratings on this listing.'}
                  </p>
                </>
              ) : (
                <p className="acc-detail__reviews-summary-text acc-detail__reviews-summary-text--solo">
                  {reviews.length > 0
                    ? 'No aggregate score on this listing yet — read guest comments below.'
                    : 'Ratings and written reviews will show here once guests have stayed.'}
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
                No written guest comments yet.
              </p>
            )}
          </section>

          {faqs.length > 0 ? (
            <section className="detail-section acc-detail__faq">
              <h2 className="acc-detail__section-title">FAQ</h2>
              <div className="acc-detail__faq-list">
                {faqs.map((f, i) => (
                  <details key={`faq-${i}`} className="acc-detail__faq-item">
                    <summary className="acc-detail__faq-q">{f.question}</summary>
                    <p className="acc-detail__faq-a">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </main>

        <aside className="acc-detail__sidebar">
          <div className="acc-detail__booking-card">
            <p className="acc-detail__booking-kicker">Ready to stay?</p>
            <h2>
              <span>${data.price_per_night}</span>
              <small> / night</small>
            </h2>

            <div className="acc-detail__booking-meta">
              {data.rating_avg && <span>★ {data.rating_avg}</span>}
              <span>{data.max_guests} guests</span>
              <span>
                {data.bedrooms} {data.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
              </span>
            </div>

            <div className="acc-detail__booking-fields">
              <label>
                Check-in
                <input type="date" min={todayStr} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </label>
              <label>
                Check-out
                <input
                  type="date"
                  min={checkIn || todayStr}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </label>
              <label>
                Guests
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                  {Array.from({ length: data.max_guests }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i + 1 === 1 ? 'guest' : 'guests'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Link to={bookHref} className="btn btn-primary acc-detail__book-btn">
              Reserve stay
            </Link>

            <Link to={`/u/${encodeURIComponent(data.owner_username)}`} className="acc-detail__message-host">
              Message host
            </Link>
          </div>
        </aside>
      </div>

      <div className="acc-detail__mobile-bar">
        <div>
          <strong>${data.price_per_night} / night</strong>
          <span>
            {data.max_guests} guests · {locationLine}
          </span>
        </div>
        <Link to={bookHref} className="btn btn-primary">
          Reserve
        </Link>
      </div>
    </div>
  )
}
