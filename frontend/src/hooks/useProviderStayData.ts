import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { ProviderBooking } from '../data/providerData'

export type ApiStayBooking = {
  id: number
  listing_title: string
  guest_display_name: string
  guest_username: string
  check_in: string
  check_out: string
  guests: number
  total_price: string
  status: string
  created_at?: string
}

function formatStayBookingDate(checkIn: string, checkOut: string) {
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`)
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })
  }
  return `${fmt(checkIn)} – ${fmt(checkOut)}`
}

export function mapStayBooking(row: ApiStayBooking): ProviderBooking {
  const guest = row.guest_display_name?.trim() || row.guest_username
  return {
    id: row.id,
    guest,
    guestUsername: row.guest_username,
    guestInitial: guest.charAt(0).toUpperCase(),
    service: row.listing_title,
    category: 'Stay',
    date: formatStayBookingDate(row.check_in, row.check_out),
    guests: row.guests,
    status: row.status,
    total: row.total_price ? parseFloat(row.total_price) : 0,
    paymentStatus: row.status === 'pending' ? 'pending' : row.total_price ? 'paid' : 'n/a',
    requestedAt: row.created_at,
    source: 'stay-api',
  }
}

export function useProviderStayBookings(enabled: boolean) {
  return useQuery({
    queryKey: ['provider-stay-bookings'],
    queryFn: async () => {
      const rows = await apiFetch<ApiStayBooking[]>('/api/accommodation/provider-bookings/')
      return asArray<ApiStayBooking>(rows).map(mapStayBooking)
    },
    enabled,
  })
}

export function useProviderStayAnalytics(enabled: boolean, days = 30) {
  return useQuery({
    queryKey: ['stay-provider-analytics', days],
    queryFn: () =>
      apiFetch<{
        days: number
        on_platform_revenue: number
        total_bookings: number
        confirmed_bookings: number
        pending_requests: number
        total_likes: number
        total_saves: number
        promotion_impressions: number
        promotion_clicks: number
        promotion_listing_opens: number
        listings: {
          id: number
          title: string
          bookings: number
          confirmed_bookings: number
          revenue: number
          likes_count: number
          saves_count: number
        }[]
      }>(`/api/accommodation/provider-analytics/?days=${days}`),
    enabled,
  })
}
