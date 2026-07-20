import type { ListingFaqItem } from '../../listing/types'
import type { HighlightChannelInput } from '../../highlights'

export const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'guesthouse', label: 'Guest house' },
  { value: 'bed_and_breakfast', label: 'Bed & breakfast' },
  { value: 'apartment', label: 'Apartment / flat' },
  { value: 'lodge', label: 'Lodge' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'villa', label: 'Villa / house' },
  { value: 'resort', label: 'Resort' },
  { value: 'camping_glamping', label: 'Camping / glamping' },
  { value: 'other', label: 'Other' },
] as const

export const AMENITY_OPTIONS = [
  'Wi-Fi',
  'Parking',
  'Pool',
  'Kitchen',
  'Breakfast',
  'Pet-friendly',
  'Air conditioning',
  'Laundry',
  'Garden',
  'Workspace',
] as const

export type StayRoomForm = {
  name: string
  description: string
  max_guests: number
  bedrooms: number
  bed_summary: string
  price_per_night: string
  compare_at_price: string
  badge: string
  featured: boolean
  image: string
  images: string
}

export type StayListingFormValues = {
  title: string
  description: string
  property_type: string
  region: string
  city: string
  price_per_night: string
  max_guests: number
  bedrooms: number
  is_active: boolean
  wifi: boolean
  parking: boolean
  pool: boolean
  kitchen: boolean
  breakfast: boolean
  pet_friendly: boolean
  amenities: string[]
  check_in_from: string
  check_out_until: string
  house_rules: string
  cancellation_policy: string
  cover_image_url: string
  gallery_urls: string
  faqs: ListingFaqItem[]
  room_types: StayRoomForm[]
}

export const EMPTY_STAY_LISTING_FORM: StayListingFormValues = {
  title: '',
  description: '',
  property_type: 'guesthouse',
  region: '',
  city: '',
  price_per_night: '',
  max_guests: 2,
  bedrooms: 1,
  is_active: true,
  wifi: false,
  parking: false,
  pool: false,
  kitchen: false,
  breakfast: false,
  pet_friendly: false,
  amenities: [],
  check_in_from: '14:00',
  check_out_until: '10:00',
  house_rules: '',
  cancellation_policy: '',
  cover_image_url: '',
  gallery_urls: '',
  faqs: [],
  room_types: [],
}

export type ProviderStayListing = {
  id: number
  title: string
  description: string
  region: string
  city: string
  price_per_night: string
  max_guests: number
  bedrooms: number
  property_type: string
  amenities: string[]
  cover_image: string | null
  media_gallery?: { kind: string; src: string }[]
  listing_stories?: HighlightChannelInput[]
  check_in_from?: string
  check_out_until?: string
  house_rules?: string
  cancellation_policy?: string
  faqs?: ListingFaqItem[]
  room_types?: unknown[]
  pet_friendly?: boolean
  wifi?: boolean
  parking?: boolean
  pool?: boolean
  kitchen?: boolean
  breakfast?: boolean
  rating_avg: string
  rating_count: number
  likes_count?: number
  saves_count?: number
  is_active: boolean
  guest_reviews?: { name: string; body: string; rating: number }[]
}

export function amenitiesFromBooleans(form: Pick<
  StayListingFormValues,
  'wifi' | 'parking' | 'pool' | 'kitchen' | 'breakfast' | 'pet_friendly' | 'amenities'
>): string[] {
  const fromFlags = [
    form.wifi ? 'Wi-Fi' : null,
    form.parking ? 'Parking' : null,
    form.pool ? 'Pool' : null,
    form.kitchen ? 'Kitchen' : null,
    form.breakfast ? 'Breakfast' : null,
    form.pet_friendly ? 'Pet-friendly' : null,
  ].filter(Boolean) as string[]
  const extra = form.amenities.filter((a) => !fromFlags.includes(a))
  return [...new Set([...fromFlags, ...extra])]
}

export function booleansFromAmenities(amenities: string[]) {
  const lower = amenities.map((a) => a.toLowerCase())
  return {
    wifi: lower.some((a) => a.includes('wifi') || a.includes('wi-fi')),
    parking: lower.some((a) => a.includes('park')),
    pool: lower.some((a) => a.includes('pool')),
    kitchen: lower.some((a) => a.includes('kitchen')),
    breakfast: lower.some((a) => a.includes('breakfast')),
    pet_friendly: lower.some((a) => a.includes('pet')),
    amenities: amenities.filter(
      (a) =>
        !['wifi', 'wi-fi', 'parking', 'pool', 'kitchen', 'breakfast', 'pet-friendly', 'pet friendly'].some((k) =>
          a.toLowerCase().includes(k),
        ),
    ),
  }
}

