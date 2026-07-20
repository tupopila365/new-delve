import type { LucideIcon } from 'lucide-react'
import { Car, Truck, Bus } from 'lucide-react'
import { mediaUrl } from '../api/client'
import type { ListingGalleryItem } from '../components/listing/types'
import type { HighlightChannelInput } from '../components/highlights'
import {
  isVideoUrl,
  parseGalleryMediaList,
} from '../components/listing/photos/listingGalleryMedia'

export type VehicleListing = {
  id: number
  title: string
  make: string
  model: string
  year?: number | null
  price_per_day: string
  region: string
  city?: string | null
  cover_image: string | null
  cover_kind?: 'image' | 'video' | string | null
  description?: string | null
  vehicle_type?: string | null
  seats?: number | null
  transmission?: string | null
  fuel_type?: string | null
  air_conditioning?: boolean | null
  rating_avg?: string | null
  rating_count?: number | null
  owner_username?: string
  pickup_location?: string | null
  included_features?: string[] | null
  highlights?: string[] | null
  rental_rules?: string[] | null
  required_renter_documents?: string[] | null
  gallery_images?: Array<string | { url?: string; kind?: string }> | null
  listing_stories?: HighlightChannelInput[] | null
  owner_display_name?: string | null
  owner_bio?: string | null
  owner_region?: string | null
  owner_city?: string | null
  owner_avatar?: string | null
}

export type BusRouteDetail = {
  origin: string
  destination: string
  operator_name: string
  operator_owner_username?: string
  cover_image?: string | null
  cover_kind?: 'image' | 'video' | string | null
  gallery_images?: Array<string | { url?: string; kind?: string }> | null
  stops?: Array<string | { place?: string }> | null
  travel_tips?: string[] | null
  distance_km?: number | null
  duration_minutes?: number | null
  listing_stories?: HighlightChannelInput[] | null
}

export type BusTripListing = {
  id: number
  total_seats: number
  price: string
  departs_at: string
  arrives_at?: string | null
  route_detail: BusRouteDetail
  available_seats: number
  occupied_seats: number[]
  amenities?: string[] | null
  rating_avg?: string | null
  rating_count?: number | null
}

const VEHICLE_TYPE_LABELS: Record<string, { label: string; Icon: LucideIcon }> = {
  '4x4': { label: '4×4 / SUV', Icon: Car },
  sedan: { label: 'Sedan', Icon: Car },
  hatchback: { label: 'Hatchback', Icon: Car },
  van: { label: 'Van / Minibus', Icon: Bus },
  pickup: { label: 'Pickup', Icon: Truck },
  luxury: { label: 'Luxury', Icon: Car },
}

export function vehicleTypeMeta(type?: string | null) {
  if (!type) return { label: 'Vehicle', Icon: Car }
  return VEHICLE_TYPE_LABELS[type] ?? { label: type, Icon: Car }
}

export function vehicleProviderName(v: VehicleListing): string {
  return v.owner_display_name?.trim() || v.owner_username || 'Transport provider'
}

export function vehicleLocationLine(v: VehicleListing): string {
  return [v.city, v.region].filter(Boolean).join(', ')
}

export function vehicleSummaryLine(v: VehicleListing): string {
  const parts = [`${v.make} ${v.model}`]
  if (v.year) parts.push(String(v.year))
  return parts.join(' · ')
}

export function busRouteTitle(trip: BusTripListing): string {
  return `${trip.route_detail.origin} to ${trip.route_detail.destination}`
}

export { openStreetMapSearchUrl, formatPlaceLine, hasValidCoords } from './placeMap'

export function rentalDaysInclusive(start: string, end: string): number | null {
  if (!start || !end) return null
  const a = new Date(start)
  const b = new Date(end)
  if (b < a) return null
  const diff = b.getTime() - a.getTime()
  const n = Math.round(diff / (1000 * 60 * 60 * 24)) + 1
  return n > 0 ? n : null
}

export function collectVehiclePhotoSources(v: VehicleListing): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (raw: string | null | undefined) => {
    const s = (raw || '').trim()
    if (!s || seen.has(s)) return
    seen.add(s)
    out.push(s)
  }
  add(v.cover_image)
  for (const item of parseGalleryMediaList(v.gallery_images as unknown[] | null | undefined)) {
    add(item.url)
  }
  return out
}

