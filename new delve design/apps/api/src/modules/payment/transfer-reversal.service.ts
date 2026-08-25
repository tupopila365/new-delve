import Stripe from 'stripe'
import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type { TransferReversalDto, TransferReversalStatus } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { createNotification } from '../notifications/notify.js'
import { requireStripe } from './stripe-client.js'
import { toStripeAmount } from './stripe-amount.js'
import { lockPaymentThenPayable, lockRefundRow, lockTransferReversalRow } from './financial-locks.js'
import { issueRefund } from './refund.service.js'

const MONEY = 2

function moneyRequired(value: { toString(): string } | string | number) {
  return new Decimal(value.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP).toFixed(MONEY)
}

/** Authoritative reversal amount is the transferred business net, never the traveler Payment. */
export function reversalAmountFromPayableNet(businessNetAmount: Decimal | string | { toString(): string }) {
  return new Decimal(businessNetAmount.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP)
}

export function canApplyReversalStripeEvent(
  current: TransferReversalStatus,
  next: 'SUCCEEDED' | 'FAILED' | 'PROCESSING',
) {
  if (current === 'SUCCEEDED') return false
  if (current === 'FAILED' && next === 'PROCESSING') return false
  return true
}

export function toTransferReversalDto(row: {
  id: string
  businessPayableId: string
  paymentId: string
  bookingId: string
  refundId: string | null
  status: TransferReversalStatus
  amount: { toString(): string }
  currency: string
  reason: TransferReversalDto['reason']
  stripeTransferId: string
  stripeTransferReversalId: string | null
  failureCode: string | null
  failureMessage: string | null
  createdAt: Date
  processingAt: Date | null
  succeededAt: Date | null
  failedAt: Date | null
}): TransferReversalDto {
  return {
    id: row.id,
    businessPayableId: row.businessPayableId,
    paymentId: row.paymentId,
    bookingId: row.bookingId,
    refundId: row.refundId,
    status: row.status,
    amount: moneyRequired(row.amount),
    currency: row.currency,
    reason: row.reason,
    stripeTransferIdPresent: Boolean(row.stripeTransferId),
    stripeTransferReversalIdPresent: Boolean(row.stripeTransferReversalId),
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    createdAt: row.createdAt.toISOString(),
    processingAt: row.processingAt?.toISOString() ?? null,
    succeededAt: row.succeededAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
  }
}

function classifyReversalError(err: unknown): {
  retryable: boolean
  code: string
  message: string
  alreadyReversed: boolean
} {
  const stripeErr = err instanceof Stripe.errors.StripeError ? err : null
  const code = stripeErr?.code || (err instanceof Error ? err.name : 'REVERSAL_FAILED')
  const message = err instanceof Error ? err.message : 'Stripe transfer reversal failed.'
  const alreadyReversed = code === 'transfer_already_reversed' || /already (been )?reversed/i.test(message)
  if (alreadyReversed) {
    return { retryable: false, code: 'ALREADY_REVERSED', message, alreadyReversed: true }
  }
  if (code === 'balance_insufficient' || code === 'insufficient_available_on_stripe_balance') {
    return {
      retryable: true,
      code: 'CONNECTED_ACCOUNT_BALANCE_INSUFFICIENT',
      message:
        "Settlement could not be recovered from the business's Stripe account. The traveler refund has not been issued. Financial review is required.",
      alreadyReversed: false,
    }
  }
  if (err instanceof Stripe.errors.StripeConnectionError || (stripeErr?.statusCode && stripeErr.statusCode >= 500)) {
    return {
      retryable: true,
      code: 'STRIPE_UNAVAILABLE',
      message: 'Stripe was temporarily unavailable.',
      alreadyReversed: false,
    }
  }
  if (err instanceof Stripe.errors.StripeRateLimitError) {
    return { retryable: true, code: 'STRIPE_RATE_LIMITED', message: 'Stripe rate limit. Retry later.', alreadyReversed: false }
  }
  return { retryable: false, code: String(code), message, alreadyReversed: false }
}

