import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  BedDouble,
  Building2,
  Car,
  Clock,
  Coffee,
  MapPin,
  MessageCircle,
  PawPrint,
  ShieldCheck,
  Trees,
  Users,
  Utensils,
  Waves,
  Wifi,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { BookingTrustNote } from '../components/booking'
import { RoomPhotoCarousel } from '../components/RoomPhotoCarousel'
import { AccommodationGallery, buildGalleryItems } from '../components/AccommodationGallery'
import { GuestReviewCard, normalizeReviews } from '../components/GuestReviewCard'
import { MiniRating } from '../components/MiniRating'
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
  TrustBadgeRow,
} from '../components/detail'
import { EmptyState } from '../components/ui'

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

const LOVE_ICON_MAP: Record<string, LucideIcon> = {
  'Comfortable stay': BedDouble,
  'Wi-Fi included': Wifi,
  'Easy parking': Car,
  'Breakfast available': Coffee,
  'Pet-friendly': PawPrint,
  'Kitchen access': Utensils,
  'Pool on site': Waves,
  'Great for families': Users,
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

function loveItemIcon(item: string): LucideIcon {
  if (item.startsWith('Close to')) return MapPin
  if (item === 'Quiet location') return Trees
  return LOVE_ICON_MAP[item] ?? BedDouble
}

function amenityChipIcon(name: string): LucideIcon | null {
  const n = name.toLowerCase()
  if (n.includes('wifi') || n.includes('wi-fi')) return Wifi
  if (n.includes('pool')) return Waves
  if (n.includes('park')) return Car
  if (n.includes('breakfast')) return Coffee
  if (n.includes('pet')) return PawPrint
  if (n.includes('kitchen')) return Utensils
  return null
}

function sortAmenities(amenities: string[]): string[] {
  const priority = ['wifi', 'wi-fi', 'pool', 'parking', 'breakfast', 'kitchen', 'pet']
  return [...amenities].sort((a, b) => {
    const ai = priority.findIndex((p) => a.toLowerCase().includes(p))
    const bi = priority.findIndex((p) => b.toLowerCase().includes(p))
    const aScore = ai === -1 ? 99 : ai
    const bScore = bi === -1 ? 99 : bi
    if (aScore !== bScore) return aScore - bScore
    return a.localeCompare(b)
  })
}

export function AccommodationDetail() {
  const { id } = useParams()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [commentDraft, setCommentDraft] = useState('')
  const [stayQuestions, setStayQuestions] = useState([
    { id: 's1', author: 'Mila K.', body: 'Is early check-in possible?', ago: '2d ago' },
    { id: 's2', author: 'Alex R.', body: 'How far is the nearest shop on foot?', ago: '5d ago' },
  ])

  const { data, isLoading, isError, refetch } = useQuery({
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

  const postStayQuestion = () => {
    const body = commentDraft.trim()
    if (!body) return
    setStayQuestions((prev) => [
      { id: `local-${Date.now()}`, author: 'Guest', body, ago: 'Just now' },
      ...prev,
    ])
    setCommentDraft('')
  }

  if (isLoading) {
    return (
      <DetailPage prefix="acc-detail-page" className="td">
        <DetailSkeleton className="acc-page__detail-skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="acc-detail-page" className="td">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="We couldn't load this stay"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  if (!data) {
    return (
      <DetailPage prefix="acc-detail-page" className="td">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="Stay not found"
          sub="This listing may have been removed or the link is incorrect."
          cta={{ label: 'Browse stays', to: '/accommodation' }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  const mapHref = openStreetMapSearchUrl(data.city || '', data.region || '')
  const galleryItems = buildGalleryItems(data.media_gallery, data.cover_image)
  const loveItems = whyGuestsLove(data)
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const todayStr = new Date().toISOString().split('T')[0]
  const sortedAmenities = sortAmenities(data.amenities ?? [])

  const bookParams = new URLSearchParams()
  if (checkIn) bookParams.set('check_in', checkIn)
  if (checkOut) bookParams.set('check_out', checkOut)
  if (guests > 1) bookParams.set('guests', String(guests))
  const bookQs = bookParams.toString()
  const bookHref = `/accommodation/${id}/book${bookQs ? `?${bookQs}` : ''}`

  const delversMoments = [
    ...galleryItems.slice(0, 2).map((item, index) => ({
      id: `g-${index}`,
      image: mediaUrl(item.src) || item.src,
      author: `guest${index + 1}`,
      body: 'Saved this stay for a quiet weekend.',
    })),
    { id: 'placeholder', author: 'traveller', body: 'Morning view from the room.' },
  ]

  const trustItems = [
    ...(data.max_guests >= 4 ? ['Good for families'] : []),
    ...(data.rating_count != null && data.rating_count >= 15 ? ['Local favourite'] : []),
    ...(data.wifi ? ['Free Wi-Fi'] : []),
    ...(data.parking ? ['Parking'] : []),
    ...(data.breakfast ? ['Breakfast'] : []),
    ...(data.pet_friendly ? ['Pet-friendly'] : []),
    ...(data.pool ? ['Pool'] : []),
  ].slice(0, 5)

  return (
    <DetailPage prefix="acc-detail-page" className="td" toast={shareMsg || null}>
      <DetailHeroWrap
        className="acc-detail__gallery-wrap"
        backTo="/accommodation"
        backLabel="Stays"
        saved={saved}
        onSave={() => setSaved((v) => !v)}
        onShare={() => onShare(data.title)}
      >
        <AccommodationGallery variant="detail" items={galleryItems} title={data.title} />
      </DetailHeroWrap>

      <section className="acc-detail__identity detail-section">
        <div className="acc-detail__meta-row">
          {data.property_type ? (
            <span className="acc-detail__pill">{propertyTypeLabel(data.property_type)}</span>
          ) : null}
          {data.rating_avg ? (
            <span className="acc-detail__pill acc-detail__pill--rating">
              <MiniRating rating={data.rating_avg} count={data.rating_count} />
            </span>
          ) : null}
          {locationLine ? (
            <span className="acc-detail__pill acc-detail__pill--location">
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {locationLine}
            </span>
          ) : null}
        </div>

        <h1 className="display acc-detail__title">{data.title}</h1>

        <div className="acc-detail__stats">
          <span className="acc-detail__stat">
            <BedDouble size={15} strokeWidth={2.25} aria-hidden />
            {data.bedrooms} {data.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
          </span>
          <span className="acc-detail__stat">
            <Users size={15} strokeWidth={2.25} aria-hidden />
            {data.max_guests} guests
          </span>
          <span className="acc-detail__stat acc-detail__stat--price">
            From N${data.price_per_night}
            <span className="acc-detail__stat-unit"> / night</span>
          </span>
        </div>

        <p className="acc-detail__host-line">
          Hosted by{' '}
          <Link to={`/u/${encodeURIComponent(data.owner_username)}`}>@{data.owner_username}</Link>
        </p>

        {trustItems.length > 0 ? (
          <TrustBadgeRow items={trustItems} className="acc-detail__trust-row" />
        ) : null}

        <SocialActionRow saved={saved} onSave={() => setSaved((v) => !v)} onShare={() => onShare(data.title)}>
          <Link to={`/u/${encodeURIComponent(data.owner_username)}`} className="acc-detail__message-link">
            <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
            Message host
          </Link>
        </SocialActionRow>
      </section>

      <DetailLayout
        main={
          <>
            <section className="detail-section acc-detail__love">
              <h2 className="acc-detail__section-title">Why guests love it</h2>
              <div className="acc-detail__love-grid">
                {loveItems.map((item) => {
                  const Icon = loveItemIcon(item)
                  return (
                    <div key={item} className="acc-detail__love-card">
                      <Icon size={18} strokeWidth={2.25} aria-hidden />
                      <span>{item}</span>
                    </div>
                  )
                })}
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
                  The host offers more than one room or unit type. Layout, capacity, and nightly rate can differ from
                  the headline &quot;from&quot; price.
                </p>
                <div className="acc-detail__room-grid">
                  {roomTypes.map((room, i) => (
                    <article key={`${i}-${room.name}`} className="acc-detail__room">
                      <div className="acc-detail__room-visual">
                        <RoomPhotoCarousel images={room.images} name={room.name} />
                      </div>
                      <div className="acc-detail__room-body">
                        <h3 className="acc-detail__room-name">{room.name}</h3>
                        <div className="acc-detail__room-meta">
                          {room.max_guests != null ? (
                            <span className="acc-detail__room-meta-item">
                              <Users size={14} strokeWidth={2.25} aria-hidden />
                              Up to {room.max_guests} guests
                            </span>
                          ) : null}
                          {room.bedrooms != null ? (
                            <span className="acc-detail__room-meta-item">
                              <BedDouble size={14} strokeWidth={2.25} aria-hidden />
                              {room.bedrooms} {room.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                            </span>
                          ) : null}
                          {room.bed_summary ? (
                            <span className="acc-detail__room-meta-item">{room.bed_summary}</span>
                          ) : null}
                        </div>
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
                  ))}
                </div>
              </section>
            ) : null}

            {sortedAmenities.length > 0 ? (
              <section className="detail-section acc-detail__amenities-block">
                <h2 className="acc-detail__section-title">Amenities</h2>
                <div className="acc-detail__amenity-grid">
                  {sortedAmenities.slice(0, 24).map((a) => {
                    const Icon = amenityChipIcon(a)
                    return (
                      <span key={a} className="acc-detail__amenity-chip">
                        {Icon ? <Icon size={14} strokeWidth={2.25} aria-hidden /> : null}
                        {a}
                      </span>
                    )
                  })}
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
                      <dt>
                        <Clock size={14} strokeWidth={2.25} aria-hidden />
                        Check-in
                      </dt>
                      <dd>From {data.check_in_from}</dd>
                    </>
                  ) : null}
                  {data.check_out_until ? (
                    <>
                      <dt>
                        <Clock size={14} strokeWidth={2.25} aria-hidden />
                        Check-out
                      </dt>
                      <dd>By {data.check_out_until}</dd>
                    </>
                  ) : null}
                </dl>
                {data.cancellation_policy ? (
                  <div className="acc-detail__policy-block">
                    <h3 className="acc-detail__policy-sub">
                      <ShieldCheck size={16} strokeWidth={2.25} aria-hidden />
                      Cancellation
                    </h3>
                    <p className="acc-detail__policy-text">{data.cancellation_policy}</p>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="detail-section acc-detail__map-card">
              <h2 className="acc-detail__section-title">Location</h2>
              {locationLine ? (
                <p className="acc-detail__map-sub">
                  <MapPin size={16} strokeWidth={2.25} aria-hidden />
                  {locationLine}
                </p>
              ) : null}
              <div className="acc-detail__map-visual" aria-hidden />
              <p className="acc-detail__map-copy">
                Open the area on OpenStreetMap to plan your route — buses, rides, or self-drive from town centres and
                airports.
              </p>
              <a href={mapHref} className="btn btn-primary acc-detail__map-btn" target="_blank" rel="noopener noreferrer">
                <MapPin size={16} strokeWidth={2.25} aria-hidden />
                View on map
              </a>
            </section>

            <DelversMoments
              title="Delvers moments from this stay"
              subtitle="Guest photos, room views, and nearby places — not host gallery shots."
              moments={delversMoments.filter((m) => m.id !== 'placeholder')}
              className="acc-detail__moments"
              showWhenEmpty
              emptyMessage="No guest moments yet — travellers share photos on Delvers after their stay."
            />

            <CommentBox
              className="acc-detail__comments"
              title="Questions for recent guests"
              subtitle="Ask about check-in, neighbourhood, parking, Wi-Fi, what to pack, safety, or shops nearby."
              draft={commentDraft}
              onDraftChange={setCommentDraft}
              onPost={postStayQuestion}
              comments={stayQuestions}
              postLabel="Ask question"
            />

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
                      : 'Ratings and written reviews will appear here after guests complete their stay.'}
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
                <div className="acc-detail__reviews-empty" role="status">
                  No written guest comments yet.
                </div>
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
          </>
        }
        sidebar={
          <DetailActionCard
            kicker="Ready to stay?"
            title={
              <>
                <span>N${data.price_per_night}</span>
                <small> / night</small>
              </>
            }
            className="acc-detail__booking-card"
            footer={
              <BookingTrustNote>Review your dates and guest details before continuing.</BookingTrustNote>
            }
          >
            <div className="acc-detail__booking-meta">
              {data.rating_avg ? (
                <span className="acc-detail__booking-meta-item acc-detail__booking-meta-item--rating">
                  <MiniRating rating={data.rating_avg} count={data.rating_count} />
                </span>
              ) : null}
              <span className="acc-detail__booking-meta-item">
                <Users size={14} strokeWidth={2.25} aria-hidden />
                {data.max_guests} guests
              </span>
              <span className="acc-detail__booking-meta-item">
                <BedDouble size={14} strokeWidth={2.25} aria-hidden />
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
              Request booking
            </Link>

            <Link to={`/u/${encodeURIComponent(data.owner_username)}`} className="acc-detail__message-host">
              <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
              Message host
            </Link>
          </DetailActionCard>
        }
      />

      <MobileStickyCTA
        title={`N$${data.price_per_night} / night`}
        subtitle={`${data.max_guests} guests · ${locationLine}`}
        action={
          <Link to={bookHref} className="btn btn-primary">
            Request booking
          </Link>
        }
        className="acc-detail__mobile-bar"
      />
    </DetailPage>
  )
}
