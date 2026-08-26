import { randomBytes } from 'node:crypto'
import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type {
  BookingDto,
  BookingStatus,
  CancelBookingBody,
  CreateBookingBody,
  ProviderBookingFilter,
  TravelerBookingFilter,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { paginated, parseAdminPage } from '../admin/admin-query.js'
import { requireBusinessMembership } from '../business/business.service.js'
import { createNotification, type NotificationType } from '../notifications/notify.js'
import { assertBookingTransition } from './booking-lifecycle.js'
import { evaluatePayableForBooking } from '../payment/settlement.service.js'
import { requestBookingCancellation } from '../payment/refund.service.js'
import { isDelvePreviewBusinessSlug, PREVIEW_OFFER_BLOCKED_MESSAGE } from '../deal/preview-deal.js'

const MONEY = 2
const ROUND = Decimal.ROUND_HALF_UP
const PAYMENT_NOTE_UNPAID =
  'Pay through Delve checkout. Collection settles to Delve first; the business share is transferred later.'
const PAYMENT_NOTE_PROCESSING = 'Payment is still being confirmed.'
const PAYMENT_NOTE_PAID = 'Payment received. Booking is confirmed. The business is settled later by Delve.'
const PAYMENT_NOTE_FAILED = 'Payment did not succeed. You can try again. This booking is not confirmed.'
const ACTIVE_CLAIM_BOOKING: BookingStatus[] = ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED']
const COMMERCIAL_ROLES = ['OWNER', 'MANAGER'] as const

async function requireVerifiedUser(userId: string) {
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

function money(value: string | number) {
  return new Decimal(value).toDecimalPlaces(MONEY, ROUND)
}

function moneyString(value: { toString(): string } | number) {
  return money(typeof value === 'number' ? value : value.toString()).toFixed(MONEY)
}

function bookingRef() {
  return `DLV-BK-${randomBytes(4).toString('hex').toUpperCase()}`
}

function travelerName(user: {
  username: string
  travelerProfile?: { displayName: string } | null
}) {
  return user.travelerProfile?.displayName || user.username
}

const bookingInclude = {
  listing: { include: { coverMedia: { select: { secureUrl: true } } } },
  business: { select: { id: true, name: true, slug: true, logoUrl: true, city: true, countryCode: true } },
  deal: { select: { id: true, title: true } },
  user: { select: { username: true, travelerProfile: { select: { displayName: true } } } },
  payments: { orderBy: { createdAt: 'desc' }, take: 8 },
  cancellationRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
  refunds: { orderBy: { createdAt: 'desc' }, take: 8 },
} as const

type BookingRow = {
  id: string
  bookingReference: string
  status: BookingStatus
  listingId: string
  businessId: string
  dealId: string | null
  dealClaimId: string | null
  startDateTime: Date | null
  endDateTime: Date | null
  quantity: number
  guestCount: number | null
  customerNote: string | null
  originalAmount: { toString(): string } | number
  discountAmount: { toString(): string } | number
  finalAmount: { toString(): string } | number
  currency: string
  listingTitleSnapshot: string
  dealTitleSnapshot: string | null
  discountSummarySnapshot: string | null
  createdAt: Date
  confirmedAt: Date | null
  cancelledAt: Date | null
  completedAt: Date | null
  listing: { id: string; title: string; coverMedia: { secureUrl: string | null } | null }
  business: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    city: string | null
    countryCode: string | null
  }
  deal: { id: string; title: string } | null
  user?: { username: string; travelerProfile?: { displayName: string } | null }
  payments?: Array<{ status: string; createdAt: Date }>
  cancellationRequests?: Array<{
    id: string
    bookingId: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
    reason: import('@delve/contracts').RefundReason
    note: string | null
    requestedByType: import('@delve/contracts').RefundActorType
    createdAt: Date
    reviewedAt: Date | null
  }>
  refunds?: Array<{ status: string; amount: { toString(): string } | string | number; currency: string; createdAt: Date }>
}

export function toBookingDto(row: BookingRow, opts?: { includeTraveler?: boolean }): BookingDto {
  return {
    id: row.id,
    bookingReference: row.bookingReference,
    status: row.status,
    listingId: row.listingId,
    businessId: row.businessId,
    dealId: row.dealId,
    dealClaimId: row.dealClaimId,
    startDateTime: row.startDateTime?.toISOString() ?? null,
    endDateTime: row.endDateTime?.toISOString() ?? null,
    quantity: row.quantity,
    guestCount: row.guestCount,
    customerNote: row.customerNote,
    pricing: {
      originalAmount: moneyString(row.originalAmount),
      discountAmount: moneyString(row.discountAmount),
      finalAmount: moneyString(row.finalAmount),
      currency: row.currency,
    },
    listing: {
      id: row.listing.id,
      title: row.listingTitleSnapshot || row.listing.title,
      coverUrl: row.listing.coverMedia?.secureUrl ?? null,
    },
    business: row.business,
    deal: row.deal
      ? {
          id: row.deal.id,
          title: row.dealTitleSnapshot || row.deal.title,
          discountSummary: row.discountSummarySnapshot,
        }
      : row.dealTitleSnapshot
        ? { id: row.dealId || '', title: row.dealTitleSnapshot, discountSummary: row.discountSummarySnapshot }
        : null,
    ...(opts?.includeTraveler && row.user ? { traveler: { displayName: travelerName(row.user) } } : {}),
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    payment: paymentSummary(row.payments),
    financial: financialSummary(row),
  }
}

function financialSummary(row: BookingRow): NonNullable<BookingDto['financial']> {
  const cancel = row.cancellationRequests?.[0]
  const refunds = row.refunds ?? []
  const latestRefund = refunds[0]
  const refunded = refunds
    .filter(r => r.status === 'SUCCEEDED')
    .reduce((sum, r) => sum.plus(r.amount.toString()), new Decimal(0))
  let travelerMessage: string | null = null
  if (latestRefund?.status === 'SUCCEEDED') {
    travelerMessage = `Refunded ${latestRefund.currency} ${moneyString(latestRefund.amount)}`
  } else if (latestRefund?.status === 'PROCESSING' || latestRefund?.status === 'PENDING') {
    travelerMessage = 'Refund processing'
  } else if (latestRefund?.status === 'FAILED') {
    travelerMessage = 'Refund failed / needs attention'
  } else if (cancel?.status === 'PENDING') {
    travelerMessage = 'Cancellation requested. Your booking is still being reviewed.'
  } else if (cancel?.status === 'APPROVED') {
    travelerMessage = 'Cancellation approved. Refund has not been confirmed yet.'
  }
  return {
    cancellation: cancel
      ? {
          id: cancel.id,
          bookingId: cancel.bookingId,
          status: cancel.status,
          reason: cancel.reason,
          note: cancel.note,
          requestedByType: cancel.requestedByType,
          createdAt: cancel.createdAt.toISOString(),
          reviewedAt: cancel.reviewedAt?.toISOString() ?? null,
        }
      : null,
    refund: latestRefund
      ? {
          status: latestRefund.status as NonNullable<NonNullable<BookingDto['financial']>['refund']>['status'],
          amount: moneyString(latestRefund.amount),
          currency: latestRefund.currency,
        }
      : null,
    refundedAmount: refunded.toFixed(MONEY),
    travelerMessage,
  }
}

function paymentSummary(payments?: Array<{ status: string }>): BookingDto['payment'] {
  const paid = payments?.some(p => p.status === 'PAID') ?? false
  const latest = payments?.[0]
  const status = (latest?.status as BookingDto['payment']['status']) ?? null
  let note = PAYMENT_NOTE_UNPAID
  if (paid) note = PAYMENT_NOTE_PAID
  else if (status === 'PROCESSING' || status === 'PENDING') note = PAYMENT_NOTE_PROCESSING
  else if (status === 'FAILED') note = PAYMENT_NOTE_FAILED
  return { captured: paid, status: paid ? 'PAID' : status, note }
}

export async function persistExpiredBookings(now = new Date()) {
  try {
    await prisma.booking.updateMany({
      where: {
        status: { in: ['PENDING', 'PENDING_PAYMENT'] },
        startDateTime: { lt: now },
      },
      data: { status: 'EXPIRED' },
    })
  } catch {
    /* schema not migrated yet */
  }
}

async function notifyProviders(businessId: string, type: NotificationType, title: string, bookingId: string, actorId?: string) {
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
        entityType: 'booking',
        entityId: bookingId,
        actorId,
      }),
    ),
  )
}

