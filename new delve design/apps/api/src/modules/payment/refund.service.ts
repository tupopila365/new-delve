import Stripe from 'stripe'
import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type {
  CancellationRequestDto,
  CreateCancellationRequestBody,
  RefundActorType,
  RefundDto,
  RefundReason,
  RefundStatus,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { requireBusinessMembership } from '../business/business.service.js'
import { assertBookingTransition } from '../booking/booking-lifecycle.js'
import { createNotification } from '../notifications/notify.js'
import { requireStripe } from './stripe-client.js'
import { toStripeAmount } from './stripe-amount.js'
import { persistPayableEligibility } from './settlement.service.js'
import { lockPaymentThenPayable, lockRefundRow, lockTransferReversalRow } from './financial-locks.js'

export function canApplyStripeRefundEvent(current: RefundStatus, stripeStatus: string): boolean {
  if (current === 'SUCCEEDED') return false
  if ((current === 'FAILED' || current === 'CANCELLED') && (stripeStatus === 'pending' || stripeStatus === 'requires_action')) {
    return false
  }
  return true
}

const MONEY = 2
const OPEN_CANCEL = ['PENDING', 'APPROVED'] as const

function moneyRequired(value: { toString(): string } | string | number) {
  return new Decimal(value.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP).toFixed(MONEY)
}

export function remainingRefundableFromTotals(
  paymentAmount: Decimal | string | { toString(): string },
  succeededRefundTotal: Decimal | string | { toString(): string } | null,
) {
  const paid = new Decimal(paymentAmount.toString())
  const used = new Decimal(succeededRefundTotal?.toString() ?? '0')
  return paid.minus(used).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP)
}

export async function remainingRefundableAmount(
  paymentId: string,
  db: typeof prisma = prisma,
) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found.')
  const succeeded = await db.refund.aggregate({
    where: { paymentId, status: 'SUCCEEDED' },
    _sum: { amount: true },
  })
  const paid = new Decimal(payment.amount.toString())
  const used = succeeded._sum.amount
  return remainingRefundableFromTotals(paid, used)
}

function travelerRefundMessage(status: RefundStatus | null, cancelStatus: string | null, amount?: string, currency?: string) {
  if (status === 'SUCCEEDED' && amount && currency) return `Refunded ${currency} ${amount}`
  if (status === 'PROCESSING' || status === 'PENDING') return 'Refund processing'
  if (status === 'FAILED') return 'Refund failed / needs attention'
  if (cancelStatus === 'PENDING') return 'Cancellation requested. Your booking is still being reviewed.'
  if (cancelStatus === 'APPROVED') return 'Cancellation approved. Refund has not been confirmed yet.'
  if (cancelStatus === 'REJECTED') return 'Cancellation request was not approved.'
  return null
}

export function toCancellationDto(row: {
  id: string
  bookingId: string
  status: CancellationRequestDto['status']
  reason: RefundReason
  note: string | null
  requestedByType: RefundActorType
  createdAt: Date
  reviewedAt: Date | null
}): CancellationRequestDto {
  return {
    id: row.id,
    bookingId: row.bookingId,
    status: row.status,
    reason: row.reason,
    note: row.note,
    requestedByType: row.requestedByType,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  }
}

export async function bookingFinancialSummary(bookingId: string) {
  const [cancel, refund, succeeded] = await Promise.all([
    prisma.bookingCancellationRequest.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.refund.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.refund.aggregate({
      where: { bookingId, status: 'SUCCEEDED' },
      _sum: { amount: true },
    }),
  ])
  const refundedAmount = new Decimal(succeeded._sum.amount?.toString() ?? '0').toFixed(MONEY)
  return {
    cancellation: cancel ? toCancellationDto(cancel) : null,
    refund: refund
      ? { status: refund.status, amount: moneyRequired(refund.amount), currency: refund.currency }
      : null,
    refundedAmount,
    travelerMessage: travelerRefundMessage(
      refund?.status ?? null,
      cancel?.status ?? null,
      refund ? moneyRequired(refund.amount) : undefined,
      refund?.currency,
    ),
  }
}

