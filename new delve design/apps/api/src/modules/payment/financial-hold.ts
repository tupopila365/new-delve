import { prisma } from '@delve/database'

const OPEN_CANCEL: Array<'PENDING' | 'APPROVED'> = ['PENDING', 'APPROVED']
const OPEN_REFUND: Array<'PENDING' | 'PROCESSING' | 'FAILED'> = ['PENDING', 'PROCESSING', 'FAILED']

type Db = Pick<typeof prisma, 'bookingCancellationRequest' | 'refund' | 'transferReversal'>

export async function bookingHasFinancialHold(bookingId: string, db: Db = prisma): Promise<boolean> {
  const [cancel, refund, reversal] = await Promise.all([
    db.bookingCancellationRequest.findFirst({
      where: { bookingId, status: { in: OPEN_CANCEL } },
      select: { id: true },
    }),
    db.refund.findFirst({
      where: { bookingId, status: { in: OPEN_REFUND } },
      select: { id: true },
    }),
    db.transferReversal.findFirst({
      where: { bookingId, status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true },
    }),
  ])
  return Boolean(cancel || refund || reversal)
}

export async function bookingIdsWithFinancialHold(bookingIds: string[], db: Db = prisma): Promise<Set<string>> {
  if (bookingIds.length === 0) return new Set()
  const [cancels, refunds, reversals] = await Promise.all([
    db.bookingCancellationRequest.findMany({
      where: { bookingId: { in: bookingIds }, status: { in: OPEN_CANCEL } },
      select: { bookingId: true },
    }),
    db.refund.findMany({
      where: { bookingId: { in: bookingIds }, status: { in: OPEN_REFUND } },
      select: { bookingId: true },
    }),
    db.transferReversal.findMany({
      where: { bookingId: { in: bookingIds }, status: { in: ['PENDING', 'PROCESSING'] } },
      select: { bookingId: true },
    }),
  ])
  return new Set([
    ...cancels.map(r => r.bookingId),
    ...refunds.map(r => r.bookingId),
    ...reversals.map(r => r.bookingId),
  ])
}
