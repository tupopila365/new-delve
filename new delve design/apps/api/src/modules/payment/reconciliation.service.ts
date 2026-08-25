import type Stripe from 'stripe'
import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type {
  BookingFinancialChainDto,
  ReconciliationIssueDto,
  ReconciliationIssueListItem,
  ReconciliationRunDto,
  ReconciliationSummaryDto,
  StartReconciliationBody,
  UnmatchedStripeEventDto,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { applySuccessfulPayment } from './payment.service.js'
import { applyRefundStripeStatus } from './refund.service.js'
import { finalizePayableFromConfirmedTransfer } from './settlement.service.js'
import { persistReversalSucceeded } from './transfer-reversal.service.js'
import { applyStripeDisputeEvent } from './dispute.service.js'
import { syncBusinessConnectFromStripe } from './connect.service.js'
import { requireStripe } from './stripe-client.js'
import { fromStripeAmount } from './stripe-amount.js'
import { expandedChargeBalanceTransaction, feeFromBalanceTransaction } from './stripe-fee.js'
import { upsertFinancialRecoveryCase } from './recovery-case.service.js'

const MONEY = 2

type IssueDraft = {
  fingerprint: string
  type: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  code: string
  summary: string
  recommendedAction?: string
  localState?: string
  stripeState?: string
  paymentId?: string | null
  bookingId?: string | null
  businessId?: string | null
  businessPayableId?: string | null
  refundId?: string | null
  transferReversalId?: string | null
  disputeId?: string | null
  stripeObjectType?: string | null
  stripeObjectId?: string | null
  autoResolved?: boolean
}

type RunContext = {
  env: Env
  runId: string
  stripe: Stripe
  recordsChecked: number
  mismatchesFound: number
  recoveriesApplied: number
  errorsCount: number
}

function money(value: { toString(): string } | string | number) {
  return new Decimal(value.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP).toFixed(MONEY)
}

function staleBefore(env: Env) {
  return new Date(Date.now() - env.RECONCILIATION_STALE_MINUTES * 60 * 1000)
}

function isRetryableStripe(err: unknown) {
  if (err instanceof Error && /rate.?limit|timeout|temporar/i.test(err.message)) return true
  return false
}

function logSafe(runId: string, type: string, localId: string | null, stripeId: string | null, result: string) {
  console.info('[reconciliation]', { runId, type, localId, stripeId, result })
}

async function upsertIssue(runId: string, draft: IssueDraft) {
  const existing = await prisma.financialReconciliationIssue.findUnique({ where: { fingerprint: draft.fingerprint } })
  if (draft.autoResolved) {
    if (existing?.status === 'OPEN') {
      await prisma.financialReconciliationIssue.update({
        where: { id: existing.id },
        data: {
          status: 'AUTO_RESOLVED',
          resolvedAt: new Date(),
          resolutionType: 'AUTO_RESOLVED',
          lastDetectedAt: new Date(),
          runId,
          summary: draft.summary,
          stripeState: draft.stripeState ?? existing.stripeState,
          localState: draft.localState ?? existing.localState,
        },
      })
      await writeAdminAudit({
        action: 'RECONCILIATION_AUTO_RESOLVED',
        outcome: 'success',
        targetType: 'reconciliation_issue',
        targetId: existing.id,
        metadata: { code: draft.code, type: draft.type },
      })
    }
    return existing?.id ?? null
  }
  if (existing) {
    if (existing.status === 'OPEN') {
      await prisma.financialReconciliationIssue.update({
        where: { id: existing.id },
        data: {
          lastDetectedAt: new Date(),
          runId,
          summary: draft.summary,
          localState: draft.localState ?? existing.localState,
          stripeState: draft.stripeState ?? existing.stripeState,
        },
      })
    }
    return existing.id
  }
  const created = await prisma.financialReconciliationIssue.create({
    data: {
      fingerprint: draft.fingerprint,
      runId,
      type: draft.type,
      severity: draft.severity,
      status: 'OPEN',
      code: draft.code,
      summary: draft.summary,
      recommendedAction: draft.recommendedAction ?? null,
      localState: draft.localState ?? null,
      stripeState: draft.stripeState ?? null,
      paymentId: draft.paymentId ?? null,
      bookingId: draft.bookingId ?? null,
      businessId: draft.businessId ?? null,
      businessPayableId: draft.businessPayableId ?? null,
      refundId: draft.refundId ?? null,
      transferReversalId: draft.transferReversalId ?? null,
      disputeId: draft.disputeId ?? null,
      stripeObjectType: draft.stripeObjectType ?? null,
      stripeObjectId: draft.stripeObjectId ?? null,
    },
  })
  await writeAdminAudit({
    action: 'RECONCILIATION_ISSUE_CREATED',
    outcome: 'success',
    targetType: 'reconciliation_issue',
    targetId: created.id,
    metadata: { code: draft.code, type: draft.type, severity: draft.severity },
  })
  return created.id
}

async function persistPaymentFee(paymentId: string, charge: Stripe.Charge | string | null | undefined) {
  const bt = expandedChargeBalanceTransaction(charge)
  const fee = feeFromBalanceTransaction(bt)
  if (!fee) return
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      stripeFeeAmount: fee.fee.toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP),
      stripeBalanceTransactionId: fee.balanceTransactionId,
    },
  })
  const payable = await prisma.businessPayable.findUnique({ where: { paymentId } })
  if (payable && payable.stripeFeeAmount == null) {
    await prisma.businessPayable.update({
      where: { id: payable.id },
      data: { stripeFeeAmount: fee.fee.toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP) },
    })
  }
}

