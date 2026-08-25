import type Stripe from 'stripe'
import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type {
  PaymentDisputeDto,
  PaymentDisputeListItem,
  PaymentDisputeStatus,
  ProviderDisputeSummary,
  SubmitDisputeEvidenceBody,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { requireBusinessMembership } from '../business/business.service.js'
import { createNotification } from '../notifications/notify.js'
import { evaluateDisputeExposure, persistDisputeExposure } from './dispute-exposure.js'
import { canApplyDisputeStatus, isOpenDisputeStatus, mapStripeDisputeStatus } from './dispute-status.js'
import { lockPaymentDisputes, lockPaymentThenPayable } from './financial-locks.js'
import { persistPayableEligibility } from './settlement.service.js'
import { findPaymentByStripeRefs } from './payment.service.js'
import { fromStripeAmount } from './stripe-amount.js'
import { requireStripe } from './stripe-client.js'
import { reverseSettlementForLostDispute } from './transfer-reversal.service.js'
import { connectedAccountBalanceWarning } from './connect.service.js'
import { buildFinancialTimeline } from './financial-timeline.js'

export { paymentHasOpenDispute, bookingIdsWithOpenDispute } from './dispute-hold.js'

const MONEY = 2

function moneyRequired(value: { toString(): string } | string | number) {
  return new Decimal(value.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP).toFixed(MONEY)
}

function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

async function notifyProviders(
  businessId: string,
  type: 'PAYMENT_DISPUTE_OPENED' | 'PAYMENT_DISPUTE_WON' | 'PAYMENT_DISPUTE_LOST' | 'PAYMENT_DISPUTE_BLOCKED' | 'PAYMENT_DISPUTE_REVERSED',
  title: string,
  body: string,
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
        type,
        title,
        body,
        entityType: 'booking',
        entityId: bookingId,
      }),
    ),
  )
}

async function findPaymentForDispute(dispute: Stripe.Dispute) {
  return findPaymentByStripeRefs({
    paymentIntentId: stripeId(dispute.payment_intent),
    chargeId: stripeId(dispute.charge),
  })
}

async function applyPayableHold(paymentId: string, disputeStatus: PaymentDisputeStatus) {
  const payable = await prisma.businessPayable.findUnique({ where: { paymentId } })
  if (!payable) return payable
  if (payable.status === 'PROCESSING' || payable.status === 'TRANSFERRED' || payable.status === 'REVERSED') {
    return payable
  }
  // MVP: do not auto-reverse a TRANSFERRED payable when a dispute opens. A dispute can later be won.
  if (disputeStatus === 'LOST') {
    if (payable.status !== 'CANCELLED') {
      return prisma.businessPayable.update({
        where: { id: payable.id },
        data: {
          status: 'CANCELLED',
          eligibilityCode: 'DISPUTE_LOST',
          cancelledAt: payable.cancelledAt ?? new Date(),
        },
      })
    }
    return payable
  }
  if (isOpenDisputeStatus(disputeStatus) && payable.status !== 'CANCELLED') {
    return prisma.businessPayable.update({
      where: { id: payable.id },
      data: {
        status: 'BLOCKED',
        eligibilityCode: 'ACTIVE_DISPUTE',
        blockedAt: payable.blockedAt ?? new Date(),
      },
    })
  }
  return payable
}

async function refreshExposure(disputeId: string) {
  return persistDisputeExposure(disputeId)
}

