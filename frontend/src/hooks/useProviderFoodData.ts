import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { ProviderBooking } from '../data/providerData'

export type ApiFoodReservation = {
  id: number
  venue: number
  venue_name: string
  guest_username: string
  guest_display_name?: string | null
  reserved_for: string
  party_size: number
  status: string
  created_at?: string
}

export function mapFoodReservation(row: ApiFoodReservation): ProviderBooking {
  const guest = row.guest_display_name?.trim() || row.guest_username
  const d = new Date(row.reserved_for)
  const date = Number.isNaN(d.getTime())
    ? row.reserved_for
    : d.toLocaleString('en-NA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
  return {
    id: row.id,
    guest,
    guestUsername: row.guest_username,
    guestInitial: guest.charAt(0).toUpperCase(),
    service: row.venue_name,
    category: 'Food',
    date,
    guests: row.party_size,
    status: row.status,
    total: 0,
    paymentStatus: 'n/a',
    requestedAt: row.created_at,
    source: 'food-api',
  }
}

export function useProviderFoodBookings(enabled: boolean) {
  return useQuery({
    queryKey: ['provider-food-reservations'],
    queryFn: async () => {
      const rows = await apiFetch<ApiFoodReservation[]>('/api/food/provider-reservations/')
      return asArray<ApiFoodReservation>(rows).map(mapFoodReservation)
    },
    enabled,
  })
}