async function checkPayment(ctx: RunContext, paymentId: string) {
  ctx.recordsChecked += 1
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) return
  if (!payment.stripePaymentIntentId) {
    if (payment.status === 'PROCESSING' || payment.status === 'PENDING') {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `payment:missing-pi:${payment.id}`,
        type: 'PAYMENT',
        severity: 'WARNING',
        code: 'PAYMENT_MISSING_STRIPE_ID',
        summary: 'Payment has no Stripe PaymentIntent id yet.',
        localState: payment.status,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        businessId: payment.businessId,
        recommendedAction: 'Wait for Checkout completion or inspect unmatched Stripe events.',
      })
    }
    return
  }
  let pi: Stripe.PaymentIntent
  try {
    pi = await ctx.stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    })
  } catch (err) {
    if (payment.status === 'PAID') {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `payment:paid-missing:${payment.id}`,
        type: 'PAYMENT',
        severity: 'CRITICAL',
        code: 'PAID_BUT_STRIPE_UNAVAILABLE',
        summary: 'Delve Payment is PAID but Stripe PaymentIntent could not be retrieved. Not downgraded.',
        localState: 'PAID',
        stripeState: 'unavailable',
        paymentId: payment.id,
        bookingId: payment.bookingId,
        businessId: payment.businessId,
        stripeObjectType: 'payment_intent',
        stripeObjectId: payment.stripePaymentIntentId,
        recommendedAction: 'Admin review. Do not recreate the payment.',
      })
      await upsertFinancialRecoveryCase({
        fingerprint: `mismatch:paid-missing:${payment.id}`,
        type: 'STRIPE_LOCAL_MISMATCH',
        businessId: payment.businessId,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amount: payment.amount,
        currency: payment.currency,
        reason: 'Local Payment is PAID but Stripe PaymentIntent could not be retrieved. Tracking only.',
      })
    } else if (isRetryableStripe(err)) {
      ctx.errorsCount += 1
    }
    logSafe(ctx.runId, 'PAYMENT', payment.id, payment.stripePaymentIntentId, 'retrieve_failed')
    return
  }

  const stripeAmount = fromStripeAmount(pi.amount, pi.currency)
  if (payment.status === 'PAID') {
    if (pi.status !== 'succeeded') {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `payment:paid-contradiction:${payment.id}`,
        type: 'PAYMENT',
        severity: 'CRITICAL',
        code: 'PAID_BUT_STRIPE_NOT_SUCCEEDED',
        summary: 'Delve Payment is PAID but Stripe does not show a succeeded PaymentIntent. Not downgraded.',
        localState: 'PAID',
        stripeState: pi.status,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        businessId: payment.businessId,
        stripeObjectType: 'payment_intent',
        stripeObjectId: pi.id,
        recommendedAction: 'Admin review. Do not automatically change Payment status.',
      })
      await upsertFinancialRecoveryCase({
        fingerprint: `mismatch:paid-contradiction:${payment.id}`,
        type: 'STRIPE_LOCAL_MISMATCH',
        businessId: payment.businessId,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amount: payment.amount,
        currency: payment.currency,
        reason: 'Local PAID contradicts Stripe PaymentIntent status. Tracking only.',
      })
      return
    }
    await persistPaymentFee(payment.id, pi.latest_charge)
    if (!stripeAmount.eq(new Decimal(payment.amount.toString())) || pi.currency.toUpperCase() !== payment.currency) {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `payment:amount:${payment.id}`,
        type: 'PAYMENT',
        severity: 'CRITICAL',
        code: 'PAYMENT_AMOUNT_MISMATCH',
        summary: 'Stripe PaymentIntent amount/currency does not match Delve Payment. Amounts were not rewritten.',
        localState: `${payment.currency} ${money(payment.amount)}`,
        stripeState: `${pi.currency.toUpperCase()} ${money(stripeAmount)}`,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        businessId: payment.businessId,
        stripeObjectType: 'payment_intent',
        stripeObjectId: pi.id,
        recommendedAction: 'Admin review. Do not auto-adjust amounts.',
      })
    }
    return
  }

  if ((payment.status === 'PROCESSING' || payment.status === 'PENDING') && pi.status === 'succeeded') {
    await applySuccessfulPayment(ctx.env, payment.id)
    await persistPaymentFee(payment.id, pi.latest_charge)
    ctx.recoveriesApplied += 1
    logSafe(ctx.runId, 'PAYMENT', payment.id, pi.id, 'auto_paid')
    await upsertIssue(ctx.runId, {
      fingerprint: `payment:missed-webhook:${payment.id}`,
      type: 'PAYMENT',
      severity: 'INFO',
      code: 'PAYMENT_WEBHOOK_RECOVERED',
      summary: 'Stripe PaymentIntent succeeded; canonical payment-success finalizer ran.',
      localState: payment.status,
      stripeState: pi.status,
      paymentId: payment.id,
      bookingId: payment.bookingId,
      businessId: payment.businessId,
      stripeObjectType: 'payment_intent',
      stripeObjectId: pi.id,
      autoResolved: true,
    })
    return
  }

  if (payment.status === 'PROCESSING' && pi.status !== 'succeeded' && pi.status !== 'processing' && pi.status !== 'requires_action') {
    ctx.mismatchesFound += 1
    await upsertIssue(ctx.runId, {
      fingerprint: `payment:stale-processing:${payment.id}`,
      type: 'PAYMENT',
      severity: 'WARNING',
      code: 'STALE_PROCESSING_PAYMENT',
      summary: 'Payment is PROCESSING locally and Stripe is not succeeded. Not auto-failed.',
      localState: payment.status,
      stripeState: pi.status,
      paymentId: payment.id,
      bookingId: payment.bookingId,
      businessId: payment.businessId,
      stripeObjectType: 'payment_intent',
      stripeObjectId: pi.id,
      recommendedAction: 'Admin review. Do not auto-create another payment.',
    })
  }
}