async function blockPayableForRefund(bookingId: string, actorUserId: string | null) {
  const payable = await prisma.businessPayable.findUnique({ where: { bookingId } })
  if (!payable) return
  if (payable.status === 'TRANSFERRED' || payable.status === 'PROCESSING') return
  await prisma.businessPayable.update({
    where: { id: payable.id },
    data: {
      status: 'BLOCKED',
      blockedAt: new Date(),
      eligibilityCode: 'REFUND_IN_PROGRESS',
    },
  })
  await writeAdminAudit({
    action: 'PAYABLE_CANCELLED_FOR_REFUND',
    outcome: 'success',
    actorUserId,
    targetType: 'settlement',
    targetId: payable.id,
    metadata: { bookingId, phase: 'blocked' },
  })
}

async function notifyProviders(businessId: string, type: 'BOOKING_CANCELLATION_REQUESTED' | 'REFUND_SUCCEEDED' | 'REFUND_FAILED', title: string, body: string, entityId: string) {
  const members = await prisma.businessMember.findMany({
    where: { businessId, role: { in: ['OWNER', 'MANAGER'] } },
    select: { userId: true },
  })
  await Promise.all(
    members.map(m =>
      createNotification({ userId: m.userId, type, title, body, entityType: 'booking', entityId }),
    ),
  )
}

export async function requestBookingCancellation(
  userId: string,
  bookingId: string,
  actorType: RefundActorType,
  body: CreateCancellationRequestBody,
  businessId?: string,
) {
  if (actorType === 'PROVIDER') {
    if (!businessId) throw new AppError(400, 'VALIDATION_ERROR', 'Business is required.')
    await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER'])
  }
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  if (actorType === 'TRAVELER' && booking.userId !== userId) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  if (actorType === 'PROVIDER' && booking.businessId !== businessId) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
    throw new AppError(400, 'BOOKING_NOT_CANCELLABLE', 'This booking cannot be cancelled.')
  }

  const paid = await prisma.payment.findFirst({ where: { bookingId, status: 'PAID' } })
  if (!paid) {
    throw new AppError(400, 'BOOKING_NOT_PAID', 'Unpaid bookings cancel directly without a refund request.')
  }

  const open = await prisma.bookingCancellationRequest.findFirst({
    where: { bookingId, status: { in: [...OPEN_CANCEL] } },
  })
  if (open) {
    throw new AppError(409, 'CANCELLATION_ALREADY_OPEN', 'A cancellation request is already under review.')
  }

  const reason: RefundReason =
    actorType === 'TRAVELER'
      ? 'TRAVELER_CANCELLATION'
      : body.reason === 'SERVICE_UNAVAILABLE'
        ? 'SERVICE_UNAVAILABLE'
        : 'PROVIDER_CANCELLATION'

  const created = await prisma.bookingCancellationRequest.create({
    data: {
      bookingId,
      requestedByUserId: userId,
      requestedByType: actorType,
      reason,
      note: body.note ?? null,
      status: 'PENDING',
    },
  })
  await blockPayableForRefund(bookingId, userId)
  const payable = await prisma.businessPayable.findUnique({ where: { bookingId } })
  if (payable) await persistPayableEligibility(payable.id)
  await writeAdminAudit({
    action: 'CANCELLATION_REQUESTED',
    outcome: 'success',
    actorUserId: userId,
    targetType: 'booking',
    targetId: bookingId,
    metadata: { cancellationRequestId: created.id, paymentId: paid.id, businessId: booking.businessId },
  })
  await createNotification({
    userId: booking.userId,
    type: 'BOOKING_CANCELLATION_REQUESTED',
    title: `Cancellation requested · ${booking.bookingReference}`,
    body: 'Your booking is still being reviewed. A refund is not confirmed yet.',
    entityType: 'booking',
    entityId: bookingId,
  })
  await notifyProviders(
    booking.businessId,
    'BOOKING_CANCELLATION_REQUESTED',
    `Cancellation requested · ${booking.bookingReference}`,
    'A paid booking cancellation is under review. Settlement will not be released while this is open.',
    bookingId,
  )
  return toCancellationDto(created)
}

