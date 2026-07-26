import type { ListingFaqItem } from '../../listing/types'
import type { HighlightChannelInput } from '../../highlights'
import { coordForApi, resolveRegionFromPlace } from '../../../utils/geocodeParse'
import { parseCoord } from '../../../utils/placeMap'
import { normalizeHouseRules, normalizeRoomBadges } from '../../../utils/accommodationListing'
import {
  formatGalleryUrlsField,
  isVideoUrl,
  parseGalleryUrlsField,
} from '../../listing/photos/listingGalleryMedia'
import {
  resolveStayPhotosForSave,
  resolveStayRoomMediaForSave,
} from './stayPhotosCloudinary'

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

/** Suggested room sale/special badges — hosts can also add custom labels. */
export const ROOM_BADGE_OPTIONS = [
  'Deal',
  'Popular',
  'On sale',
  'Early bird',
  'Best value',
  'Limited',
  'New',
  'Featured',
] as const

const ROOM_BADGE_PRESET_SET = new Set(ROOM_BADGE_OPTIONS.map((b) => b.toLowerCase()))

export function isPresetRoomBadge(label: string): boolean {
  return ROOM_BADGE_PRESET_SET.has(label.trim().toLowerCase())
}

export type StayRoomForm = {
  name: string
  description: string
  max_guests: number
  bedrooms: number
  bed_summary: string
  price_per_night: string
  compare_at_price: string
  badges: string[]
  featured: boolean
  /** Cover media URL (image or video). */
  image: string
  image_file?: File | null
  /** Extra gallery — newline URLs or JSON when videos are present. */
  images: string
  gallery_files?: File[]
}

export type StayListingFormValues = {
  title: string
  description: string
  property_type: string
  region: string
  city: string
  address: string
  latitude: number | null
  longitude: number | null
  google_place_id: string
  formatted_address: string
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
  house_rules: string[]
  cancellation_policy: string
  cover_image_url: string
  cover_image_file?: File | null
  gallery_urls: string
  gallery_files?: File[]
  faqs: ListingFaqItem[]
  room_types: StayRoomForm[]
}

export const EMPTY_STAY_LISTING_FORM: StayListingFormValues = {
  title: '',
  description: '',
  property_type: 'guesthouse',
  region: '',
  city: '',
  address: '',
  latitude: null,
  longitude: null,
  google_place_id: '',
  formatted_address: '',
  price_per_night: '',
  max_guests: 2,
  bedrooms: 1,
  is_active: false,
  wifi: false,
  parking: false,
  pool: false,
  kitchen: false,
  breakfast: false,
  pet_friendly: false,
  amenities: [],
  check_in_from: '14:00',
  check_out_until: '10:00',
  house_rules: [],
  cancellation_policy: '',
  cover_image_url: '',
  cover_image_file: null,
  gallery_urls: '',
  gallery_files: [],
  faqs: [],
  room_types: [],
}

