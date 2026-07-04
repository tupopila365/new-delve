import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from './useBusinessAccess'

type Booking = {
  id: number
  status: string
}

type ProviderBooking = {
  id: number
  status: string
}

function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? data : []
}

export function useNavBadges() {
  const { profile } = useAuth()
  const { businesses } = useBusinessAccess()

  const canSeeProviderBookings =
    profile?.user_type === 'service_provider' || businesses.length > 0

  const { data: unreadPayload } = useQuery({
    queryKey: ['messaging-unread-count'],
    queryFn: () => apiFetch<{ unread: number }>('/api/messaging/unread-count/'),
    enabled: Boolean(profile),
    staleTime: 10_000,
    refetchInterval: 15_000,
  })

  const { data: userBookingsRaw } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const [stays, vehicles, seats, food] = await Promise.all([
        apiFetch<Booking[]>('/api/accommodation/bookings/').catch(() => [] as Booking[]),
        apiFetch<Booking[]>('/api/transport/vehicle-bookings/').catch(() => [] as Booking[]),
        apiFetch<Booking[]>('/api/transport/bus/reservations/').catch(() => [] as Booking[]),
        apiFetch<Booking[]>('/api/food/reservations/').catch(() => [] as Booking[]),
      ])
      return [...asArray(stays), ...asArray(vehicles), ...asArray(seats), ...asArray(food)]
    },
    enabled: Boolean(profile),
    staleTime: 60_000,
  })

  const { data: providerBookingsRaw } = useQuery({
    queryKey: ['provider-bookings-badge'],
    queryFn: async () => {
      const [stays, food] = await Promise.all([
        apiFetch<ProviderBooking[]>('/api/accommodation/provider-bookings/?status=pending').catch(
          () => [] as ProviderBooking[],
        ),
        apiFetch<ProviderBooking[]>('/api/food/provider-reservations/?status=pending').catch(
          () => [] as ProviderBooking[],
        ),
      ])
      return [...asArray(stays), ...asArray(food)]
    },
    enabled: Boolean(profile) && canSeeProviderBookings,
    staleTime: 60_000,
  })

  const userBookings = asArray<Booking>(userBookingsRaw)
  const providerBookings = asArray<ProviderBooking>(providerBookingsRaw)

  const unreadMessages = unreadPayload?.unread ?? 0
  const pendingUserBookings = userBookings.filter((b) => b.status === 'pending').length
  const pendingProviderBookings = providerBookings.length

  return {
    unreadMessages,
    pendingUserBookings,
    pendingProviderBookings,
    pendingBookings: pendingUserBookings + pendingProviderBookings,
  }
}