export async function approveCancellation(adminUserId: string, requestId: string) {
  const request = await prisma.bookingCancellationRequest.findUnique({ where: { id: requestId } })
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Cancellation request not found.')
  if (request.status !== 'PENDING') throw new AppError(400, 'INVALID_CANCELLATION_STATE', 'This request cannot be approved.')
  const payment = await prisma.payment.findFirst({ where: { bookingId: request.bookingId, status: 'PAID' } })
  if (!payment) throw new AppError(400, 'PAYMENT_NOT_PAID', 'No PAID payment for this booking.')
  const remaining = await remainingRefundableAmount(payment.id)
  if (remaining.lte(0)) throw new AppError(400, 'NOTHING_TO_REFUND', 'There is no remaining refundable amount.')

  const updated = await prisma.bookingCancellationRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED', reviewedAt: new Date(), reviewedByUserId: adminUserId },
  })
  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      bookingId: request.bookingId,
      userId: payment.userId,
      businessId: payment.businessId,
      cancellationRequestId: request.id,
      status: 'PENDING',
      amount: remaining,
      currency: payment.currency,
      reason: request.reason,
      requestedByType: request.requestedByType,
      requestedByUserId: request.requestedByUserId,
      idempotencyKey: `refund-request:${request.id}`,
    },
  })
  await blockPayableForRefund(request.bookingId, adminUserId)
  await writeAdminAudit({
    action: 'CANCELLATION_APPROVED',
    outcome: 'success',
    actorUserId: adminUserId,
    targetType: 'booking',
    targetId: request.bookingId,
    metadata: { cancellationRequestId: request.id, refundId: refund.id, paymentId: payment.id, businessId: payment.businessId },
  })
  await writeAdminAudit({
    action: 'REFUND_CREATED',
    outcome: 'success',
    actorUserId: adminUserId,
    targetType: 'refund',
    targetId: refund.id,
    metadata: { paymentId: payment.id, bookingId: request.bookingId, businessId: payment.businessId },
  })
  return { cancellation: toCancellationDto(updated), refund: await adminGetRefund(refund.id) }
}

export async function rejectCancellation(adminUserId: string, requestId: string, note?: string | null) {
  const request = await prisma.bookingCancellationRequest.findUnique({ where: { id: requestId } })
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Cancellation request not found.')
  if (request.status !== 'PENDING') throw new AppError(400, 'INVALID_CANCELLATION_STATE', 'This request cannot be rejected.')
  const updated = await prisma.bookingCancellationRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewedAt: new Date(),
      reviewedByUserId: adminUserId,
      note: note ?? request.note,
    },
  })
  const payable = await prisma.businessPayable.findUnique({ where: { bookingId: request.bookingId } })
  if (payable) await persistPayableEligibility(payable.id)
  await writeAdminAudit({
    action: 'CANCELLATION_REJECTED',
    outcome: 'success',
    actorUserId: adminUserId,
    targetType: 'booking',
    targetId: request.bookingId,
    metadata: { cancellationRequestId: request.id },
  })
  return toCancellationDto(updated)
}

const refundInclude = {
  booking: { select: { bookingReference: true, status: true, listingTitleSnapshot: true, startDateTime: true } },
  payment: { select: { status: true, amount: true, paidAt: true } },
  business: { select: { name: true, slug: true } },
  user: { select: { username: true, travelerProfile: { select: { displayName: true } } } },
  cancellationRequest: true,
} as const

