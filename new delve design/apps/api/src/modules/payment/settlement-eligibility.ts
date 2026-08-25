import type { BusinessPayableStatus, PaymentStatus, StripeConnectStatus } from '@delve/contracts'
import { Decimal } from '@delve/database/decimal'

export type EligibilityInput = {
  payableStatus: BusinessPayableStatus
  stripeTransferId: string | null
  businessNetAmount: Decimal | string | { toString(): string }
  paymentStatus: PaymentStatus
  bookingStatus: string
  businessStatus: string
  stripeAccountId: string | null
  stripeAccountStatus: StripeConnectStatus
  stripeChargesEnabled: boolean
  stripePayoutsEnabled: boolean
  stripeDetailsSubmitted: boolean
  hasActiveCancellationOrRefund: boolean
}

export function evaluateSettlementEligibility(input: EligibilityInput): {
  eligible: boolean
  code: string
  reason: string
  retryable: boolean
  nextStatus: BusinessPayableStatus
} {
  if (input.payableStatus === 'REVERSED') {
    return {
      eligible: false,
      code: 'SETTLEMENT_REVERSED',
      reason: 'This settlement transfer was reversed. It cannot be released again.',
      retryable: false,
      nextStatus: 'REVERSED',
    }
  }
  if (input.payableStatus === 'TRANSFERRED' || input.stripeTransferId) {
    return {
      eligible: false,
      code: 'ALREADY_TRANSFERRED',
      reason: 'This settlement already has a successful Stripe Transfer.',
      retryable: false,
      nextStatus: 'TRANSFERRED',
    }
  }
  if (input.payableStatus === 'CANCELLED') {
    return {
      eligible: false,
      code: 'CANCELLED',
      reason: 'This payable was cancelled.',
      retryable: false,
      nextStatus: 'CANCELLED',
    }
  }
  if (input.payableStatus === 'PROCESSING') {
    return {
      eligible: false,
      code: 'IN_PROGRESS',
      reason: 'A settlement Transfer is already in progress.',
      retryable: false,
      nextStatus: 'PROCESSING',
    }
  }
  if (input.hasActiveCancellationOrRefund) {
    return {
      eligible: false,
      code: 'REFUND_IN_PROGRESS',
      reason: 'Traveler refund/cancellation is in progress. Settlement cannot be released.',
      retryable: false,
      nextStatus: 'BLOCKED',
    }
  }
  if (input.paymentStatus !== 'PAID') {
    return {
      eligible: false,
      code: 'PAYMENT_NOT_PAID',
      reason: 'Traveler payment is not PAID.',
      retryable: false,
      nextStatus: 'PENDING',
    }
  }
  if (input.bookingStatus !== 'COMPLETED') {
    return {
      eligible: false,
      code: 'BOOKING_NOT_COMPLETED',
      reason: 'The booking has not been completed yet.',
      retryable: false,
      nextStatus: 'PENDING',
    }
  }
  if (input.businessStatus !== 'VERIFIED') {
    return {
      eligible: false,
      code: 'BUSINESS_NOT_ACTIVE',
      reason: 'The business is not verified and active on Delve.',
      retryable: false,
      nextStatus: 'BLOCKED',
    }
  }
  if (!input.stripeAccountId) {
    return {
      eligible: false,
      code: 'MISSING_ACCOUNT',
      reason: 'This business has no Stripe connected account.',
      retryable: false,
      nextStatus: 'BLOCKED',
    }
  }
  if (input.stripeAccountStatus !== 'ACTIVE') {
    return {
      eligible: false,
      code: 'CONNECT_NOT_READY',
      reason: 'Stripe Connect is not ACTIVE for this business.',
      retryable: false,
      nextStatus: 'BLOCKED',
    }
  }
  if (!input.stripeDetailsSubmitted) {
    return {
      eligible: false,
      code: 'DETAILS_NOT_SUBMITTED',
      reason: 'Stripe onboarding details have not been submitted.',
      retryable: false,
      nextStatus: 'BLOCKED',
    }
  }
  if (!input.stripeChargesEnabled) {
    return {
      eligible: false,
      code: 'CHARGES_DISABLED',
      reason: 'The connected account cannot accept charges.',
      retryable: false,
      nextStatus: 'BLOCKED',
    }
  }
  if (!input.stripePayoutsEnabled) {
    return {
      eligible: false,
      code: 'PAYOUTS_DISABLED',
      reason: 'The connected account does not have payouts enabled.',
      retryable: false,
      nextStatus: 'BLOCKED',
    }
  }
  const net = new Decimal(input.businessNetAmount.toString())
  if (!net.isFinite() || net.lte(0)) {
    return {
      eligible: false,
      code: 'AMOUNT_INVALID',
      reason: 'Business net amount must be greater than zero.',
      retryable: false,
      nextStatus: 'BLOCKED',
    }
  }
  return {
    eligible: true,
    code: 'ELIGIBLE',
    reason: 'All settlement conditions are satisfied. Admin may release a Stripe Transfer.',
    retryable: false,
    nextStatus: 'ELIGIBLE',
  }
}

export function providerSettlementLabel(status: BusinessPayableStatus, eligibilityCode: string | null): string {
  if (status === 'REVERSED') return 'Settlement reversed'
  if (status === 'TRANSFERRED') return 'Transferred to your Stripe account'
  if (status === 'PROCESSING') return 'Settlement in progress'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'ELIGIBLE') return 'Eligible for settlement'
  if (status === 'BLOCKED') {
    if (eligibilityCode === 'REFUND_IN_PROGRESS') return 'Settlement blocked — refund in progress'
    if (eligibilityCode === 'CONNECT_NOT_READY' || eligibilityCode === 'MISSING_ACCOUNT' || eligibilityCode === 'PAYOUTS_DISABLED') {
      return 'Stripe setup incomplete'
    }
    return 'Settlement blocked'
  }
  if (eligibilityCode === 'BOOKING_NOT_COMPLETED') return 'Pending completion'
  return 'Pending settlement'
}
