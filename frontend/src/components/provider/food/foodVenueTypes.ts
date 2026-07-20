import type { VenueStoryChannelInput } from '../../food/stories/types'
import { emptySchedule, scheduleFromJson } from './openingHoursUtils'
import { moduleStatus, workspaceCompleteness, type ProviderFoodVenueRecord } from './foodVenueModules'
import { normalizeVenueStoriesForSave } from './venueStoriesFormUtils'
import { parseCoord } from '../../../utils/placeMap'
import { formatGalleryUrlsField, parseGalleryUrlsField } from '../../listing/photos/listingGalleryMedia'

export const CUISINE_OPTIONS = [
  { value: 'local', label: 'Local / Namibian' },
  { value: 'grill', label: 'Grill & steak' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'cafe', label: 'Café' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'asian', label: 'Asian' },
  { value: 'fast_food', label: 'Fast food' },
  { value: 'bar', label: 'Bar & nightlife' },
  { value: 'vegan', label: 'Vegan / vegetarian' },
  { value: 'international', label: 'International' },
  { value: 'other', label: 'Other' },
] as const

export type FoodVenueFormValues = {
  name: string
  description: string
  tagline: string
  popular_dish: string
  cuisine: string
  region: string
  city: string
  address: string
  latitude: number | null
  longitude: number | null
  google_place_id: string
  formatted_address: string
  phone: string
  website: string
  opening_hours: string
  opening_hours_json: import('./openingHoursUtils').OpeningHoursSchedule
  closes_at: string
  price_level: number
  dine_in: boolean
  takeaway: boolean
  delivery: boolean
  reservations: boolean
  is_open: '' | 'true' | 'false'
  amenities_text: string
  cover_image_url: string
  cover_image_file: File | null
  gallery_urls: string
  gallery_files: File[]
  venue_stories: VenueStoryChannelInput[]
  is_active: boolean
}

export const EMPTY_FOOD_VENUE_FORM: FoodVenueFormValues = {
  name: '',
  description: '',
  tagline: '',
  popular_dish: '',
  cuisine: 'local',
  region: '',
  city: '',
  address: '',
  latitude: null,
  longitude: null,
  google_place_id: '',
  formatted_address: '',
  phone: '',
  website: '',
  opening_hours: '',
  opening_hours_json: emptySchedule(),
  closes_at: '',
  price_level: 2,
  dine_in: true,
  takeaway: false,
  delivery: false,
  reservations: false,
  is_open: '',
  amenities_text: '',
  cover_image_url: '',
  cover_image_file: null,
  gallery_urls: '',
  gallery_files: [],
  venue_stories: [],
  is_active: false,
}

export type ProviderFoodVenue = {
  id: number
  owner_username: string
  name: string
  description: string
  tagline?: string | null
  popular_dish?: string | null
  cuisine: string
  region: string
  city: string
  address?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  google_place_id?: string | null
  formatted_address?: string | null
  phone?: string | null
  website?: string | null
  opening_hours?: string | null
  opening_hours_json?: import('./openingHoursUtils').OpeningHoursSchedule | null
  closes_at?: string | null
  price_level: number
  dine_in?: boolean
  takeaway?: boolean
  delivery?: boolean
  reservations?: boolean
  is_open?: boolean | null
  amenities?: string[]
  photos?: { id?: number; image: string; caption?: string; category?: string; is_cover?: boolean; kind?: 'image' | 'video' }[]
  venue_stories?: VenueStoryChannelInput[]
  cover_image?: string | null
  cover_kind?: 'image' | 'video' | string | null
  rating_avg?: string | null
  rating_count?: number | null
  is_active: boolean
}

function galleryUrlsFromPhotos(
  photos: ProviderFoodVenue['photos'],
): string {
  if (!photos?.length) return ''
  return formatGalleryUrlsField(
    photos
      .filter((p) => !p.is_cover)
      .map((p) => ({ url: p.image, kind: p.kind === 'video' ? 'video' : 'image' })),
  )
}

