import type { BookingStatus } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'

const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED', 'EXPIRED', 'PENDING'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: ['CANCELLED'],
  EXPIRED: [],
}

export function assertBookingTransition(from: BookingStatus, to: BookingStatus) {
  if (!ALLOWED[from]?.includes(to)) {
    throw new AppError(400, 'INVALID_BOOKING_TRANSITION', `Cannot change a ${from} booking to ${to}.`)
  }
}
