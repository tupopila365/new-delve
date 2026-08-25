import Stripe from 'stripe'
import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type {
  BusinessPayableDto,
  BusinessPayableStatus,
  PaymentStatus,
  ProviderEarningsDto,
  StripeConnectStatus,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { requireBusinessMembership } from '../business/business.service.js'
import { createNotification } from '../notifications/notify.js'
import { requireStripe } from './stripe-client.js'
import { toStripeAmount } from './stripe-amount.js'
import { bookingHasFinancialHold, bookingIdsWithFinancialHold } from './financial-hold.js'
import { evaluateSettlementEligibility, providerSettlementLabel } from './settlement-eligibility.js'

const MONEY = 2

function moneyString(value: { toString(): string } | string | number | null | undefined) {
  if (value == null) return null
  return new Decimal(value.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP).toFixed(MONEY)
}

function moneyRequired(value: { toString(): string } | string | number) {
  return new Decimal(value.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP).toFixed(MONEY)
}

type PayableGraph = {
  id: string
  bookingId: string
  paymentId: string
  businessId: string
  status: BusinessPayableStatus
  grossAmount: { toString(): string }
  platformCommissionAmount: { toString(): string }
  businessNetAmount: { toString(): string }
  currency: string
  stripeFeeAmount: { toString(): string } | null
  stripeTransferId: string | null
  transferGroup: string
  eligibilityCode: string | null
  lastFailureCode: string | null
  lastFailureMessage: string | null
  createdAt: Date
  eligibleAt: Date | null
  processingAt: Date | null
  transferredAt: Date | null
  booking: {
    bookingReference: string
    status: string
    listingTitleSnapshot: string
    completedAt: Date | null
  }
  payment: {
    status: PaymentStatus
    amount: { toString(): string }
    paidAt: Date | null
    stripeChargeId: string | null
    stripePaymentIntentId: string | null
  }
  business: {
    id: string
    name: string
    slug: string
    status: string
    stripeAccountId: string | null
    stripeAccountStatus: StripeConnectStatus
    stripeChargesEnabled: boolean
    stripePayoutsEnabled: boolean
    stripeDetailsSubmitted: boolean
  }
  attempts?: Array<{
    id: string
    outcome: string
    stripeTransferId: string | null
    failureCode: string | null
    failureMessage: string | null
    createdAt: Date
  }>
  hasActiveCancellationOrRefund?: boolean
  reversal?: {
    status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'
    amount: { toString(): string }
    currency: string
    succeededAt: Date | null
    failedAt: Date | null
    failureCode: string | null
    failureMessage: string | null
    stripeTransferReversalId: string | null
  } | null
}

const payableInclude = {
  booking: {
    select: { bookingReference: true, status: true, listingTitleSnapshot: true, completedAt: true },
  },
  payment: {
    select: {
      status: true,
      amount: true,
      paidAt: true,
      stripeChargeId: true,
      stripePaymentIntentId: true,
    },
  },
  business: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      stripeAccountId: true,
      stripeAccountStatus: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
    },
  },
} as const

function eligibilityOf(row: PayableGraph) {
  return evaluateSettlementEligibility({
    payableStatus: row.status,
    stripeTransferId: row.stripeTransferId,
    businessNetAmount: row.businessNetAmount,
    paymentStatus: row.payment.status,
    bookingStatus: row.booking.status,
    businessStatus: row.business.status,
    stripeAccountId: row.business.stripeAccountId,
    stripeAccountStatus: row.business.stripeAccountStatus,
    stripeChargesEnabled: row.business.stripeChargesEnabled,
    stripePayoutsEnabled: row.business.stripePayoutsEnabled,
    stripeDetailsSubmitted: row.business.stripeDetailsSubmitted,
    hasActiveCancellationOrRefund: Boolean(row.hasActiveCancellationOrRefund),
  })
}