function travelerFilterWhere(filter?: TravelerBookingFilter): { status?: { in: BookingStatus[] } } {
  if (filter === 'pending') return { status: { in: ['PENDING', 'PENDING_PAYMENT'] } }
  if (filter === 'upcoming') return { status: { in: ['CONFIRMED'] } }
  if (filter === 'completed') return { status: { in: ['COMPLETED'] } }
  if (filter === 'cancelled') return { status: { in: ['CANCELLED', 'EXPIRED'] } }
  return {}
}

function providerFilterWhere(filter?: ProviderBookingFilter): { status?: { in: BookingStatus[] } } {
  if (filter === 'pending') return { status: { in: ['PENDING', 'PENDING_PAYMENT'] } }
  if (filter === 'confirmed') return { status: { in: ['CONFIRMED'] } }
  if (filter === 'completed') return { status: { in: ['COMPLETED'] } }
  if (filter === 'cancelled') return { status: { in: ['CANCELLED', 'EXPIRED'] } }
  return {}
}

export async function createBooking(userId: string, body: CreateBookingBody): Promise<BookingDto> {
  await requireVerifiedUser(userId)
  const quantity = body.quantity ?? 1
  const guestCount = body.guestCount ?? quantity
  const startDateTime = body.startDateTime ? new Date(body.startDateTime) : null
  const endDateTime = body.endDateTime ? new Date(body.endDateTime) : null

  const listing = await prisma.listing.findUnique({
    where: { id: body.listingId },
    include: { business: { select: { id: true, status: true, slug: true } } },
  })
  if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found.')
  if (listing.status !== 'PUBLISHED') {
    throw new AppError(400, 'LISTING_NOT_PUBLISHED', 'This listing is not available to book.')
  }
  if (listing.business.status !== 'VERIFIED') {
    throw new AppError(400, 'BUSINESS_NOT_ELIGIBLE', 'This business cannot currently accept bookings.')
  }
  if (isDelvePreviewBusinessSlug(listing.business.slug)) {
    throw new AppError(403, 'PREVIEW_OFFER', PREVIEW_OFFER_BLOCKED_MESSAGE)
  }
  if (listing.priceAmount == null || !listing.currency) {
    throw new AppError(400, 'LISTING_PRICE_UNAVAILABLE', 'This listing does not have an advertised price yet.')
  }

  let dealId: string | null = null
  let dealTitleSnapshot: string | null = null
  let discountSummarySnapshot: string | null = null
  let original = money(listing.priceAmount.toString()).mul(quantity)
  let finalAmt = original
  let discount = new Decimal(0)
  let currency = listing.currency.toUpperCase()

  if (body.dealClaimId) {
    const claim = await prisma.dealClaim.findUnique({
      where: { id: body.dealClaimId },
      include: {
        deal: { select: { id: true, listingId: true, businessId: true, status: true, endDate: true, title: true } },
      },
    })
    if (!claim) throw new AppError(400, 'INVALID_CLAIM', 'Deal claim not found.')
    if (claim.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'This deal claim does not belong to you.')
    if (claim.dealId && claim.deal.listingId && claim.deal.listingId !== listing.id) {
      throw new AppError(400, 'CLAIM_LISTING_MISMATCH', 'This claim is not valid for the selected listing.')
    }
    if (claim.deal.businessId !== listing.businessId) {
      throw new AppError(400, 'CLAIM_BUSINESS_MISMATCH', 'This claim is not valid for this business.')
    }
    if (claim.status === 'CANCELLED' || claim.status === 'EXPIRED' || claim.status === 'REDEEMED') {
      throw new AppError(400, 'CLAIM_NOT_ELIGIBLE', 'This deal claim cannot be used for a booking.')
    }
    if (claim.expiresAt.getTime() < Date.now()) {
      throw new AppError(400, 'CLAIM_EXPIRED', 'This deal claim has expired.')
    }
    if (claim.deal.status !== 'PUBLISHED' || claim.deal.endDate.getTime() < Date.now()) {
      throw new AppError(400, 'DEAL_NOT_ACTIVE', 'This deal is not currently available for booking.')
    }
    if (claim.originalPriceSnapshot == null || claim.dealPriceSnapshot == null) {
      throw new AppError(
        400,
        'DEAL_PRICE_UNAVAILABLE',
        'This deal cannot currently be booked because pricing is unavailable.',
      )
    }
    if (claim.currencySnapshot.toUpperCase() !== currency) {
      throw new AppError(400, 'CURRENCY_MISMATCH', 'Deal claim currency must match the listing currency.')
    }
    const existingUse = await prisma.booking.findFirst({
      where: { dealClaimId: claim.id, status: { in: ACTIVE_CLAIM_BOOKING } },
    })
    if (existingUse) {
      throw new AppError(409, 'CLAIM_ALREADY_BOOKED', 'This deal claim is already attached to an active booking.')
    }
    original = money(claim.originalPriceSnapshot.toString()).mul(quantity)
    finalAmt = money(claim.dealPriceSnapshot.toString()).mul(quantity)
    discount = original.minus(finalAmt)
    if (discount.lt(0)) {
      throw new AppError(400, 'INVALID_DISCOUNT', 'Deal snapshot is inconsistent.')
    }
    dealId = claim.dealId
    dealTitleSnapshot = claim.titleSnapshot
    discountSummarySnapshot = claim.discountSummarySnapshot
  }

  original = money(original.toString())
  finalAmt = money(finalAmt.toString())
  discount = money(discount.toString())

  let created = null
  for (let i = 0; i < 5; i += 1) {
    try {
      created = await prisma.booking.create({
        data: {
          bookingReference: bookingRef(),
          userId,
          businessId: listing.businessId,
          listingId: listing.id,
          dealId,
          dealClaimId: body.dealClaimId ?? null,
          status: 'PENDING',
          startDateTime,
          endDateTime,
          quantity,
          guestCount,
          customerNote: body.customerNote ?? null,
          originalAmount: original,
          discountAmount: discount,
          finalAmount: finalAmt,
          currency,
          listingTitleSnapshot: listing.title,
          dealTitleSnapshot,
          discountSummarySnapshot,
        },
        include: bookingInclude,
      })
      break
    } catch (err) {
      if (i === 4) throw err
    }
  }
  if (!created) throw new AppError(500, 'BOOKING_CREATE_FAILED', 'Could not create booking.')

  await writeAdminAudit({
    action: 'BOOKING_CREATED',
    outcome: 'success',
    actorUserId: userId,
    targetType: 'booking',
    targetId: created.id,
    metadata: { bookingReference: created.bookingReference },
  })
  await createNotification({
    userId,
    type: 'BOOKING_CREATED',
    title: `Reservation requested · ${created.bookingReference}`,
    body: PAYMENT_NOTE_UNPAID,
    entityType: 'booking',
    entityId: created.id,
  })
  await notifyProviders(
    listing.businessId,
    'BOOKING_CREATED',
    `New reservation ${created.bookingReference}`,
    created.id,
    userId,
  )
  return toBookingDto(created)
}