async function notifyProvidersReversal(
  businessId: string,
  bookingReference: string,
  amount: string,
  currency: string,
  bookingId: string,
) {
  const members = await prisma.businessMember.findMany({
    where: { businessId, role: { in: ['OWNER', 'MANAGER'] } },
    select: { userId: true },
  })
  await Promise.all(
    members.map(m =>
      createNotification({
        userId: m.userId,
        type: 'SETTLEMENT_REVERSED',
        title: `Settlement reversed · ${bookingReference}`,
        body: `A settlement for booking ${bookingReference} was reversed because the booking is being refunded. Amount: ${currency} ${amount}. This is a Stripe Transfer reversal, not a bank payout reversal.`,
        entityType: 'booking',
        entityId: bookingId,
      }),
    ),
  )
}

export async function persistReversalSucceeded(
  reversalId: string,
  stripeTransferReversalId: string | null,
  actorUserId?: string | null,
) {
  const row = await prisma.transferReversal.findUnique({ where: { id: reversalId } })
  if (!row) return
  if (!canApplyReversalStripeEvent(row.status, 'SUCCEEDED')) return
  const now = new Date()
  const applied = await prisma.$transaction(async tx => {
    await lockPaymentThenPayable(tx, row.paymentId)
    if (row.refundId) await lockRefundRow(tx, row.refundId)
    await lockTransferReversalRow(tx, row.id)
    const current = await tx.transferReversal.findUniqueOrThrow({ where: { id: row.id } })
    if (current.status === 'SUCCEEDED') return false
    await tx.transferReversal.update({
      where: { id: row.id },
      data: {
        status: 'SUCCEEDED',
        succeededAt: now,
        stripeTransferReversalId: stripeTransferReversalId ?? current.stripeTransferReversalId,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
      },
    })
    await tx.businessPayable.update({
      where: { id: row.businessPayableId },
      data: {
        status: 'REVERSED',
        eligibilityCode: 'SETTLEMENT_REVERSED',
      },
    })
    return true
  })
  if (!applied) return
  const booking = await prisma.booking.findUnique({ where: { id: row.bookingId }, select: { bookingReference: true } })
  await writeAdminAudit({
    action: 'TRANSFER_REVERSAL_SUCCEEDED',
    outcome: 'success',
    actorUserId: actorUserId ?? null,
    targetType: 'transfer_reversal',
    targetId: row.id,
    metadata: {
      transferReversalId: row.id,
      businessPayableId: row.businessPayableId,
      stripeTransferId: row.stripeTransferId,
      paymentId: row.paymentId,
      bookingId: row.bookingId,
      refundId: row.refundId,
      businessId: row.businessId,
    },
  })
  if (booking) {
    await notifyProvidersReversal(
      row.businessId,
      booking.bookingReference,
      moneyRequired(row.amount),
      row.currency,
      row.bookingId,
    )
  }
}

export async function persistReversalFailed(
  reversalId: string,
  failure: { code: string; message: string },
  actorUserId?: string | null,
) {
  const row = await prisma.transferReversal.findUnique({ where: { id: reversalId } })
  if (!row) return
  if (!canApplyReversalStripeEvent(row.status, 'FAILED')) return
  await prisma.transferReversal.update({
    where: { id: reversalId },
    data: {
      status: 'FAILED',
      failedAt: new Date(),
      failureCode: failure.code,
      failureMessage: failure.message.slice(0, 500),
    },
  })
  await writeAdminAudit({
    action: 'TRANSFER_REVERSAL_FAILED',
    outcome: 'failure',
    actorUserId: actorUserId ?? null,
    targetType: 'transfer_reversal',
    targetId: row.id,
    reason: failure.message.slice(0, 300),
    metadata: {
      transferReversalId: row.id,
      businessPayableId: row.businessPayableId,
      stripeTransferId: row.stripeTransferId,
      paymentId: row.paymentId,
      bookingId: row.bookingId,
      refundId: row.refundId,
      businessId: row.businessId,
    },
  })
}

export async function applyTransferReversedWebhook(
  stripeTransferId: string,
  stripeReversalId?: string | null,
  metadataReversalId?: string | null,
) {
  const row = metadataReversalId
    ? await prisma.transferReversal.findUnique({ where: { id: metadataReversalId } })
    : await prisma.transferReversal.findFirst({
        where: { stripeTransferId, status: { in: ['PENDING', 'PROCESSING', 'FAILED'] } },
        orderBy: { createdAt: 'desc' },
      })
  if (!row) return
  await persistReversalSucceeded(row.id, stripeReversalId ?? row.stripeTransferReversalId)
}

