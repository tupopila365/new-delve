import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from './useBusinessAccess'

type Conversation = {
  id: number
  unread_count?: number
}

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

  const { data: conversationsRaw } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<Conversation[]>('/api/messaging/conversations/'),
    enabled: Boolean(profile),
    staleTime: 60_000,
  })

  const { data: userBookingsRaw } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => apiFetch<Booking[]>('/api/accommodation/bookings/').catch(() => [] as Booking[]),
    enabled: Boolean(profile),
    staleTime: 60_000,
  })

  const { data: providerBookingsRaw } = useQuery({
    queryKey: ['provider-bookings-badge'],
    queryFn: () =>
      apiFetch<ProviderBooking[]>('/api/accommodation/provider-bookings/?status=pending').catch(
        () => [] as ProviderBooking[]
      ),
    enabled: Boolean(profile) && canSeeProviderBookings,
    staleTime: 60_000,
  })

  const conversations = asArray<Conversation>(conversationsRaw)
  const userBookings = asArray<Booking>(userBookingsRaw)
  const providerBookings = asArray<ProviderBooking>(providerBookingsRaw)

  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
  const pendingUserBookings = userBookings.filter((b) => b.status === 'pending').length
  const pendingProviderBookings = providerBookings.length

  return {
    unreadMessages,
    pendingUserBookings,
    pendingProviderBookings,
    pendingBookings: pendingUserBookings + pendingProviderBookings,
  }
}