export async function listMyBookings(userId: string, filter?: TravelerBookingFilter): Promise<BookingDto[]> {
  await requireVerifiedUser(userId)
  await persistExpiredBookings()
  const rows = await prisma.booking.findMany({
    where: { userId, ...travelerFilterWhere(filter) },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return rows.map(row => toBookingDto(row))
}

export async function getMyBooking(userId: string, bookingId: string): Promise<BookingDto> {
  await requireVerifiedUser(userId)
  await persistExpiredBookings()
  const row = await prisma.booking.findUnique({ where: { id: bookingId }, include: bookingInclude })
  if (!row || row.userId !== userId) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  return toBookingDto(row)
}

export async function cancelMyBooking(userId: string, bookingId: string, body: CancelBookingBody = {}): Promise<BookingDto> {
  await requireVerifiedUser(userId)
  const existing = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!existing || existing.userId !== userId) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  const paid = await prisma.payment.findFirst({ where: { bookingId, status: 'PAID' } })
  if (paid) {
    await requestBookingCancellation(userId, bookingId, 'TRAVELER', { note: body.reason ?? null })
    return getMyBooking(userId, bookingId)
  }
  assertBookingTransition(existing.status as BookingStatus, 'CANCELLED')
  const row = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: body.reason ?? null },
    include: bookingInclude,
  })
  await writeAdminAudit({
    action: 'BOOKING_CANCELLED',
    outcome: 'success',
    actorUserId: userId,
    targetType: 'booking',
    targetId: bookingId,
  })
  await notifyProviders(row.businessId, 'BOOKING_CANCELLED', `Reservation cancelled ${row.bookingReference}`, row.id, userId)
  await prisma.businessPayable.updateMany({
    where: { bookingId, status: { in: ['PENDING', 'ELIGIBLE', 'BLOCKED'] } },
    data: { status: 'CANCELLED', cancelledAt: new Date(), eligibilityCode: 'CANCELLED' },
  })
  return toBookingDto(row)
}

