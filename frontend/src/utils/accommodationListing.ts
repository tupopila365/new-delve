import type { LucideIcon } from 'lucide-react'
import {
  BedDouble,
  Car,
  Coffee,
  MapPin,
  PawPrint,
  Trees,
  Users,
  Utensils,
  Waves,
  Wifi,
} from 'lucide-react'
import { normalizeReviews } from '../components/GuestReviewCard'
import { toListingGalleryImages } from '../components/listing/listingUtils'
import type { ListingDetailRow, ListingFaqItem, ListingGalleryItem, ListingRoomOption } from '../components/listing/types'
import type { HighlightChannelInput } from '../components/highlights'
import { mediaUrl } from '../api/client'
import { buildGalleryItems } from '../components/AccommodationGallery'

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

export type AccommodationListing = {
  id: number
  title: string
  description: string
  region: string
  city: string
  address?: string
  latitude?: number | string | null
  longitude?: number | string | null
  google_place_id?: string
  formatted_address?: string
  price_per_night: string
  max_guests: number
  bedrooms: number
  amenities: string[]
  cover_image: string | null
  media_gallery?: { kind: string; src: string }[]
  /** Provider-curated highlight rings (replaces auto gallery rings when set). */
  listing_stories?: HighlightChannelInput[]
  check_in_from?: string
  check_out_until?: string
  house_rules?: string[] | string
  cancellation_policy?: string
  faqs?: unknown
  guest_reviews?: unknown
  room_types?: unknown
  owner_username: string
  owner_display_name?: string | null
  owner_avatar?: string | null
  property_type?: string
  pet_friendly?: boolean
  wifi?: boolean
  parking?: boolean
  pool?: boolean
  kitchen?: boolean
  breakfast?: boolean
  rating_avg?: string
  rating_count?: number
  likes_count?: number
  liked_by_me?: boolean
  deals?: import('../components/deals').ListingDeal[]
  saves_count?: number
  saved_by_me?: boolean
}

export type RoomTypeItem = {
  name: string
  description: string
  max_guests: number | null
  bedrooms: number | null
  bed_summary: string
  price_per_night: string | null
  compare_at_price?: string | null
  badges: string[]
  /** @deprecated Prefer badges — first badge kept for older call sites. */
  badge?: string | null
  featured?: boolean
  image: string | null
  images: string[]
}

/** Normalize room sale/special badges from list or legacy single string. */
export function normalizeRoomBadges(raw: unknown, legacy?: unknown): string[] {
  const out: string[] = []
  const push = (value: unknown) => {
    const text = String(value ?? '').trim().slice(0, 40)
    if (!text) return
    if (out.some((b) => b.toLowerCase() === text.toLowerCase())) return
    out.push(text)
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      push(item)
      if (out.length >= 8) return out
    }
  } else {
    push(raw)
  }
  if (out.length === 0) push(legacy)
  return out
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

export function propertyTypeLabel(v: string) {
  return PROPERTY_LABELS[v] ?? v
}

export { openStreetMapSearchUrl, formatPlaceLine, hasValidCoords, parseCoord, resolveDirectionsUrl } from './placeMap'

/** Normalize house rules from API (list) or legacy newline text. */
export function normalizeHouseRules(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x ?? '').trim()).filter(Boolean)
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  }
  return []
}

/** @deprecated Prefer normalizeHouseRules — kept for call sites that still pass strings. */
export function parseHouseRules(text: string | string[] | null | undefined): string[] {
  return normalizeHouseRules(text)
}

export function normalizeFaqs(raw: unknown): ListingFaqItem[] {
  if (!Array.isArray(raw)) return []
  const out: ListingFaqItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as { question?: string; answer?: string }
    const q = typeof o.question === 'string' ? o.question.trim() : ''
    const a = typeof o.answer === 'string' ? o.answer.trim() : ''
    if (q && a) out.push({ question: q, answer: a })
  }
  return out
}

export function normalizeRoomTypes(raw: unknown): RoomTypeItem[] {
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

    const badges = normalizeRoomBadges(o.badges, o.badge ?? o.special_label)
    out.push({
      name,
      description,
      max_guests: parseOptionalUint(o.max_guests),
      bedrooms: parseOptionalUint(o.bedrooms),
      bed_summary,
      price_per_night: parseRoomPrice(o.price_per_night),
      compare_at_price: parseRoomPrice(o.compare_at_price ?? o.was_price ?? o.original_price),
      badges,
      badge: badges[0] ?? null,
      featured: o.featured === true || o.is_featured === true,
      image,
      images,
    })
  }
  return out
}

export function whyGuestsLove(data: AccommodationListing): string[] {
  const items = [
    data.wifi ? 'Wi-Fi included' : null,
    data.parking ? 'Easy parking' : null,
    data.breakfast ? 'Breakfast available' : null,
    data.pet_friendly ? 'Pet-friendly' : null,
    data.kitchen ? 'Kitchen access' : null,
    data.pool ? 'Pool on site' : null,
    data.city ? `Close to ${data.city}` : null,
  ].filter(Boolean) as string[]

  const unique: string[] = []
  for (const item of items) {
    if (!unique.includes(item)) unique.push(item)
    if (unique.length >= 4) break
  }
  return unique
}

