import { describe, expect, it } from 'vitest'
import { evaluateSettlementEligibility, providerSettlementLabel } from '../src/modules/payment/settlement-eligibility.js'

const ready = {
  payableStatus: 'PENDING' as const,
  stripeTransferId: null,
  businessNetAmount: '900.00',
  paymentStatus: 'PAID' as const,
  bookingStatus: 'COMPLETED',
  businessStatus: 'VERIFIED',
  stripeAccountId: 'acct_1',
  stripeAccountStatus: 'ACTIVE' as const,
  stripeChargesEnabled: true,
  stripePayoutsEnabled: true,
  stripeDetailsSubmitted: true,
  hasActiveCancellationOrRefund: false,
}

describe('settlement eligibility', () => {
  it('stays pending until the booking is completed', () => {
    const result = evaluateSettlementEligibility({ ...ready, bookingStatus: 'CONFIRMED' })
    expect(result.eligible).toBe(false)
    expect(result.code).toBe('BOOKING_NOT_COMPLETED')
    expect(result.nextStatus).toBe('PENDING')
    expect(providerSettlementLabel('PENDING', result.code)).toBe('Pending completion')
  })

  it('becomes eligible only when payment, completion, and Connect are ready', () => {
    const result = evaluateSettlementEligibility(ready)
    expect(result.eligible).toBe(true)
    expect(result.nextStatus).toBe('ELIGIBLE')
  })

  it('blocks when Stripe Connect is incomplete', () => {
    const result = evaluateSettlementEligibility({ ...ready, stripeAccountStatus: 'ONBOARDING', stripePayoutsEnabled: false })
    expect(result.eligible).toBe(false)
    expect(result.nextStatus).toBe('BLOCKED')
  })

  it('blocks settlement while a refund or cancellation is open', () => {
    const result = evaluateSettlementEligibility({ ...ready, hasActiveCancellationOrRefund: true })
    expect(result.eligible).toBe(false)
    expect(result.code).toBe('REFUND_IN_PROGRESS')
    expect(result.nextStatus).toBe('BLOCKED')
  })

  it('blocks untransferred settlement while an active dispute is open', () => {
    const result = evaluateSettlementEligibility({ ...ready, payableStatus: 'ELIGIBLE', hasActiveDispute: true })
    expect(result.eligible).toBe(false)
    expect(result.code).toBe('ACTIVE_DISPUTE')
    expect(result.nextStatus).toBe('BLOCKED')
    expect(providerSettlementLabel('BLOCKED', result.code)).toBe('Settlement under dispute review')
  })

  it('does not auto-transfer after a won dispute — only eligibility can return', () => {
    const result = evaluateSettlementEligibility(ready)
    expect(result.eligible).toBe(true)
    expect(result.nextStatus).toBe('ELIGIBLE')
  })

  it('does not treat TRANSFERRED as a bank payout status', () => {
    const result = evaluateSettlementEligibility({
      ...ready,
      payableStatus: 'TRANSFERRED',
      stripeTransferId: 'tr_1',
    })
    expect(result.code).toBe('ALREADY_TRANSFERRED')
    expect(providerSettlementLabel('TRANSFERRED', result.code)).toBe('Transferred to your Stripe account')
  })

  it('never becomes eligible after a successful reversal', () => {
    const result = evaluateSettlementEligibility({
      ...ready,
      payableStatus: 'REVERSED',
      stripeTransferId: 'tr_1',
    })
    expect(result.eligible).toBe(false)
    expect(result.nextStatus).toBe('REVERSED')
    expect(providerSettlementLabel('REVERSED', result.code)).toBe('Settlement reversed')
  })
})
