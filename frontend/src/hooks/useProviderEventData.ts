import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { ProviderBooking } from '../data/providerData'

export type ApiEventBooking = {
  id: number
  event: number
  event_title: string
  event_starts_at: string
  attendee_username: string
  attendee_display_name: string
  tickets: number
  total_price: string | null
  status: string
  created_at: string
}

export type EventMonetizationApi = {
  days: number
  on_platform_revenue: number
  external_ticket_clicks: number
  total_bookings: number
  confirmed_bookings: number
  pending_payment: number
  events: {
    id: number
    title: string
    external_clicks: number
    bookings: number
    confirmed_bookings: number
    revenue: number
    has_external_tickets?: boolean
    on_platform_paid?: boolean
  }[]
}

const PERIOD_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export function mapEventBooking(row: ApiEventBooking): ProviderBooking {
  const guest = row.attendee_display_name?.trim() || row.attendee_username
  const d = new Date(row.event_starts_at)
  const date = Number.isNaN(d.getTime())
    ? row.event_starts_at
    : d.toLocaleDateString('en-NA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
  return {
    id: row.id,
    guest,
    guestUsername: row.attendee_username,
    guestInitial: guest.charAt(0).toUpperCase(),
    service: row.event_title,
    category: 'Event',
    date,
    guests: row.tickets,
    status: row.status,
    total: row.total_price ? parseFloat(row.total_price) : 0,
    paymentStatus: row.status === 'pending' ? 'pending' : row.total_price ? 'paid' : 'n/a',
    requestedAt: row.created_at,
    source: 'event-api',
  }
}

export function useProviderEventBookings(enabled: boolean) {
  return useQuery({
    queryKey: ['provider-event-bookings'],
    queryFn: async () => {
      const rows = await apiFetch<ApiEventBooking[]>('/api/events/provider-bookings/')
      return asArray<ApiEventBooking>(rows).map(mapEventBooking)
    },
    enabled,
  })
}

export function useProviderEventAnalytics(period: '7d' | '30d' | '90d', enabled: boolean) {
  const days = PERIOD_DAYS[period] ?? 30
  return useQuery({
    queryKey: ['event-provider-analytics', days],
    queryFn: () => apiFetch<EventMonetizationApi>(`/api/events/provider_analytics/?days=${days}`),
    enabled,
  })
}

export function mergeProviderBookings(
  mockBookings: ProviderBooking[],
  eventBookings: ProviderBooking[],
  allowedCategories: string[],
  stayBookings: ProviderBooking[] = [],
): ProviderBooking[] {
  const includeEvents = allowedCategories.length === 0 || allowedCategories.includes('Event')
  const includeStays = allowedCategories.length === 0 || allowedCategories.includes('Stay')
  const mockRows = mockBookings.filter((b) => {
    if (b.category === 'Event' && includeEvents) return false
    if (b.category === 'Stay' && includeStays) return false
    return true
  })
  const apiRows = [
    ...(includeEvents ? eventBookings : []),
    ...(includeStays ? stayBookings : []),
  ]
  const all = [...mockRows, ...apiRows]
  if (allowedCategories.length === 0) return all
  return all.filter((b) => allowedCategories.includes(b.category))
}