async function checkRefund(ctx: RunContext, refundId: string) {
  ctx.recordsChecked += 1
  const refund = await prisma.refund.findUnique({ where: { id: refundId } })
  if (!refund) return
  if (!refund.stripeRefundId) {
    if (refund.status === 'PROCESSING') {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `refund:missing-id:${refund.id}`,
        type: 'REFUND',
        severity: 'WARNING',
        code: 'REFUND_MISSING_STRIPE_ID',
        summary: 'Refund is PROCESSING without a Stripe refund id.',
        localState: refund.status,
        refundId: refund.id,
        paymentId: refund.paymentId,
        bookingId: refund.bookingId,
        businessId: refund.businessId,
      })
    }
    return
  }
  let stripeRefund: Stripe.Refund
  try {
    stripeRefund = await ctx.stripe.refunds.retrieve(refund.stripeRefundId)
  } catch (err) {
    if (refund.status === 'SUCCEEDED') {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `refund:succeeded-missing:${refund.id}`,
        type: 'REFUND',
        severity: 'CRITICAL',
        code: 'REFUND_SUCCEEDED_BUT_STRIPE_MISSING',
        summary: 'Delve Refund is SUCCEEDED but Stripe Refund could not be retrieved. Not reversed.',
        localState: 'SUCCEEDED',
        stripeState: 'unavailable',
        refundId: refund.id,
        paymentId: refund.paymentId,
        bookingId: refund.bookingId,
        businessId: refund.businessId,
        stripeObjectType: 'refund',
        stripeObjectId: refund.stripeRefundId,
        recommendedAction: 'Admin review. Do not un-cancel the booking or issue another refund.',
      })
    } else if (isRetryableStripe(err)) ctx.errorsCount += 1
    return
  }
  if (refund.status === 'SUCCEEDED' && stripeRefund.status !== 'succeeded') {
    ctx.mismatchesFound += 1
    await upsertIssue(ctx.runId, {
      fingerprint: `refund:succeeded-contradiction:${refund.id}`,
      type: 'REFUND',
      severity: 'CRITICAL',
      code: 'REFUND_SUCCEEDED_BUT_STRIPE_NOT',
      summary: 'Delve Refund is SUCCEEDED but Stripe does not confirm it. Not rewritten.',
      localState: 'SUCCEEDED',
      stripeState: stripeRefund.status || 'unknown',
      refundId: refund.id,
      paymentId: refund.paymentId,
      bookingId: refund.bookingId,
      businessId: refund.businessId,
      stripeObjectType: 'refund',
      stripeObjectId: stripeRefund.id,
      recommendedAction: 'Admin review. Do not create another refund.',
    })
    return
  }
  if (refund.status === 'PROCESSING' && stripeRefund.status === 'succeeded') {
    await applyRefundStripeStatus(ctx.env, refund.id, 'succeeded', stripeRefund.id)
    ctx.recoveriesApplied += 1
    await upsertIssue(ctx.runId, {
      fingerprint: `refund:missed-webhook:${refund.id}`,
      type: 'REFUND',
      severity: 'INFO',
      code: 'REFUND_WEBHOOK_RECOVERED',
      summary: 'Stripe Refund succeeded; canonical refund-success finalizer ran.',
      localState: 'PROCESSING',
      stripeState: 'succeeded',
      refundId: refund.id,
      paymentId: refund.paymentId,
      bookingId: refund.bookingId,
      businessId: refund.businessId,
      stripeObjectType: 'refund',
      stripeObjectId: stripeRefund.id,
      autoResolved: true,
    })
  }
}