export type ProviderStayListing = {
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
  property_type: string
  amenities: string[]
  cover_image: string | null
  media_gallery?: { kind: string; src: string }[]
  listing_stories?: HighlightChannelInput[]
  check_in_from?: string
  check_out_until?: string
  house_rules?: string[] | string
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
  views_count?: number
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
  const galleryItems = (stay.media_gallery ?? [])
    .map((m) => {
      const src = String(m.src ?? '').trim()
      if (!src) return null
      const kind = m.kind === 'video' || isVideoUrl(src) ? ('video' as const) : ('image' as const)
      return { url: src, kind }
    })
    .filter((item): item is { url: string; kind: 'image' | 'video' } => item != null)
  // Cover is stored separately — don't duplicate as the first gallery tile when identical.
  const cover = (stay.cover_image ?? '').trim()
  const galleryWithoutCover = galleryItems.filter((g) => g.url !== cover)
  const faqs = Array.isArray(stay.faqs) ? stay.faqs : []
  const rooms = Array.isArray(stay.room_types)
    ? (stay.room_types as Record<string, unknown>[]).map((r) => {
        const galleryImgs = Array.isArray(r.images)
          ? (r.images as unknown[])
              .map((x) => String(x ?? '').trim())
              .filter(Boolean)
          : []
        const coverImg = String(r.image ?? (galleryImgs[0] ?? '') ?? '')
        const extraImgs = galleryImgs.filter((x) => x !== coverImg)
        return {
          name: String(r.name ?? ''),
          description: String(r.description ?? ''),
          max_guests: Number(r.max_guests ?? 2),
          bedrooms: Number(r.bedrooms ?? 1),
          bed_summary: String(r.bed_summary ?? ''),
          price_per_night: String(r.price_per_night ?? ''),
          compare_at_price: String(r.compare_at_price ?? r.was_price ?? r.original_price ?? ''),
          badges: normalizeRoomBadges(r.badges, r.badge ?? r.special_label),
          featured: r.featured === true || r.is_featured === true,
          image: coverImg,
          image_file: null,
          images: formatGalleryUrlsField(
            extraImgs.map((url) => ({
              url,
              kind: isVideoUrl(url) ? ('video' as const) : ('image' as const),
            })),
          ),
          gallery_files: [],
        }
      })
    : []

  return {
    title: stay.title,
    description: stay.description,
    property_type: stay.property_type || 'guesthouse',
    region: stay.region,
    city: stay.city,
    address: stay.address ?? '',
    latitude: parseCoord(stay.latitude),
    longitude: parseCoord(stay.longitude),
    google_place_id: stay.google_place_id ?? '',
    formatted_address: stay.formatted_address ?? '',
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
    house_rules: normalizeHouseRules(stay.house_rules),
    cancellation_policy: stay.cancellation_policy ?? '',
    cover_image_url: cover,
    cover_image_file: null,
    gallery_urls: formatGalleryUrlsField(galleryWithoutCover),
    gallery_files: [],
    faqs,
    room_types: rooms,
  }
}

/** Sync payload builder — use buildStayListingApiPayload when files may still be uploading. */
export function formToApiPayload(form: StayListingFormValues) {
  const amenities = amenitiesFromBooleans(form)
  const galleryItems = parseGalleryUrlsField(form.gallery_urls)
  const cover = form.cover_image_url.trim()
  const media_gallery = [
    ...(cover
      ? [
          {
            kind: (isVideoUrl(cover) ? 'video' : 'image') as 'image' | 'video',
            src: cover,
          },
        ]
      : []),
    ...galleryItems
      .filter((item) => item.url !== cover)
      .map((item) => ({ kind: item.kind, src: item.url })),
  ]

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    property_type: form.property_type,
    region: resolveRegionFromPlace(
      { region: form.region, city: form.city, country: '' },
      form.formatted_address || form.address,
    ),
    city: form.city.trim(),
    address: form.address.trim(),
    latitude: coordForApi(form.latitude),
    longitude: coordForApi(form.longitude),
    google_place_id: form.google_place_id.trim(),
    formatted_address: form.formatted_address.trim(),
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
    house_rules: form.house_rules.map((r) => r.trim()).filter(Boolean),
    cancellation_policy: form.cancellation_policy.trim(),
    cover_image: cover || null,
    media_gallery,
    faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    room_types: form.room_types
      .filter((r) => r.name.trim())
      .map((r) => {
        const image = r.image.trim()
        const galleryImgs = parseGalleryUrlsField(r.images).map((item) => item.url)
        const images = [...new Set([image, ...galleryImgs].filter(Boolean))]
        const compareAt = r.compare_at_price.trim()
        const badges = r.badges.map((b) => b.trim()).filter(Boolean)
        return {
          name: r.name.trim(),
          description: r.description.trim(),
          max_guests: Number(r.max_guests),
          bedrooms: Number(r.bedrooms),
          bed_summary: r.bed_summary.trim(),
          price_per_night: r.price_per_night || form.price_per_night,
          featured: r.featured,
          ...(compareAt ? { compare_at_price: compareAt } : {}),
          ...(badges.length ? { badges, badge: badges[0] } : {}),
          ...(image ? { image } : {}),
          ...(images.length ? { images } : {}),
        }
      }),
  }
}

