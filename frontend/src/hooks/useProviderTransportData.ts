import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { ProviderBooking } from '../data/providerData'

export type ApiRentalBooking = {
  id: number
  vehicle_title: string
  guest_display_name: string
  guest_username: string
  check_in: string
  check_out: string
  days: number
  total_price: string
  status: string
  created_at?: string
}

export type ApiSeatBooking = {
  id: number
  route_label: string
  passenger_display_name: string
  passenger_username: string
  seat: number
  date: string
  total_price: string
  status: string
  created_at?: string
}

function formatRentalDates(checkIn: string, checkOut: string) {
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`)
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })
  }
  return `${fmt(checkIn)} – ${fmt(checkOut)}`
}

function formatSeatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function mapRentalBooking(row: ApiRentalBooking): ProviderBooking {
  const guest = row.guest_display_name?.trim() || row.guest_username
  return {
    id: row.id,
    guest,
    guestUsername: row.guest_username,
    guestInitial: guest.charAt(0).toUpperCase(),
    service: row.vehicle_title,
    category: 'Transport',
    date: formatRentalDates(row.check_in, row.check_out),
    guests: 1,
    status: row.status,
    total: row.total_price ? parseFloat(row.total_price) : 0,
    paymentStatus: row.status === 'pending' ? 'pending' : row.total_price ? 'paid' : 'n/a',
    requestedAt: row.created_at,
    source: 'transport-rental-api',
  }
}

export function mapSeatBooking(row: ApiSeatBooking): ProviderBooking {
  const guest = row.passenger_display_name?.trim() || row.passenger_username
  return {
    id: row.id,
    guest,
    guestUsername: row.passenger_username,
    guestInitial: guest.charAt(0).toUpperCase(),
    service: `${row.route_label} · Seat ${row.seat}`,
    category: 'Transport',
    date: formatSeatDate(row.date),
    guests: 1,
    status: row.status,
    total: row.total_price ? parseFloat(row.total_price) : 0,
    paymentStatus: row.status === 'pending' ? 'pending' : row.total_price ? 'paid' : 'n/a',
    requestedAt: row.created_at,
    source: 'transport-seat-api',
  }
}

export function useProviderTransportBookings(enabled: boolean) {
  return useQuery({
    queryKey: ['provider-transport-bookings'],
    queryFn: async () => {
      const [rentals, seats] = await Promise.all([
        apiFetch<ApiRentalBooking[]>('/api/transport/provider-rental-bookings/'),
        apiFetch<ApiSeatBooking[]>('/api/transport/provider-seat-bookings/'),
      ])
      return [
        ...asArray<ApiRentalBooking>(rentals).map(mapRentalBooking),
        ...asArray<ApiSeatBooking>(seats).map(mapSeatBooking),
      ]
    },
    enabled,
  })
}