export async function adminGetRefund(refundId: string): Promise<RefundDto> {
  const row = await prisma.refund.findUnique({
    where: { id: refundId },
    include: refundInclude,
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Refund not found.')
  const payable = await prisma.businessPayable.findUnique({ where: { bookingId: row.bookingId } })
  const reversal = payable
    ? await prisma.transferReversal.findUnique({ where: { businessPayableId: payable.id } })
    : null
  const requiresSettlementReversal = Boolean(
    payable &&
      payable.stripeTransferId &&
      payable.status !== 'REVERSED' &&
      reversal?.status !== 'SUCCEEDED' &&
      row.status !== 'SUCCEEDED',
  )
  return {
    id: row.id,
    paymentId: row.paymentId,
    bookingId: row.bookingId,
    businessId: row.businessId,
    status: row.status,
    amount: moneyRequired(row.amount),
    currency: row.currency,
    reason: row.reason,
    explanation: row.explanation,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    createdAt: row.createdAt.toISOString(),
    processingAt: row.processingAt?.toISOString() ?? null,
    succeededAt: row.succeededAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    booking: {
      bookingReference: row.booking.bookingReference,
      status: row.booking.status,
      listingTitle: row.booking.listingTitleSnapshot,
      startDateTime: row.booking.startDateTime?.toISOString() ?? null,
    },
    payment: {
      status: row.payment.status,
      amount: moneyRequired(row.payment.amount),
      paidAt: row.payment.paidAt?.toISOString() ?? null,
    },
    business: { name: row.business.name, slug: row.business.slug },
    traveler: { displayName: row.user.travelerProfile?.displayName || row.user.username },
    payable: payable
      ? {
          status: payable.status,
          stripeTransferIdPresent: Boolean(payable.stripeTransferId),
          grossAmount: moneyRequired(payable.grossAmount),
          platformCommissionAmount: moneyRequired(payable.platformCommissionAmount),
          businessNetAmount: moneyRequired(payable.businessNetAmount),
          transferredAt: payable.transferredAt?.toISOString() ?? null,
        }
      : null,
    reversal: reversal
      ? {
          id: reversal.id,
          businessPayableId: reversal.businessPayableId,
          paymentId: reversal.paymentId,
          bookingId: reversal.bookingId,
          refundId: reversal.refundId,
          status: reversal.status,
          amount: moneyRequired(reversal.amount),
          currency: reversal.currency,
          reason: reversal.reason,
          stripeTransferIdPresent: Boolean(reversal.stripeTransferId),
          stripeTransferReversalIdPresent: Boolean(reversal.stripeTransferReversalId),
          failureCode: reversal.failureCode,
          failureMessage: reversal.failureMessage,
          createdAt: reversal.createdAt.toISOString(),
          processingAt: reversal.processingAt?.toISOString() ?? null,
          succeededAt: reversal.succeededAt?.toISOString() ?? null,
          failedAt: reversal.failedAt?.toISOString() ?? null,
        }
      : null,
    requiresSettlementReversal,
    cancellationRequest: row.cancellationRequest ? toCancellationDto(row.cancellationRequest) : null,
  }
}

export async function adminListRefunds(status?: string): Promise<RefundDto[]> {
  const where = status && status !== 'all' ? { status: status as RefundStatus } : {}
  const rows = await prisma.refund.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true },
  })
  return Promise.all(rows.map(r => adminGetRefund(r.id)))
}

export async function adminListCancellationRequests(status?: string) {
  const where = status && status !== 'all' ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' } : {}
  const rows = await prisma.bookingCancellationRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return rows.map(toCancellationDto)
}

function classifyRefundError(err: unknown): { retryable: boolean; code: string; message: string } {
  if (err instanceof Stripe.errors.StripeConnectionError) {
    return { retryable: true, code: 'STRIPE_UNAVAILABLE', message: 'Stripe was temporarily unavailable.' }
  }
  if (err instanceof Stripe.errors.StripeAPIError && err.statusCode && err.statusCode >= 500) {
    return { retryable: true, code: 'STRIPE_UNAVAILABLE', message: 'Stripe was temporarily unavailable.' }
  }
  if (err instanceof Stripe.errors.StripeRateLimitError) {
    return { retryable: true, code: 'STRIPE_RATE_LIMITED', message: 'Stripe rate limit. Retry later.' }
  }
  const code = err instanceof Stripe.errors.StripeError ? err.code || err.type : 'REFUND_FAILED'
  const message = err instanceof Error ? err.message : 'Stripe refund failed.'
  return { retryable: false, code: String(code), message }
}

export async function applyRefundStripeStatus(
  env: Env,
  refundId: string,
  stripeStatus: string,
  stripeRefundId?: string | null,
  failure?: { code?: string | null; message?: string | null },
) {
  const refund = await prisma.refund.findUnique({ where: { id: refundId } })
  if (!refund) return
  if (!canApplyStripeRefundEvent(refund.status, stripeStatus)) return
  if (stripeStatus === 'succeeded' || stripeStatus === 'SUCCEEDED') {
    await finalizeSuccessfulRefund(env, refund.id, stripeRefundId ?? refund.stripeRefundId)
    return
  }
  if (stripeStatus === 'pending' || stripeStatus === 'requires_action') {
    if (refund.status === 'FAILED' || refund.status === 'CANCELLED') return
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: 'PROCESSING',
        processingAt: refund.processingAt ?? new Date(),
        ...(stripeRefundId ? { stripeRefundId } : {}),
      },
    })
    return
  }
  if (stripeStatus === 'failed' || stripeStatus === 'canceled') {
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: stripeStatus === 'canceled' ? 'CANCELLED' : 'FAILED',
        failedAt: new Date(),
        failureCode: failure?.code ?? 'refund_failed',
        failureMessage: failure?.message ?? 'Refund failed',
        ...(stripeRefundId ? { stripeRefundId } : {}),
      },
    })
  }
}

