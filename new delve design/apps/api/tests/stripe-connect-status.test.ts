import { describe, expect, it } from 'vitest'
import { isSettlementReady, mapStripeAccountStatus } from '../src/modules/payment/stripe-connect-status.js'
import type Stripe from 'stripe'

function account(partial: Partial<Stripe.Account>): Stripe.Account {
  return {
    id: 'acct_1',
    object: 'account',
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: false,
    requirements: { currently_due: [], past_due: [], disabled_reason: null },
    ...partial,
  } as Stripe.Account
}

describe('stripe connect status mapping', () => {
  it('does not treat stripeAccountId as settlement-ready', () => {
    expect(
      isSettlementReady({
        stripeAccountStatus: 'ONBOARDING',
        stripePayoutsEnabled: false,
        stripeChargesEnabled: false,
      }),
    ).toBe(false)
    const mapped = mapStripeAccountStatus(account({ id: 'acct_1' }))
    expect(mapped.stripeAccountStatus).toBe('ONBOARDING')
  })

  it('maps charges+payouts+details to ACTIVE', () => {
    const mapped = mapStripeAccountStatus(
      account({ charges_enabled: true, payouts_enabled: true, details_submitted: true }),
    )
    expect(mapped.stripeAccountStatus).toBe('ACTIVE')
    expect(isSettlementReady(mapped)).toBe(true)
  })

  it('maps submitted-but-restricted accounts to RESTRICTED', () => {
    const mapped = mapStripeAccountStatus(
      account({
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: false,
        requirements: { currently_due: ['individual.verification.document'], past_due: [], disabled_reason: null },
      }),
    )
    expect(mapped.stripeAccountStatus).toBe('RESTRICTED')
    expect(isSettlementReady(mapped)).toBe(false)
  })
})