export function toPayableDto(row: PayableGraph, opts?: { includeAttempts?: boolean }): BusinessPayableDto {
  const eligibility = eligibilityOf(row)
  return {
    id: row.id,
    bookingId: row.bookingId,
    paymentId: row.paymentId,
    businessId: row.businessId,
    status: row.status,
    grossAmount: moneyRequired(row.grossAmount),
    platformCommissionAmount: moneyRequired(row.platformCommissionAmount),
    businessNetAmount: moneyRequired(row.businessNetAmount),
    currency: row.currency,
    stripeFeeAmount: moneyString(row.stripeFeeAmount),
    stripeTransferId: row.stripeTransferId,
    eligibility: {
      eligible: eligibility.eligible,
      code: eligibility.code,
      reason: eligibility.reason,
      retryable: eligibility.retryable,
    },
    createdAt: row.createdAt.toISOString(),
    eligibleAt: row.eligibleAt?.toISOString() ?? null,
    processingAt: row.processingAt?.toISOString() ?? null,
    transferredAt: row.transferredAt?.toISOString() ?? null,
    booking: {
      bookingReference: row.booking.bookingReference,
      status: row.booking.status,
      listingTitle: row.booking.listingTitleSnapshot,
      completedAt: row.booking.completedAt?.toISOString() ?? null,
    },
    payment: {
      status: row.payment.status,
      amount: moneyRequired(row.payment.amount),
      paidAt: row.payment.paidAt?.toISOString() ?? null,
    },
    business: {
      id: row.business.id,
      name: row.business.name,
      slug: row.business.slug,
      status: row.business.status,
      stripeAccountStatus: row.business.stripeAccountStatus,
      stripeAccountIdPresent: Boolean(row.business.stripeAccountId),
      chargesEnabled: row.business.stripeChargesEnabled,
      payoutsEnabled: row.business.stripePayoutsEnabled,
      detailsSubmitted: row.business.stripeDetailsSubmitted,
    },
    reversal: row.reversal
      ? {
          status: row.reversal.status,
          amount: moneyRequired(row.reversal.amount),
          currency: row.reversal.currency,
          succeededAt: row.reversal.succeededAt?.toISOString() ?? null,
          failedAt: row.reversal.failedAt?.toISOString() ?? null,
          failureCode: row.reversal.failureCode,
          failureMessage: row.reversal.failureMessage,
          stripeTransferReversalIdPresent: Boolean(row.reversal.stripeTransferReversalId),
        }
      : null,
    ...(opts?.includeAttempts
      ? {
          attempts: (row.attempts ?? []).map(a => ({
            id: a.id,
            outcome: a.outcome,
            stripeTransferId: a.stripeTransferId,
            failureCode: a.failureCode,
            failureMessage: a.failureMessage,
            createdAt: a.createdAt.toISOString(),
          })),
        }
      : {}),
  }
}

export async function persistPayableEligibility(payableId: string) {
  const row = await prisma.businessPayable.findUnique({
    where: { id: payableId },
    include: payableInclude,
  })
  if (!row) return null
  const hold = await bookingHasFinancialHold(row.bookingId)
  const graph = { ...(row as PayableGraph), hasActiveCancellationOrRefund: hold }
  const result = eligibilityOf(graph)
  if (row.status === 'TRANSFERRED' || row.status === 'PROCESSING' || row.status === 'CANCELLED' || row.status === 'REVERSED') {
    return prisma.businessPayable.findUnique({ where: { id: payableId }, include: payableInclude })
  }
  const now = new Date()
  const next = result.nextStatus
  if (next === row.status) {
    return prisma.businessPayable.update({
      where: { id: payableId },
      data: { eligibilityCode: result.code },
      include: payableInclude,
    })
  }
  const becameEligible = next === 'ELIGIBLE' && row.status !== 'ELIGIBLE'
  const updated = await prisma.businessPayable.update({
    where: { id: payableId },
    data: {
      status: next,
      eligibilityCode: result.code,
      eligibleAt: next === 'ELIGIBLE' ? row.eligibleAt ?? now : row.eligibleAt,
      blockedAt: next === 'BLOCKED' ? now : row.blockedAt,
    },
    include: payableInclude,
  })
  if (becameEligible) {
    const members = await prisma.businessMember.findMany({
      where: { businessId: row.businessId, role: { in: ['OWNER', 'MANAGER'] } },
      select: { userId: true },
    })
    await Promise.all(
      members.map(m =>
        createNotification({
          userId: m.userId,
          type: 'SETTLEMENT_ELIGIBLE',
          title: `Settlement eligible · ${row.booking.bookingReference}`,
          body: 'Delve can release this settlement. This is not a bank payout.',
          entityType: 'settlement',
          entityId: row.id,
        }),
      ),
    )
  }
  return updated
}