export function loveItemIcon(item: string): LucideIcon {
  if (item.startsWith('Close to')) return MapPin
  if (item === 'Quiet location') return Trees
  return LOVE_ICON_MAP[item] ?? BedDouble
}

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  'wi-fi': 'Wi-Fi',
  parking: 'Parking',
  pool: 'Pool',
  kitchen: 'Kitchen',
  breakfast: 'Breakfast',
  pet_friendly: 'Pet-friendly',
  'pet-friendly': 'Pet-friendly',
  pets: 'Pet-friendly',
  ac: 'Air conditioning',
  'air conditioning': 'Air conditioning',
  laundry: 'Laundry',
  garden: 'Garden',
  workspace: 'Workspace',
}

/** Map amenity slugs / keys to traveller-facing labels. */
export function amenityDisplayLabel(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/_/g, ' ')
  const compact = key.replace(/\s+/g, '_')
  if (AMENITY_LABELS[raw.trim().toLowerCase()]) return AMENITY_LABELS[raw.trim().toLowerCase()]
  if (AMENITY_LABELS[compact]) return AMENITY_LABELS[compact]
  if (AMENITY_LABELS[key]) return AMENITY_LABELS[key]
  return raw
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function amenityChipIcon(name: string): LucideIcon | null {
  const n = name.toLowerCase()
  if (n.includes('wifi') || n.includes('wi-fi')) return Wifi
  if (n.includes('pool')) return Waves
  if (n.includes('park')) return Car
  if (n.includes('breakfast')) return Coffee
  if (n.includes('pet')) return PawPrint
  if (n.includes('kitchen')) return Utensils
  return null
}

export function sortAmenities(amenities: string[]): string[] {
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

export function buildTrustHighlights(data: AccommodationListing): string[] {
  return [
    ...(data.max_guests >= 4 ? ['Good for families'] : []),
    ...(data.rating_count != null && data.rating_count >= 15 ? ['Local favourite'] : []),
    ...(data.wifi ? ['Free Wi-Fi'] : []),
    ...(data.parking ? ['Parking'] : []),
    ...(data.breakfast ? ['Breakfast'] : []),
    ...(data.pet_friendly ? ['Pet-friendly'] : []),
    ...(data.pool ? ['Pool'] : []),
  ].slice(0, 5)
}

export function buildListingImages(data: AccommodationListing): ListingGalleryItem[] {
  const galleryItems = buildGalleryItems(data.media_gallery, data.cover_image)
  return galleryItems.map((item, index) => ({
    id: index,
    src: mediaUrl(item.src) || item.src,
    alt: data.title,
    kind: item.kind === 'video' ? 'video' : 'image',
  }))
}

export function buildRoomOffers(
  data: AccommodationListing,
  roomTypes: RoomTypeItem[],
  listingId: string | number,
): ListingRoomOption[] {
  const listingCover = data.cover_image ? mediaUrl(data.cover_image) || data.cover_image : null

  const fromTypes = roomTypes.map((room, i) => {
    const rawPrimary = room.images[0] ?? room.image
    const primary = rawPrimary ? mediaUrl(rawPrimary) || rawPrimary : listingCover
    const roomGallery = toListingGalleryImages(
      room.images.length > 0 ? room.images : rawPrimary ? [rawPrimary] : data.cover_image ? [data.cover_image] : [],
      room.name,
      `room-${i}`,
    )
    return {
      id: `${i}-${room.name}`,
      name: room.name,
      description: room.description,
      maxGuests: room.max_guests,
      bedrooms: room.bedrooms,
      bedSummary: room.bed_summary,
      pricePerNight: room.price_per_night,
      compareAtPrice: room.compare_at_price,
      fallbackPrice: data.price_per_night,
      image: primary,
      images: roomGallery,
      badges: room.badges,
      badge: room.badges[0] ?? room.badge ?? null,
      featured: room.featured,
      bookHref: `/accommodation/${listingId}/book?room=${encodeURIComponent(room.name)}`,
    }
  })

  if (fromTypes.length > 0) return fromTypes

  const coverSources = data.cover_image ? [data.cover_image] : []
  return [
    {
      id: 'listing-default',
      name: 'Standard room',
      description: data.description,
      maxGuests: data.max_guests,
      bedrooms: data.bedrooms,
      bedSummary: null,
      pricePerNight: data.price_per_night,
      compareAtPrice: null,
      fallbackPrice: data.price_per_night,
      image: listingCover,
      images: toListingGalleryImages(coverSources, data.title, 'default'),
      badges: [],
      badge: null,
      featured: true,
      bookHref: `/accommodation/${listingId}/book`,
    },
  ]
}

export function buildPolicyRows(
  data: AccommodationListing,
  icons: { clock: import('react').ReactNode; shield: import('react').ReactNode },
): ListingDetailRow[] {
  return [
    data.check_in_from ? { label: 'Check-in', value: `From ${data.check_in_from}`, icon: icons.clock } : null,
    data.check_out_until ? { label: 'Check-out', value: `By ${data.check_out_until}`, icon: icons.clock } : null,
    data.cancellation_policy
      ? { label: 'Cancellation', value: data.cancellation_policy, icon: icons.shield }
      : null,
  ].filter(Boolean) as ListingDetailRow[]
}

export { normalizeReviews }
