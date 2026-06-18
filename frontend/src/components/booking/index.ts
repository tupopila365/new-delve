export {
  bookingStatusLabel,
  bookingStatusVariant,
  bookingNextStep,
  normalizeBookingStatus,
  BOOKING_SERVICE_LABELS,
} from './bookingStatus'
export type { BookingServiceType, BookingStatusVariant } from './bookingStatus'

// User-facing aliases (preferred for traveller booking flows)
export { BookingShell as UserBookingShell } from './BookingShell'
export { BookingSummaryCard as UserBookingSummaryCard } from './BookingSummaryCard'
export { BookingStepHeader as UserBookingStep } from './BookingStepHeader'
export { BookingDateFields as UserBookingDateFields } from './BookingDateFields'
export { BookingGuestSelector as UserBookingPeopleSelector } from './BookingGuestSelector'
export { BookingProviderCard as UserBookingProviderCard } from './BookingProviderCard'
export { BookingPriceSummary as UserBookingPriceSummary } from './BookingPriceSummary'
export { BookingNotesField as UserBookingNotesField } from './BookingNotesField'
export { BookingTrustNote as UserBookingTrustNote } from './BookingTrustNote'
export { BookingStatusBadge as UserBookingStatusBadge } from './BookingStatusBadge'
export { UserBookingSuccessState } from './UserBookingSuccessState'
export { UserBookingErrorState } from './UserBookingErrorState'

// Core exports (shared implementation)
export { BookingStatusBadge } from './BookingStatusBadge'
export { BookingTrustNote } from './BookingTrustNote'
export { BookingSection } from './BookingSection'
export { BookingGuestSelector } from './BookingGuestSelector'
export { BookingDateFields } from './BookingDateFields'
export { BookingNotesField } from './BookingNotesField'
export { BookingPriceSummary } from './BookingPriceSummary'
export type { PriceLine } from './BookingPriceSummary'
export { BookingProviderCard } from './BookingProviderCard'
export { BookingSummaryCard } from './BookingSummaryCard'
export type { SummaryMeta } from './BookingSummaryCard'
export { BookingShell } from './BookingShell'
export { BookingConfirmationState } from './BookingConfirmationState'
export { BookingStepHeader } from './BookingStepHeader'
export { GuideRequestPanel } from './GuideRequestPanel'
export { GuideRequestSuccess } from './GuideRequestSuccess'
export { GuideRequestAccessGate } from './GuideRequestAccessGate'
export { GUIDE_TIME_PRESETS } from './guideRequestShared'
export type { GuideRequestPhase, GuideBookingRecord } from './guideRequestShared'
export { UserBookingCard } from './UserBookingCard'

export {
  nightsBetween,
  formatStayDate,
  formatStayRange,
  todayIsoDate,
  googleCalendarUrl,
  buildBookingSearchParams,
  checkStayAvailability,
  validateStayDates,
  formatGuideDate,
  validateGuideBookingInput,
  checkGuidePackageAvailability,
  buildGuideBookingSearchParams,
  googleCalendarGuideUrl,
  nextAvailableGuideDate,
  guidePackageDetailPath,
  guidePackageBookPath,
} from './bookingUtils'
export type {
  AvailabilityStatus,
  AvailabilityCheckInput,
  AvailabilityCheckResult,
  GuideAvailabilityInput,
} from './bookingUtils'
export { BookingAccessGate } from './BookingAccessGate'
export { BookingRoomCard } from './BookingRoomCard'
export type { BookingRoomCardData } from './BookingRoomCard'
export { BookingDetailsList } from './BookingDetailsList'
export type { BookingDetailItem } from './BookingDetailsList'
export { BookingReviewHeader } from './BookingReviewHeader'
export { BookingInlineCard } from './BookingInlineCard'
export { BookingReservePanel } from './BookingReservePanel'
export { BookingSentPanel } from './BookingSentPanel'

export {
  StayBookingLayout,
  StayTripSummary,
  StayAvailabilityPanel,
  StayDetailsPanel,
  StayReviewPanel,
  StayConfirmedPanel,
} from './stay'
export type { StayBookingStep } from './stay'

export {
  GuideBookingLayout,
  GuideTripSummary,
  GuideAvailabilityPanel,
  GuideDetailsPanel,
  GuideReviewPanel,
  GuideConfirmedPanel,
  GuidePackageReserveCard,
} from './guide'
export type { GuideBookingStep } from './guide'
