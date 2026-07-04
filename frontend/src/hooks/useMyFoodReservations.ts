import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'

export type MyFoodReservation = {
  id: number
  venue: number
  venue_name: string
  venue_city?: string
  venue_region?: string
  owner_username: string
  owner_display_name?: string | null
  reserved_for: string
  party_size: number
  special_requests?: string
  status: string
  created_at?: string
}

export function useMyFoodReservations(enabled = true) {
  return useQuery({
    queryKey: ['my-bookings', 'food'],
    queryFn: async () => {
      try {
        return asArray<MyFoodReservation>(await apiFetch('/api/food/reservations/'))
      } catch {
        return [] as MyFoodReservation[]
      }
    },
    enabled,
  })
}