export async function applyStripeDisputeEvent(event: Stripe.Event, dispute: Stripe.Dispute): Promise<void> {
  const eventCreated = typeof event.created === 'number' ? event.created : 0
  const payment = await findPaymentForDispute(dispute)
  if (!payment) {
    await prisma.unmatchedStripeFinancialEvent.upsert({
      where: { providerEventId: event.id },
      create: {
        providerEventId: event.id,
        eventType: event.type,
        stripeObjectId: dispute.id,
        chargeId: stripeId(dispute.charge),
        paymentIntentId: stripeId(dispute.payment_intent),
        note: 'Stripe dispute did not match a Delve Payment.',
      },
      update: {},
    })
    await writeAdminAudit({
      action: 'DISPUTE_UNMATCHED',
      outcome: 'failure',
      targetType: 'stripe_dispute',
      targetId: dispute.id,
      metadata: { eventType: event.type, chargeId: stripeId(dispute.charge), paymentIntentId: stripeId(dispute.payment_intent) },
    })
    return
  }

  const nextStatus = mapStripeDisputeStatus(dispute.status)
  const amount = fromStripeAmount(dispute.amount, dispute.currency).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP)
  const dueBy = dispute.evidence_details?.due_by
  const evidenceDueAt = dueBy ? new Date(dueBy * 1000) : null
  const now = new Date()

  const existing = await prisma.paymentDispute.findUnique({ where: { stripeDisputeId: dispute.id } })
  if (existing && !canApplyDisputeStatus(existing.status, nextStatus, existing.lastStripeEventCreated, eventCreated)) {
    return
  }

  const row = await prisma.$transaction(async tx => {
    await lockPaymentThenPayable(tx, payment.id)
    await lockPaymentDisputes(tx, payment.id)
    const prev = await tx.paymentDispute.findUnique({ where: { stripeDisputeId: dispute.id } })
    if (prev && !canApplyDisputeStatus(prev.status, nextStatus, prev.lastStripeEventCreated, eventCreated)) {
      return prev
    }
    const data = {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      businessId: payment.businessId,
      userId: payment.userId,
      stripeChargeId: stripeId(dispute.charge),
      stripePaymentIntentId: stripeId(dispute.payment_intent),
      status: nextStatus,
      stripeStatus: dispute.status,
      amount,
      currency: dispute.currency.toUpperCase(),
      reason: dispute.reason || 'unspecified',
      isChargeRefundable: dispute.is_charge_refundable ?? null,
      evidenceDueAt,
      lastStripeEventAt: now,
      lastStripeEventCreated: eventCreated,
      needsResponseAt: nextStatus === 'NEEDS_RESPONSE' ? prev?.needsResponseAt ?? now : prev?.needsResponseAt ?? null,
      submittedAt: nextStatus === 'UNDER_REVIEW' ? prev?.submittedAt ?? now : prev?.submittedAt ?? null,
      wonAt: nextStatus === 'WON' ? prev?.wonAt ?? now : prev?.wonAt ?? null,
      lostAt: nextStatus === 'LOST' ? prev?.lostAt ?? now : prev?.lostAt ?? null,
      closedAt: nextStatus === 'CLOSED' || nextStatus === 'WON' || nextStatus === 'LOST' ? prev?.closedAt ?? now : prev?.closedAt ?? null,
    }
    if (prev) {
      return tx.paymentDispute.update({ where: { id: prev.id }, data })
    }
    return tx.paymentDispute.create({
      data: { stripeDisputeId: dispute.id, ...data },
    })
  })

  const created = !existing
  await applyPayableHold(payment.id, row.status)
  if (row.status === 'WON') {
    const payable = await prisma.businessPayable.findUnique({ where: { paymentId: payment.id } })
    if (payable && payable.status === 'BLOCKED' && payable.eligibilityCode === 'ACTIVE_DISPUTE') {
      await persistPayableEligibility(payable.id)
    }
  }
  await refreshExposure(row.id)

  const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId }, select: { bookingReference: true } })
  const ref = booking?.bookingReference ?? payment.bookingId
  const amountLabel = `${row.currency} ${moneyRequired(row.amount)}`

  if (created) {
    await writeAdminAudit({
      action: 'DISPUTE_CREATED',
      outcome: 'success',
      targetType: 'payment_dispute',
      targetId: row.id,
      metadata: {
        disputeId: row.id,
        stripeDisputeId: row.stripeDisputeId,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        businessId: payment.businessId,
      },
    })
    const payable = await prisma.businessPayable.findUnique({ where: { paymentId: payment.id } })
    if (payable && payable.status !== 'TRANSFERRED' && payable.status !== 'PROCESSING') {
      await writeAdminAudit({
        action: 'DISPUTE_SETTLEMENT_BLOCKED',
        outcome: 'success',
        targetType: 'payment_dispute',
        targetId: row.id,
        metadata: { disputeId: row.id, businessPayableId: payable.id, paymentId: payment.id, bookingId: payment.bookingId, businessId: payment.businessId },
      })
      await notifyProviders(
        payment.businessId,
        'PAYMENT_DISPUTE_BLOCKED',
        `Settlement under financial review · ${ref}`,
        `A payment dispute is open for booking ${ref}. Amount ${amountLabel}. Settlement cannot be released while the dispute needs attention.`,
        payment.bookingId,
      )
    }
    await notifyProviders(
      payment.businessId,
      'PAYMENT_DISPUTE_OPENED',
      `Payment dispute under review · ${ref}`,
      `A cardholder dispute was opened for booking ${ref}. Amount ${amountLabel}. This is not an automatic refund.`,
      payment.bookingId,
    )
  } else {
    await writeAdminAudit({
      action: 'DISPUTE_UPDATED',
      outcome: 'success',
      targetType: 'payment_dispute',
      targetId: row.id,
      metadata: {
        disputeId: row.id,
        stripeDisputeId: row.stripeDisputeId,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        businessId: payment.businessId,
        status: row.status,
      },
    })
  }

  if (row.status === 'WON' && existing?.status !== 'WON') {
    await writeAdminAudit({
      action: 'DISPUTE_WON',
      outcome: 'success',
      targetType: 'payment_dispute',
      targetId: row.id,
      metadata: { disputeId: row.id, stripeDisputeId: row.stripeDisputeId, paymentId: payment.id, bookingId: payment.bookingId, businessId: payment.businessId },
    })
    await notifyProviders(
      payment.businessId,
      'PAYMENT_DISPUTE_WON',
      `Payment dispute closed in Delve’s favor · ${ref}`,
      `The dispute for booking ${ref} was won. If settlement was only held for this dispute, it can become eligible again. Admin release is still required.`,
      payment.bookingId,
    )
  }
  if (row.status === 'LOST' && existing?.status !== 'LOST') {
    const refreshed = await prisma.paymentDispute.findUniqueOrThrow({ where: { id: row.id } })
    await writeAdminAudit({
      action: 'DISPUTE_LOST',
      outcome: 'success',
      targetType: 'payment_dispute',
      targetId: row.id,
      metadata: {
        disputeId: row.id,
        stripeDisputeId: row.stripeDisputeId,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        businessId: payment.businessId,
        recoveryStatus: refreshed.recoveryStatus,
      },
    })
    if (refreshed.recoveryStatus === 'RECOVERY_REQUIRED') {
      await writeAdminAudit({
        action: 'DISPUTE_RECOVERY_REQUIRED',
        outcome: 'success',
        targetType: 'payment_dispute',
        targetId: row.id,
        metadata: { disputeId: row.id, stripeDisputeId: row.stripeDisputeId, paymentId: payment.id, bookingId: payment.bookingId, businessId: payment.businessId },
      })
    }
    await notifyProviders(
      payment.businessId,
      'PAYMENT_DISPUTE_LOST',
      `Payment dispute closed · ${ref}`,
      refreshed.recoveryStatus === 'RECOVERY_REQUIRED'
        ? `The dispute for booking ${ref} was lost. Business settlement was already transferred and may need recovery. No additional traveler refund is issued from this path.`
        : `The dispute for booking ${ref} was lost. Settlement cannot be released for this booking.`,
      payment.bookingId,
    )
  }
}

