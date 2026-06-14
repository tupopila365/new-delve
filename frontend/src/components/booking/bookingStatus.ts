export type BookingStatusVariant = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

export type BookingServiceType =
  | 'stay'
  | 'guide'
  | 'experience'
  | 'vehicle'
  | 'bus'
  | 'event'
  | 'food'
  | 'other'

export const BOOKING_SERVICE_LABELS: Record<BookingServiceType, string> = {
  stay: 'Stay',
  guide: 'Guide',
  experience: 'Experience',
  vehicle: 'Vehicle',
  bus: 'Bus trip',
  event: 'Event',
  food: 'Food reservation',
  other: 'Booking',
}

const STATUS_VARIANT: Record<string, BookingStatusVariant> = {
  draft: 'neutral',
  requested: 'info',
  pending: 'warning',
  reserved: 'warning',
  confirmed: 'success',
  completed: 'success',
  checked_in: 'success',
  checked_out: 'success',
  accepted: 'success',
  paid: 'success',
  seated: 'success',
  cancelled: 'neutral',
  refunded: 'info',
  disputed: 'danger',
  declined: 'danger',
  no_show: 'danger',
  suspended: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  requested: 'Requested',
  pending: 'Pending',
  reserved: 'Reserved',
  confirmed: 'Confirmed',
  completed: 'Completed',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  accepted: 'Accepted',
  paid: 'Paid',
  seated: 'Seated',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  disputed: 'Disputed',
  declined: 'Declined',
  no_show: 'No show',
}

export function normalizeBookingStatus(status: string): string {
  return status.toLowerCase().replace(/\s+/g, '_')
}

export function bookingStatusLabel(status: string): string {
  const key = normalizeBookingStatus(status)
  return STATUS_LABEL[key] ?? status.replace(/_/g, ' ')
}

export function bookingStatusVariant(status: string): BookingStatusVariant {
  const key = normalizeBookingStatus(status)
  return STATUS_VARIANT[key] ?? 'neutral'
}

export function bookingNextStep(status: string, serviceType?: BookingServiceType): string | undefined {
  const key = normalizeBookingStatus(status)
  const isGuide = serviceType === 'guide' || serviceType === 'experience'
  if (key === 'pending' || key === 'requested' || key === 'reserved') {
    return isGuide ? 'Waiting for guide review' : 'Waiting for provider review'
  }
  if (key === 'confirmed') {
    return isGuide ? 'Check messages for details from the guide' : 'Check messages for details from the provider'
  }
  if (key === 'completed' || key === 'checked_in' || key === 'checked_out') return 'Your booking is complete'
  if (key === 'cancelled' || key === 'declined') return 'This request was cancelled'
  if (key === 'disputed') return 'This booking has an open issue'
  return undefined
}
