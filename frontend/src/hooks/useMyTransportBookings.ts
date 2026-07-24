import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import { formatDisplayMoney } from '../lib/displayMoney'
import { exploreDisplayCurrency } from '../lib/exploreDestination'

function parseMoneyAmount(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Format a stored booking total for display (Explore currency; display-only). */
export function formatBookingTotal(value: string | number | null | undefined): string {
  return formatDisplayMoney(parseMoneyAmount(value), exploreDisplayCurrency(), {
    fallback: formatDisplayMoney(0, exploreDisplayCurrency()),
  })
}

export type MyVehicleBooking = {
  id: number
  listing: number
  listing_title: string
  listing_owner_username: string
  owner_display_name?: string
  listing_region?: string
  listing_city?: string
  start_date: string
  end_date: string
  total_price: string
  status: string
  mock_payment_ref?: string
  payout_status?: string
  has_review?: boolean
  created_at?: string
}

export type MySeatReservation = {
  id: number
  trip: number
  trip_departs_at: string
  route_label: string
  operator_name?: string
  operator_owner_username?: string
  seat_number: number
  seat_price: string
  status: string
  mock_payment_ref?: string
  payout_status?: string
  has_review?: boolean
  created_at?: string
}

export type MySeatBookingGroup = {
  key: string
  trip: number
  route_label: string
  trip_departs_at: string
  operator_name?: string
  operator_owner_username?: string
  seat_numbers: number[]
  reservation_ids: number[]
  status: string
  total_price: string
  mock_payment_ref?: string
  payout_status?: string
  has_review?: boolean
  created_at?: string
}

export function groupSeatReservations(rows: MySeatReservation[]): MySeatBookingGroup[] {
  const sorted = [...rows].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
  const groups: MySeatBookingGroup[] = []

  for (const row of sorted) {
    const paymentRef = row.mock_payment_ref?.trim()
    const createdMs = row.created_at ? new Date(row.created_at).getTime() : 0
    const existing = groups.find((g) => {
      if (g.trip !== row.trip) return false
      if (paymentRef && g.mock_payment_ref) return g.mock_payment_ref === paymentRef
      if (!g.created_at || !row.created_at) return false
      const gap = Math.abs(new Date(g.created_at).getTime() - createdMs)
      return gap < 5000
    })

    if (existing) {
      existing.seat_numbers.push(row.seat_number)
      existing.reservation_ids.push(row.id)
      existing.seat_numbers.sort((a, b) => a - b)
      if (row.status === 'pending' || existing.status === 'pending') {
        existing.status = 'pending'
      }
      const seatTotal = parseMoneyAmount(existing.total_price)
      const add = parseMoneyAmount(row.seat_price)
      existing.total_price = (seatTotal + add).toFixed(0)
      if (!existing.payout_status && row.payout_status) {
        existing.payout_status = row.payout_status
      }
      continue
    }

    groups.push({
      key: `bus-${row.id}`,
      trip: row.trip,
      route_label: row.route_label,
      trip_departs_at: row.trip_departs_at,
      operator_name: row.operator_name,
      operator_owner_username: row.operator_owner_username,
      seat_numbers: [row.seat_number],
      reservation_ids: [row.id],
      status: row.status,
      total_price: parseMoneyAmount(row.seat_price).toFixed(0),
      mock_payment_ref: paymentRef || undefined,
      payout_status: row.payout_status,
      has_review: row.has_review,
      created_at: row.created_at,
    })
  }

  return groups
}

export function findSeatBookingGroup(groups: MySeatBookingGroup[], reservationId: number) {
  return groups.find((g) => g.reservation_ids.includes(reservationId))
}

export function useMyVehicleBookings(enabled: boolean) {
  return useQuery({
    queryKey: ['my-bookings', 'transport', 'vehicles'],
    queryFn: async () => {
      try {
        return asArray<MyVehicleBooking>(await apiFetch('/api/transport/vehicle-bookings/'))
      } catch {
        return []
      }
    },
    enabled,
  })
}

export function useMySeatReservations(enabled: boolean) {
  return useQuery({
    queryKey: ['my-bookings', 'transport', 'seats'],
    queryFn: async () => {
      try {
        return asArray<MySeatReservation>(await apiFetch('/api/transport/bus/reservations/'))
      } catch {
        return []
      }
    },
    enabled,
  })
}

export function useMySeatBookingGroups(enabled: boolean) {
  const query = useMySeatReservations(enabled)
  const groups = groupSeatReservations(query.data ?? [])
  return { ...query, groups }
}
