import type { FinancialTimelineEvent } from '@delve/contracts'
import { moneyFixed } from './report-metrics.js'

type TimelineSource = {
  booking: { createdAt: Date; bookingReference: string }
  payment: { status: string; amount: { toString(): string }; currency: string; paidAt: Date | null } | null
  payable: {
    createdAt: Date
    transferredAt: Date | null
    status: string
    businessNetAmount: { toString(): string }
    currency: string
  } | null
  refunds: Array<{ status: string; amount: { toString(): string }; currency: string; succeededAt: Date | null }>
  reversal: { status: string; amount: { toString(): string }; currency: string; succeededAt: Date | null } | null
  disputes: Array<{
    status: string
    amount: { toString(): string }
    currency: string
    createdAt: Date
    wonAt: Date | null
    lostAt: Date | null
    submittedAt: Date | null
  }>
  recoveries: Array<{ createdAt: Date; type: string; amount: { toString(): string }; currency: string; status: string }>
}

/** Only emits events that exist on persisted records. Order is by timestamp, never fabricated. */
export function buildFinancialTimeline(source: TimelineSource): FinancialTimelineEvent[] {
  const events: FinancialTimelineEvent[] = [
    {
      kind: 'BOOKING_CREATED',
      label: 'Booking created',
      at: source.booking.createdAt.toISOString(),
      detail: source.booking.bookingReference,
    },
  ]
  if (source.payment?.status === 'PAID' && source.payment.paidAt) {
    events.push({
      kind: 'PAYMENT_PAID',
      label: 'Payment paid',
      at: source.payment.paidAt.toISOString(),
      detail: `${source.payment.currency} ${moneyFixed(source.payment.amount)}`,
    })
  }
  if (source.payable) {
    events.push({
      kind: 'PAYABLE_CREATED',
      label: `Payable ${source.payable.status}`,
      at: source.payable.createdAt.toISOString(),
      detail: `${source.payable.currency} ${moneyFixed(source.payable.businessNetAmount)}`,
    })
    if (source.payable.transferredAt) {
      events.push({
        kind: 'SETTLEMENT_TRANSFERRED',
        label: 'Settlement transferred',
        at: source.payable.transferredAt.toISOString(),
        detail: `${source.payable.currency} ${moneyFixed(source.payable.businessNetAmount)}`,
      })
    }
  }
  for (const refund of source.refunds) {
    if (refund.status === 'SUCCEEDED' && refund.succeededAt) {
      events.push({
        kind: 'REFUND_SUCCEEDED',
        label: 'Refund succeeded',
        at: refund.succeededAt.toISOString(),
        detail: `${refund.currency} ${moneyFixed(refund.amount)}`,
      })
    }
  }
  if (source.reversal?.status === 'SUCCEEDED' && source.reversal.succeededAt) {
    events.push({
      kind: 'TRANSFER_REVERSED',
      label: 'Transfer reversed',
      at: source.reversal.succeededAt.toISOString(),
      detail: `${source.reversal.currency} ${moneyFixed(source.reversal.amount)}`,
    })
  }
  for (const dispute of source.disputes) {
    events.push({
      kind: 'DISPUTE_OPENED',
      label: 'Dispute opened',
      at: dispute.createdAt.toISOString(),
      detail: `${dispute.currency} ${moneyFixed(dispute.amount)}`,
    })
    if (dispute.submittedAt) {
      events.push({
        kind: 'EVIDENCE_SUBMITTED',
        label: 'Evidence submitted',
        at: dispute.submittedAt.toISOString(),
        detail: null,
      })
    }
    if (dispute.status === 'WON' && dispute.wonAt) {
      events.push({
        kind: 'DISPUTE_WON',
        label: 'Dispute won',
        at: dispute.wonAt.toISOString(),
        detail: `${dispute.currency} ${moneyFixed(dispute.amount)}`,
      })
    }
    if (dispute.status === 'LOST' && dispute.lostAt) {
      events.push({
        kind: 'DISPUTE_LOST',
        label: 'Dispute lost',
        at: dispute.lostAt.toISOString(),
        detail: `${dispute.currency} ${moneyFixed(dispute.amount)}`,
      })
    }
  }
  for (const recovery of source.recoveries) {
    events.push({
      kind: 'RECOVERY_CASE_OPENED',
      label: `Recovery case ${recovery.status}`,
      at: recovery.createdAt.toISOString(),
      detail: `${recovery.currency} ${moneyFixed(recovery.amount)} · ${recovery.type}`,
    })
  }
  return events.sort((a, b) => {
    if (!a.at && !b.at) return 0
    if (!a.at) return 1
    if (!b.at) return -1
    return a.at.localeCompare(b.at)
  })
}
