import { describe, expect, it } from 'vitest'
import { canApplyDisputeStatus, mapStripeDisputeStatus } from '../src/modules/payment/dispute-status.js'
import { evaluateDisputeExposure } from '../src/modules/payment/dispute-exposure.js'

describe('stripe dispute status mapping', () => {
  it('maps Stripe Dispute.status values without inventing names', () => {
    expect(mapStripeDisputeStatus('needs_response')).toBe('NEEDS_RESPONSE')
    expect(mapStripeDisputeStatus('under_review')).toBe('UNDER_REVIEW')
    expect(mapStripeDisputeStatus('won')).toBe('WON')
    expect(mapStripeDisputeStatus('lost')).toBe('LOST')
    expect(mapStripeDisputeStatus('warning_needs_response')).toBe('WARNING')
    expect(mapStripeDisputeStatus('warning_under_review')).toBe('WARNING')
    expect(mapStripeDisputeStatus('warning_closed')).toBe('CLOSED')
  })

  it('does not downgrade terminal WON/LOST from a stale event', () => {
    expect(canApplyDisputeStatus('WON', 'NEEDS_RESPONSE', 100, 90)).toBe(false)
    expect(canApplyDisputeStatus('LOST', 'UNDER_REVIEW', 100, 200)).toBe(false)
    expect(canApplyDisputeStatus('NEEDS_RESPONSE', 'UNDER_REVIEW', 100, 200)).toBe(true)
  })
})

describe('dispute exposure', () => {
  it('blocks untransferred settlement without creating a refund path', () => {
    const result = evaluateDisputeExposure({
      payableStatus: 'ELIGIBLE',
      stripeTransferId: null,
      payableProcessing: false,
      reversalSucceeded: false,
      fullRefundSucceeded: false,
      disputeStatus: 'NEEDS_RESPONSE',
    })
    expect(result.code).toBe('SETTLEMENT_BLOCKED')
    expect(result.recoveryStatus).toBe('BLOCKED_SETTLEMENT')
  })

  it('records already-transferred exposure without reversing automatically', () => {
    const result = evaluateDisputeExposure({
      payableStatus: 'TRANSFERRED',
      stripeTransferId: 'tr_1',
      payableProcessing: false,
      reversalSucceeded: false,
      fullRefundSucceeded: false,
      disputeStatus: 'NEEDS_RESPONSE',
    })
    expect(result.code).toBe('SETTLEMENT_TRANSFERRED')
    expect(result.recoveryStatus).toBe('NOT_REQUIRED')
  })

  it('requires recovery when a lost dispute follows a successful transfer', () => {
    const result = evaluateDisputeExposure({
      payableStatus: 'TRANSFERRED',
      stripeTransferId: 'tr_1',
      payableProcessing: false,
      reversalSucceeded: false,
      fullRefundSucceeded: false,
      disputeStatus: 'LOST',
    })
    expect(result.recoveryStatus).toBe('RECOVERY_REQUIRED')
    expect(result.code).toBe('SETTLEMENT_TRANSFERRED')
  })

  it('does not require another reversal when settlement was already reversed', () => {
    const result = evaluateDisputeExposure({
      payableStatus: 'REVERSED',
      stripeTransferId: 'tr_1',
      payableProcessing: false,
      reversalSucceeded: true,
      fullRefundSucceeded: false,
      disputeStatus: 'LOST',
    })
    expect(result.code).toBe('SETTLEMENT_REVERSED')
    expect(result.recoveryStatus).toBe('RECOVERED')
  })

  it('flags a succeeded refund plus dispute for manual review instead of a second refund', () => {
    const result = evaluateDisputeExposure({
      payableStatus: 'CANCELLED',
      stripeTransferId: null,
      payableProcessing: false,
      reversalSucceeded: false,
      fullRefundSucceeded: true,
      disputeStatus: 'LOST',
    })
    expect(result.code).toBe('REFUNDED_ALREADY')
    expect(result.recoveryStatus).toBe('MANUAL_REVIEW')
  })

  it('does not freeze a payable while Transfer is PROCESSING', () => {
    const result = evaluateDisputeExposure({
      payableStatus: 'PROCESSING',
      stripeTransferId: null,
      payableProcessing: true,
      reversalSucceeded: false,
      fullRefundSucceeded: false,
      disputeStatus: 'NEEDS_RESPONSE',
    })
    expect(result.code).toBe('SETTLEMENT_IN_FLIGHT')
    expect(result.recoveryStatus).toBe('MANUAL_REVIEW')
  })
})
