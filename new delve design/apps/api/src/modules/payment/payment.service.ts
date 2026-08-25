import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type { CreatePaymentDto, PaymentDto, PaymentStatus } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { assertBookingTransition } from '../booking/booking-lifecycle.js'
import { createNotification } from '../notifications/notify.js'
import { requireStripe } from './stripe-client.js'
import { toStripeAmount } from './stripe-amount.js'
import { createPayableForPaidPayment, transferGroupForBooking } from './payable.service.js'
import { isDelvePreviewBusinessSlug, PREVIEW_OFFER_BLOCKED_MESSAGE } from '../deal/preview-deal.js'

const OPEN: PaymentStatus[] = ['PENDING', 'PROCESSING']

function money(value: { toString(): string } | string | number) {
  return new Decimal(typeof value === 'number' ? value : value.toString()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

function moneyString(value: { toString(): string } | string | number) {
  return money(value).toFixed(2)
}

export function toPaymentDto(row: {
  id: string
  bookingId: string
  businessId: string
  provider: PaymentDto['provider']
  status: PaymentStatus
  amount: { toString(): string } | string | number
  currency: string
  createdAt: Date
  processingAt: Date | null
  paidAt: Date | null
  failedAt: Date | null
  cancelledAt: Date | null
  failureCode: string | null
  failureMessage: string | null
}): PaymentDto {
  return {
    id: row.id,
    bookingId: row.bookingId,
    businessId: row.businessId,
    provider: row.provider,
    status: row.status,
    amount: moneyString(row.amount),
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    processingAt: row.processingAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
  }
}

async function requireVerifiedTraveler(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  if (user.accountStatus === 'deactivated') {
    throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'This account has been deactivated.')
  }
  if (user.accountStatus === 'disabled' || user.accountStatus === 'restricted') {
    throw new AppError(403, 'ACCOUNT_RESTRICTED', 'This account is restricted. Contact support.')
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before continuing.')
  }
  return user
}

function bookingPayable(status: string) {
  return status === 'PENDING' || status === 'PENDING_PAYMENT'
}

async function markBookingPendingPayment(bookingId: string, from: string) {
  if (from === 'PENDING_PAYMENT') return
  assertBookingTransition(from as 'PENDING', 'PENDING_PAYMENT')
  await prisma.booking.update({ where: { id: bookingId }, data: { status: 'PENDING_PAYMENT' } })
}

export async function createBookingCheckout(
  env: Env,
  userId: string,
  bookingId: string,
): Promise<CreatePaymentDto> {
  const user = await requireVerifiedTraveler(userId)
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { business: true, listing: true },
  })
  if (!booking || booking.userId !== userId) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  if (isDelvePreviewBusinessSlug(booking.business.slug)) {
    throw new AppError(403, 'PREVIEW_OFFER', PREVIEW_OFFER_BLOCKED_MESSAGE)
  }
  if (!bookingPayable(booking.status)) {
    throw new AppError(400, 'BOOKING_NOT_PAYABLE', 'This booking cannot be paid.')
  }

  const paid = await prisma.payment.findFirst({ where: { bookingId, status: 'PAID' } })
  if (paid) {
    throw new AppError(409, 'BOOKING_ALREADY_PAID', 'This booking already has a successful payment.')
  }

  const amount = money(booking.finalAmount)
  const currency = booking.currency

  if (amount.lte(0)) {
    let payment
    try {
      payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          userId,
          businessId: booking.businessId,
          provider: 'STRIPE',
          status: 'PENDING',
          amount,
          currency,
          idempotencyKey: `booking:${booking.id}:zero`,
        },
      })
    } catch {
      payment = await prisma.payment.findFirst({
        where: { bookingId: booking.id, idempotencyKey: `booking:${booking.id}:zero` },
      })
      if (!payment) throw new AppError(409, 'PAYMENT_IN_PROGRESS', 'Could not start payment.')
    }
    await applySuccessfulPayment(env, payment.id)
    return {
      payment: toPaymentDto(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })),
      checkoutUrl: null,
    }
  }

  const open = await prisma.payment.findFirst({
    where: { bookingId, status: { in: OPEN } },
    orderBy: { createdAt: 'desc' },
  })
  const stripe = requireStripe(env)

  if (open?.stripeCheckoutSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(open.stripeCheckoutSessionId)
    if (existing.status === 'open' && existing.url) {
      await markBookingPendingPayment(booking.id, booking.status)
      return { payment: toPaymentDto(open), checkoutUrl: existing.url }
    }
  }

  const payment = open
    ? open
    : await prisma.payment.create({
        data: {
          bookingId: booking.id,
          userId,
          businessId: booking.businessId,
          provider: 'STRIPE',
          status: 'PENDING',
          amount,
          currency,
          idempotencyKey: `booking:${booking.id}:checkout:${crypto.randomUUID()}`,
        },
      })

  const origin = env.TRAVELER_WEB_URL.replace(/\/$/, '')
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: booking.id,
      success_url: `${origin}/bookings?booking=${encodeURIComponent(booking.id)}&payment=${encodeURIComponent(payment.id)}`,
      cancel_url: `${origin}/bookings?booking=${encodeURIComponent(booking.id)}&pay=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: toStripeAmount(amount, currency),
            product_data: {
              name: booking.listingTitleSnapshot || booking.listing.title,
              description: `${booking.bookingReference} · ${booking.business.name}`,
            },
          },
        },
      ],
      metadata: {
        paymentId: payment.id,
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        businessId: booking.businessId,
      },
      payment_intent_data: {
        transfer_group: transferGroupForBooking(booking.id),
        metadata: {
          paymentId: payment.id,
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
          businessId: booking.businessId,
        },
      },
    },
    { idempotencyKey: `checkout:${payment.id}` },
  )

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      status: 'PROCESSING',
      processingAt: new Date(),
    },
  })
  await markBookingPendingPayment(booking.id, booking.status)
  if (!session.url) {
    throw new AppError(502, 'STRIPE_CHECKOUT_FAILED', 'Stripe did not return a Checkout URL.')
  }
  return { payment: toPaymentDto(updated), checkoutUrl: session.url }
}

export async function getMyPayment(userId: string, bookingId: string, paymentId: string): Promise<PaymentDto> {
  await requireVerifiedTraveler(userId)
  const row = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!row || row.userId !== userId || row.bookingId !== bookingId) {
    throw new AppError(404, 'NOT_FOUND', 'Payment not found.')
  }
  return toPaymentDto(row)
}

export async function applySuccessfulPayment(env: Env, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) return
  if (payment.status === 'PAID') {
    await createPayableForPaidPayment(env, {
      bookingId: payment.bookingId,
      paymentId: payment.id,
      businessId: payment.businessId,
      gross: payment.amount,
      currency: payment.currency,
    })
    return
  }
  if (payment.status === 'CANCELLED') return

  const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId } })
  if (!booking) return

  const now = new Date()
  await prisma.$transaction(async tx => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: now, failedAt: null, failureCode: null, failureMessage: null },
    })
    if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && booking.status !== 'EXPIRED') {
      if (booking.status === 'PENDING' || booking.status === 'PENDING_PAYMENT') {
        assertBookingTransition(booking.status, 'CONFIRMED')
      }
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED', confirmedAt: booking.confirmedAt ?? now },
      })
    }
  })

  await createPayableForPaidPayment(env, {
    bookingId: payment.bookingId,
    paymentId: payment.id,
    businessId: payment.businessId,
    gross: payment.amount,
    currency: payment.currency,
  })

  await writeAdminAudit({
    action: 'PAYMENT_PAID',
    outcome: 'success',
    actorUserId: payment.userId,
    targetType: 'payment',
    targetId: payment.id,
    metadata: { bookingId: payment.bookingId, bookingReference: booking.bookingReference },
  })
  await createNotification({
    userId: payment.userId,
    type: 'PAYMENT_PAID',
    title: `Payment received · ${booking.bookingReference}`,
    body: 'Your booking is confirmed. The business is settled later by Delve.',
    entityType: 'booking',
    entityId: booking.id,
  })
  await createNotification({
    userId: payment.userId,
    type: 'BOOKING_CONFIRMED',
    title: `Reservation confirmed · ${booking.bookingReference}`,
    entityType: 'booking',
    entityId: booking.id,
  })
}

export async function applyPaymentProcessing(paymentId: string, stripePaymentIntentId?: string | null, stripeChargeId?: string | null) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.status === 'PAID' || payment.status === 'CANCELLED') return
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'PROCESSING',
      processingAt: payment.processingAt ?? new Date(),
      ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
      ...(stripeChargeId ? { stripeChargeId } : {}),
    },
  })
}

export async function applyPaymentFailed(
  paymentId: string,
  failure: { code?: string | null; message?: string | null },
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.status === 'PAID') return
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
      failedAt: new Date(),
      failureCode: failure.code ?? null,
      failureMessage: failure.message ?? null,
    },
  })
  const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId } })
  await createNotification({
    userId: payment.userId,
    type: 'PAYMENT_FAILED',
    title: `Payment failed · ${booking?.bookingReference ?? payment.bookingId}`,
    body: 'You can try paying again. This booking is not confirmed.',
    entityType: 'booking',
    entityId: payment.bookingId,
  })
}

export async function applyPaymentCancelled(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.status === 'PAID') return
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })
}

export async function findPaymentByStripeRefs(input: {
  paymentId?: string | null
  paymentIntentId?: string | null
  checkoutSessionId?: string | null
}) {
  if (input.paymentId) {
    const byId = await prisma.payment.findUnique({ where: { id: input.paymentId } })
    if (byId) return byId
  }
  if (input.paymentIntentId) {
    const byPi = await prisma.payment.findUnique({ where: { stripePaymentIntentId: input.paymentIntentId } })
    if (byPi) return byPi
  }
  if (input.checkoutSessionId) {
    const byCs = await prisma.payment.findUnique({ where: { stripeCheckoutSessionId: input.checkoutSessionId } })
    if (byCs) return byCs
  }
  return null
}
