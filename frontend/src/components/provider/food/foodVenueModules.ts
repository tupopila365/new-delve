import {
  Camera,
  Clapperboard,
  Clock,
  MapPin,
  Phone,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { VenueStoryChannelInput } from '../../food/stories/types'
import { normalizeVenueStoriesForSave } from './venueStoriesFormUtils'
import {
  scheduleHasOpenDay,
  scheduleFromJson,
  scheduleToJson,
  type OpeningHoursSchedule,
} from './openingHoursUtils'
import type { FoodVenueFormValues } from './foodVenueTypes'
import { hasValidCoords, parseCoord } from '../../../utils/placeMap'

export type FoodVenueModuleId =
  | 'identity'
  | 'location'
  | 'hours'
  | 'contact'
  | 'service'
  | 'photos'
  | 'stories'

export type ModuleStatus = 'empty' | 'draft' | 'complete'

export type FoodVenueModuleDef = {
  id: FoodVenueModuleId
  label: string
  hint: string
  Icon: LucideIcon
}

export const FOOD_VENUE_MODULES: FoodVenueModuleDef[] = [
  { id: 'identity', label: 'Venue', hint: 'Name, cuisine, and description', Icon: Store },
  { id: 'location', label: 'Location', hint: 'Map pin, address, and region', Icon: MapPin },
  { id: 'hours', label: 'Hours', hint: 'When you are open each week', Icon: Clock },
  { id: 'contact', label: 'Contact', hint: 'Phone and website', Icon: Phone },
  { id: 'service', label: 'Service', hint: 'Dine-in, delivery, and amenities', Icon: UtensilsCrossed },
  { id: 'photos', label: 'Photos', hint: 'Cover image and gallery', Icon: Camera },
  { id: 'stories', label: 'Stories', hint: 'Optional highlight reels', Icon: Clapperboard },
]

export type ProviderFoodVenueRecord = {
  id: number
  name: string
  description?: string | null
  tagline?: string | null
  popular_dish?: string | null
  cuisine: string
  region: string
  city?: string | null
  address?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  google_place_id?: string | null
  formatted_address?: string | null
  phone?: string | null
  website?: string | null
  opening_hours?: string | null
  opening_hours_json?: OpeningHoursSchedule | null
  closes_at?: string | null
  price_level: number
  dine_in?: boolean
  takeaway?: boolean
  delivery?: boolean
  reservations?: boolean
  is_open?: boolean | null
  amenities?: string[]
  photos?: { image: string; is_cover?: boolean }[]
  venue_stories?: VenueStoryChannelInput[]
  cover_image?: string | null
  is_active: boolean
}

export function identityPayload(values: FoodVenueFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    tagline: values.tagline.trim(),
    popular_dish: values.popular_dish.trim(),
    cuisine: values.cuisine,
    price_level: values.price_level,
  }
}

export function locationPayload(values: FoodVenueFormValues) {
  return {
    region: values.region.trim(),
    city: values.city.trim(),
    address: values.address.trim(),
    latitude: values.latitude,
    longitude: values.longitude,
    google_place_id: values.google_place_id.trim(),
    formatted_address: values.formatted_address.trim(),
  }
}

export function hoursPayload(schedule: OpeningHoursSchedule) {
  return {
    opening_hours_json: scheduleToJson(schedule),
  }
}

export function contactPayload(values: FoodVenueFormValues) {
  const is_open =
    values.is_open === 'true' ? true : values.is_open === 'false' ? false : null
  return {
    phone: values.phone.trim(),
    website: values.website.trim(),
    is_open,
  }
}

export function servicePayload(values: FoodVenueFormValues) {
  const amenities = values.amenities_text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    dine_in: values.dine_in,
    takeaway: values.takeaway,
    delivery: values.delivery,
    reservations: values.reservations,
    amenities,
  }
}

export type PublishRequirement = {
  id: string
  label: string
  met: boolean
  module: FoodVenueModuleId
}

export function publishRequirements(venue: ProviderFoodVenueRecord): PublishRequirement[] {
  const lat = parseCoord(venue.latitude)
  const lng = parseCoord(venue.longitude)
  const hasLocation =
    hasValidCoords(lat, lng) || Boolean(venue.region?.trim() && venue.city?.trim())
  const hasCover = Boolean(venue.cover_image || venue.photos?.some((p) => p.is_cover))

  return [
    { id: 'name', label: 'Venue name', met: Boolean(venue.name?.trim()), module: 'identity' },
    { id: 'location', label: 'Location (map pin or city & region)', met: hasLocation, module: 'location' },
    { id: 'photo', label: 'Cover photo', met: hasCover, module: 'photos' },
  ]
}

