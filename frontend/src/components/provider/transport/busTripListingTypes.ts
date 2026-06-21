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
  cover_image_url: string
  gallery_urls: string
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
  cover_image_url: '',
  gallery_urls: '',
  is_active: true,
}

export type ProviderBusTripListing = {
  id: number
  route_detail: {
    origin: string
    destination: string
    operator_name: string
    cover_image?: string | null
    gallery_images?: string[]
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
    cover_image_url: t.route_detail.cover_image ?? '',
    gallery_urls: (t.route_detail.gallery_images ?? []).join('\n'),
    is_active: t.is_active,
  }
}

export function formToBusTripPayload(form: BusTripListingFormValues) {
  const gallery = form.gallery_urls
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return {
    route_detail: {
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      operator_name: form.operator_name.trim(),
      cover_image: form.cover_image_url.trim() || null,
      gallery_images: gallery,
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