export async function evaluatePayableForBooking(bookingId: string) {
  const payable = await prisma.businessPayable.findUnique({ where: { bookingId } })
  if (!payable) return null
  return persistPayableEligibility(payable.id)
}

function classifyTransferError(err: unknown): { retryable: boolean; code: string; message: string } {
  if (err instanceof Stripe.errors.StripeConnectionError) {
    return { retryable: true, code: 'STRIPE_UNAVAILABLE', message: 'Stripe was temporarily unavailable.' }
  }
  if (err instanceof Stripe.errors.StripeAPIError && err.statusCode && err.statusCode >= 500) {
    return { retryable: true, code: 'STRIPE_UNAVAILABLE', message: 'Stripe was temporarily unavailable.' }
  }
  if (err instanceof Stripe.errors.StripeRateLimitError) {
    return { retryable: true, code: 'STRIPE_RATE_LIMITED', message: 'Stripe rate limit. Retry later.' }
  }
  const code = err instanceof Stripe.errors.StripeError ? err.code || err.type : 'TRANSFER_FAILED'
  const message = err instanceof Error ? err.message : 'Stripe Transfer failed.'
  const blocked = [
    'account_invalid',
    'balance_insufficient',
    'transfers_not_allowed',
    'currency_mismatch',
    'invalid_destination',
  ].includes(String(code))
  return { retryable: !blocked, code: String(code), message }
}