export function venueToForm(venue: ProviderFoodVenue): FoodVenueFormValues {
  const cover =
    venue.cover_image ||
    venue.photos?.find((p) => p.is_cover)?.image ||
    venue.photos?.[0]?.image ||
    ''
  return {
    name: venue.name,
    description: venue.description ?? '',
    tagline: venue.tagline ?? '',
    popular_dish: venue.popular_dish ?? '',
    cuisine: venue.cuisine || 'other',
    region: venue.region,
    city: venue.city ?? '',
    address: venue.address ?? '',
    latitude: parseCoord(venue.latitude),
    longitude: parseCoord(venue.longitude),
    google_place_id: venue.google_place_id ?? '',
    formatted_address: venue.formatted_address ?? '',
    phone: venue.phone ?? '',
    website: venue.website ?? '',
    opening_hours: venue.opening_hours ?? '',
    opening_hours_json: scheduleFromJson(venue.opening_hours_json),
    closes_at: venue.closes_at ?? '',
    price_level: venue.price_level || 2,
    dine_in: venue.dine_in !== false,
    takeaway: Boolean(venue.takeaway),
    delivery: Boolean(venue.delivery),
    reservations: Boolean(venue.reservations),
    is_open:
      venue.is_open === true ? 'true' : venue.is_open === false ? 'false' : '',
    amenities_text: (venue.amenities ?? []).join(', '),
    cover_image_url: cover,
    cover_image_file: null,
    gallery_urls: galleryUrlsFromPhotos(venue.photos),
    gallery_files: [],
    venue_stories: (venue.venue_stories ?? []).map((ch) => ({
      ...ch,
      slides: ch.slides.map((s) => ({ ...s })),
    })),
    is_active: venue.is_active !== false,
  }
}

export function formToVenuePayload(values: FoodVenueFormValues) {
  const amenities = values.amenities_text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const gallery = parseGalleryUrlsField(values.gallery_urls)
  const photos = gallery.map((item, index) => ({
    id: index + 2,
    image: item.url,
    kind: item.kind,
    caption: '',
    category: 'food',
    is_cover: false,
  }))
  const is_open =
    values.is_open === 'true' ? true : values.is_open === 'false' ? false : null

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    tagline: values.tagline.trim(),
    popular_dish: values.popular_dish.trim(),
    cuisine: values.cuisine,
    region: values.region.trim(),
    city: values.city.trim(),
    address: values.address.trim(),
    latitude: values.latitude,
    longitude: values.longitude,
    google_place_id: values.google_place_id.trim(),
    formatted_address: values.formatted_address.trim(),
    phone: values.phone.trim(),
    website: values.website.trim(),
    opening_hours: values.opening_hours.trim(),
    closes_at: values.closes_at.trim(),
    price_level: values.price_level,
    dine_in: values.dine_in,
    takeaway: values.takeaway,
    delivery: values.delivery,
    reservations: values.reservations,
    is_open,
    amenities,
    photos,
    venue_stories: normalizeVenueStoriesForSave(values.venue_stories),
    cover_image_url: values.cover_image_url.trim(),
    is_active: values.is_active,
  }
}

export function venueCompleteness(venue: ProviderFoodVenue): { percent: number; missing: string[] } {
  const record = venue as ProviderFoodVenueRecord
  const { percent } = workspaceCompleteness(record)
  const missing: string[] = []
  const labels: Record<string, string> = {
    identity: 'Venue details',
    location: 'Location',
    hours: 'Opening hours',
    contact: 'Contact info',
    photos: 'Cover photo or video',
    stories: 'Highlights',
  }
  for (const [id, label] of Object.entries(labels)) {
    const status = moduleStatus(record, id as import('./foodVenueModules').FoodVenueModuleId)
    if (status !== 'complete') missing.push(label)
  }
  return { percent, missing }
}
