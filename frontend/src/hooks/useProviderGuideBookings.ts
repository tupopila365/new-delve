import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { GuideProviderBooking } from '../components/provider/guides'
import type { ProviderBooking } from '../data/providerData'

function formatGuideDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function mapGuideBooking(row: GuideProviderBooking): ProviderBooking {
  const guest = row.guest_display_name?.trim() || row.guest_username
  return {
    id: row.id,
    guest,
    guestUsername: row.guest_username,
    guestInitial: guest.charAt(0).toUpperCase(),
    service: row.package_title,
    category: 'Guide',
    date: formatGuideDate(row.date),
    guests: row.guests,
    status: row.status,
    total: row.total_price ? parseFloat(row.total_price) : 0,
    paymentStatus: row.status === 'pending' ? 'pending' : row.total_price ? 'paid' : 'n/a',
    requestedAt: row.date,
    source: 'guide-api',
  }
}

export function useProviderGuideBookings(enabled: boolean) {
  return useQuery({
    queryKey: ['provider-guide-bookings'],
    queryFn: async () => {
      const rows = await apiFetch<GuideProviderBooking[]>('/api/guides/provider-bookings/')
      return asArray<GuideProviderBooking>(rows).map(mapGuideBooking)
    },
    enabled,
  })
}