async function finalizeSuccessfulRefund(_env: Env, refundId: string, stripeRefundId: string | null) {
  const refund = await prisma.refund.findUnique({ where: { id: refundId } })
  if (!refund || refund.status === 'SUCCEEDED') return
  const booking = await prisma.booking.findUnique({ where: { id: refund.bookingId } })
  if (!booking) return
  const now = new Date()
  const cancelledCount = await prisma.$transaction(async tx => {
    await tx.refund.update({
      where: { id: refund.id },
      data: {
        status: 'SUCCEEDED',
        succeededAt: now,
        stripeRefundId,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
      },
    })
    if (booking.status !== 'CANCELLED') {
      assertBookingTransition(booking.status, 'CANCELLED')
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', cancelledAt: booking.cancelledAt ?? now },
      })
    }
    if (refund.cancellationRequestId) {
      await tx.bookingCancellationRequest.update({
        where: { id: refund.cancellationRequestId },
        data: { status: 'COMPLETED' },
      })
    }
    const payables = await tx.businessPayable.updateMany({
      where: { bookingId: booking.id, status: { in: ['PENDING', 'ELIGIBLE', 'BLOCKED'] } },
      data: { status: 'CANCELLED', cancelledAt: now, eligibilityCode: 'CANCELLED' },
    })
    return payables.count
  })
  if (cancelledCount > 0) {
    await writeAdminAudit({
      action: 'PAYABLE_CANCELLED_FOR_REFUND',
      outcome: 'success',
      actorUserId: refund.requestedByUserId,
      targetType: 'settlement',
      targetId: refund.bookingId,
      metadata: { refundId: refund.id, paymentId: refund.paymentId, bookingId: refund.bookingId, businessId: refund.businessId },
    })
  }
  await writeAdminAudit({
    action: 'REFUND_SUCCEEDED',
    outcome: 'success',
    actorUserId: refund.requestedByUserId,
    targetType: 'refund',
    targetId: refund.id,
    metadata: { paymentId: refund.paymentId, bookingId: refund.bookingId, businessId: refund.businessId },
  })
  await createNotification({
    userId: refund.userId,
    type: 'REFUND_SUCCEEDED',
    title: `Refund issued · ${booking.bookingReference}`,
    body: `Your refund of ${refund.currency} ${moneyRequired(refund.amount)} for booking ${booking.bookingReference} has been issued. It may take time to appear on the original payment method.`,
    entityType: 'booking',
    entityId: booking.id,
  })
  await notifyProviders(
    refund.businessId,
    'REFUND_SUCCEEDED',
    `Booking ${booking.bookingReference} was cancelled`,
    'The traveler refund succeeded. Settlement for this booking is closed and will not be released.',
    booking.id,
  )
}