export function collectBusPhotoSources(trip: BusTripListing): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (raw: string | null | undefined) => {
    const s = (raw || '').trim()
    if (!s || seen.has(s)) return
    seen.add(s)
    out.push(s)
  }
  add(trip.route_detail.cover_image)
  for (const item of parseGalleryMediaList(trip.route_detail.gallery_images as unknown[] | null | undefined)) {
    add(item.url)
  }
  return out
}

function transportCoverKind(
  cover: string | null | undefined,
  kind?: string | null,
): 'image' | 'video' {
  const src = (cover || '').trim()
  if (kind === 'video' || (src && isVideoUrl(src))) return 'video'
  return 'image'
}

export function buildVehicleGalleryImages(v: VehicleListing): ListingGalleryItem[] {
  const images: ListingGalleryItem[] = []
  const coverRaw = mediaUrl(v.cover_image) ?? (v.cover_image?.trim() || '')
  if (coverRaw) {
    images.push({
      id: 'cover',
      src: coverRaw,
      alt: v.title,
      kind: transportCoverKind(coverRaw, v.cover_kind),
    })
  }
  for (const [i, item] of parseGalleryMediaList(v.gallery_images as unknown[] | null | undefined).entries()) {
    const src = mediaUrl(item.url) ?? item.url
    if (!src || images.some((img) => img.src === src)) continue
    images.push({
      id: `gallery-${i}`,
      src,
      alt: v.title,
      kind: item.kind === 'video' || isVideoUrl(src) ? 'video' : 'image',
    })
  }
  return images
}

export function buildBusGalleryImages(trip: BusTripListing): ListingGalleryItem[] {
  const title = busRouteTitle(trip)
  const images: ListingGalleryItem[] = []
  const coverRaw =
    mediaUrl(trip.route_detail.cover_image) ?? (trip.route_detail.cover_image?.trim() || '')
  if (coverRaw) {
    images.push({
      id: 'cover',
      src: coverRaw,
      alt: title,
      kind: transportCoverKind(coverRaw, trip.route_detail.cover_kind),
    })
  }
  for (const [i, item] of parseGalleryMediaList(
    trip.route_detail.gallery_images as unknown[] | null | undefined,
  ).entries()) {
    const src = mediaUrl(item.url) ?? item.url
    if (!src || images.some((img) => img.src === src)) continue
    images.push({
      id: `gallery-${i}`,
      src,
      alt: title,
      kind: item.kind === 'video' || isVideoUrl(src) ? 'video' : 'image',
    })
  }
  return images
}

/** Provider-authored selling points (backend field). No fabricated filler. */
export function vehicleHighlights(v: VehicleListing): string[] {
  return Array.isArray(v.highlights)
    ? v.highlights.map((s) => String(s).trim()).filter(Boolean)
    : []
}

/** Provider-authored rental rules (backend field). */
export function vehicleRentalRules(v: VehicleListing): string[] {
  return Array.isArray(v.rental_rules)
    ? v.rental_rules.map((s) => String(s).trim()).filter(Boolean)
    : []
}

/** Provider-authored travel tips (backend field on the route). */
export function busTravelTips(trip: BusTripListing): string[] {
  const tips = trip.route_detail.travel_tips
  return Array.isArray(tips) ? tips.map((s) => String(s).trim()).filter(Boolean) : []
}

export function formatTripWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return { date: 'Date TBA', time: 'Time TBA' }
  }
  return {
    date: d.toLocaleDateString('en-NA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function tripDurationLabel(trip: BusTripListing, departs: string, arrives?: string | null): string {
  if (trip.route_detail.duration_minutes) {
    const mins = trip.route_detail.duration_minutes
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h && m) return `${h}h ${m}m`
    if (h) return `${h}h`
    return `${m}m`
  }
  if (!arrives) return ''
  const ms = new Date(arrives).getTime() - new Date(departs).getTime()
  if (ms <= 0) return ''
  const mins = Math.round(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export type RouteStop = {
  place: string
  label: string
  time: string | null
}

export function routeTimelineStops(trip: BusTripListing, depTime: string, arrTime: string | null): RouteStop[] {
  const { origin, destination, stops: rawStops } = trip.route_detail
  const stops: RouteStop[] = [{ place: origin, label: 'Departure', time: depTime }]
  if (Array.isArray(rawStops)) {
    for (const item of rawStops) {
      const place = (typeof item === 'string' ? item : item?.place || '').trim()
      if (place) stops.push({ place, label: 'Stop', time: null })
    }
  }
  stops.push({ place: destination, label: 'Arrival', time: arrTime })
  return stops
}
