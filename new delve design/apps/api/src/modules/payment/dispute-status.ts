import type { PaymentDisputeStatus } from '@delve/contracts'

/** Stripe Dispute.status values from the Stripe API Dispute object. Do not invent names. */
export type StripeDisputeStatus =
  | 'warning_needs_response'
  | 'warning_under_review'
  | 'warning_closed'
  | 'needs_response'
  | 'under_review'
  | 'won'
  | 'lost'

export function mapStripeDisputeStatus(raw: string): PaymentDisputeStatus {
  switch (raw) {
    case 'needs_response':
      return 'NEEDS_RESPONSE'
    case 'under_review':
      return 'UNDER_REVIEW'
    case 'won':
      return 'WON'
    case 'lost':
      return 'LOST'
    case 'warning_needs_response':
    case 'warning_under_review':
      return 'WARNING'
    case 'warning_closed':
      return 'CLOSED'
    default:
      return 'UNDER_REVIEW'
  }
}

export function isTerminalDisputeStatus(status: PaymentDisputeStatus): boolean {
  return status === 'WON' || status === 'LOST' || status === 'CLOSED'
}

export function isOpenDisputeStatus(status: PaymentDisputeStatus): boolean {
  return status === 'NEEDS_RESPONSE' || status === 'UNDER_REVIEW' || status === 'WARNING'
}

/** Ignore stale Stripe events that would downgrade a terminal dispute. */
export function canApplyDisputeStatus(
  current: PaymentDisputeStatus,
  next: PaymentDisputeStatus,
  lastEventCreated: number | null | undefined,
  incomingEventCreated: number | null | undefined,
): boolean {
  if (
    lastEventCreated != null &&
    incomingEventCreated != null &&
    incomingEventCreated < lastEventCreated
  ) {
    return false
  }
  if (isTerminalDisputeStatus(current) && current !== next) return false
  return true
}