async function checkTransfer(ctx: RunContext, payableId: string) {
  ctx.recordsChecked += 1
  const payable = await prisma.businessPayable.findUnique({ where: { id: payableId } })
  if (!payable) return
  if (payable.status === 'PROCESSING') {
    const existingId = payable.stripeTransferId
    if (!existingId) {
      const attempt = await prisma.settlementAttempt.findFirst({
        where: { payableId, stripeTransferId: { not: null } },
        orderBy: { createdAt: 'desc' },
      })
      if (!attempt?.stripeTransferId) {
        ctx.mismatchesFound += 1
        await upsertIssue(ctx.runId, {
          fingerprint: `transfer:processing-no-id:${payable.id}`,
          type: 'TRANSFER',
          severity: 'WARNING',
          code: 'TRANSFER_PROCESSING_NO_ID',
          summary: 'Payable is PROCESSING without a Stripe Transfer id. No replacement Transfer created.',
          localState: 'PROCESSING',
          businessPayableId: payable.id,
          paymentId: payable.paymentId,
          bookingId: payable.bookingId,
          businessId: payable.businessId,
          recommendedAction: 'Admin review. Do not create another Transfer.',
        })
        return
      }
    }
    const transferId = payable.stripeTransferId || undefined
    if (!transferId) return
    try {
      const transfer = await ctx.stripe.transfers.retrieve(transferId)
      const stripeAmount = fromStripeAmount(transfer.amount, transfer.currency)
      if (!stripeAmount.eq(new Decimal(payable.businessNetAmount.toString())) || transfer.currency.toUpperCase() !== payable.currency) {
        ctx.mismatchesFound += 1
        await upsertIssue(ctx.runId, {
          fingerprint: `transfer:amount:${payable.id}`,
          type: 'TRANSFER',
          severity: 'CRITICAL',
          code: 'TRANSFER_AMOUNT_MISMATCH',
          summary: 'Stripe Transfer amount/currency does not match business net. Accounting was not adjusted.',
          localState: `${payable.currency} ${money(payable.businessNetAmount)}`,
          stripeState: `${transfer.currency.toUpperCase()} ${money(stripeAmount)}`,
          businessPayableId: payable.id,
          paymentId: payable.paymentId,
          bookingId: payable.bookingId,
          businessId: payable.businessId,
          stripeObjectType: 'transfer',
          stripeObjectId: transfer.id,
        })
      }
      await finalizePayableFromConfirmedTransfer(payable.id, transfer.id)
      ctx.recoveriesApplied += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `transfer:missed-finalize:${payable.id}`,
        type: 'TRANSFER',
        severity: 'INFO',
        code: 'TRANSFER_FINALIZED',
        summary: 'Existing Stripe Transfer confirmed; canonical settlement-success finalizer ran. No new Transfer created.',
        localState: 'PROCESSING',
        stripeState: 'exists',
        businessPayableId: payable.id,
        paymentId: payable.paymentId,
        bookingId: payable.bookingId,
        businessId: payable.businessId,
        stripeObjectType: 'transfer',
        stripeObjectId: transfer.id,
        autoResolved: true,
      })
    } catch (err) {
      if (isRetryableStripe(err)) ctx.errorsCount += 1
      else {
        ctx.mismatchesFound += 1
        await upsertIssue(ctx.runId, {
          fingerprint: `transfer:processing-missing:${payable.id}`,
          type: 'TRANSFER',
          severity: 'WARNING',
          code: 'TRANSFER_PROCESSING_UNAVAILABLE',
          summary: 'Payable is PROCESSING and Stripe Transfer could not be retrieved. No replacement Transfer created.',
          localState: 'PROCESSING',
          businessPayableId: payable.id,
          paymentId: payable.paymentId,
          bookingId: payable.bookingId,
          businessId: payable.businessId,
        })
      }
    }
    return
  }
  if (payable.status === 'TRANSFERRED' && payable.stripeTransferId) {
    try {
      const transfer = await ctx.stripe.transfers.retrieve(payable.stripeTransferId)
      const stripeAmount = fromStripeAmount(transfer.amount, transfer.currency)
      if (!stripeAmount.eq(new Decimal(payable.businessNetAmount.toString())) || transfer.currency.toUpperCase() !== payable.currency) {
        ctx.mismatchesFound += 1
        await upsertIssue(ctx.runId, {
          fingerprint: `transfer:amount:${payable.id}`,
          type: 'TRANSFER',
          severity: 'CRITICAL',
          code: 'TRANSFER_AMOUNT_MISMATCH',
          summary: 'Stripe Transfer amount/currency does not match business net. Accounting was not adjusted.',
          localState: `${payable.currency} ${money(payable.businessNetAmount)}`,
          stripeState: `${transfer.currency.toUpperCase()} ${money(stripeAmount)}`,
          businessPayableId: payable.id,
          paymentId: payable.paymentId,
          bookingId: payable.bookingId,
          businessId: payable.businessId,
          stripeObjectType: 'transfer',
          stripeObjectId: transfer.id,
        })
      }
    } catch {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `transfer:transferred-missing:${payable.id}`,
        type: 'TRANSFER',
        severity: 'CRITICAL',
        code: 'TRANSFERRED_BUT_STRIPE_MISSING',
        summary: 'Payable is TRANSFERRED but Stripe Transfer could not be found. No replacement Transfer created.',
        localState: 'TRANSFERRED',
        stripeState: 'unavailable',
        businessPayableId: payable.id,
        paymentId: payable.paymentId,
        bookingId: payable.bookingId,
        businessId: payable.businessId,
        stripeObjectType: 'transfer',
        stripeObjectId: payable.stripeTransferId,
        recommendedAction: 'Admin review. Do not recreate the Transfer.',
      })
      await upsertFinancialRecoveryCase({
        fingerprint: `mismatch:transfer-missing:${payable.id}`,
        type: 'STRIPE_LOCAL_MISMATCH',
        businessId: payable.businessId,
        paymentId: payable.paymentId,
        bookingId: payable.bookingId,
        businessPayableId: payable.id,
        amount: payable.businessNetAmount,
        currency: payable.currency,
        reason: 'Local payable is TRANSFERRED but Stripe Transfer was not found. Tracking only.',
      })
    }
  }
}

