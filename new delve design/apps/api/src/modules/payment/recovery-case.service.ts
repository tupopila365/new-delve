import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type { FinancialRecoveryCaseDto } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'

const MONEY = 2

function moneyRequired(value: { toString(): string } | string | number) {
  return new Decimal(value.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP).toFixed(MONEY)
}

export async function upsertFinancialRecoveryCase(input: {
  fingerprint: string
  type: string
  businessId: string
  paymentId?: string | null
  bookingId?: string | null
  businessPayableId?: string | null
  disputeId?: string | null
  transferReversalId?: string | null
  amount: Decimal | string | { toString(): string }
  currency: string
  reason: string
}): Promise<{ created: boolean; id: string }> {
  const amount = new Decimal(input.amount.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP)
  const existing = await prisma.financialRecoveryCase.findUnique({ where: { fingerprint: input.fingerprint } })
  if (existing) {
    if (existing.status === 'RESOLVED' || existing.status === 'WRITTEN_OFF') {
      return { created: false, id: existing.id }
    }
    await prisma.financialRecoveryCase.update({
      where: { id: existing.id },
      data: {
        reason: input.reason,
        amount,
        transferReversalId: input.transferReversalId ?? existing.transferReversalId,
      },
    })
    return { created: false, id: existing.id }
  }
  const created = await prisma.financialRecoveryCase.create({
    data: {
      fingerprint: input.fingerprint,
      type: input.type,
      businessId: input.businessId,
      paymentId: input.paymentId ?? null,
      bookingId: input.bookingId ?? null,
      businessPayableId: input.businessPayableId ?? null,
      disputeId: input.disputeId ?? null,
      transferReversalId: input.transferReversalId ?? null,
      amount,
      currency: input.currency,
      reason: input.reason,
      status: 'OPEN',
    },
  })
  await writeAdminAudit({
    action: 'RECOVERY_CASE_CREATED',
    outcome: 'success',
    targetType: 'financial_recovery_case',
    targetId: created.id,
    metadata: {
      type: input.type,
      businessId: input.businessId,
      paymentId: input.paymentId ?? undefined,
      bookingId: input.bookingId ?? undefined,
    },
  })
  return { created: true, id: created.id }
}

async function toDto(row: {
  id: string
  type: string
  status: FinancialRecoveryCaseDto['status']
  amount: { toString(): string }
  currency: string
  reason: string
  businessId: string
  bookingId: string | null
  paymentId: string | null
  businessPayableId: string | null
  disputeId: string | null
  transferReversalId: string | null
  adminNote: string | null
  createdAt: Date
  resolvedAt: Date | null
}): Promise<FinancialRecoveryCaseDto> {
  const booking = row.bookingId
    ? await prisma.booking.findUnique({ where: { id: row.bookingId }, select: { bookingReference: true } })
    : null
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    amount: moneyRequired(row.amount),
    currency: row.currency,
    reason: row.reason,
    businessId: row.businessId,
    bookingId: row.bookingId,
    bookingReference: booking?.bookingReference ?? null,
    paymentId: row.paymentId,
    businessPayableId: row.businessPayableId,
    disputeId: row.disputeId,
    transferReversalId: row.transferReversalId,
    adminNote: row.adminNote,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  }
}

export async function adminListRecoveryCases(status?: string) {
  const where =
    status && status !== 'all' ? { status: status as FinancialRecoveryCaseDto['status'] } : {}
  const rows = await prisma.financialRecoveryCase.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return Promise.all(rows.map(row => toDto(row)))
}

export async function adminGetRecoveryCase(id: string) {
  const row = await prisma.financialRecoveryCase.findUnique({ where: { id } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Recovery case not found.')
  return toDto(row)
}

export async function adminResolveRecoveryCase(
  adminUserId: string,
  id: string,
  status: 'RESOLVED' | 'WRITTEN_OFF' | 'UNDER_REVIEW',
  note?: string,
) {
  const row = await prisma.financialRecoveryCase.findUnique({ where: { id } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Recovery case not found.')
  const updated = await prisma.financialRecoveryCase.update({
    where: { id },
    data: {
      status,
      adminNote: note ?? row.adminNote,
      resolvedAt: status === 'UNDER_REVIEW' ? null : new Date(),
      resolvedById: status === 'UNDER_REVIEW' ? null : adminUserId,
    },
  })
  if (status !== 'UNDER_REVIEW') {
    await writeAdminAudit({
      action: 'RECOVERY_CASE_RESOLVED',
      outcome: 'success',
      actorUserId: adminUserId,
      targetType: 'financial_recovery_case',
      targetId: id,
      metadata: { status },
    })
  }
  return toDto(updated)
}
