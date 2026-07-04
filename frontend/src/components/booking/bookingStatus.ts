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
    if (serviceType === 'event') return 'Complete payment or wait for organizer confirmation'
    if (serviceType === 'stay') return 'Waiting for the host to confirm your dates'
    if (serviceType === 'vehicle') return 'Waiting for the provider to confirm your rental'
    if (serviceType === 'bus') return 'Complete the demo payment step or wait for operator confirmation'
    if (serviceType === 'food') return 'Waiting for the venue to confirm your table'
    return isGuide
      ? 'Waiting for the guide to confirm — you can also complete the demo payment'
      : 'Waiting for provider review'
  }
  if (key === 'confirmed') {
    if (serviceType === 'event') return 'Your spot is confirmed — see you there'
    if (serviceType === 'stay') return 'Your stay is confirmed — message the host with any questions'
    if (serviceType === 'vehicle') return 'Your vehicle is confirmed — coordinate pickup with the provider'
    if (serviceType === 'bus') return 'Your seats are confirmed — arrive early for boarding'
    if (serviceType === 'food') return 'Your table is confirmed — see you at the venue'
    return isGuide
      ? 'Your tour is confirmed — message the guide with any questions'
      : 'Check messages for details from the provider'
  }
  if (key === 'completed' || key === 'checked_in' || key === 'checked_out') {
    return isGuide ? 'Tour complete — thanks for exploring with DELVE' : 'Your booking is complete'
  }
  if (key === 'cancelled' || key === 'declined') return 'This request was cancelled'
  if (key === 'refunded') return 'This booking was refunded'
  if (key === 'disputed') return 'This booking has an open issue'
  return undefined
}
