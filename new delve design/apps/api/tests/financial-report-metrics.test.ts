import { describe, expect, it } from 'vitest'
import { resolveReportPeriod } from '../src/modules/payment/report-period.js'
import { aggregateCurrencySummaries, type PaymentAggRow, type PayableAggRow } from '../src/modules/payment/report-metrics.js'

const period = resolveReportPeriod({ preset: 'CUSTOM', from: '2026-08-01', to: '2026-08-31' }, new Date('2026-08-15T12:00:00.000Z'))

function payment(row: Partial<PaymentAggRow> & Pick<PaymentAggRow, 'id' | 'amount' | 'currency'>): PaymentAggRow {
  return {
    businessId: 'biz-a',
    status: 'PAID',
    paidAt: new Date('2026-08-10T10:00:00.000Z'),
    stripeFeeAmount: null,
    ...row,
  }
}

function payable(row: Partial<PayableAggRow> & Pick<PayableAggRow, 'paymentId' | 'platformCommissionAmount' | 'businessNetAmount' | 'grossAmount'>): PayableAggRow {
  return {
    businessId: 'biz-a',
    currency: 'NAD',
    status: 'PENDING',
    createdAt: new Date('2026-08-10T10:00:00.000Z'),
    transferredAt: null,
    ...row,
  }
}

function run(input: Parameters<typeof aggregateCurrencySummaries>[0]) {
  return aggregateCurrencySummaries({
    period,
    payments: [],
    payables: [],
    refunds: [],
    reversals: [],
    disputes: [],
    recoveries: [],
    paymentsNeedingReview: new Set(),
    ...input,
  })
}