export function stayListingToForm(stay: ProviderStayListing): StayListingFormValues {
  const flags = booleansFromAmenities(stay.amenities ?? [])
  const gallery = (stay.media_gallery ?? []).map((m) => m.src).join('\n')
  const faqs = Array.isArray(stay.faqs) ? stay.faqs : []
  const rooms = Array.isArray(stay.room_types)
    ? (stay.room_types as Record<string, unknown>[]).map((r) => {
        const galleryImgs = Array.isArray(r.images)
          ? (r.images as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          : []
        const cover = String(r.image ?? (galleryImgs[0] ?? '') ?? '')
        const extraImgs = galleryImgs.filter((x) => x !== cover)
        return {
          name: String(r.name ?? ''),
          description: String(r.description ?? ''),
          max_guests: Number(r.max_guests ?? 2),
          bedrooms: Number(r.bedrooms ?? 1),
          bed_summary: String(r.bed_summary ?? ''),
          price_per_night: String(r.price_per_night ?? ''),
          compare_at_price: String(r.compare_at_price ?? r.was_price ?? r.original_price ?? ''),
          badge: String(r.badge ?? r.special_label ?? ''),
          featured: r.featured === true || r.is_featured === true,
          image: cover,
          images: extraImgs.join('\n'),
        }
      })
    : []

  return {
    title: stay.title,
    description: stay.description,
    property_type: stay.property_type || 'guesthouse',
    region: stay.region,
    city: stay.city,
    price_per_night: stay.price_per_night,
    max_guests: stay.max_guests,
    bedrooms: stay.bedrooms,
    is_active: stay.is_active,
    wifi: stay.wifi ?? flags.wifi,
    parking: stay.parking ?? flags.parking,
    pool: stay.pool ?? flags.pool,
    kitchen: stay.kitchen ?? flags.kitchen,
    breakfast: stay.breakfast ?? flags.breakfast,
    pet_friendly: stay.pet_friendly ?? flags.pet_friendly,
    amenities: flags.amenities,
    check_in_from: stay.check_in_from ?? '14:00',
    check_out_until: stay.check_out_until ?? '10:00',
    house_rules: stay.house_rules ?? '',
    cancellation_policy: stay.cancellation_policy ?? '',
    cover_image_url: stay.cover_image ?? '',
    gallery_urls: gallery,
    faqs,
    room_types: rooms,
  }
}

export function formToApiPayload(form: StayListingFormValues) {
  const amenities = amenitiesFromBooleans(form)
  const galleryLines = form.gallery_urls
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const media_gallery = galleryLines.map((src) => ({ kind: 'image', src }))

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    property_type: form.property_type,
    region: form.region.trim(),
    city: form.city.trim(),
    price_per_night: form.price_per_night,
    max_guests: Number(form.max_guests),
    bedrooms: Number(form.bedrooms),
    is_active: form.is_active,
    amenities,
    wifi: form.wifi,
    parking: form.parking,
    pool: form.pool,
    kitchen: form.kitchen,
    breakfast: form.breakfast,
    pet_friendly: form.pet_friendly,
    check_in_from: form.check_in_from,
    check_out_until: form.check_out_until,
    house_rules: form.house_rules.trim(),
    cancellation_policy: form.cancellation_policy.trim(),
    cover_image: form.cover_image_url.trim() || null,
    media_gallery,
    faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    room_types: form.room_types
      .filter((r) => r.name.trim())
      .map((r) => {
        const image = r.image.trim()
        const galleryImgs = r.images
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        const images = [...new Set([image, ...galleryImgs].filter(Boolean))]
        const compareAt = r.compare_at_price.trim()
        const badge = r.badge.trim()
        return {
          name: r.name.trim(),
          description: r.description.trim(),
          max_guests: Number(r.max_guests),
          bedrooms: Number(r.bedrooms),
          bed_summary: r.bed_summary.trim(),
          price_per_night: r.price_per_night || form.price_per_night,
          featured: r.featured,
          ...(compareAt ? { compare_at_price: compareAt } : {}),
          ...(badge ? { badge } : {}),
          ...(image ? { image } : {}),
          ...(images.length ? { images } : {}),
        }
      }),
  }
}

export function listingCompleteness(stay: ProviderStayListing): { percent: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [Boolean(stay.title?.trim()), 'Title'],
    [Boolean(stay.description?.trim()), 'Description'],
    [Boolean(stay.city?.trim() && stay.region?.trim()), 'Location'],
    [Boolean(stay.cover_image), 'Cover photo'],
    [Boolean(stay.price_per_night), 'Nightly price'],
    [stay.max_guests > 0, 'Guest capacity'],
    [stay.bedrooms > 0, 'Bedrooms'],
    [(stay.amenities?.length ?? 0) > 0, 'Amenities'],
    [Boolean(stay.check_in_from && stay.check_out_until), 'Check-in / check-out'],
    [Boolean(stay.cancellation_policy?.trim()), 'Cancellation policy'],
    [Array.isArray(stay.room_types) && stay.room_types.length > 0, 'Room types'],
    [(stay.media_gallery?.length ?? 0) > 0, 'Photo gallery'],
    [Array.isArray(stay.faqs) && stay.faqs.length > 0, 'FAQs'],
    [(stay.listing_stories?.length ?? 0) > 0, 'Highlights'],
  ]
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label)
  const percent = Math.round(((checks.length - missing.length) / checks.length) * 100)
  return { percent, missing }
}
