import type { BookingDto, CreateBookingBody, ProviderBookingFilter, TravelerBookingFilter } from '@delve/contracts'
import { authorizedJson } from './authClient'

export async function createBooking(body: CreateBookingBody) {
  return authorizedJson<BookingDto>('/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchMyBookings(filter?: TravelerBookingFilter) {
  const qs = filter ? `?filter=${encodeURIComponent(filter)}` : ''
  return authorizedJson<BookingDto[]>(`/me/bookings${qs}`)
}

export async function fetchMyBooking(bookingId: string) {
  return authorizedJson<BookingDto>(`/me/bookings/${encodeURIComponent(bookingId)}`)
}

export async function cancelMyBooking(bookingId: string, reason?: string) {
  return authorizedJson<BookingDto>(`/me/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  })
}

export async function fetchBusinessBookings(businessId: string, query?: { filter?: ProviderBookingFilter; q?: string }) {
  const params = new URLSearchParams()
  if (query?.filter) params.set('filter', query.filter)
  if (query?.q) params.set('q', query.q)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return authorizedJson<BookingDto[]>(`/businesses/${encodeURIComponent(businessId)}/bookings${suffix}`)
}

export async function fetchBusinessBooking(businessId: string, bookingId: string) {
  return authorizedJson<BookingDto>(
    `/businesses/${encodeURIComponent(businessId)}/bookings/${encodeURIComponent(bookingId)}`,
  )
}

export async function confirmBusinessBooking(businessId: string, bookingId: string) {
  return authorizedJson<BookingDto>(
    `/businesses/${encodeURIComponent(businessId)}/bookings/${encodeURIComponent(bookingId)}/confirm`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function completeBusinessBooking(businessId: string, bookingId: string) {
  return authorizedJson<BookingDto>(
    `/businesses/${encodeURIComponent(businessId)}/bookings/${encodeURIComponent(bookingId)}/complete`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function cancelBusinessBooking(businessId: string, bookingId: string, reason?: string) {
  return authorizedJson<BookingDto>(
    `/businesses/${encodeURIComponent(businessId)}/bookings/${encodeURIComponent(bookingId)}/cancel`,
    { method: 'POST', body: JSON.stringify(reason ? { reason } : {}) },
  )
}