function evidenceStillOpen(dueAt: Date | null, status: PaymentDisputeStatus) {
  if (!isOpenDisputeStatus(status) && status !== 'NEEDS_RESPONSE') return false
  if (!dueAt) return status === 'NEEDS_RESPONSE' || status === 'WARNING'
  return dueAt.getTime() >= Date.now()
}

async function toListItem(row: {
  id: string
  paymentId: string
  bookingId: string
  businessId: string
  amount: { toString(): string }
  currency: string
  reason: string
  status: PaymentDisputeStatus
  stripeStatus: string
  evidenceDueAt: Date | null
  exposureCode: string | null
  recoveryStatus: PaymentDisputeDto['recoveryStatus']
  createdAt: Date
  booking: { bookingReference: string; user: { username: string } }
  business: { name: string }
  payment: { paidAt: Date | null }
}): Promise<PaymentDisputeListItem> {
  const payable = await prisma.businessPayable.findUnique({
    where: { paymentId: row.paymentId },
    include: { transferReversal: true },
  })
  const refunds = await prisma.refund.findMany({ where: { paymentId: row.paymentId } })
  const exposure = evaluateDisputeExposure({
    payableStatus: payable?.status ?? null,
    stripeTransferId: payable?.stripeTransferId ?? null,
    payableProcessing: payable?.status === 'PROCESSING',
    reversalSucceeded: payable?.transferReversal?.status === 'SUCCEEDED' || payable?.status === 'REVERSED',
    fullRefundSucceeded: refunds.some(r => r.status === 'SUCCEEDED'),
    disputeStatus: row.status,
  })
  return {
    id: row.id,
    paymentId: row.paymentId,
    bookingId: row.bookingId,
    businessId: row.businessId,
    bookingReference: row.booking.bookingReference,
    travelerUsername: row.booking.user.username,
    businessName: row.business.name,
    amount: moneyRequired(row.amount),
    currency: row.currency,
    reason: row.reason,
    status: row.status,
    stripeStatus: row.stripeStatus,
    evidenceDueAt: row.evidenceDueAt?.toISOString() ?? null,
    paymentPaidAt: row.payment.paidAt?.toISOString() ?? null,
    exposureCode: row.exposureCode ?? exposure.code,
    recoveryStatus: row.recoveryStatus,
    settlementLabel: exposure.settlementLabel,
    createdAt: row.createdAt.toISOString(),
  }
}

