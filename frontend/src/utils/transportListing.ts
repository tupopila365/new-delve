import type { LucideIcon } from 'lucide-react'
import { Car, Truck, Bus } from 'lucide-react'
import { mediaUrl } from '../api/client'
import type { ListingDetailRow, ListingGalleryItem, ListingMomentItem } from '../components/listing/types'
import { toListingGalleryImages } from '../components/listing/listingUtils'

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
  description?: string | null
  vehicle_type?: string | null
  seats?: number | null
  transmission?: string | null
  fuel_type?: string | null
  air_conditioning?: boolean | null
  owner_username?: string
  pickup_location?: string | null
  included_features?: string[] | null
  gallery_images?: string[] | null
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
  cover_image?: string | null
  gallery_images?: string[] | null
  distance_km?: number | null
  duration_minutes?: number | null
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
}

export const DEFAULT_RENTAL_RULES = [
  "Valid driver's license required",
  'Deposit may be required on pick-up',
  'Return with the same fuel level',
  'No smoking in the vehicle',
]

export const DEFAULT_BUS_TRAVEL_TIPS = [
  'Arrive 20 minutes before departure with your reference details.',
  'Keep snacks and water — stops can be brief on longer routes.',
  'Window seats fill first on popular coastal runs.',
]

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

export function openStreetMapSearchUrl(place: string, region?: string) {
  const q = [place, region].filter(Boolean).join(', ')
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
}

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
  for (const src of v.gallery_images ?? []) add(src)
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
  for (const src of trip.route_detail.gallery_images ?? []) add(src)
  return out
}

export function buildVehicleGalleryImages(v: VehicleListing): ListingGalleryItem[] {
  return toListingGalleryImages(collectVehiclePhotoSources(v), v.title, 'veh')
}

export function buildBusGalleryImages(trip: BusTripListing): ListingGalleryItem[] {
  return toListingGalleryImages(collectBusPhotoSources(trip), busRouteTitle(trip), 'bus')
}

export function buildVehicleHighlights(v: VehicleListing): string[] {
  const items = [
    v.vehicle_type === '4x4' || v.vehicle_type === 'pickup' ? 'Great for gravel roads' : 'Comfortable city driving',
    v.seats != null && v.seats >= 5 ? 'Enough luggage space' : 'Easy to park',
    v.air_conditioning ? 'Air conditioning' : null,
    v.included_features?.some((f) => /pickup|airport/i.test(f)) ? 'Flexible pickup' : 'Local pickup',
    v.transmission === 'automatic' ? 'Automatic transmission' : null,
  ].filter(Boolean) as string[]
  return items.slice(0, 4)
}

export function buildVehicleTrustHighlights(v: VehicleListing): string[] {
  const items: string[] = ['Vehicle rental', 'Listed on DELVE']
  if (v.air_conditioning) items.push('Air conditioning')
  if (v.vehicle_type === '4x4' || v.vehicle_type === 'pickup') items.push('Gravel-road friendly')
  if (v.included_features?.some((f) => /airport|pickup/i.test(f))) items.push('Airport pickup')
  return items
}

export function buildBusTrustHighlights(trip: BusTripListing): string[] {
  const items: string[] = ['Bus trip', 'Listed on DELVE']
  if (trip.available_seats <= 3) items.push(`${trip.available_seats} seats left`)
  else if (trip.available_seats <= 8) items.push(`${trip.available_seats} seats available`)
  else items.push('Seats available')
  return items
}

export function buildVehicleDetailRows(v: VehicleListing): ListingDetailRow[] {
  const locationLine = vehicleLocationLine(v)
  const rows: ListingDetailRow[] = [
    { id: 'rate', label: 'Daily rate', value: `N$${v.price_per_day}` },
    {
      id: 'pickup',
      label: 'Pickup location',
      value: v.pickup_location || locationLine || 'Confirm with provider',
    },
    { id: 'return', label: 'Return', value: 'Same location unless arranged with provider' },
  ]
  if (v.seats != null) rows.push({ id: 'seats', label: 'Seats', value: `${v.seats} passengers` })
  if (v.transmission) rows.push({ id: 'transmission', label: 'Transmission', value: v.transmission })
  if (v.fuel_type) rows.push({ id: 'fuel', label: 'Fuel type', value: v.fuel_type })
  if (v.year) rows.push({ id: 'year', label: 'Year', value: String(v.year) })
  const typeMeta = vehicleTypeMeta(v.vehicle_type)
  if (v.vehicle_type) rows.push({ id: 'type', label: 'Vehicle type', value: typeMeta.label })
  return rows
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
  const { origin, destination } = trip.route_detail
  let middle: string | null = null
  if (origin === 'Windhoek' && destination === 'Swakopmund') middle = 'Rehoboth'
  if (origin === 'Windhoek' && destination === 'Oshakati') middle = 'Otjiwarongo'
  if (origin === 'Swakopmund' && destination === 'Walvis Bay') middle = 'Langstrand'

  const stops: RouteStop[] = [{ place: origin, label: 'Departure', time: depTime }]
  if (middle) stops.push({ place: middle, label: 'Short stop', time: null })
  stops.push({ place: destination, label: 'Arrival', time: arrTime })
  return stops
}

export function buildBusDetailRows(trip: BusTripListing): ListingDetailRow[] {
  const dep = formatTripWhen(trip.departs_at)
  const arr = trip.arrives_at ? formatTripWhen(trip.arrives_at) : null
  const duration = tripDurationLabel(trip, trip.departs_at, trip.arrives_at)
  const rows: ListingDetailRow[] = [
    { id: 'origin', label: 'Origin', value: trip.route_detail.origin },
    { id: 'destination', label: 'Destination', value: trip.route_detail.destination },
    { id: 'departure', label: 'Departure', value: `${dep.date} · ${dep.time}` },
  ]
  if (arr) rows.push({ id: 'arrival', label: 'Arrival', value: `${arr.date} · ${arr.time}` })
  if (duration) rows.push({ id: 'duration', label: 'Duration', value: duration })
  rows.push({ id: 'fare', label: 'Fare', value: `N$${trip.price} per passenger` })
  rows.push({ id: 'operator', label: 'Operator', value: trip.route_detail.operator_name })
  if (trip.route_detail.distance_km) {
    rows.push({ id: 'distance', label: 'Distance', value: `${trip.route_detail.distance_km} km` })
  }
  return rows
}

export function buildVehicleMoments(v: VehicleListing, gallery: ListingGalleryItem[]): ListingMomentItem[] {
  return [
    ...gallery.slice(0, 2).map((item, i) => ({
      id: i,
      image: mediaUrl(item.src) || item.src,
      author: `driver${i + 1}`,
      body: 'Packed for a gravel-road weekend.',
      taggedListing: v.title,
    })),
    {
      id: 'placeholder',
      author: 'traveller',
      body: 'Fuel stop tip before heading north.',
      taggedListing: v.title,
    },
  ]
}

export function buildBusMoments(trip: BusTripListing, gallery: ListingGalleryItem[]): ListingMomentItem[] {
  const title = busRouteTitle(trip)
  return [
    ...gallery.slice(0, 2).map((item, i) => ({
      id: i,
      image: mediaUrl(item.src) || item.src,
      author: `rider${i + 1}`,
      body: 'Coastal run — grab a window seat early.',
      taggedListing: title,
    })),
    {
      id: 'placeholder',
      author: 'commuter',
      body: 'Sunrise leaving Windhoek.',
      taggedListing: title,
    },
  ]
}