export async function releaseSettlement(env: Env, adminUserId: string, payableId: string): Promise<BusinessPayableDto> {
  const claimed = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = (SELECT "paymentId" FROM "BusinessPayable" WHERE id = ${payableId}) FOR UPDATE`
    const locked = await tx.$queryRaw<Array<{ id: string; status: BusinessPayableStatus }>>`
      SELECT id, status FROM "BusinessPayable" WHERE id = ${payableId} FOR UPDATE
    `
    const row = locked[0]
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Settlement not found.')
    if (row.status === 'TRANSFERRED') {
      throw new AppError(409, 'ALREADY_TRANSFERRED', 'This settlement already has a Stripe Transfer.')
    }
    if (row.status === 'PROCESSING') {
      throw new AppError(409, 'SETTLEMENT_IN_PROGRESS', 'A settlement Transfer is already in progress.')
    }
    if (row.status === 'CANCELLED') {
      throw new AppError(400, 'SETTLEMENT_CANCELLED', 'This payable was cancelled.')
    }
    if (row.status === 'REVERSED') {
      throw new AppError(409, 'SETTLEMENT_REVERSED', 'This settlement transfer was reversed and cannot be released again.')
    }
    const full = await tx.businessPayable.findUniqueOrThrow({
      where: { id: payableId },
      include: payableInclude,
    })
    const reversal = await tx.transferReversal.findUnique({ where: { businessPayableId: payableId } })
    if (reversal) {
      await tx.$queryRaw`SELECT id FROM "TransferReversal" WHERE id = ${reversal.id} FOR UPDATE`
    }
    if (reversal?.status === 'SUCCEEDED') {
      throw new AppError(409, 'SETTLEMENT_REVERSED', 'This settlement transfer was reversed and cannot be released again.')
    }
    if (reversal?.status === 'PROCESSING' || reversal?.status === 'PENDING') {
      throw new AppError(409, 'REVERSAL_IN_PROGRESS', 'Transfer reversal is in progress. Settlement cannot be released.')
    }
    const hold = await bookingHasFinancialHold(full.bookingId, tx)
    if (hold) {
      throw new AppError(
        409,
        'SETTLEMENT_BLOCKED_REFUND',
        'Traveler refund/cancellation is in progress. Settlement cannot be released.',
      )
    }
    const check = eligibilityOf({ ...(full as PayableGraph), hasActiveCancellationOrRefund: hold })
    if (!check.eligible || full.status !== 'ELIGIBLE') {
      throw new AppError(400, 'SETTLEMENT_NOT_ELIGIBLE', check.reason)
    }
    const net = new Decimal(full.businessNetAmount.toString())
    if (net.lte(0)) throw new AppError(400, 'AMOUNT_INVALID', 'Business net amount must be greater than zero.')
    if (full.payment.status !== 'PAID') throw new AppError(400, 'PAYMENT_NOT_PAID', 'Traveler payment is not PAID.')
    if (full.booking.status !== 'COMPLETED') {
      throw new AppError(400, 'BOOKING_NOT_COMPLETED', 'The booking has not been completed.')
    }
    if (full.business.status !== 'VERIFIED') {
      throw new AppError(400, 'BUSINESS_NOT_ACTIVE', 'The business is not verified.')
    }
    if (!full.business.stripeAccountId) {
      throw new AppError(400, 'MISSING_ACCOUNT', 'No Stripe connected account.')
    }
    await tx.businessPayable.update({
      where: { id: payableId },
      data: { status: 'PROCESSING', processingAt: new Date(), eligibilityCode: 'IN_PROGRESS' },
    })
    return full
  })

  const stripe = requireStripe(env)
  const destination = claimed.business.stripeAccountId
  if (!destination) {
    await prisma.businessPayable.update({
      where: { id: payableId },
      data: { status: 'BLOCKED', blockedAt: new Date(), lastFailureCode: 'MISSING_ACCOUNT' },
    })
    throw new AppError(400, 'MISSING_ACCOUNT', 'No Stripe connected account.')
  }

  try {
    const transferParams: Stripe.TransferCreateParams = {
      amount: toStripeAmount(claimed.businessNetAmount, claimed.currency),
      currency: claimed.currency.toLowerCase(),
      destination,
      transfer_group: claimed.transferGroup,
      metadata: {
        businessPayableId: claimed.id,
        bookingId: claimed.bookingId,
        bookingReference: claimed.booking.bookingReference,
        businessId: claimed.businessId,
        paymentId: claimed.paymentId,
      },
    }
    if (claimed.payment.stripeChargeId) {
      transferParams.source_transaction = claimed.payment.stripeChargeId
    }
    const transfer = await stripe.transfers.create(transferParams, {
      idempotencyKey: `payable-transfer:${claimed.id}`,
    })

    const updated = await prisma.businessPayable.update({
      where: { id: payableId },
      data: {
        status: 'TRANSFERRED',
        stripeTransferId: transfer.id,
        transferredAt: new Date(),
        eligibilityCode: 'ALREADY_TRANSFERRED',
        lastFailureCode: null,
        lastFailureMessage: null,
      },
      include: { ...payableInclude, attempts: { orderBy: { createdAt: 'desc' }, take: 20 } },
    })
    await prisma.settlementAttempt.create({
      data: {
        payableId,
        outcome: 'SUCCEEDED',
        stripeTransferId: transfer.id,
        actorUserId: adminUserId,
      },
    })
    await writeAdminAudit({
      action: 'SETTLEMENT_RELEASED',
      outcome: 'success',
      actorUserId: adminUserId,
      targetType: 'settlement',
      targetId: payableId,
      metadata: { stripeTransferId: transfer.id, bookingId: claimed.bookingId },
    })
    const members = await prisma.businessMember.findMany({
      where: { businessId: claimed.businessId, role: { in: ['OWNER', 'MANAGER'] } },
      select: { userId: true },
    })
    await Promise.all(
      members.map(m =>
        createNotification({
          userId: m.userId,
          type: 'SETTLEMENT_TRANSFERRED',
          title: `Settlement transferred · ${claimed.booking.bookingReference}`,
          body: 'Delve transferred the business share to your Stripe connected account. This is not a bank payout confirmation.',
          entityType: 'settlement',
          entityId: payableId,
        }),
      ),
    )
    return toPayableDto(updated as PayableGraph, { includeAttempts: true })
  } catch (err) {
    const classified = classifyTransferError(err)
    const hold = await bookingHasFinancialHold(claimed.bookingId)
    const nextStatus = hold ? 'BLOCKED' : classified.retryable ? 'ELIGIBLE' : 'BLOCKED'
    await prisma.businessPayable.update({
      where: { id: payableId },
      data: {
        status: nextStatus,
        eligibilityCode: hold ? 'REFUND_IN_PROGRESS' : classified.code,
        lastFailureCode: classified.code,
        lastFailureMessage: classified.message.slice(0, 500),
        blockedAt: nextStatus === 'BLOCKED' ? new Date() : undefined,
      },
    })
    await prisma.settlementAttempt.create({
      data: {
        payableId,
        outcome: 'FAILED',
        failureCode: classified.code,
        failureMessage: classified.message.slice(0, 500),
        actorUserId: adminUserId,
      },
    })
    await writeAdminAudit({
      action: 'SETTLEMENT_FAILED',
      outcome: 'failure',
      actorUserId: adminUserId,
      targetType: 'settlement',
      targetId: payableId,
      reason: classified.message.slice(0, 300),
      metadata: { code: classified.code },
    })
    throw new AppError(
      classified.retryable ? 502 : 400,
      classified.code,
      classified.message,
    )
  }
}

export async function adminListSettlements(status?: string): Promise<BusinessPayableDto[]> {
  const where = status && status !== 'all' ? { status: status as BusinessPayableStatus } : {}
  const rows = await prisma.businessPayable.findMany({
    where,
    include: { ...payableInclude, transferReversal: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const holds = await bookingIdsWithFinancialHold(rows.map(r => r.bookingId))
  return rows.map(row =>
    toPayableDto({
      ...(row as PayableGraph),
      hasActiveCancellationOrRefund: holds.has(row.bookingId),
      reversal: row.transferReversal,
    }),
  )
}

export async function adminGetSettlement(payableId: string): Promise<BusinessPayableDto> {
  const row = await prisma.businessPayable.findUnique({
    where: { id: payableId },
    include: { ...payableInclude, attempts: { orderBy: { createdAt: 'desc' }, take: 20 }, transferReversal: true },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Settlement not found.')
  const hold = await bookingHasFinancialHold(row.bookingId)
  return toPayableDto(
    {
      ...(row as PayableGraph),
      hasActiveCancellationOrRefund: hold,
      reversal: row.transferReversal,
    },
    { includeAttempts: true },
  )
}

export async function listProviderEarnings(userId: string, businessId: string): Promise<ProviderEarningsDto> {
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER', 'CONTENT_EDITOR'])
  const rows = await prisma.businessPayable.findMany({
    where: { businessId },
    include: { ...payableInclude, transferReversal: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const totals = { pending: new Decimal(0), eligible: new Decimal(0), transferred: new Decimal(0) }
  let currency: string | null = rows[0]?.currency ?? null
  for (const row of rows) {
    const net = new Decimal(row.businessNetAmount.toString())
    if (row.status === 'TRANSFERRED') totals.transferred = totals.transferred.plus(net)
    else if (row.status === 'ELIGIBLE' || row.status === 'PROCESSING') totals.eligible = totals.eligible.plus(net)
    else if (row.status === 'PENDING' || row.status === 'BLOCKED') totals.pending = totals.pending.plus(net)
  }
  const holds = await bookingIdsWithFinancialHold(rows.map(r => r.bookingId))
  return {
    summary: {
      pending: totals.pending.toFixed(MONEY),
      eligible: totals.eligible.toFixed(MONEY),
      transferred: totals.transferred.toFixed(MONEY),
      currency,
    },
    rows: rows.map(row => {
      const el = eligibilityOf({
        ...(row as PayableGraph),
        hasActiveCancellationOrRefund: holds.has(row.bookingId),
      })
      const reversed = row.transferReversal?.status === 'SUCCEEDED' || row.status === 'REVERSED'
      return {
        id: row.id,
        listingTitle: row.booking.listingTitleSnapshot,
        bookingReference: row.booking.bookingReference,
        grossAmount: moneyRequired(row.grossAmount),
        platformCommissionAmount: moneyRequired(row.platformCommissionAmount),
        businessNetAmount: moneyRequired(row.businessNetAmount),
        currency: row.currency,
        status: row.status,
        providerLabel: reversed ? 'Settlement reversed' : providerSettlementLabel(row.status, el.code),
        originallyTransferred: row.stripeTransferId ? moneyRequired(row.businessNetAmount) : null,
        reversedAmount: reversed ? moneyRequired(row.transferReversal?.amount ?? row.businessNetAmount) : null,
        reversalStatus: row.transferReversal?.status ?? (row.status === 'REVERSED' ? 'SUCCEEDED' : null),
        createdAt: row.createdAt.toISOString(),
      }
    }),
  }
}