export async function listBusinessBookings(
  userId: string,
  businessId: string,
  query: { filter?: ProviderBookingFilter; q?: string } = {},
): Promise<BookingDto[]> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, [...COMMERCIAL_ROLES])
  await persistExpiredBookings()
  const q = query.q?.trim()
  const rows = await prisma.booking.findMany({
    where: {
      businessId,
      ...providerFilterWhere(query.filter),
      ...(q
        ? {
            OR: [
              { bookingReference: { contains: q, mode: 'insensitive' } },
              { user: { username: { contains: q, mode: 'insensitive' } } },
              { user: { travelerProfile: { displayName: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return rows.map(row => toBookingDto(row, { includeTraveler: true }))
}

export async function getBusinessBooking(userId: string, businessId: string, bookingId: string): Promise<BookingDto> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, [...COMMERCIAL_ROLES])
  const row = await prisma.booking.findUnique({ where: { id: bookingId }, include: bookingInclude })
  if (!row || row.businessId !== businessId) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  return toBookingDto(row, { includeTraveler: true })
}

async function providerTransition(
  userId: string,
  businessId: string,
  bookingId: string,
  next: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
  reason?: string | null,
) {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, [...COMMERCIAL_ROLES])
  const existing = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!existing || existing.businessId !== businessId) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  assertBookingTransition(existing.status as BookingStatus, next)
  const now = new Date()
  const row = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: next,
      ...(next === 'CONFIRMED' ? { confirmedAt: now } : {}),
      ...(next === 'CANCELLED' ? { cancelledAt: now, cancelReason: reason ?? null } : {}),
      ...(next === 'COMPLETED' ? { completedAt: now } : {}),
    },
    include: bookingInclude,
  })
  const action =
    next === 'CONFIRMED' ? 'BOOKING_CONFIRMED' : next === 'COMPLETED' ? 'BOOKING_COMPLETED' : 'BOOKING_CANCELLED'
  const type: NotificationType =
    next === 'CONFIRMED' ? 'BOOKING_CONFIRMED' : next === 'COMPLETED' ? 'BOOKING_COMPLETED' : 'BOOKING_CANCELLED'
  await writeAdminAudit({
    action,
    outcome: 'success',
    actorUserId: userId,
    targetType: 'booking',
    targetId: bookingId,
  })
  await createNotification({
    userId: row.userId,
    type,
    title:
      next === 'CONFIRMED'
        ? `Reservation confirmed · ${row.bookingReference}`
        : next === 'COMPLETED'
          ? `Reservation completed · ${row.bookingReference}`
          : `Reservation cancelled · ${row.bookingReference}`,
    body: next === 'CONFIRMED' || next === 'COMPLETED' ? PAYMENT_NOTE_PAID : undefined,
    entityType: 'booking',
    entityId: row.id,
    actorId: userId,
  })
  if (next === 'COMPLETED') {
    await evaluatePayableForBooking(bookingId)
  }
  if (next === 'CANCELLED') {
    await prisma.businessPayable.updateMany({
      where: { bookingId, status: { in: ['PENDING', 'ELIGIBLE', 'BLOCKED'] } },
      data: { status: 'CANCELLED', cancelledAt: new Date(), eligibilityCode: 'CANCELLED' },
    })
  }
  return toBookingDto(row, { includeTraveler: true })
}

export async function confirmBusinessBooking(userId: string, businessId: string, bookingId: string) {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, [...COMMERCIAL_ROLES])
  const paid = await prisma.payment.findFirst({ where: { bookingId, status: 'PAID' } })
  if (!paid) {
    throw new AppError(
      400,
      'BOOKING_PAYMENT_REQUIRED',
      'This booking cannot be confirmed until Delve has collected a successful traveler payment.',
    )
  }
  return providerTransition(userId, businessId, bookingId, 'CONFIRMED')
}