async function checkReversal(ctx: RunContext, reversalId: string) {
  ctx.recordsChecked += 1
  const row = await prisma.transferReversal.findUnique({ where: { id: reversalId } })
  if (!row) return
  try {
    const transfer = await ctx.stripe.transfers.retrieve(row.stripeTransferId, { expand: ['reversals'] })
    const reversals = transfer.reversals?.data ?? []
    const match = row.stripeTransferReversalId
      ? reversals.find(r => r.id === row.stripeTransferReversalId)
      : reversals[0]
    if (row.status === 'PROCESSING' && match) {
      await persistReversalSucceeded(row.id, match.id)
      ctx.recoveriesApplied += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `reversal:missed-webhook:${row.id}`,
        type: 'TRANSFER_REVERSAL',
        severity: 'INFO',
        code: 'REVERSAL_WEBHOOK_RECOVERED',
        summary: 'Stripe Transfer reversal exists; canonical reversal-success finalizer ran. No second reversal created.',
        localState: 'PROCESSING',
        stripeState: 'exists',
        transferReversalId: row.id,
        paymentId: row.paymentId,
        bookingId: row.bookingId,
        businessId: row.businessId,
        businessPayableId: row.businessPayableId,
        stripeObjectType: 'transfer_reversal',
        stripeObjectId: match.id,
        autoResolved: true,
      })
      return
    }
    if (row.status === 'SUCCEEDED' && !match) {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `reversal:succeeded-missing:${row.id}`,
        type: 'TRANSFER_REVERSAL',
        severity: 'CRITICAL',
        code: 'REVERSAL_SUCCEEDED_BUT_STRIPE_MISSING',
        summary: 'Local TransferReversal is SUCCEEDED but Stripe reversal was not found. Not retried. No traveler refund created.',
        localState: 'SUCCEEDED',
        stripeState: 'missing',
        transferReversalId: row.id,
        paymentId: row.paymentId,
        bookingId: row.bookingId,
        businessId: row.businessId,
        recommendedAction: 'Admin review. Do not automatically reverse again or refund the traveler.',
      })
    }
  } catch (err) {
    if (row.status === 'SUCCEEDED') {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `reversal:succeeded-missing:${row.id}`,
        type: 'TRANSFER_REVERSAL',
        severity: 'CRITICAL',
        code: 'REVERSAL_SUCCEEDED_BUT_STRIPE_MISSING',
        summary: 'Local TransferReversal is SUCCEEDED but Stripe Transfer could not be retrieved.',
        localState: 'SUCCEEDED',
        transferReversalId: row.id,
        paymentId: row.paymentId,
        bookingId: row.bookingId,
        businessId: row.businessId,
      })
    } else if (isRetryableStripe(err)) ctx.errorsCount += 1
  }
}

async function checkDispute(ctx: RunContext, disputeId: string) {
  ctx.recordsChecked += 1
  const row = await prisma.paymentDispute.findUnique({ where: { id: disputeId } })
  if (!row) return
  try {
    const dispute = await ctx.stripe.disputes.retrieve(row.stripeDisputeId, { expand: ['balance_transactions'] })
    const synthetic = {
      id: `recon_${ctx.runId}_${dispute.id}`,
      object: 'event',
      api_version: null,
      created: Math.floor(Date.now() / 1000),
      type: 'charge.dispute.updated',
      data: { object: dispute },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    } as unknown as Stripe.Event
    const before = row.status
    await applyStripeDisputeEvent(synthetic, dispute)
    const after = await prisma.paymentDispute.findUniqueOrThrow({ where: { id: row.id } })
    const feeBts = Array.isArray(dispute.balance_transactions)
      ? dispute.balance_transactions.filter((bt): bt is Stripe.BalanceTransaction => typeof bt !== 'string' && bt.fee > 0)
      : []
    if (feeBts[0]) {
      const fee = feeFromBalanceTransaction(feeBts[0])
      if (fee) {
        await prisma.paymentDispute.update({
          where: { id: row.id },
          data: { stripeFeeAmount: fee.fee.toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP) },
        })
      }
    }
    if (before !== after.status) {
      ctx.recoveriesApplied += 1
      logSafe(ctx.runId, 'DISPUTE', row.id, dispute.id, `status_${after.status}`)
    }
  } catch (err) {
    if (isRetryableStripe(err)) ctx.errorsCount += 1
    else {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `dispute:unavailable:${row.id}`,
        type: 'DISPUTE',
        severity: 'WARNING',
        code: 'DISPUTE_STRIPE_UNAVAILABLE',
        summary: 'Open dispute could not be refreshed from Stripe.',
        localState: row.status,
        disputeId: row.id,
        paymentId: row.paymentId,
        bookingId: row.bookingId,
        businessId: row.businessId,
        stripeObjectType: 'dispute',
        stripeObjectId: row.stripeDisputeId,
      })
    }
  }
}

