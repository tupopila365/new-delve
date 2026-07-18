import {
  formatGalleryUrlsField,
  isVideoUrl,
  parseGalleryUrlsField,
  serializeGalleryMediaList,
} from '../../listing/photos/listingGalleryMedia'
import { DEFAULT_PASSENGER_BUS_TIPS } from '../../../data/transportProvider'

/** Split a multi-line textarea into a trimmed list of non-empty lines. */
function linesToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export const BUS_AMENITY_OPTIONS = [
  'Air conditioning',
  'Onboard toilet',
  'Luggage hold',
  'USB charging',
  'Wi-Fi',
  'Reclining seats',
  'Refreshments',
] as const

export type BusTripListingFormValues = {
  origin: string
  destination: string
  operator_name: string
  distance_km: string
  duration_minutes: number
  departs_at: string
  arrives_at: string
  total_seats: number
  price: string
  amenities: string[]
  stops: string
  travel_tips: string
  cover_image_url: string
  cover_image_file: File | null
  gallery_urls: string
  gallery_files: File[]
  is_active: boolean
}

export const EMPTY_BUS_TRIP_FORM: BusTripListingFormValues = {
  origin: '',
  destination: '',
  operator_name: '',
  distance_km: '',
  duration_minutes: 240,
  departs_at: '',
  arrives_at: '',
  total_seats: 32,
  price: '',
  amenities: [],
  stops: '',
  travel_tips: DEFAULT_PASSENGER_BUS_TIPS.join('\n'),
  cover_image_url: '',
  cover_image_file: null,
  gallery_urls: '',
  gallery_files: [],
  is_active: true,
}

export type ProviderBusTripListing = {
  id: number
  route_detail: {
    origin: string
    destination: string
    operator_name: string
    cover_image?: string | null
    cover_kind?: 'image' | 'video' | string | null
    gallery_images?: Array<string | { url?: string; kind?: string }>
    stops?: Array<string | { place?: string }>
    travel_tips?: string[]
    distance_km?: number | null
    duration_minutes?: number | null
  }
  departs_at: string
  arrives_at: string
  price: string
  total_seats: number
  available_seats: number
  occupied_seats: number[]
  amenities?: string[]
  is_active: boolean
}

export function busTripToForm(t: ProviderBusTripListing): BusTripListingFormValues {
  const dep = t.departs_at ? toLocalInputValue(t.departs_at) : ''
  const arr = t.arrives_at ? toLocalInputValue(t.arrives_at) : ''
  const gallery = parseGalleryUrlsField(
    Array.isArray(t.route_detail.gallery_images)
      ? formatGalleryUrlsField(
          t.route_detail.gallery_images
            .map((item) => {
              if (typeof item === 'string') return { url: item, kind: 'image' as const }
              const url = String(item?.url || '').trim()
              if (!url) return null
              return {
                url,
                kind: (item?.kind === 'video' || isVideoUrl(url) ? 'video' : 'image') as 'image' | 'video',
              }
            })
            .filter((item): item is { url: string; kind: 'image' | 'video' } => Boolean(item)),
        )
      : '',
  )
  return {
    origin: t.route_detail.origin,
    destination: t.route_detail.destination,
    operator_name: t.route_detail.operator_name,
    distance_km: t.route_detail.distance_km ? String(t.route_detail.distance_km) : '',
    duration_minutes: t.route_detail.duration_minutes ?? 240,
    departs_at: dep,
    arrives_at: arr,
    total_seats: t.total_seats,
    price: t.price,
    amenities: t.amenities ?? [],
    stops: (t.route_detail.stops ?? [])
      .map((s) => (typeof s === 'string' ? s : s?.place || ''))
      .filter(Boolean)
      .join('\n'),
    travel_tips: (t.route_detail.travel_tips ?? []).join('\n'),
    cover_image_url: t.route_detail.cover_image ?? '',
    cover_image_file: null,
    gallery_urls: formatGalleryUrlsField(gallery),
    gallery_files: [],
    is_active: t.is_active,
  }
}

export function formToBusTripPayload(form: BusTripListingFormValues) {
  const gallery = parseGalleryUrlsField(form.gallery_urls)
  const cover = form.cover_image_url.trim()
  const coverKind: 'image' | 'video' =
    cover && (isVideoUrl(cover) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(cover)) ? 'video' : 'image'
  return {
    route_detail: {
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      operator_name: form.operator_name.trim(),
      cover_image: cover || null,
      cover_kind: coverKind,
      gallery_images: serializeGalleryMediaList(gallery),
      stops: linesToList(form.stops),
      travel_tips: linesToList(form.travel_tips),
      distance_km: form.distance_km.trim() ? Number(form.distance_km) : null,
      duration_minutes: Number(form.duration_minutes) || null,
    },
    departs_at: fromLocalInputValue(form.departs_at),
    arrives_at: fromLocalInputValue(form.arrives_at),
    total_seats: Number(form.total_seats),
    price: form.price.trim(),
    amenities: form.amenities,
    is_active: form.is_active,
  }
}

export function busTripCompleteness(t: ProviderBusTripListing): { percent: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [Boolean(t.route_detail.origin?.trim()), 'Origin'],
    [Boolean(t.route_detail.destination?.trim()), 'Destination'],
    [Boolean(t.route_detail.operator_name?.trim()), 'Operator name'],
    [Boolean(t.departs_at), 'Departure time'],
    [Boolean(t.arrives_at), 'Arrival time'],
    [t.total_seats > 0, 'Seat capacity'],
    [Boolean(t.price), 'Fare'],
    [Boolean(t.route_detail.cover_image), 'Route cover photo'],
    [(t.amenities?.length ?? 0) > 0, 'Amenities'],
  ]
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label)
  const percent = Math.round(((checks.length - missing.length) / checks.length) * 100)
  return { percent, missing }
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(value: string) {
  if (!value.trim()) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toISOString()
}
