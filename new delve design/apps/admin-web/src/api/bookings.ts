import type { BookingDto } from '@delve/contracts'
import { adminJson } from './adminClient'

export function adminGetBooking(bookingId: string) {
  return adminJson<BookingDto>(`/admin/bookings/${encodeURIComponent(bookingId)}`)
}
