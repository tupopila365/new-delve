export type BookingServiceType =
  | 'stay'
  | 'activity'
  | 'event'
  | 'food'
  | 'vehicle'
  | 'bus'
  | 'transfer'
  | 'flight'
  | 'ferry'
  | 'community'
  | 'charter'
  | 'deal'
  | 'other'

export type BookingSource = 'services' | 'transport' | 'deals'

export type BookingMethodHint =
  | 'book'
  | 'request'
  | 'reserve'
  | 'check-availability'
  | 'instant'
  | 'external'

export interface BookingContext {
  source: BookingSource
  serviceType: BookingServiceType
  bookingMethod: BookingMethodHint
  listingId: string
  listingName: string
  providerName: string
  currency: string
  unitPrice: string
  priceBasis: string
  image?: string
  actionLabel?: string
  dealId?: string
  dealTitle?: string
  selectedOptionId?: string
  selectedOptionLabel?: string
  quantity?: number
  origin?: string
  destination?: string
  cancellationSummary?: string
  timeZone?: string
}
