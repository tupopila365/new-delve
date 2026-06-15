import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../../api/client'
import { Featured, type FeaturedItem } from '../Featured'

type Vehicle = {
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
}

type Trip = {
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

const FALLBACK_TRANSPORT_IMAGE = '/images/default-journey.jpg'

function formatDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Upcoming'
  return date.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' })
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
    eyebrow: 'Vehicle rental',
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
    eyebrow: 'Shared trip',
    location: trip.route_detail.operator_name,
    meta: `${formatDateTime(trip.departs_at)} · ${trip.available_seats} seats left`,
    price: `N$${trip.price}`,
  }
}

export function FeaturedTransport() {
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['featured-transport-vehicles'],
    queryFn: () => apiFetch<Vehicle[]>('/api/transport/vehicles/', { auth: false }),
    staleTime: 45_000,
  })

  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ['featured-transport-shared-trips'],
    queryFn: () => apiFetch<Trip[]>('/api/transport/bus/trips/', { auth: false }),
    staleTime: 45_000,
  })

  const items: FeaturedItem[] = [
    ...(vehicles ?? []).slice(0, 4).map(vehicleToFeatured),
    ...(trips ?? []).slice(0, 4).map(tripToFeatured),
  ].slice(0, 8)

  if (vehiclesLoading && tripsLoading) return null

  return (
    <Featured
      title="Featured transport"
      subtitle="Vehicle rentals and shared trips travellers are checking."
      items={items}
      emptyText="Featured transport options will appear once providers add listings."
    />
  )
}