describe('financial report metrics', () => {
  it('counts only PAID payments as gross', () => {
    const rows = run({
      payments: [
        payment({ id: '1', amount: '1000.00', currency: 'NAD' }),
        payment({ id: '2', amount: '500.00', currency: 'NAD' }),
        payment({ id: '3', amount: '300.00', currency: 'NAD', status: 'FAILED', paidAt: null }),
      ],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].currency).toBe('NAD')
    expect(rows[0].grossPayments).toBe('1500.00')
    expect(rows[0].successfulPaymentCount).toBe(2)
  })

  it('never combines multiple currencies into one total', () => {
    const rows = run({
      payments: [
        payment({ id: '1', amount: '1000.00', currency: 'NAD' }),
        payment({ id: '2', amount: '100.00', currency: 'USD' }),
        payment({ id: '3', amount: '500.00', currency: 'ZAR' }),
      ],
    })
    expect(rows.map(r => `${r.currency}:${r.grossPayments}`).sort()).toEqual([
      'NAD:1000.00',
      'USD:100.00',
      'ZAR:500.00',
    ])
    const combined = rows.reduce((s, r) => s + Number(r.grossPayments), 0)
    expect(combined).toBe(1600)
    expect(rows).toHaveLength(3)
  })

  it('uses stored historical commission, not a current rate', () => {
    const rows = run({
      payments: [payment({ id: 'p1', amount: '1000.00', currency: 'NAD' })],
      payables: [
        payable({
          paymentId: 'p1',
          grossAmount: '1000.00',
          platformCommissionAmount: '100.00',
          businessNetAmount: '900.00',
        }),
      ],
    })
    expect(rows[0].platformCommission).toBe('100.00')
    expect(rows[0].businessNetFromPaidPeriod).toBe('900.00')
  })

  it('keeps refunded payments in gross', () => {
    const rows = run({
      payments: [payment({ id: 'p1', amount: '1000.00', currency: 'NAD' })],
      refunds: [
        {
          amount: '1000.00',
          currency: 'NAD',
          status: 'SUCCEEDED',
          succeededAt: new Date('2026-08-12T00:00:00.000Z'),
          businessId: 'biz-a',
        },
      ],
    })
    expect(rows[0].grossPayments).toBe('1000.00')
    expect(rows[0].refundsSucceeded).toBe('1000.00')
  })

  it('reports transferred and reversed amounts separately', () => {
    const rows = run({
      payables: [
        payable({
          paymentId: 'p1',
          grossAmount: '1000.00',
          platformCommissionAmount: '100.00',
          businessNetAmount: '900.00',
          status: 'REVERSED',
          transferredAt: new Date('2026-08-11T00:00:00.000Z'),
        }),
      ],
      reversals: [
        {
          amount: '900.00',
          currency: 'NAD',
          status: 'SUCCEEDED',
          succeededAt: new Date('2026-08-12T00:00:00.000Z'),
          businessId: 'biz-a',
        },
      ],
    })
    expect(rows[0].settlementsTransferred).toBe('900.00')
    expect(rows[0].transferReversalsSucceeded).toBe('900.00')
  })

  it('reports dispute lost separately from settlement reversal', () => {
    const rows = run({
      payments: [payment({ id: 'p1', amount: '1000.00', currency: 'NAD' })],
      payables: [
        payable({
          paymentId: 'p1',
          grossAmount: '1000.00',
          platformCommissionAmount: '100.00',
          businessNetAmount: '900.00',
          status: 'REVERSED',
          transferredAt: new Date('2026-08-11T00:00:00.000Z'),
        }),
      ],
      disputes: [
        {
          amount: '1000.00',
          currency: 'NAD',
          status: 'LOST',
          reason: 'fraudulent',
          createdAt: new Date('2026-08-13T00:00:00.000Z'),
          wonAt: null,
          lostAt: new Date('2026-08-14T00:00:00.000Z'),
          stripeFeeAmount: null,
          recoveryStatus: 'RECOVERED',
          businessId: 'biz-a',
        },
      ],
      reversals: [
        {
          amount: '900.00',
          currency: 'NAD',
          status: 'SUCCEEDED',
          succeededAt: new Date('2026-08-14T01:00:00.000Z'),
          businessId: 'biz-a',
        },
      ],
    })
    expect(rows[0].disputeAmountLost).toBe('1000.00')
    expect(rows[0].transferReversalsSucceeded).toBe('900.00')
    expect(rows[0].grossPayments).toBe('1000.00')
  })

  it('treats a null Stripe fee as unknown, not zero', () => {
    const rows = run({
      payments: [payment({ id: 'p1', amount: '1000.00', currency: 'NAD', stripeFeeAmount: null })],
    })
    expect(rows[0].stripeProcessingFees).toBeNull()
    expect(rows[0].stripeFeesUnknownCount).toBe(1)
    expect(rows[0].stripeFeesKnownCount).toBe(0)
    expect(rows[0].marketplaceContributionComplete).toBe(false)
    expect(rows[0].marketplaceContributionBeforeOperatingExpenses).toBeNull()
  })

  it('computes marketplace contribution from known fees and stored commission', () => {
    const rows = run({
      payments: [payment({ id: 'p1', amount: '1000.00', currency: 'NAD', stripeFeeAmount: '35.00' })],
      payables: [
        payable({
          paymentId: 'p1',
          grossAmount: '1000.00',
          platformCommissionAmount: '100.00',
          businessNetAmount: '900.00',
        }),
      ],
    })
    expect(rows[0].grossPayments).toBe('1000.00')
    expect(rows[0].stripeProcessingFees).toBe('35.00')
    expect(rows[0].platformCommission).toBe('100.00')
    expect(rows[0].marketplaceContributionBeforeOperatingExpenses).toBe('65.00')
    expect(rows[0].marketplaceContributionComplete).toBe(true)
  })

  it('excludes TRANSFERRED from outstanding obligation', () => {
    const rows = run({
      payables: [
        payable({
          paymentId: 'p1',
          grossAmount: '100.00',
          platformCommissionAmount: '10.00',
          businessNetAmount: '90.00',
          status: 'PENDING',
        }),
        payable({
          paymentId: 'p2',
          grossAmount: '200.00',
          platformCommissionAmount: '20.00',
          businessNetAmount: '180.00',
          status: 'TRANSFERRED',
          transferredAt: new Date('2026-08-11T00:00:00.000Z'),
        }),
        payable({
          paymentId: 'p3',
          grossAmount: '50.00',
          platformCommissionAmount: '5.00',
          businessNetAmount: '45.00',
          status: 'REVERSED',
        }),
      ],
    })
    expect(rows[0].outstandingBusinessAmount).toBe('90.00')
  })
})