export function canPublish(venue: ProviderFoodVenueRecord): boolean {
  return publishRequirements(venue).every((r) => r.met)
}

export function publishPayload() {
  return { is_active: true }
}

export function unpublishPayload() {
  return { is_active: false }
}

export function storiesPayload(values: FoodVenueFormValues) {
  return {
    venue_stories: normalizeVenueStoriesForSave(values.venue_stories),
  }
}

export function canSaveIdentity(values: FoodVenueFormValues): boolean {
  return Boolean(values.name.trim())
}

export function canSaveLocation(_values: FoodVenueFormValues): boolean {
  return true
}

export function canSaveHours(_schedule: OpeningHoursSchedule): boolean {
  return true
}

export function canSaveContact(_values: FoodVenueFormValues): boolean {
  return true
}

export function canSaveService(_values: FoodVenueFormValues): boolean {
  return true
}

export function moduleStatus(
  venue: ProviderFoodVenueRecord,
  module: FoodVenueModuleId,
): ModuleStatus {
  switch (module) {
    case 'identity':
      if (!venue.name?.trim()) return 'empty'
      if (venue.description?.trim() && venue.cuisine) return 'complete'
      return 'draft'
    case 'location': {
      const lat = parseCoord(venue.latitude)
      const lng = parseCoord(venue.longitude)
      if (hasValidCoords(lat, lng)) return 'complete'
      if (!venue.region?.trim() && !venue.city?.trim() && !venue.address?.trim()) return 'empty'
      if (venue.region?.trim() && venue.city?.trim()) return 'complete'
      return 'draft'
    }
    case 'hours': {
      const schedule = scheduleFromJson(venue.opening_hours_json)
      if (!scheduleHasOpenDay(schedule) && !venue.opening_hours?.trim()) return 'empty'
      if (scheduleHasOpenDay(schedule) || venue.opening_hours?.trim()) return 'complete'
      return 'draft'
    }
    case 'contact':
      if (!venue.phone?.trim() && !venue.website?.trim()) return 'empty'
      if (venue.phone?.trim() || venue.website?.trim()) return 'complete'
      return 'draft'
    case 'service':
      return 'complete'
    case 'photos':
      if (!venue.cover_image && !venue.photos?.length) return 'empty'
      if (venue.cover_image || venue.photos?.some((p) => p.is_cover)) return 'complete'
      return 'draft'
    case 'stories':
      if (!venue.venue_stories?.length) return 'empty'
      return 'complete'
    default:
      return 'empty'
  }
}

export function workspaceCompleteness(venue: ProviderFoodVenueRecord): {
  percent: number
  completeCount: number
} {
  const weights: Record<FoodVenueModuleId, number> = {
    identity: 20,
    location: 25,
    hours: 15,
    contact: 10,
    service: 5,
    photos: 20,
    stories: 5,
  }
  let earned = 0
  let total = 0
  let completeCount = 0
  for (const mod of FOOD_VENUE_MODULES) {
    const w = weights[mod.id]
    total += w
    const status = moduleStatus(venue, mod.id)
    if (status === 'complete') {
      earned += w
      completeCount += 1
    } else if (status === 'draft') {
      earned += w * 0.5
    }
  }
  return { percent: Math.round((earned / total) * 100), completeCount }
}

export function moduleStatusPillClass(status: ModuleStatus): string {
  if (status === 'complete') return 'prov-ui__pill prov-ui__pill--ok fv-status-pill'
  if (status === 'draft') return 'prov-ui__pill prov-ui__pill--warn fv-status-pill'
  return 'prov-ui__pill prov-ui__pill--muted fv-status-pill'
}

export function moduleStatusLabel(status: ModuleStatus): string {
  if (status === 'complete') return 'Complete'
  if (status === 'draft') return 'In progress'
  return 'Not started'
}

export function venueOpenPillClass(venue: {
  is_open?: boolean | null
  is_active: boolean
}): string {
  if (venue.is_open === true) return 'prov-ui__pill prov-ui__pill--ok'
  if (venue.is_open === false) return 'prov-ui__pill prov-ui__pill--bad'
  if (venue.is_active) return 'prov-ui__pill prov-ui__pill--ok'
  return 'prov-ui__pill prov-ui__pill--warn'
}

export function saveLabel(module: FoodVenueModuleId): string {
  const labels: Record<FoodVenueModuleId, string> = {
    identity: 'Save venue',
    location: 'Save location',
    hours: 'Save hours',
    contact: 'Save contact',
    service: 'Save service options',
    photos: 'Save photos',
    stories: 'Save stories',
  }
  return labels[module]
}