/** Resolve local files to Cloudinary URLs, then build the API body. */
export async function buildStayListingApiPayload(form: StayListingFormValues) {
  const listingMedia = await resolveStayPhotosForSave({
    cover_image_url: form.cover_image_url,
    cover_image_file: form.cover_image_file,
    gallery_urls: form.gallery_urls,
    gallery_files: form.gallery_files,
  })

  const rooms = await Promise.all(
    form.room_types.map(async (room) => {
      const media = await resolveStayRoomMediaForSave({
        cover_image_url: room.image,
        cover_image_file: room.image_file,
        gallery_urls: room.images,
        gallery_files: room.gallery_files,
      })
      return {
        ...room,
        image: media.image,
        image_file: null,
        images: formatGalleryUrlsField(
          media.images
            .filter((url) => url !== media.image)
            .map((url) => ({
              url,
              kind: isVideoUrl(url) ? ('video' as const) : ('image' as const),
            })),
        ),
        gallery_files: [],
      }
    }),
  )

  return formToApiPayload({
    ...form,
    cover_image_url: listingMedia.cover_image,
    cover_image_file: null,
    gallery_urls: formatGalleryUrlsField(
      listingMedia.media_gallery
        .filter((item) => item.src !== listingMedia.cover_image)
        .map((item) => ({ url: item.src, kind: item.kind })),
    ),
    gallery_files: [],
    room_types: rooms,
  })
}

/** Property fields only — never sends room_types, so room pages stay intact. */
export async function buildStayPropertyApiPayload(form: StayListingFormValues) {
  const full = await buildStayListingApiPayload({ ...form, room_types: [] })
  const { room_types: _omit, ...propertyBody } = full
  return propertyBody
}

/** Resolve one room's media, then build the API room object. */
export async function buildStayRoomApiItem(room: StayRoomForm, fallbackNightly: string) {
  const media = await resolveStayRoomMediaForSave({
    cover_image_url: room.image,
    cover_image_file: room.image_file,
    gallery_urls: room.images,
    gallery_files: room.gallery_files,
  })
  const image = media.image
  const galleryImgs = media.images.filter((url) => url !== image)
  const images = [...new Set([image, ...galleryImgs].filter(Boolean))]
  const compareAt = room.compare_at_price.trim()
  const badges = room.badges.map((b) => b.trim()).filter(Boolean)
  return {
    name: room.name.trim(),
    description: room.description.trim(),
    max_guests: Number(room.max_guests),
    bedrooms: Number(room.bedrooms),
    bed_summary: room.bed_summary.trim(),
    price_per_night: room.price_per_night || fallbackNightly,
    featured: room.featured,
    ...(compareAt ? { compare_at_price: compareAt } : {}),
    ...(badges.length ? { badges, badge: badges[0] } : {}),
    ...(image ? { image } : {}),
    ...(images.length ? { images } : {}),
  }
}

export function listingCompleteness(stay: ProviderStayListing): { percent: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [Boolean(stay.title?.trim()), 'Title'],
    [Boolean(stay.description?.trim()), 'Description'],
    [Boolean(stay.city?.trim() && stay.region?.trim()), 'Location'],
    [
      parseCoord(stay.latitude) != null && parseCoord(stay.longitude) != null,
      'Map pin',
    ],
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

/** Independent listing editor steps — finish one, save, and come back to the rest anytime. */
export const STAY_FORM_STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'pricing', label: 'Capacity & pricing' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'policies', label: 'Policies' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'media', label: 'Photos & video' },
  { id: 'faqs', label: 'FAQs' },
] as const

/** Property/accommodation-only steps (rooms are edited on their own pages). */
export const STAY_PROPERTY_FORM_STEPS = STAY_FORM_STEPS.filter((s) => s.id !== 'rooms')

export type StayFormStepId = (typeof STAY_FORM_STEPS)[number]['id']
export type StayPropertyFormStepId = (typeof STAY_PROPERTY_FORM_STEPS)[number]['id']

export function emptyStayRoom(): StayRoomForm {
  return {
    name: '',
    description: '',
    max_guests: 2,
    bedrooms: 1,
    bed_summary: '',
    price_per_night: '',
    compare_at_price: '',
    badges: [],
    featured: false,
    image: '',
    image_file: null,
    images: '',
    gallery_files: [],
  }
}

