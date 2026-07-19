import type { AdminPayment } from '../api/types'

export const HELD_WARN_DAYS = 3

/** Whole days since paid_at (or created_at) for held payouts. */
export function heldAgeDays(
  row: Pick<AdminPayment, 'paid_at' | 'created_at' | 'payout_status'>,
): number | null {
  if (row.payout_status !== 'held') return null
  const raw = row.paid_at || row.created_at
  if (!raw) return null
  const start = new Date(raw).getTime()
  if (Number.isNaN(start)) return null
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000))
}

export function heldAgeLabel(days: number): string {
  if (days <= 0) return 'Held · today'
  if (days === 1) return 'Held · 1d'
  return `Held · ${days}d`
}
