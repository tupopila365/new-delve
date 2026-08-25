import { describe, expect, it } from 'vitest'
import { remainingRefundableFromTotals, canApplyStripeRefundEvent } from '../src/modules/payment/refund.service.js'
import { evaluateSettlementEligibility } from '../src/modules/payment/settlement-eligibility.js'

describe('refund amounts', () => {
  it('uses the payment amount, not a frontend 5000 request', () => {
    const remaining = remainingRefundableFromTotals('900.00', '0')
    expect(remaining.toFixed(2)).toBe('900.00')
    expect(remaining.lt('5000')).toBe(true)
  })

  it('subtracts succeeded refunds from remaining', () => {
    expect(remainingRefundableFromTotals('900.00', '900.00').toFixed(2)).toBe('0.00')
  })
})

describe('refund stripe event ordering', () => {
  it('does not downgrade SUCCEEDED when an old pending event arrives', () => {
    expect(canApplyStripeRefundEvent('SUCCEEDED', 'pending')).toBe(false)
    expect(canApplyStripeRefundEvent('SUCCEEDED', 'failed')).toBe(false)
  })

  it('does not move FAILED back to processing on a stale pending event', () => {
    expect(canApplyStripeRefundEvent('FAILED', 'pending')).toBe(false)
    expect(canApplyStripeRefundEvent('FAILED', 'succeeded')).toBe(true)
  })
})

describe('refund vs settlement', () => {
  const base = {
    payableStatus: 'ELIGIBLE' as const,
    stripeTransferId: null as string | null,
    businessNetAmount: '810.00',
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

  it('blocks eligible settlement when refund workflow starts', () => {
    const result = evaluateSettlementEligibility({ ...base, hasActiveCancellationOrRefund: true })
    expect(result.nextStatus).toBe('BLOCKED')
    expect(result.code).toBe('REFUND_IN_PROGRESS')
  })

  it('keeps transferred payables as transferred so refunds cannot ignore them', () => {
    const result = evaluateSettlementEligibility({
      ...base,
      payableStatus: 'TRANSFERRED',
      stripeTransferId: 'tr_1',
      hasActiveCancellationOrRefund: true,
    })
    expect(result.code).toBe('ALREADY_TRANSFERRED')
    expect(result.nextStatus).toBe('TRANSFERRED')
  })
})