export function isStayFormStepId(value: string | null | undefined): value is StayFormStepId {
  return Boolean(value && STAY_FORM_STEPS.some((s) => s.id === value))
}

/** Minimum fields required to create a draft listing (API + form). */
export function canCreateStayDraft(form: StayListingFormValues): boolean {
  return Boolean(
    form.title.trim() &&
      form.description.trim() &&
      form.price_per_night &&
      ((form.region.trim() && form.city.trim()) ||
        (Boolean(form.formatted_address?.trim()) &&
          form.latitude != null &&
          form.longitude != null)),
  )
}

export function stayFormStepDone(form: StayListingFormValues, step: StayFormStepId): boolean {
  switch (step) {
    case 'basics':
      return Boolean(
        form.title.trim() &&
          form.description.trim() &&
          ((form.region.trim() && form.city.trim()) ||
            (Boolean(form.formatted_address?.trim()) &&
              form.latitude != null &&
              form.longitude != null)),
      )
    case 'pricing':
      return Boolean(form.price_per_night && form.max_guests > 0)
    case 'amenities':
      return (
        form.amenities.length > 0 ||
        form.wifi ||
        form.parking ||
        form.pool ||
        form.kitchen ||
        form.breakfast ||
        form.pet_friendly
      )
    case 'policies':
      return Boolean(form.check_in_from && form.check_out_until && form.cancellation_policy.trim())
    case 'rooms':
      return form.room_types.some((r) => r.name.trim())
    case 'media':
      return Boolean(form.cover_image_url.trim() || form.cover_image_file)
    case 'faqs':
      return form.faqs.some((f) => f.question.trim() && f.answer.trim())
    default:
      return false
  }
}

export function stayFormStepDoneFromListing(stay: ProviderStayListing, step: StayFormStepId): boolean {
  return stayFormStepDone(stayListingToForm(stay), step)
}

/** First incomplete step, or last step when everything in the editor is done. */
export function nextIncompleteStayFormStep(
  form: StayListingFormValues,
  from: StayFormStepId = 'basics',
): StayFormStepId {
  const start = STAY_FORM_STEPS.findIndex((s) => s.id === from)
  const ordered = [
    ...STAY_FORM_STEPS.slice(Math.max(0, start)),
    ...STAY_FORM_STEPS.slice(0, Math.max(0, start)),
  ]
  for (const step of ordered) {
    if (!stayFormStepDone(form, step.id)) return step.id
  }
  return STAY_FORM_STEPS[STAY_FORM_STEPS.length - 1].id
}

export function nextStayFormStep(current: StayFormStepId): StayFormStepId | null {
  const i = STAY_FORM_STEPS.findIndex((s) => s.id === current)
  if (i < 0 || i >= STAY_FORM_STEPS.length - 1) return null
  return STAY_FORM_STEPS[i + 1].id
}

/** First incomplete property step (rooms managed separately). */
export function nextIncompleteStayPropertyStep(
  form: StayListingFormValues,
  from: StayPropertyFormStepId = 'basics',
): StayPropertyFormStepId {
  const start = STAY_PROPERTY_FORM_STEPS.findIndex((s) => s.id === from)
  const ordered = [
    ...STAY_PROPERTY_FORM_STEPS.slice(Math.max(0, start)),
    ...STAY_PROPERTY_FORM_STEPS.slice(0, Math.max(0, start)),
  ]
  for (const step of ordered) {
    if (!stayFormStepDone(form, step.id)) return step.id
  }
  return STAY_PROPERTY_FORM_STEPS[STAY_PROPERTY_FORM_STEPS.length - 1].id
}

export function nextStayPropertyStep(current: StayPropertyFormStepId): StayPropertyFormStepId | null {
  const i = STAY_PROPERTY_FORM_STEPS.findIndex((s) => s.id === current)
  if (i < 0 || i >= STAY_PROPERTY_FORM_STEPS.length - 1) return null
  return STAY_PROPERTY_FORM_STEPS[i + 1].id
}
