import { prisma } from '@delve/database'
import type { PaymentDisputeStatus } from '@delve/contracts'

const OPEN: PaymentDisputeStatus[] = ['NEEDS_RESPONSE', 'UNDER_REVIEW', 'WARNING']

export async function paymentHasOpenDispute(paymentId: string): Promise<boolean> {
  const row = await prisma.paymentDispute.findFirst({
    where: { paymentId, status: { in: OPEN } },
    select: { id: true },
  })
  return Boolean(row)
}

export async function bookingIdsWithOpenDispute(bookingIds: string[]): Promise<Set<string>> {
  if (!bookingIds.length) return new Set()
  const rows = await prisma.paymentDispute.findMany({
    where: { bookingId: { in: bookingIds }, status: { in: OPEN } },
    select: { bookingId: true },
  })
  return new Set(rows.map(r => r.bookingId))
}