export async function reverseSettlementAndContinueRefund(env: Env, adminUserId: string, refundId: string) {
  const claimed = await prisma.$transaction(async tx => {
    const refund = await tx.refund.findUnique({ where: { id: refundId } })
    if (!refund) throw new AppError(404, 'NOT_FOUND', 'Refund not found.')
    await lockPaymentThenPayable(tx, refund.paymentId)
    await lockRefundRow(tx, refund.id)
    const lockedRefund = await tx.refund.findUniqueOrThrow({ where: { id: refund.id } })
    if (lockedRefund.status === 'SUCCEEDED') throw new AppError(409, 'ALREADY_REFUNDED', 'This refund already succeeded.')
    if (lockedRefund.status === 'PROCESSING') {
      throw new AppError(409, 'REFUND_IN_PROGRESS', 'A Stripe refund is already in progress.')
    }
    if (lockedRefund.status === 'CANCELLED') throw new AppError(400, 'REFUND_CANCELLED', 'This refund was cancelled.')
    if (lockedRefund.status !== 'PENDING' && lockedRefund.status !== 'FAILED') {
      throw new AppError(400, 'REFUND_NOT_ELIGIBLE', 'This refund cannot start reversal recovery.')
    }

    const payment = await tx.payment.findUniqueOrThrow({ where: { id: lockedRefund.paymentId } })
    if (payment.status !== 'PAID') throw new AppError(400, 'PAYMENT_NOT_PAID', 'Payment is not PAID.')

    const payable = await tx.businessPayable.findUnique({ where: { paymentId: payment.id } })
    if (!payable) throw new AppError(400, 'PAYABLE_MISSING', 'No business payable exists for this payment.')
    if (payable.status === 'PROCESSING') {
      throw new AppError(409, 'SETTLEMENT_IN_PROGRESS', 'Settlement is in progress. Reversal cannot run at the same time.')
    }
    if (!payable.stripeTransferId) {
      throw new AppError(400, 'TRANSFER_MISSING', 'This payable has no Stripe Transfer to reverse.')
    }
    if (payable.bookingId !== lockedRefund.bookingId || payable.paymentId !== lockedRefund.paymentId) {
      throw new AppError(400, 'FINANCIAL_MISMATCH', 'Booking, payment, and payable do not match.')
    }
    if (payable.status !== 'TRANSFERRED' && payable.status !== 'REVERSED') {
      throw new AppError(400, 'PAYABLE_NOT_TRANSFERRED', 'Only a transferred settlement can be reversed.')
    }

    const cancel = await tx.bookingCancellationRequest.findFirst({
      where: { bookingId: lockedRefund.bookingId, status: { in: ['APPROVED', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
    })
    if (!cancel) {
      throw new AppError(400, 'CANCELLATION_NOT_APPROVED', 'Paid cancellation must be approved before reversal.')
    }

    const amount = reversalAmountFromPayableNet(payable.businessNetAmount)
    if (amount.lte(0)) throw new AppError(400, 'AMOUNT_INVALID', 'Reversal amount must be greater than zero.')
    if (payable.currency !== lockedRefund.currency) {
      throw new AppError(400, 'CURRENCY_MISMATCH', 'Payable currency must match the refund currency.')
    }

    let reversal = await tx.transferReversal.findUnique({ where: { businessPayableId: payable.id } })
    if (reversal) {
      await lockTransferReversalRow(tx, reversal.id)
      reversal = await tx.transferReversal.findUniqueOrThrow({ where: { id: reversal.id } })
    }

    if (reversal?.status === 'SUCCEEDED') {
      return { skipStripe: true as const, createdNew: false, reversal, refund: lockedRefund, payment, payable }
    }
    if (reversal?.status === 'PROCESSING') {
      throw new AppError(409, 'REVERSAL_IN_PROGRESS', 'A transfer reversal is already in progress.')
    }

    let createdNew = false
    if (!reversal) {
      createdNew = true
      const created = await tx.transferReversal.create({
        data: {
          businessPayableId: payable.id,
          paymentId: payment.id,
          bookingId: lockedRefund.bookingId,
          refundId: lockedRefund.id,
          businessId: payable.businessId,
          stripeTransferId: payable.stripeTransferId,
          status: 'PROCESSING',
          amount,
          currency: payable.currency,
          reason: 'BOOKING_REFUND',
          idempotencyKey: `transfer-reversal:pending:${payable.id}`,
          processingAt: new Date(),
        },
      })
      reversal = await tx.transferReversal.update({
        where: { id: created.id },
        data: { idempotencyKey: `transfer-reversal:${created.id}` },
      })
    } else {
      reversal = await tx.transferReversal.update({
        where: { id: reversal.id },
        data: {
          status: 'PROCESSING',
          processingAt: reversal.processingAt ?? new Date(),
          refundId: lockedRefund.id,
          amount,
          failureCode: null,
          failureMessage: null,
        },
      })
    }

    return { skipStripe: false as const, createdNew, reversal, refund: lockedRefund, payment, payable }
  })

  if (!claimed.skipStripe) {
    if (claimed.createdNew) {
      await writeAdminAudit({
        action: 'TRANSFER_REVERSAL_CREATED',
        outcome: 'success',
        actorUserId: adminUserId,
        targetType: 'transfer_reversal',
        targetId: claimed.reversal.id,
        metadata: {
          transferReversalId: claimed.reversal.id,
          businessPayableId: claimed.payable.id,
          stripeTransferId: claimed.payable.stripeTransferId,
          paymentId: claimed.payment.id,
          bookingId: claimed.refund.bookingId,
          refundId: claimed.refund.id,
          businessId: claimed.payable.businessId,
        },
      })
    }
    await writeAdminAudit({
      action: 'TRANSFER_REVERSAL_PROCESSING',
      outcome: 'success',
      actorUserId: adminUserId,
      targetType: 'transfer_reversal',
      targetId: claimed.reversal.id,
      metadata: {
        transferReversalId: claimed.reversal.id,
        businessPayableId: claimed.payable.id,
        stripeTransferId: claimed.payable.stripeTransferId,
        paymentId: claimed.payment.id,
        bookingId: claimed.refund.bookingId,
        refundId: claimed.refund.id,
        businessId: claimed.payable.businessId,
      },
    })

    const stripe = requireStripe(env)
    try {
      const created = await stripe.transfers.createReversal(
        claimed.payable.stripeTransferId!,
        {
          amount: toStripeAmount(claimed.reversal.amount, claimed.reversal.currency),
          metadata: {
            transferReversalId: claimed.reversal.id,
            businessPayableId: claimed.payable.id,
            refundId: claimed.refund.id,
            paymentId: claimed.payment.id,
            bookingId: claimed.refund.bookingId,
          },
        },
        { idempotencyKey: `transfer-reversal:${claimed.reversal.id}` },
      )
      await persistReversalSucceeded(claimed.reversal.id, created.id, adminUserId)
    } catch (err) {
      const classified = classifyReversalError(err)
      if (classified.alreadyReversed) {
        const stripeClient = requireStripe(env)
        const transfer = await stripeClient.transfers.retrieve(claimed.payable.stripeTransferId!, { expand: ['reversals'] })
        const existingId = transfer.reversals?.data?.[0]?.id ?? null
        await persistReversalSucceeded(claimed.reversal.id, existingId, adminUserId)
      } else {
        await persistReversalFailed(claimed.reversal.id, classified, adminUserId)
        throw new AppError(classified.retryable ? 502 : 409, classified.code, classified.message)
      }
    }
  }

  await writeAdminAudit({
    action: 'REFUND_CONTINUED_AFTER_REVERSAL',
    outcome: 'success',
    actorUserId: adminUserId,
    targetType: 'refund',
    targetId: claimed.refund.id,
    metadata: {
      transferReversalId: claimed.reversal.id,
      businessPayableId: claimed.payable.id,
      stripeTransferId: claimed.payable.stripeTransferId,
      paymentId: claimed.payment.id,
      bookingId: claimed.refund.bookingId,
      refundId: claimed.refund.id,
      businessId: claimed.payable.businessId,
    },
  })
  return issueRefund(env, adminUserId, claimed.refund.id)
}

export async function getReversalForPayable(businessPayableId: string) {
  const row = await prisma.transferReversal.findUnique({ where: { businessPayableId } })
  return row ? toTransferReversalDto(row) : null
}
