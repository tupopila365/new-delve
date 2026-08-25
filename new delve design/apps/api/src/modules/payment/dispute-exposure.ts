import { prisma } from '@delve/database'
import type { DisputeExposureCode, PaymentDisputeRecoveryStatus } from '@delve/contracts'

export type DisputeExposureInput = {
  payableStatus: string | null
  stripeTransferId: string | null
  payableProcessing: boolean
  reversalSucceeded: boolean
  fullRefundSucceeded: boolean
  disputeStatus: string
}

export type DisputeExposure = {
  code: DisputeExposureCode
  recoveryStatus: PaymentDisputeRecoveryStatus
  settlementLabel: string
}

export function evaluateDisputeExposure(input: DisputeExposureInput): DisputeExposure {
  if (input.fullRefundSucceeded && (input.disputeStatus === 'LOST' || input.disputeStatus === 'WON')) {
    return {
      code: 'REFUNDED_ALREADY',
      recoveryStatus: 'MANUAL_REVIEW',
      settlementLabel: 'Payment already refunded — review combined financial history',
    }
  }
  if (input.reversalSucceeded || input.payableStatus === 'REVERSED') {
    return {
      code: 'SETTLEMENT_REVERSED',
      recoveryStatus: 'RECOVERED',
      settlementLabel: 'Business settlement already reversed',
    }
  }
  if (input.payableProcessing) {
    return {
      code: 'SETTLEMENT_IN_FLIGHT',
      recoveryStatus: 'MANUAL_REVIEW',
      settlementLabel: 'Settlement Transfer is in progress — re-check after Stripe Transfer completes',
    }
  }
  if (input.payableStatus === 'TRANSFERRED' || input.stripeTransferId) {
    if (input.disputeStatus === 'LOST') {
      return {
        code: 'SETTLEMENT_TRANSFERRED',
        recoveryStatus: 'RECOVERY_REQUIRED',
        settlementLabel: 'Business settlement was already transferred before the dispute',
      }
    }
    if (input.disputeStatus === 'WON' || input.disputeStatus === 'CLOSED') {
      return {
        code: 'SETTLEMENT_TRANSFERRED',
        recoveryStatus: 'NOT_REQUIRED',
        settlementLabel: 'Business settlement already transferred — no further recovery',
      }
    }
    return {
      code: 'SETTLEMENT_TRANSFERRED',
      recoveryStatus: 'NOT_REQUIRED',
      settlementLabel: 'Business settlement was already transferred before the dispute',
    }
  }
  if (!input.payableStatus) {
    return {
      code: 'NO_SETTLEMENT',
      recoveryStatus: 'NOT_REQUIRED',
      settlementLabel: 'No business payable on this payment',
    }
  }
  if (input.disputeStatus === 'LOST') {
    return {
      code: 'SETTLEMENT_BLOCKED',
      recoveryStatus: 'NOT_REQUIRED',
      settlementLabel: 'Settlement cancelled due to payment dispute loss',
    }
  }
  if (input.disputeStatus === 'WON' || input.disputeStatus === 'CLOSED') {
    return {
      code: 'NO_SETTLEMENT',
      recoveryStatus: 'NOT_REQUIRED',
      settlementLabel: 'Dispute closed without an outstanding settlement hold',
    }
  }
  return {
    code: 'SETTLEMENT_BLOCKED',
    recoveryStatus: 'BLOCKED_SETTLEMENT',
    settlementLabel: 'Settlement under dispute review — cannot be released',
  }
}

export async function persistDisputeExposure(disputeId: string) {
  const dispute = await prisma.paymentDispute.findUniqueOrThrow({ where: { id: disputeId } })
  const payable = await prisma.businessPayable.findUnique({
    where: { paymentId: dispute.paymentId },
    include: { transferReversal: true },
  })
  const refunds = await prisma.refund.findMany({ where: { paymentId: dispute.paymentId } })
  const exposure = evaluateDisputeExposure({
    payableStatus: payable?.status ?? null,
    stripeTransferId: payable?.stripeTransferId ?? null,
    payableProcessing: payable?.status === 'PROCESSING',
    reversalSucceeded: payable?.transferReversal?.status === 'SUCCEEDED' || payable?.status === 'REVERSED',
    fullRefundSucceeded: refunds.some(r => r.status === 'SUCCEEDED'),
    disputeStatus: dispute.status,
  })
  return prisma.paymentDispute.update({
    where: { id: disputeId },
    data: { exposureCode: exposure.code, recoveryStatus: exposure.recoveryStatus },
  })
}

export async function persistDisputeExposuresForPayment(paymentId: string) {
  const rows = await prisma.paymentDispute.findMany({ where: { paymentId }, select: { id: true } })
  for (const row of rows) await persistDisputeExposure(row.id)
}