export async function completeBusinessBooking(userId: string, businessId: string, bookingId: string) {
  return providerTransition(userId, businessId, bookingId, 'COMPLETED')
}

export async function cancelBusinessBooking(
  userId: string,
  businessId: string,
  bookingId: string,
  body: CancelBookingBody = {},
) {
  const paid = await prisma.payment.findFirst({ where: { bookingId, status: 'PAID' } })
  if (paid) {
    await requestBookingCancellation(userId, bookingId, 'PROVIDER', { note: body.reason ?? null, reason: 'SERVICE_UNAVAILABLE' }, businessId)
    return getBusinessBooking(userId, businessId, bookingId)
  }
  return providerTransition(userId, businessId, bookingId, 'CANCELLED', body.reason)
}

export async function adminListBookings(status?: string): Promise<BookingDto[]> {
  await persistExpiredBookings()
  const rows = await prisma.booking.findMany({
    where: status ? { status: status as BookingStatus } : {},
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return rows.map(row => toBookingDto(row, { includeTraveler: true }))
}

export async function adminListBookingsForBusiness(
  businessId: string,
  query: { status?: string; page?: unknown; pageSize?: unknown },
) {
  if (!businessId.trim()) throw new AppError(400, 'VALIDATION_ERROR', 'businessId required')
  const exists = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } })
  if (!exists) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  await persistExpiredBookings()
  const { page, pageSize, skip } = parseAdminPage(query)
  const where = {
    businessId,
    ...(query.status ? { status: query.status as BookingStatus } : {}),
  }
  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])
  return paginated(rows.map(row => toBookingDto(row, { includeTraveler: true })), page, pageSize, total)
}

export async function adminListBookingsForUser(
  userId: string,
  query: { status?: string; page?: unknown; pageSize?: unknown },
) {
  if (!userId.trim()) throw new AppError(400, 'VALIDATION_ERROR', 'userId required')
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!exists) throw new AppError(404, 'NOT_FOUND', 'Traveler not found.')
  await persistExpiredBookings()
  const { page, pageSize, skip } = parseAdminPage(query)
  const where = {
    userId,
    ...(query.status ? { status: query.status as BookingStatus } : {}),
  }
  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])
  return paginated(rows.map(row => toBookingDto(row, { includeTraveler: true })), page, pageSize, total)
}

export async function adminGetBooking(bookingId: string): Promise<BookingDto> {
  const row = await prisma.booking.findUnique({ where: { id: bookingId }, include: bookingInclude })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  return toBookingDto(row, { includeTraveler: true })
}
