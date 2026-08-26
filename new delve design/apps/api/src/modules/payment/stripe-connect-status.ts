import type Stripe from 'stripe'
import type { StripeConnectStatus } from '@delve/contracts'

export function isSettlementReady(input: {
  stripeAccountStatus: StripeConnectStatus
  stripePayoutsEnabled: boolean
  stripeChargesEnabled: boolean
}): boolean {
  return input.stripeAccountStatus === 'ACTIVE' && input.stripePayoutsEnabled && input.stripeChargesEnabled
}

export function connectReadinessLabel(input: {
  stripeAccountStatus: StripeConnectStatus
  stripePayoutsEnabled: boolean
  stripeChargesEnabled: boolean
}): string {
  if (input.stripeAccountStatus === 'NOT_CONNECTED') return 'Not connected'
  if (input.stripeAccountStatus === 'ONBOARDING') return 'Setup incomplete'
  if (input.stripeAccountStatus === 'RESTRICTED') return 'Restricted'
  if (input.stripeAccountStatus === 'DISABLED') return 'Payouts disabled'
  if (!input.stripePayoutsEnabled) return 'Payouts disabled'
  if (isSettlementReady(input)) return 'Settlement ready'
  return 'Active'
}

export function mapStripeAccountStatus(account: Stripe.Account): {
  stripeAccountStatus: StripeConnectStatus
  stripeChargesEnabled: boolean
  stripePayoutsEnabled: boolean
  stripeDetailsSubmitted: boolean
  requirementsDueCount: number
} {
  const chargesEnabled = Boolean(account.charges_enabled)
  const payoutsEnabled = Boolean(account.payouts_enabled)
  const detailsSubmitted = Boolean(account.details_submitted)
  const due = [...(account.requirements?.currently_due ?? []), ...(account.requirements?.past_due ?? [])]
  const requirementsDueCount = new Set(due).size
  const disabledReason = account.requirements?.disabled_reason ?? null

  let stripeAccountStatus: StripeConnectStatus = 'ONBOARDING'
  if (disabledReason?.startsWith('rejected')) {
    stripeAccountStatus = 'DISABLED'
  } else if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
    stripeAccountStatus = 'ACTIVE'
  } else if (detailsSubmitted || disabledReason) {
    stripeAccountStatus = 'RESTRICTED'
  } else {
    stripeAccountStatus = 'ONBOARDING'
  }

  return {
    stripeAccountStatus,
    stripeChargesEnabled: chargesEnabled,
    stripePayoutsEnabled: payoutsEnabled,
    stripeDetailsSubmitted: detailsSubmitted,
    requirementsDueCount,
  }
}