async function checkConnect(ctx: RunContext, businessId: string) {
  ctx.recordsChecked += 1
  try {
    await syncBusinessConnectFromStripe(ctx.env, businessId)
  } catch (err) {
    if (isRetryableStripe(err)) ctx.errorsCount += 1
    else {
      ctx.mismatchesFound += 1
      await upsertIssue(ctx.runId, {
        fingerprint: `connect:refresh:${businessId}`,
        type: 'CONNECTED_ACCOUNT',
        severity: 'WARNING',
        code: 'CONNECT_REFRESH_FAILED',
        summary: 'Connected account state could not be refreshed from Stripe.',
        businessId,
      })
    }
  }
}

async function processIndependently(ctx: RunContext, label: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (err) {
    ctx.errorsCount += 1
    logSafe(ctx.runId, label, null, null, err instanceof Error ? err.message.slice(0, 120) : 'error')
  }
}

export async function runFinancialReconciliation(
  env: Env,
  input: StartReconciliationBody & { triggeredByType: string; triggeredByUserId?: string | null },
): Promise<ReconciliationRunDto> {
  if (!env.stripeConfigured) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe is not configured.')
  const run = await prisma.financialReconciliationRun.create({
    data: {
      scope: input.scope,
      status: 'RUNNING',
      startedAt: new Date(),
      triggeredByType: input.triggeredByType,
      triggeredByUserId: input.triggeredByUserId ?? null,
    },
  })
  await writeAdminAudit({
    action: 'RECONCILIATION_RUN_STARTED',
    outcome: 'success',
    actorUserId: input.triggeredByUserId ?? null,
    targetType: 'reconciliation_run',
    targetId: run.id,
    metadata: { scope: input.scope },
  })
  const ctx: RunContext = {
    env,
    runId: run.id,
    stripe: requireStripe(env),
    recordsChecked: 0,
    mismatchesFound: 0,
    recoveriesApplied: 0,
    errorsCount: 0,
  }
  const limit = env.RECONCILIATION_BATCH_LIMIT
  const cutoff = staleBefore(env)
  try {
    if (input.scope === 'PAYMENT' && input.paymentId) {
      await processIndependently(ctx, 'PAYMENT', () => checkPayment(ctx, input.paymentId!))
    } else if (input.scope === 'BOOKING' && input.bookingId) {
      await reconcileBookingChainInternal(ctx, input.bookingId)
    } else {
      const payments = await prisma.payment.findMany({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
          updatedAt: { lte: cutoff },
        },
        select: { id: true },
        take: limit,
        orderBy: { updatedAt: 'asc' },
      })
      const paidSample =
        input.scope === 'GLOBAL_RECENT'
          ? await prisma.payment.findMany({
              where: { status: 'PAID', paidAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
              select: { id: true },
              take: Math.min(limit, 20),
            })
          : []
      for (const row of [...payments, ...paidSample]) {
        await processIndependently(ctx, 'PAYMENT', () => checkPayment(ctx, row.id))
      }
      const refunds = await prisma.refund.findMany({
        where: { status: { in: ['PROCESSING', 'FAILED'] }, updatedAt: { lte: cutoff } },
        select: { id: true },
        take: limit,
        orderBy: { updatedAt: 'asc' },
      })
      for (const row of refunds) await processIndependently(ctx, 'REFUND', () => checkRefund(ctx, row.id))
      const payables = await prisma.businessPayable.findMany({
        where: {
          OR: [
            { status: 'PROCESSING', updatedAt: { lte: cutoff } },
            ...(input.scope === 'GLOBAL_RECENT'
              ? [{ status: 'TRANSFERRED' as const, transferredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }]
              : []),
          ],
        },
        select: { id: true },
        take: limit,
        orderBy: { updatedAt: 'asc' },
      })
      for (const row of payables) await processIndependently(ctx, 'TRANSFER', () => checkTransfer(ctx, row.id))
      const reversals = await prisma.transferReversal.findMany({
        where: { status: { in: ['PROCESSING', 'FAILED'] }, updatedAt: { lte: cutoff } },
        select: { id: true },
        take: limit,
      })
      const succeededReversals =
        input.scope === 'GLOBAL_RECENT'
          ? await prisma.transferReversal.findMany({
              where: { status: 'SUCCEEDED', succeededAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
              select: { id: true },
              take: 10,
            })
          : []
      for (const row of [...reversals, ...succeededReversals]) {
        await processIndependently(ctx, 'REVERSAL', () => checkReversal(ctx, row.id))
      }
      const disputes = await prisma.paymentDispute.findMany({
        where: { status: { in: ['NEEDS_RESPONSE', 'UNDER_REVIEW', 'WARNING'] } },
        select: { id: true },
        take: limit,
        orderBy: { updatedAt: 'asc' },
      })
      for (const row of disputes) await processIndependently(ctx, 'DISPUTE', () => checkDispute(ctx, row.id))
      const businesses = await prisma.business.findMany({
        where: { stripeAccountId: { not: null } },
        select: { id: true },
        take: Math.min(limit, 20),
        orderBy: { updatedAt: 'asc' },
      })
      for (const row of businesses) await processIndependently(ctx, 'CONNECT', () => checkConnect(ctx, row.id))
    }

    const status =
      ctx.errorsCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED'
    const updated = await prisma.financialReconciliationRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: new Date(),
        recordsChecked: ctx.recordsChecked,
        mismatchesFound: ctx.mismatchesFound,
        recoveriesApplied: ctx.recoveriesApplied,
        errorsCount: ctx.errorsCount,
      },
    })
    await writeAdminAudit({
      action: 'RECONCILIATION_RUN_COMPLETED',
      outcome: 'success',
      actorUserId: input.triggeredByUserId ?? null,
      targetType: 'reconciliation_run',
      targetId: run.id,
      metadata: {
        status,
        recordsChecked: ctx.recordsChecked,
        mismatchesFound: ctx.mismatchesFound,
        recoveriesApplied: ctx.recoveriesApplied,
        errorsCount: ctx.errorsCount,
      },
    })
    return toRunDto(updated)
  } catch (err) {
    await prisma.financialReconciliationRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        recordsChecked: ctx.recordsChecked,
        mismatchesFound: ctx.mismatchesFound,
        recoveriesApplied: ctx.recoveriesApplied,
        errorsCount: ctx.errorsCount + 1,
      },
    })
    throw err
  }
}