export async function issueRefund(env: Env, adminUserId: string, refundId: string): Promise<RefundDto> {
  const claimed = await prisma.$transaction(async tx => {
    const refundPeek = await tx.refund.findUnique({ where: { id: refundId } })
    if (!refundPeek) throw new AppError(404, 'NOT_FOUND', 'Refund not found.')
    await lockPaymentThenPayable(tx, refundPeek.paymentId)
    await lockRefundRow(tx, refundPeek.id)
    const refund = await tx.refund.findUnique({ where: { id: refundId } })
    if (!refund) throw new AppError(404, 'NOT_FOUND', 'Refund not found.')
    if (refund.status === 'SUCCEEDED') throw new AppError(409, 'ALREADY_REFUNDED', 'This refund already succeeded.')
    if (refund.status === 'PROCESSING') throw new AppError(409, 'REFUND_IN_PROGRESS', 'A Stripe refund is already in progress.')
    if (refund.status === 'CANCELLED') throw new AppError(400, 'REFUND_CANCELLED', 'This refund was cancelled.')

    const payable = await tx.businessPayable.findUnique({ where: { paymentId: refund.paymentId } })
    if (payable) {
      const reversal = await tx.transferReversal.findUnique({ where: { businessPayableId: payable.id } })
      if (reversal) await lockTransferReversalRow(tx, reversal.id)
      if (payable.status === 'PROCESSING') {
        throw new AppError(409, 'SETTLEMENT_IN_PROGRESS', 'Settlement is in progress. Refund cannot run at the same time.')
      }
      if (reversal?.status === 'PROCESSING') {
        throw new AppError(409, 'REVERSAL_IN_PROGRESS', 'Transfer reversal is in progress. Refund cannot run yet.')
      }
      const reversalOk = reversal?.status === 'SUCCEEDED' || payable.status === 'REVERSED'
      if ((payable.status === 'TRANSFERRED' || payable.stripeTransferId) && !reversalOk) {
        throw new AppError(
          409,
          'REFUND_REQUIRES_SETTLEMENT_REVERSAL',
          'Business settlement has already been transferred. Reverse the Stripe Transfer before refunding the traveler.',
        )
      }
    }

    const payment = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId } })
    if (payment.status !== 'PAID') throw new AppError(400, 'PAYMENT_NOT_PAID', 'Payment is not PAID.')
    if (!payment.stripePaymentIntentId && !payment.stripeChargeId) {
      throw new AppError(400, 'STRIPE_IDENTIFIER_MISSING', 'Payment has no Stripe charge or PaymentIntent id.')
    }
    const remaining = await remainingRefundableAmount(payment.id, tx as typeof prisma)
    const amount = new Decimal(refund.amount.toString())
    if (amount.lte(0) || amount.gt(remaining)) {
      throw new AppError(400, 'REFUND_AMOUNT_INVALID', 'Refund amount exceeds remaining refundable payment.')
    }
    if (refund.currency !== payment.currency) {
      throw new AppError(400, 'CURRENCY_MISMATCH', 'Refund currency must match the payment.')
    }

    await tx.refund.update({
      where: { id: refund.id },
      data: { status: 'PROCESSING', processingAt: new Date() },
    })
    return { refund, payment }
  })
  await writeAdminAudit({
    action: 'REFUND_PROCESSING',
    outcome: 'success',
    actorUserId: adminUserId,
    targetType: 'refund',
    targetId: claimed.refund.id,
    metadata: { paymentId: claimed.payment.id, bookingId: claimed.refund.bookingId, businessId: claimed.refund.businessId },
  })
  await createNotification({
    userId: claimed.refund.userId,
    type: 'REFUND_PROCESSING',
    title: 'Refund processing',
    body: 'Delve has submitted your refund. It is not confirmed until Stripe completes it.',
    entityType: 'booking',
    entityId: claimed.refund.bookingId,
  })

  const stripe = requireStripe(env)
  try {
    const params: Stripe.RefundCreateParams = {
      amount: toStripeAmount(claimed.refund.amount, claimed.refund.currency),
      metadata: {
        refundId: claimed.refund.id,
        paymentId: claimed.payment.id,
        bookingId: claimed.refund.bookingId,
        businessId: claimed.refund.businessId,
      },
    }
    if (claimed.payment.stripePaymentIntentId) params.payment_intent = claimed.payment.stripePaymentIntentId
    else if (claimed.payment.stripeChargeId) params.charge = claimed.payment.stripeChargeId
    const created = await stripe.refunds.create(params, { idempotencyKey: `refund:${claimed.refund.id}` })
    await prisma.refund.update({
      where: { id: claimed.refund.id },
      data: { stripeRefundId: created.id },
    })
    await applyRefundStripeStatus(env, claimed.refund.id, created.status || 'pending', created.id)
    return adminGetRefund(claimed.refund.id)
  } catch (err) {
    const classified = classifyRefundError(err)
    await prisma.refund.update({
      where: { id: claimed.refund.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureCode: classified.code,
        failureMessage: classified.message.slice(0, 500),
      },
    })
    await writeAdminAudit({
      action: 'REFUND_FAILED',
      outcome: 'failure',
      actorUserId: adminUserId,
      targetType: 'refund',
      targetId: claimed.refund.id,
      reason: classified.message.slice(0, 300),
      metadata: { paymentId: claimed.payment.id, bookingId: claimed.refund.bookingId, businessId: claimed.refund.businessId },
    })
    await createNotification({
      userId: claimed.refund.userId,
      type: 'REFUND_FAILED',
      title: 'Refund needs attention',
      body: 'The refund could not be completed yet. Your booking is not financially cancelled.',
      entityType: 'booking',
      entityId: claimed.refund.bookingId,
    })
    await notifyProviders(
      claimed.refund.businessId,
      'REFUND_FAILED',
      'Refund failed',
      'A traveler refund failed. Settlement remains blocked until Admin resolves it.',
      claimed.refund.bookingId,
    )
    throw new AppError(classified.retryable ? 502 : 400, classified.code, classified.message)
  }
}

export async function findRefundByStripeId(stripeRefundId: string) {
  return prisma.refund.findUnique({ where: { stripeRefundId } })
}