const disputeInclude = {
  booking: { include: { user: { select: { username: true } } } },
  business: { select: { name: true } },
  payment: true,
} as const

export async function adminListDisputes(status?: string): Promise<PaymentDisputeListItem[]> {
  const where =
    status && status !== 'ALL' && status !== 'CLOSED'
      ? { status: status as PaymentDisputeStatus }
      : status === 'CLOSED'
        ? { status: { in: ['CLOSED', 'WON', 'LOST'] as PaymentDisputeStatus[] } }
        : {}
  const rows = await prisma.paymentDispute.findMany({
    where,
    include: disputeInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return Promise.all(rows.map(row => toListItem(row)))
}

export async function adminGetDispute(id: string): Promise<PaymentDisputeDto> {
  const row = await prisma.paymentDispute.findUnique({
    where: { id },
    include: {
      booking: { include: { user: { select: { username: true } } } },
      business: { select: { name: true } },
      payment: true,
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Dispute not found.')
  const payable = await prisma.businessPayable.findUnique({
    where: { paymentId: row.paymentId },
    include: { transferReversal: true },
  })
  const refunds = await prisma.refund.findMany({ where: { paymentId: row.paymentId }, orderBy: { createdAt: 'asc' } })
  const summary = await toListItem(row)
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: row.bookingId } })
  const exposure = evaluateDisputeExposure({
    payableStatus: payable?.status ?? null,
    stripeTransferId: payable?.stripeTransferId ?? null,
    payableProcessing: payable?.status === 'PROCESSING',
    reversalSucceeded: payable?.transferReversal?.status === 'SUCCEEDED' || payable?.status === 'REVERSED',
    fullRefundSucceeded: refunds.some(r => r.status === 'SUCCEEDED'),
    disputeStatus: row.status,
  })
  const recoveries = await prisma.financialRecoveryCase.findMany({ where: { bookingId: row.bookingId } })
  const timeline = buildFinancialTimeline({
    booking,
    payment: row.payment,
    payable,
    refunds,
    reversal: payable?.transferReversal ?? null,
    disputes: [row],
    recoveries,
  })

  return {
    ...summary,
    listingTitle: booking.listingTitleSnapshot,
    bookingStatus: booking.status,
    paymentStatus: row.payment.status,
    paymentAmount: moneyRequired(row.payment.amount),
    payableStatus: payable?.status ?? null,
    payableNetAmount: payable ? moneyRequired(payable.businessNetAmount) : null,
    stripeTransferIdPresent: Boolean(payable?.stripeTransferId),
    refundStatuses: refunds.map(r => r.status),
    reversalStatus: payable?.transferReversal?.status ?? null,
    providerEvidenceNote: row.providerEvidenceNote,
    providerEvidenceAt: row.providerEvidenceAt?.toISOString() ?? null,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    wonAt: row.wonAt?.toISOString() ?? null,
    lostAt: row.lostAt?.toISOString() ?? null,
    evidenceAccepting: evidenceStillOpen(row.evidenceDueAt, row.status),
    derivedEvidence: {
      bookingReference: booking.bookingReference,
      listingTitle: booking.listingTitleSnapshot,
      businessName: row.business.name,
      bookingStatus: booking.status,
      paymentAmount: moneyRequired(row.payment.amount),
      currency: row.payment.currency,
      bookingCreatedAt: booking.createdAt.toISOString(),
      confirmedAt: booking.confirmedAt?.toISOString() ?? null,
      completedAt: booking.completedAt?.toISOString() ?? null,
      dealTitle: booking.dealTitleSnapshot,
    },
    timeline,
    settlementLabel: exposure.settlementLabel,
    exposureCode: exposure.code,
  }
}

export async function adminSubmitEvidence(env: Env, adminUserId: string, disputeId: string, body: SubmitDisputeEvidenceBody) {
  const row = await prisma.paymentDispute.findUnique({ where: { id: disputeId } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Dispute not found.')
  if (!evidenceStillOpen(row.evidenceDueAt, row.status)) {
    throw new AppError(400, 'EVIDENCE_DEADLINE_PASSED', 'Stripe is no longer accepting evidence for this dispute.')
  }
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: row.bookingId } })
  const business = await prisma.business.findUniqueOrThrow({ where: { id: row.businessId } })
  const evidence: Stripe.DisputeUpdateParams.Evidence = {}
  const extraText: string[] = []
  if (body.includeDerivedFacts !== false) {
    evidence.product_description = `${booking.listingTitleSnapshot} · ${business.name} · ${booking.bookingReference}`
    if (booking.startDateTime) evidence.service_date = booking.startDateTime.toISOString().slice(0, 10)
  }
  if (body.productDescription) evidence.product_description = body.productDescription
  if (body.serviceDate) evidence.service_date = body.serviceDate
  if (body.cancellationPolicy) evidence.cancellation_policy_disclosure = body.cancellationPolicy
  if (body.refundPolicy) evidence.refund_policy_disclosure = body.refundPolicy
  if (body.uncategorizedText) extraText.push(body.uncategorizedText)
  if (body.customerCommunication) extraText.push(body.customerCommunication)
  if (row.providerEvidenceNote) extraText.push(`Provider note: ${row.providerEvidenceNote}`)
  if (extraText.length) evidence.uncategorized_text = extraText.join('\n\n').slice(0, 20000)

  const stripe = requireStripe(env)
  await stripe.disputes.update(row.stripeDisputeId, { evidence, submit: true })
  const updated = await prisma.paymentDispute.update({
    where: { id: row.id },
    data: { submittedAt: new Date(), status: row.status === 'NEEDS_RESPONSE' ? 'UNDER_REVIEW' : row.status },
  })
  await writeAdminAudit({
    action: 'DISPUTE_EVIDENCE_SUBMITTED',
    outcome: 'success',
    actorUserId: adminUserId,
    targetType: 'payment_dispute',
    targetId: row.id,
    metadata: {
      disputeId: row.id,
      stripeDisputeId: row.stripeDisputeId,
      paymentId: row.paymentId,
      bookingId: row.bookingId,
      businessId: row.businessId,
    },
  })
  return adminGetDispute(updated.id)
}

export async function adminRecoverLostDispute(env: Env, adminUserId: string, disputeId: string) {
  const row = await prisma.paymentDispute.findUnique({ where: { id: disputeId } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Dispute not found.')
  if (row.status !== 'LOST') throw new AppError(400, 'DISPUTE_NOT_LOST', 'Recovery is only for lost disputes.')
  const refreshed = await refreshExposure(row.id)
  if (refreshed.recoveryStatus === 'RECOVERED') return adminGetDispute(row.id)
  if (refreshed.recoveryStatus === 'MANUAL_REVIEW' && refreshed.exposureCode === 'REFUNDED_ALREADY') {
    throw new AppError(409, 'REFUND_ALREADY_EXISTS', 'This payment already has a succeeded refund. No additional money movement.')
  }
  if (refreshed.recoveryStatus !== 'RECOVERY_REQUIRED' && refreshed.recoveryStatus !== 'RECOVERY_FAILED') {
    throw new AppError(400, 'RECOVERY_NOT_REQUIRED', 'This dispute does not require settlement recovery.')
  }
  const payable = await prisma.businessPayable.findUnique({
    where: { paymentId: row.paymentId },
    include: { business: { select: { stripeAccountId: true } } },
  })
  const warning =
    payable?.business.stripeAccountId
      ? await connectedAccountBalanceWarning(
          env,
          payable.business.stripeAccountId,
          payable.currency,
          payable.businessNetAmount,
        )
      : null
  await prisma.paymentDispute.update({
    where: { id: row.id },
    data: { recoveryStatus: 'RECOVERY_PENDING' },
  })
  try {
    await reverseSettlementForLostDispute(env, adminUserId, row.paymentId, row.id)
    await prisma.paymentDispute.update({ where: { id: row.id }, data: { recoveryStatus: 'RECOVERED' } })
    await writeAdminAudit({
      action: 'DISPUTE_RECOVERY_SUCCEEDED',
      outcome: 'success',
      actorUserId: adminUserId,
      targetType: 'payment_dispute',
      targetId: row.id,
      metadata: {
        disputeId: row.id,
        stripeDisputeId: row.stripeDisputeId,
        paymentId: row.paymentId,
        bookingId: row.bookingId,
        businessId: row.businessId,
      },
    })
    const booking = await prisma.booking.findUnique({ where: { id: row.bookingId }, select: { bookingReference: true } })
    await notifyProviders(
      row.businessId,
      'PAYMENT_DISPUTE_REVERSED',
      `Settlement reversed · ${booking?.bookingReference ?? row.bookingId}`,
      'Business settlement was reversed after a lost payment dispute. This is a Stripe Transfer reversal, not a bank payout reversal.',
      row.bookingId,
    )
  } catch (err) {
    await prisma.paymentDispute.update({ where: { id: row.id }, data: { recoveryStatus: 'RECOVERY_FAILED' } })
    await writeAdminAudit({
      action: 'DISPUTE_RECOVERY_FAILED',
      outcome: 'failure',
      actorUserId: adminUserId,
      targetType: 'payment_dispute',
      targetId: row.id,
      reason: err instanceof Error ? err.message.slice(0, 300) : 'Recovery failed',
      metadata: {
        disputeId: row.id,
        stripeDisputeId: row.stripeDisputeId,
        paymentId: row.paymentId,
        bookingId: row.bookingId,
        businessId: row.businessId,
      },
    })
    throw err
  }
  return { ...(await adminGetDispute(row.id)), balanceWarning: warning }
}

export async function listBusinessDisputes(userId: string, businessId: string): Promise<ProviderDisputeSummary[]> {
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER', 'CONTENT_EDITOR'])
  const rows = await prisma.paymentDispute.findMany({
    where: { businessId },
    include: { booking: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const items = await Promise.all(rows.map(async row => {
    const list = await toListItem({
      ...row,
      booking: { bookingReference: row.booking.bookingReference, user: { username: '' } },
      business: { name: '' },
      payment: { paidAt: null },
    })
    return {
      id: row.id,
      bookingReference: row.booking.bookingReference,
      listingTitle: row.booking.listingTitleSnapshot,
      amount: moneyRequired(row.amount),
      currency: row.currency,
      status: row.status,
      recoveryStatus: row.recoveryStatus,
      settlementLabel: list.settlementLabel,
      evidenceDueAt: row.evidenceDueAt?.toISOString() ?? null,
      providerEvidenceNote: row.providerEvidenceNote,
      createdAt: row.createdAt.toISOString(),
    }
  }))
  return items
}

export async function submitProviderDisputeNote(userId: string, businessId: string, disputeId: string, note: string) {
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER'])
  const row = await prisma.paymentDispute.findFirst({ where: { id: disputeId, businessId } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Dispute not found.')
  await prisma.paymentDispute.update({
    where: { id: row.id },
    data: { providerEvidenceNote: note, providerEvidenceAt: new Date(), providerEvidenceById: userId },
  })
  return listBusinessDisputes(userId, businessId).then(rows => rows.find(r => r.id === disputeId)!)
}