async function reconcileBookingChainInternal(ctx: RunContext, bookingId: string) {
  const payments = await prisma.payment.findMany({ where: { bookingId }, select: { id: true } })
  for (const p of payments) await processIndependently(ctx, 'PAYMENT', () => checkPayment(ctx, p.id))
  const refunds = await prisma.refund.findMany({ where: { bookingId }, select: { id: true } })
  for (const r of refunds) await processIndependently(ctx, 'REFUND', () => checkRefund(ctx, r.id))
  const payables = await prisma.businessPayable.findMany({ where: { bookingId }, select: { id: true } })
  for (const p of payables) await processIndependently(ctx, 'TRANSFER', () => checkTransfer(ctx, p.id))
  const reversals = await prisma.transferReversal.findMany({ where: { bookingId }, select: { id: true } })
  for (const r of reversals) await processIndependently(ctx, 'REVERSAL', () => checkReversal(ctx, r.id))
  const disputes = await prisma.paymentDispute.findMany({ where: { bookingId }, select: { id: true } })
  for (const d of disputes) await processIndependently(ctx, 'DISPUTE', () => checkDispute(ctx, d.id))
}

export async function reconcileBookingFinancialChain(env: Env, bookingId: string, adminUserId?: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  const run = await runFinancialReconciliation(env, {
    scope: 'BOOKING',
    bookingId,
    triggeredByType: 'ADMIN',
    triggeredByUserId: adminUserId ?? null,
  })
  const issues = await prisma.financialReconciliationIssue.findMany({
    where: { bookingId, status: 'OPEN' },
    orderBy: { detectedAt: 'desc' },
    take: 50,
  })
  return {
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
    bookingStatus: booking.status,
    issues: issues.map(toIssueListItem),
    recoveriesApplied: run.recoveriesApplied,
  } satisfies BookingFinancialChainDto
}

function toRunDto(row: {
  id: string
  scope: string
  status: ReconciliationRunDto['status']
  startedAt: Date | null
  completedAt: Date | null
  recordsChecked: number
  mismatchesFound: number
  recoveriesApplied: number
  errorsCount: number
  triggeredByType: string
  createdAt: Date
}): ReconciliationRunDto {
  return {
    id: row.id,
    scope: row.scope,
    status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    recordsChecked: row.recordsChecked,
    mismatchesFound: row.mismatchesFound,
    recoveriesApplied: row.recoveriesApplied,
    errorsCount: row.errorsCount,
    triggeredByType: row.triggeredByType,
    createdAt: row.createdAt.toISOString(),
  }
}

function toIssueListItem(row: {
  id: string
  type: string
  severity: ReconciliationIssueListItem['severity']
  status: ReconciliationIssueListItem['status']
  code: string
  summary: string
  bookingId: string | null
  businessId: string | null
  stripeObjectId: string | null
  detectedAt: Date
  lastDetectedAt: Date
}): ReconciliationIssueListItem {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    status: row.status,
    code: row.code,
    summary: row.summary,
    bookingId: row.bookingId,
    bookingReference: null,
    businessId: row.businessId,
    stripeObjectId: row.stripeObjectId,
    detectedAt: row.detectedAt.toISOString(),
    lastDetectedAt: row.lastDetectedAt.toISOString(),
  }
}

export async function adminReconciliationSummary(): Promise<ReconciliationSummaryDto> {
  const [openIssues, criticalIssues, unmatchedEvents, openRecoveryCases, last] = await Promise.all([
    prisma.financialReconciliationIssue.count({ where: { status: 'OPEN' } }),
    prisma.financialReconciliationIssue.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
    prisma.unmatchedStripeFinancialEvent.count({ where: { status: 'OPEN' } }),
    prisma.financialRecoveryCase.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    prisma.financialReconciliationRun.findFirst({ orderBy: { createdAt: 'desc' } }),
  ])
  return {
    openIssues,
    criticalIssues,
    unmatchedEvents,
    openRecoveryCases,
    lastRun: last ? toRunDto(last) : null,
  }
}

