import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type { Env } from '../../config/env.js'
import { platformCommissionAmount, netAfterPlatformFee } from './stripe-amount.js'
import { persistPayableEligibility } from './settlement.service.js'

export function transferGroupForBooking(bookingId: string) {
  return `booking_${bookingId}`
}

export async function createPayableForPaidPayment(
  env: Env,
  input: {
    bookingId: string
    paymentId: string
    businessId: string
    gross: Decimal | string | { toString(): string }
    currency: string
  },
) {
  const existing = await prisma.businessPayable.findUnique({ where: { paymentId: input.paymentId } })
  if (existing) {
    await persistPayableEligibility(existing.id)
    return prisma.businessPayable.findUniqueOrThrow({ where: { id: existing.id } })
  }

  const feeBps = env.DELVE_PLATFORM_FEE_BPS
  const gross = new Decimal(input.gross.toString()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const commission = platformCommissionAmount(gross, feeBps)
  const net = netAfterPlatformFee(gross, feeBps)

  const created = await prisma.businessPayable.create({
    data: {
      bookingId: input.bookingId,
      paymentId: input.paymentId,
      businessId: input.businessId,
      status: 'PENDING',
      grossAmount: gross,
      platformCommissionAmount: commission,
      businessNetAmount: net,
      currency: input.currency,
      stripeFeeAmount: null,
      transferGroup: transferGroupForBooking(input.bookingId),
      eligibilityCode: 'BOOKING_NOT_COMPLETED',
    },
  })
  await persistPayableEligibility(created.id)
  return prisma.businessPayable.findUniqueOrThrow({ where: { id: created.id } })
}
