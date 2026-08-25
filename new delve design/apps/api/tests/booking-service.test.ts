import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    listing: { findUnique: vi.fn() },
    dealClaim: { findUnique: vi.fn() },
    booking: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    businessMember: { findUnique: vi.fn(), findMany: vi.fn() },
    payment: { findFirst: vi.fn() },
    businessPayable: { updateMany: vi.fn(), findUnique: vi.fn() },
    notification: { create: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}))

vi.mock('../src/modules/admin/admin-audit.js', () => ({ writeAdminAudit: vi.fn() }))
vi.mock('../src/modules/notifications/notify.js', () => ({ createNotification: vi.fn() }))

import { prisma } from '@delve/database'
import {
  cancelMyBooking,
  completeBusinessBooking,
  confirmBusinessBooking,
  createBooking,
  getMyBooking,
  listBusinessBookings,
} from '../src/modules/booking/booking.service.js'

const owner = { id: 'u1', emailVerifiedAt: new Date(), accountStatus: 'active' }
const membership = { id: 'm1', userId: 'u1', businessId: 'b1', role: 'OWNER' }
const editor = { id: 'm2', userId: 'u2', businessId: 'b1', role: 'CONTENT_EDITOR' }

function listingRow(price: number | null = 1200) {
  return {
    id: 'l1',
    title: 'Sossusvlei Sunrise Tour',
    status: 'PUBLISHED',
    businessId: 'b1',
    priceAmount: price,
    currency: price == null ? null : 'NAD',
    business: { id: 'b1', status: 'VERIFIED', slug: 'desert-co' },
  }
}

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bk1',
    bookingReference: 'DLV-BK-AABBCCDD',
    userId: 'u1',
    businessId: 'b1',
    listingId: 'l1',
    dealId: null,
    dealClaimId: null,
    status: 'PENDING',
    startDateTime: null,
    endDateTime: null,
    quantity: 1,
    guestCount: 1,
    customerNote: null,
    originalAmount: 1200,
    discountAmount: 0,
    finalAmount: 1200,
    currency: 'NAD',
    listingTitleSnapshot: 'Sossusvlei Sunrise Tour',
    dealTitleSnapshot: null,
    discountSummarySnapshot: null,
    createdAt: new Date(),
    confirmedAt: null,
    cancelledAt: null,
    completedAt: null,
    listing: { id: 'l1', title: 'Sossusvlei Sunrise Tour', coverMedia: null },
    business: { id: 'b1', name: 'Desert Co', slug: 'desert-co', logoUrl: null, city: 'Sesriem', countryCode: 'NA' },
    deal: null,
    user: { username: 'traveler', travelerProfile: { displayName: 'Ada' } },
    ...overrides,
  }
}