export async function adminListReconciliationIssues(query: {
  severity?: string
  type?: string
  status?: string
  businessId?: string
}) {
  const rows = await prisma.financialReconciliationIssue.findMany({
    where: {
      ...(query.status && query.status !== 'all' ? { status: query.status as ReconciliationIssueListItem['status'] } : {}),
      ...(query.severity ? { severity: query.severity as ReconciliationIssueListItem['severity'] } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.businessId ? { businessId: query.businessId } : {}),
    },
    orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
    take: 100,
  })
  const bookingIds = rows.map(r => r.bookingId).filter((id): id is string => Boolean(id))
  const bookings = bookingIds.length
    ? await prisma.booking.findMany({ where: { id: { in: bookingIds } }, select: { id: true, bookingReference: true } })
    : []
  const ref = new Map(bookings.map(b => [b.id, b.bookingReference]))
  return rows.map(row => ({ ...toIssueListItem(row), bookingReference: row.bookingId ? ref.get(row.bookingId) ?? null : null }))
}

export async function adminGetReconciliationIssue(id: string): Promise<ReconciliationIssueDto> {
  const row = await prisma.financialReconciliationIssue.findUnique({ where: { id } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Reconciliation issue not found.')
  const booking = row.bookingId
    ? await prisma.booking.findUnique({ where: { id: row.bookingId }, select: { bookingReference: true } })
    : null
  return {
    ...toIssueListItem(row),
    bookingReference: booking?.bookingReference ?? null,
    fingerprint: row.fingerprint,
    runId: row.runId,
    paymentId: row.paymentId,
    businessPayableId: row.businessPayableId,
    refundId: row.refundId,
    transferReversalId: row.transferReversalId,
    disputeId: row.disputeId,
    stripeObjectType: row.stripeObjectType,
    recommendedAction: row.recommendedAction,
    localState: row.localState,
    stripeState: row.stripeState,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolutionType: row.resolutionType,
    resolutionNote: row.resolutionNote,
  }
}

export async function adminResolveReconciliationIssue(
  adminUserId: string,
  id: string,
  resolutionType: 'MANUALLY_RESOLVED' | 'IGNORED',
  note?: string,
) {
  const row = await prisma.financialReconciliationIssue.findUnique({ where: { id } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Reconciliation issue not found.')
  await prisma.financialReconciliationIssue.update({
    where: { id },
    data: {
      status: resolutionType,
      resolutionType,
      resolutionNote: note ?? null,
      resolvedAt: new Date(),
    },
  })
  await writeAdminAudit({
    action: 'RECONCILIATION_MANUAL_RESOLVED',
    outcome: 'success',
    actorUserId: adminUserId,
    targetType: 'reconciliation_issue',
    targetId: id,
    metadata: { resolutionType },
  })
  return adminGetReconciliationIssue(id)
}

export async function adminListUnmatchedEvents(status?: string): Promise<UnmatchedStripeEventDto[]> {
  const rows = await prisma.unmatchedStripeFinancialEvent.findMany({
    where: status && status !== 'all' ? { status: status as UnmatchedStripeEventDto['status'] } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return rows.map(row => ({
    id: row.id,
    providerEventId: row.providerEventId,
    eventType: row.eventType,
    stripeObjectId: row.stripeObjectId,
    chargeId: row.chargeId,
    paymentIntentId: row.paymentIntentId,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  }))
}

export async function retryUnmatchedEvent(env: Env, id: string, adminUserId: string) {
  const row = await prisma.unmatchedStripeFinancialEvent.findUnique({ where: { id } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Unmatched event not found.')
  const stripe = requireStripe(env)
  if (row.eventType.startsWith('charge.dispute.') && row.stripeObjectId) {
    const dispute = await stripe.disputes.retrieve(row.stripeObjectId)
    const synthetic = {
      id: row.providerEventId,
      object: 'event',
      created: Math.floor(Date.now() / 1000),
      type: row.eventType,
      data: { object: dispute },
    } as unknown as Stripe.Event
    await applyStripeDisputeEvent(synthetic, dispute)
    const matched = await prisma.paymentDispute.findUnique({ where: { stripeDisputeId: dispute.id } })
    if (matched) {
      await prisma.unmatchedStripeFinancialEvent.update({
        where: { id: row.id },
        data: { status: 'MATCHED', reviewedAt: new Date(), reviewedById: adminUserId },
      })
      return { matched: true, disputeId: matched.id }
    }
  }
  return { matched: false }
}

export async function markUnmatchedReviewed(id: string, adminUserId: string) {
  const row = await prisma.unmatchedStripeFinancialEvent.findUnique({ where: { id } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Unmatched event not found.')
  await prisma.unmatchedStripeFinancialEvent.update({
    where: { id },
    data: { status: 'REVIEWED', reviewedAt: new Date(), reviewedById: adminUserId },
  })
  return { reviewed: true }
}
