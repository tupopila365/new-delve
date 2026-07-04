import { apiFetch, mediaUrl } from '../../api/client'
import { Featured, type FeaturedItem } from '../Featured'
import { FEATURED_API, useFeaturedPlacement, type FeaturedPartnerFields } from '../../hooks/useFeaturedPlacement'
import { partnerBadgeFields } from '../../utils/featuredPartner'

type Vehicle = FeaturedPartnerFields & {
  id: number
  title: string
  make: string
  model: string
  year?: number | null
  price_per_day: string
  region: string
  city?: string | null
  cover_image: string | null
  vehicle_type?: string | null
  seats?: number | null
  transmission?: string | null
  route_detail?: undefined
}

type Trip = FeaturedPartnerFields & {
  id: number
  route_detail: {
    origin: string
    destination: string
    operator_name: string
    cover_image?: string | null
  }
  departs_at: string
  arrives_at: string
  price: string
  available_seats: number
}

type TransportFeaturedRow = Vehicle | Trip

const FALLBACK_TRANSPORT_IMAGE = '/images/default-journey.jpg'

function formatDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Upcoming'
  return date.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isBusTripRow(row: TransportFeaturedRow): row is Trip {
  return row.route_detail != null
}

function vehicleToFeatured(vehicle: Vehicle): FeaturedItem {
  const location = vehicle.city ? `${vehicle.city}, ${vehicle.region}` : vehicle.region
  const specs = [
    vehicle.vehicle_type,
    vehicle.seats != null ? `${vehicle.seats} seats` : null,
    vehicle.transmission,
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    id: `vehicle-${vehicle.id}`,
    title: vehicle.title || `${vehicle.make} ${vehicle.model}`,
    href: `/transport/vehicle/${vehicle.id}`,
    image: mediaUrl(vehicle.cover_image) || FALLBACK_TRANSPORT_IMAGE,
    fallbackImage: FALLBACK_TRANSPORT_IMAGE,
    ...partnerBadgeFields(vehicle, 'Vehicle rental'),
    location,
    meta: specs || `${vehicle.make} ${vehicle.model}${vehicle.year ? ` · ${vehicle.year}` : ''}`,
    price: `N$${vehicle.price_per_day}/day`,
  }
}

function tripToFeatured(trip: Trip): FeaturedItem {
  return {
    id: `shared-${trip.id}`,
    title: `${trip.route_detail.origin} → ${trip.route_detail.destination}`,
    href: `/transport/bus/${trip.id}`,
    image: mediaUrl(trip.route_detail.cover_image) || FALLBACK_TRANSPORT_IMAGE,
    fallbackImage: FALLBACK_TRANSPORT_IMAGE,
    ...partnerBadgeFields(trip, 'Shared trip'),
    location: trip.route_detail.operator_name,
    meta: `${formatDateTime(trip.departs_at)} · ${trip.available_seats} seats left`,
    price: `N$${trip.price}`,
  }
}

export function FeaturedTransport() {
  const { data: rows, isLoading } = useFeaturedPlacement<TransportFeaturedRow>(
    'featured-transport-rail',
    FEATURED_API.transport,
  )

  const items: FeaturedItem[] = (rows ?? []).slice(0, 8).map((row) =>
    isBusTripRow(row) ? tripToFeatured(row) : vehicleToFeatured(row),
  )

  if (isLoading) return null

  return (
    <Featured
      title="Featured transport"
      subtitle="Vehicle rentals and shared trips travellers are checking."
      items={items}
      emptyText="Featured transport options will appear once providers add listings."
    />
  )
}
