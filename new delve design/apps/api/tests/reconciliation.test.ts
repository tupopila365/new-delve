import { beforeEach, describe, expect, it, vi } from 'vitest'

const applySuccessfulPayment = vi.fn()
const applyRefundStripeStatus = vi.fn()
const finalizePayableFromConfirmedTransfer = vi.fn()
const persistReversalSucceeded = vi.fn()
const applyStripeDisputeEvent = vi.fn()

const stripe = {
  paymentIntents: { retrieve: vi.fn() },
  refunds: { retrieve: vi.fn() },
  transfers: { retrieve: vi.fn(), create: vi.fn() },
  disputes: { retrieve: vi.fn() },
  accounts: { retrieve: vi.fn() },
}

vi.mock('../src/modules/payment/stripe-client.js', () => ({
  requireStripe: () => stripe,
  requireStripeWebhookSecret: () => 'whsec',
}))

vi.mock('../src/modules/payment/payment.service.js', () => ({
  applySuccessfulPayment: (...args: unknown[]) => applySuccessfulPayment(...args),
  findPaymentByStripeRefs: vi.fn(),
}))

vi.mock('../src/modules/payment/refund.service.js', () => ({
  applyRefundStripeStatus: (...args: unknown[]) => applyRefundStripeStatus(...args),
}))

vi.mock('../src/modules/payment/settlement.service.js', () => ({
  finalizePayableFromConfirmedTransfer: (...args: unknown[]) => finalizePayableFromConfirmedTransfer(...args),
  persistPayableEligibility: vi.fn(),
}))

vi.mock('../src/modules/payment/transfer-reversal.service.js', () => ({
  persistReversalSucceeded: (...args: unknown[]) => persistReversalSucceeded(...args),
}))

vi.mock('../src/modules/payment/dispute.service.js', () => ({
  applyStripeDisputeEvent: (...args: unknown[]) => applyStripeDisputeEvent(...args),
}))

vi.mock('../src/modules/payment/connect.service.js', () => ({
  syncBusinessConnectFromStripe: vi.fn(),
}))

vi.mock('@delve/database', () => ({
  prisma: {
    financialReconciliationRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    financialReconciliationIssue: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    financialRecoveryCase: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    refund: { findUnique: vi.fn(), findMany: vi.fn() },
    businessPayable: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    transferReversal: { findUnique: vi.fn(), findMany: vi.fn() },
    paymentDispute: { findUnique: vi.fn(), findMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    business: { findMany: vi.fn() },
    booking: { findUnique: vi.fn() },
    settlementAttempt: { findFirst: vi.fn() },
    unmatchedStripeFinancialEvent: { findUnique: vi.fn(), update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}))

import { prisma } from '@delve/database'
import { loadEnv } from '../src/config/env.js'
import { runFinancialReconciliation, retryUnmatchedEvent } from '../src/modules/payment/reconciliation.service.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  STRIPE_SECRET_KEY: 'sk_test_123',
  RECONCILIATION_STALE_MINUTES: '15',
  RECONCILIATION_BATCH_LIMIT: '40',
})

const paymentRow = {
  id: 'pay1',
  bookingId: 'bk1',
  businessId: 'biz1',
  userId: 'u1',
  status: 'PROCESSING',
  amount: { toString: () => '1000.00' },
  currency: 'NAD',
  stripePaymentIntentId: 'pi_1',
  stripeChargeId: 'ch_1',
}

function emptyLists() {
  vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.refund.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.businessPayable.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.transferReversal.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.paymentDispute.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.business.findMany).mockResolvedValue([] as never)
}