describe('booking foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.booking.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.businessPayable.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.businessPayable.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([])
  })

  it('creates a listing booking snapshot at NAD 1200', async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(listingRow(1200) as never)
    vi.mocked(prisma.booking.create).mockResolvedValue(bookingRow() as never)
    const created = await createBooking('u1', { listingId: 'l1' })
    expect(created.pricing.finalAmount).toBe('1200.00')
    expect(created.pricing.discountAmount).toBe('0.00')
    expect(created.status).toBe('PENDING')
    expect(created.payment.captured).toBe(false)
    expect(created.bookingReference.startsWith('DLV-BK-') || created.bookingReference === 'DLV-BK-AABBCCDD').toBe(true)
  })

  it('blocks bookings on Delve preview listings', async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValue({
      ...listingRow(1200),
      business: { id: 'b1', status: 'VERIFIED', slug: 'delve-preview-wild-horizon' },
    } as never)
    await expect(createBooking('u1', { listingId: 'l1' })).rejects.toMatchObject({
      code: 'PREVIEW_OFFER',
    })
    expect(prisma.booking.create).not.toHaveBeenCalled()
  })

  it('snapshots deal claim pricing 1200/900 and ignores later listing price in stored row', async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(listingRow(1400) as never)
    vi.mocked(prisma.dealClaim.findUnique).mockResolvedValue({
      id: 'c1',
      userId: 'u1',
      dealId: 'd1',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86_400_000),
      originalPriceSnapshot: 1200,
      dealPriceSnapshot: 900,
      currencySnapshot: 'NAD',
      titleSnapshot: 'Sunrise deal',
      discountSummarySnapshot: '25% off',
      deal: {
        id: 'd1',
        listingId: 'l1',
        businessId: 'b1',
        status: 'PUBLISHED',
        endDate: new Date(Date.now() + 86_400_000),
        title: 'Sunrise deal',
      },
    } as never)
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.booking.create).mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      bookingRow({
        dealId: 'd1',
        dealClaimId: 'c1',
        originalAmount: data.originalAmount,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
        dealTitleSnapshot: 'Sunrise deal',
        discountSummarySnapshot: '25% off',
        deal: { id: 'd1', title: 'Sunrise deal' },
      }) as never,
    )
    const created = await createBooking('u1', { listingId: 'l1', dealClaimId: 'c1' })
    expect(created.pricing.originalAmount).toBe('1200.00')
    expect(created.pricing.discountAmount).toBe('300.00')
    expect(created.pricing.finalAmount).toBe('900.00')
  })

  it('rejects another user reading a booking', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...owner, id: 'u2' } as never)
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(bookingRow() as never)
    await expect(getMyBooking('u2', 'bk1')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('rejects a claim owned by someone else', async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(listingRow() as never)
    vi.mocked(prisma.dealClaim.findUnique).mockResolvedValue({
      id: 'c1',
      userId: 'other',
      dealId: 'd1',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 1000),
      originalPriceSnapshot: 1200,
      dealPriceSnapshot: 900,
      currencySnapshot: 'NAD',
      titleSnapshot: 'x',
      discountSummarySnapshot: '25% off',
      deal: { id: 'd1', listingId: 'l1', businessId: 'b1', status: 'PUBLISHED', endDate: new Date(Date.now() + 1000), title: 'x' },
    } as never)
    await expect(createBooking('u1', { listingId: 'l1', dealClaimId: 'c1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('rejects a claim for a different listing', async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(listingRow() as never)
    vi.mocked(prisma.dealClaim.findUnique).mockResolvedValue({
      id: 'c1',
      userId: 'u1',
      dealId: 'd1',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 1000),
      originalPriceSnapshot: 1200,
      dealPriceSnapshot: 900,
      currencySnapshot: 'NAD',
      titleSnapshot: 'x',
      discountSummarySnapshot: '25% off',
      deal: { id: 'd1', listingId: 'l2', businessId: 'b1', status: 'PUBLISHED', endDate: new Date(Date.now() + 1000), title: 'x' },
    } as never)
    await expect(createBooking('u1', { listingId: 'l1', dealClaimId: 'c1' })).rejects.toMatchObject({
      code: 'CLAIM_LISTING_MISMATCH',
    })
  })

  it('rejects an already-consumed active claim booking', async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(listingRow() as never)
    vi.mocked(prisma.dealClaim.findUnique).mockResolvedValue({
      id: 'c1',
      userId: 'u1',
      dealId: 'd1',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 1000),
      originalPriceSnapshot: 1200,
      dealPriceSnapshot: 900,
      currencySnapshot: 'NAD',
      titleSnapshot: 'x',
      discountSummarySnapshot: '25% off',
      deal: { id: 'd1', listingId: 'l1', businessId: 'b1', status: 'PUBLISHED', endDate: new Date(Date.now() + 1000), title: 'x' },
    } as never)
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(bookingRow({ dealClaimId: 'c1' }) as never)
    await expect(createBooking('u1', { listingId: 'l1', dealClaimId: 'c1' })).rejects.toMatchObject({
      code: 'CLAIM_ALREADY_BOOKED',
    })
  })

  it('confirms pending bookings only after a PAID collection', async () => {
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(membership as never)
    vi.mocked(prisma.payment.findFirst).mockResolvedValue({ id: 'pay1', status: 'PAID' } as never)
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(bookingRow() as never)
    const confirmedAt = new Date()
    vi.mocked(prisma.booking.update).mockResolvedValue(bookingRow({ status: 'CONFIRMED', confirmedAt }) as never)
    const row = await confirmBusinessBooking('u1', 'b1', 'bk1')
    expect(row.status).toBe('CONFIRMED')
    expect(row.confirmedAt).toBeTruthy()
  })

  it('rejects provider confirm when traveler payment is not PAID', async () => {
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(membership as never)
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
    await expect(confirmBusinessBooking('u1', 'b1', 'bk1')).rejects.toMatchObject({ code: 'BOOKING_PAYMENT_REQUIRED' })
  })

  it('rejects CONTENT_EDITOR commercial actions', async () => {
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(editor as never)
    await expect(confirmBusinessBooking('u2', 'b1', 'bk1')).rejects.toMatchObject({ code: 'INSUFFICIENT_ROLE' })
  })

  it('rejects listing bookings without a price', async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(listingRow(null) as never)
    await expect(createBooking('u1', { listingId: 'l1' })).rejects.toMatchObject({ code: 'LISTING_PRICE_UNAVAILABLE' })
  })

  it('rejects invalid status transitions', async () => {
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(membership as never)
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(bookingRow({ status: 'COMPLETED' }) as never)
    await expect(completeBusinessBooking('u1', 'b1', 'bk1')).rejects.toMatchObject({ code: 'INVALID_BOOKING_TRANSITION' })
  })

  it('lets a traveler cancel a pending booking', async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(bookingRow() as never)
    vi.mocked(prisma.booking.update).mockResolvedValue(
      bookingRow({ status: 'CANCELLED', cancelledAt: new Date() }) as never,
    )
    const row = await cancelMyBooking('u1', 'bk1')
    expect(row.status).toBe('CANCELLED')
    expect(row.cancelledAt).toBeTruthy()
  })

  it('blocks a provider from another business', async () => {
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(null)
    await expect(listBusinessBookings('u1', 'b2')).rejects.toMatchObject({ code: 'NOT_A_MEMBER' })
  })
})
