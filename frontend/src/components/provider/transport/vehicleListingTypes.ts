import {
  formatGalleryUrlsField,
  isVideoUrl,
  parseGalleryUrlsField,
  serializeGalleryMediaList,
} from '../../listing/photos/listingGalleryMedia'
import { RENTER_DOCUMENT_OPTIONS } from '../../../data/renterDocuments'
import { DEFAULT_PASSENGER_RENTAL_RULES } from '../../../data/transportProvider'

export { RENTER_DOCUMENT_OPTIONS }

/** Split a multi-line textarea into a trimmed list of non-empty lines. */
function linesToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export const VEHICLE_TYPE_OPTIONS = [
  { value: '4x4', label: '4×4 / SUV' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'van', label: 'Van / minibus' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'pickup', label: 'Pickup' },
] as const

export const VEHICLE_FEATURE_OPTIONS = [
  'Airport pickup',
  'Full comprehensive insurance',
  'Unlimited kilometres',
  'Child seat on request',
  'Basic insurance',
  'Roadside support',
  'GPS navigation',
  'Roof rack',
  'Gravel-road kit',
] as const

export type VehicleListingFormValues = {
  title: string
  make: string
  model: string
  year: number
  vehicle_type: string
  transmission: string
  fuel_type: string
  seats: number
  price_per_day: string
  region: string
  city: string
  pickup_location: string
  description: string
  included_features: string[]
  highlights: string
  rental_rules: string
  cover_image_url: string
  cover_image_file: File | null
  gallery_urls: string
  gallery_files: File[]
  required_renter_documents: string[]
  is_active: boolean
}

export const EMPTY_VEHICLE_LISTING_FORM: VehicleListingFormValues = {
  title: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  vehicle_type: '4x4',
  transmission: 'manual',
  fuel_type: 'diesel',
  seats: 5,
  price_per_day: '',
  region: '',
  city: '',
  pickup_location: '',
  description: '',
  included_features: [],
  highlights: '',
  rental_rules: DEFAULT_PASSENGER_RENTAL_RULES.join('\n'),
  cover_image_url: '',
  cover_image_file: null,
  gallery_urls: '',
  gallery_files: [],
  required_renter_documents: ['driver_license_front', 'driver_license_back', 'national_id'],
  is_active: true,
}

export type ProviderVehicleListing = {
  id: number
  title: string
  make: string
  model: string
  year: number
  transmission: string
  seats: number
  vehicle_type: string
  price_per_day: string
  region: string
  city: string
  cover_image: string | null
  cover_kind?: 'image' | 'video' | string | null
  description?: string | null
  pickup_location?: string | null
  fuel_type?: string | null
  included_features?: string[]
  highlights?: string[]
  rental_rules?: string[]
  gallery_images?: Array<string | { url?: string; kind?: string }>
  required_renter_documents?: string[]
  is_active?: boolean
}

export function vehicleToForm(v: ProviderVehicleListing): VehicleListingFormValues {
  const gallery = parseGalleryUrlsField(
    Array.isArray(v.gallery_images)
      ? formatGalleryUrlsField(
          v.gallery_images
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
    title: v.title,
    make: v.make,
    model: v.model,
    year: v.year,
    vehicle_type: v.vehicle_type,
    transmission: v.transmission,
    fuel_type: v.fuel_type ?? 'diesel',
    seats: v.seats,
    price_per_day: v.price_per_day,
    region: v.region,
    city: v.city,
    pickup_location: v.pickup_location ?? '',
    description: v.description ?? '',
    included_features: v.included_features ?? [],
    highlights: (v.highlights ?? []).join('\n'),
    rental_rules: (v.rental_rules ?? []).join('\n'),
    cover_image_url: v.cover_image ?? '',
    cover_image_file: null,
    gallery_urls: formatGalleryUrlsField(gallery),
    gallery_files: [],
    required_renter_documents: v.required_renter_documents ?? [],
    is_active: v.is_active !== false,
  }
}

export function formToVehiclePayload(form: VehicleListingFormValues) {
  const gallery = parseGalleryUrlsField(form.gallery_urls)
  const cover = form.cover_image_url.trim()
  const coverKind: 'image' | 'video' =
    cover && (isVideoUrl(cover) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(cover)) ? 'video' : 'image'
  return {
    title: form.title.trim(),
    make: form.make.trim(),
    model: form.model.trim(),
    year: Number(form.year),
    vehicle_type: form.vehicle_type,
    transmission: form.transmission.trim(),
    fuel_type: form.fuel_type.trim() || null,
    seats: Number(form.seats),
    price_per_day: form.price_per_day.trim(),
    region: form.region.trim(),
    city: form.city.trim(),
    pickup_location: form.pickup_location.trim(),
    description: form.description.trim(),
    included_features: form.included_features,
    highlights: linesToList(form.highlights),
    rental_rules: linesToList(form.rental_rules),
    cover_image: cover || null,
    cover_image_url: cover || '',
    cover_kind: coverKind,
    cover_kind_in: coverKind,
    gallery_images: serializeGalleryMediaList(gallery),
    required_renter_documents: form.required_renter_documents,
    is_active: form.is_active,
  }
}

export function vehicleCompleteness(v: ProviderVehicleListing): { percent: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [Boolean(v.title?.trim()), 'Title'],
    [Boolean(v.make?.trim() && v.model?.trim()), 'Make & model'],
    [Boolean(v.price_per_day), 'Daily rate'],
    [Boolean(v.region?.trim() && v.city?.trim()), 'Location'],
    [Boolean(v.pickup_location?.trim()), 'Pickup location'],
    [Boolean(v.description?.trim()), 'Description'],
    [Boolean(v.cover_image), 'Cover photo'],
    [(v.gallery_images?.length ?? 0) > 0, 'Gallery photos'],
    [(v.included_features?.length ?? 0) > 0, 'Included features'],
    [(v.required_renter_documents?.length ?? 0) > 0, 'Renter documents'],
  ]
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label)
  const percent = Math.round(((checks.length - missing.length) / checks.length) * 100)
  return { percent, missing }
}