describe('financial reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    emptyLists()
    vi.mocked(prisma.financialReconciliationRun.create).mockResolvedValue({
      id: 'run1',
      scope: 'PAYMENT',
      status: 'RUNNING',
      startedAt: new Date(),
      completedAt: null,
      recordsChecked: 0,
      mismatchesFound: 0,
      recoveriesApplied: 0,
      errorsCount: 0,
      triggeredByType: 'TEST',
      createdAt: new Date(),
    } as never)
    vi.mocked(prisma.financialReconciliationRun.update).mockImplementation(async ({ data }) => ({
      id: 'run1',
      scope: 'PAYMENT',
      status: data.status,
      startedAt: new Date(),
      completedAt: new Date(),
      recordsChecked: data.recordsChecked,
      mismatchesFound: data.mismatchesFound,
      recoveriesApplied: data.recoveriesApplied,
      errorsCount: data.errorsCount,
      triggeredByType: 'TEST',
      createdAt: new Date(),
    }) as never)
    vi.mocked(prisma.financialReconciliationIssue.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.financialReconciliationIssue.create).mockResolvedValue({ id: 'iss1' } as never)
    vi.mocked(prisma.financialReconciliationIssue.update).mockResolvedValue({ id: 'iss1' } as never)
    vi.mocked(prisma.financialRecoveryCase.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.financialRecoveryCase.create).mockResolvedValue({ id: 'rc1' } as never)
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.payment.update).mockResolvedValue({} as never)
    vi.mocked(prisma.businessPayable.findUnique).mockResolvedValue(null as never)
  })

  it('recovers a missed payment webhook through the canonical success finalizer', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(paymentRow as never)
    stripe.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 100000,
      currency: 'nad',
      latest_charge: {
        id: 'ch_1',
        balance_transaction: { id: 'txn_1', amount: 100000, fee: 2500, net: 97500, currency: 'nad' },
      },
    })
    await runFinancialReconciliation(env, { scope: 'PAYMENT', paymentId: 'pay1', triggeredByType: 'TEST' })
    expect(applySuccessfulPayment).toHaveBeenCalledTimes(1)
    expect(applySuccessfulPayment).toHaveBeenCalledWith(env, 'pay1')
    expect(stripe.transfers.create).not.toHaveBeenCalled()
  })

  it('does not create a second payment when reconciliation runs twice', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(paymentRow as never)
    stripe.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 100000,
      currency: 'nad',
      latest_charge: null,
    })
    await runFinancialReconciliation(env, { scope: 'PAYMENT', paymentId: 'pay1', triggeredByType: 'TEST' })
    await runFinancialReconciliation(env, { scope: 'PAYMENT', paymentId: 'pay1', triggeredByType: 'TEST' })
    expect(applySuccessfulPayment).toHaveBeenCalledTimes(2)
    expect(stripe.transfers.create).not.toHaveBeenCalled()
  })

  it('flags a PAID vs Stripe contradiction without downgrading Payment', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({ ...paymentRow, status: 'PAID' } as never)
    stripe.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_1',
      status: 'canceled',
      amount: 100000,
      currency: 'nad',
    })
    await runFinancialReconciliation(env, { scope: 'PAYMENT', paymentId: 'pay1', triggeredByType: 'TEST' })
    expect(applySuccessfulPayment).not.toHaveBeenCalled()
    expect(prisma.financialReconciliationIssue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'PAID_BUT_STRIPE_NOT_SUCCEEDED', severity: 'CRITICAL' }),
      }),
    )
    expect(prisma.payment.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }))
  })

  it('finalizes a PROCESSING payable from an existing Stripe Transfer without creating another', async () => {
    vi.mocked(prisma.businessPayable.findMany).mockResolvedValue([{ id: 'pb1' }] as never)
    vi.mocked(prisma.businessPayable.findUnique).mockResolvedValue({
      id: 'pb1',
      status: 'PROCESSING',
      stripeTransferId: 'tr_1',
      businessNetAmount: { toString: () => '900.00' },
      currency: 'NAD',
      paymentId: 'pay1',
      bookingId: 'bk1',
      businessId: 'biz1',
    } as never)
    stripe.transfers.retrieve.mockResolvedValue({ id: 'tr_1', amount: 90000, currency: 'nad' })
    await runFinancialReconciliation(env, { scope: 'STALE', triggeredByType: 'TEST' })
    expect(finalizePayableFromConfirmedTransfer).toHaveBeenCalledWith('pb1', 'tr_1')
    expect(stripe.transfers.create).not.toHaveBeenCalled()
  })

  it('creates a CRITICAL issue when TRANSFERRED local transfer is missing on Stripe and does not recreate it', async () => {
    vi.mocked(prisma.businessPayable.findMany).mockResolvedValue([{ id: 'pb1' }] as never)
    vi.mocked(prisma.businessPayable.findUnique).mockResolvedValue({
      id: 'pb1',
      status: 'TRANSFERRED',
      stripeTransferId: 'tr_missing',
      businessNetAmount: { toString: () => '900.00' },
      currency: 'NAD',
      paymentId: 'pay1',
      bookingId: 'bk1',
      businessId: 'biz1',
    } as never)
    stripe.transfers.retrieve.mockRejectedValue(new Error('No such transfer'))
    await runFinancialReconciliation(env, { scope: 'STALE', triggeredByType: 'TEST' })
    expect(stripe.transfers.create).not.toHaveBeenCalled()
    expect(finalizePayableFromConfirmedTransfer).not.toHaveBeenCalled()
    expect(prisma.financialReconciliationIssue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'TRANSFERRED_BUT_STRIPE_MISSING', severity: 'CRITICAL' }),
      }),
    )
  })

  it('recovers a PROCESSING refund from Stripe succeeded via the canonical refund finalizer', async () => {
    vi.mocked(prisma.refund.findMany).mockResolvedValue([{ id: 'rf1' }] as never)
    vi.mocked(prisma.refund.findUnique).mockResolvedValue({
      id: 'rf1',
      status: 'PROCESSING',
      stripeRefundId: 're_1',
      paymentId: 'pay1',
      bookingId: 'bk1',
      businessId: 'biz1',
    } as never)
    stripe.refunds.retrieve.mockResolvedValue({ id: 're_1', status: 'succeeded' })
    await runFinancialReconciliation(env, { scope: 'STALE', triggeredByType: 'TEST' })
    expect(applyRefundStripeStatus).toHaveBeenCalledWith(env, 'rf1', 'succeeded', 're_1')
  })

  it('recovers a PROCESSING transfer reversal from Stripe without creating a second reversal', async () => {
    vi.mocked(prisma.transferReversal.findMany).mockResolvedValue([{ id: 'rev1' }] as never)
    vi.mocked(prisma.transferReversal.findUnique).mockResolvedValue({
      id: 'rev1',
      status: 'PROCESSING',
      stripeTransferId: 'tr_1',
      stripeTransferReversalId: 'trr_1',
      paymentId: 'pay1',
      bookingId: 'bk1',
      businessId: 'biz1',
      businessPayableId: 'pb1',
    } as never)
    stripe.transfers.retrieve.mockResolvedValue({
      id: 'tr_1',
      reversals: { data: [{ id: 'trr_1' }] },
    })
    await runFinancialReconciliation(env, { scope: 'STALE', triggeredByType: 'TEST' })
    expect(persistReversalSucceeded).toHaveBeenCalledWith('rev1', 'trr_1')
    expect(stripe.transfers.create).not.toHaveBeenCalled()
  })

  it('applies canonical dispute mapping when Stripe is WON and does not auto-transfer', async () => {
    vi.mocked(prisma.paymentDispute.findMany).mockResolvedValue([{ id: 'disp1' }] as never)
    vi.mocked(prisma.paymentDispute.findUnique).mockResolvedValue({
      id: 'disp1',
      status: 'UNDER_REVIEW',
      stripeDisputeId: 'dp_1',
      paymentId: 'pay1',
      bookingId: 'bk1',
      businessId: 'biz1',
    } as never)
    vi.mocked(prisma.paymentDispute.findUniqueOrThrow).mockResolvedValue({ id: 'disp1', status: 'WON' } as never)
    stripe.disputes.retrieve.mockResolvedValue({
      id: 'dp_1',
      status: 'won',
      balance_transactions: [],
    })
    await runFinancialReconciliation(env, { scope: 'STALE', triggeredByType: 'TEST' })
    expect(applyStripeDisputeEvent).toHaveBeenCalled()
    expect(stripe.transfers.create).not.toHaveBeenCalled()
  })

  it('retries an unmatched dispute without duplicating mapping when Payment now exists', async () => {
    vi.mocked(prisma.unmatchedStripeFinancialEvent.findUnique).mockResolvedValue({
      id: 'um1',
      providerEventId: 'evt_1',
      eventType: 'charge.dispute.created',
      stripeObjectId: 'dp_1',
    } as never)
    stripe.disputes.retrieve.mockResolvedValue({ id: 'dp_1', status: 'needs_response' })
    vi.mocked(prisma.paymentDispute.findUnique).mockResolvedValue({ id: 'disp1', stripeDisputeId: 'dp_1' } as never)
    vi.mocked(prisma.unmatchedStripeFinancialEvent.update).mockResolvedValue({} as never)
    const result = await retryUnmatchedEvent(env, 'um1', 'admin-1')
    expect(applyStripeDisputeEvent).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ matched: true, disputeId: 'disp1' })
  })
})
