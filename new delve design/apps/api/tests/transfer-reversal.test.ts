import { describe, expect, it } from 'vitest'
import { reversalAmountFromPayableNet, canApplyReversalStripeEvent } from '../src/modules/payment/transfer-reversal.service.js'
import { remainingRefundableFromTotals } from '../src/modules/payment/refund.service.js'
import { evaluateSettlementEligibility } from '../src/modules/payment/settlement-eligibility.js'

describe('transfer reversal amounts', () => {
  it('reverses the business net 900, not the traveler payment 1000', () => {
    const reversal = reversalAmountFromPayableNet('900.00')
    const travelerRefund = remainingRefundableFromTotals('1000.00', '0')
    expect(reversal.toFixed(2)).toBe('900.00')
    expect(travelerRefund.toFixed(2)).toBe('1000.00')
    expect(reversal.eq(travelerRefund)).toBe(false)
  })
})

describe('transfer reversal event ordering', () => {
  it('does not downgrade SUCCEEDED', () => {
    expect(canApplyReversalStripeEvent('SUCCEEDED', 'FAILED')).toBe(false)
    expect(canApplyReversalStripeEvent('SUCCEEDED', 'PROCESSING')).toBe(false)
  })

  it('allows FAILED to become SUCCEEDED on a later confirmation', () => {
    expect(canApplyReversalStripeEvent('FAILED', 'SUCCEEDED')).toBe(true)
  })
})

describe('reversed payables cannot be released again', () => {
  const base = {
    payableStatus: 'REVERSED' as const,
    stripeTransferId: 'tr_1',
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

  it('keeps REVERSED closed even if booking is still COMPLETED', () => {
    const result = evaluateSettlementEligibility(base)
    expect(result.eligible).toBe(false)
    expect(result.code).toBe('SETTLEMENT_REVERSED')
    expect(result.nextStatus).toBe('REVERSED')
  })
})
