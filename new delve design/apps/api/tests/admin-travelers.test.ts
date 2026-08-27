import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    session: { findFirst: vi.fn(), updateMany: vi.fn() },
    booking: { count: vi.fn(), findMany: vi.fn() },
    dealClaim: { count: vi.fn(), findMany: vi.fn() },
    journey: { count: vi.fn(), findMany: vi.fn() },
    travelerEvent: { count: vi.fn(), findMany: vi.fn() },
    eventAttendance: { count: vi.fn() },
    communityMembership: { count: vi.fn(), findMany: vi.fn() },
    communityThread: { findMany: vi.fn() },
    communityReport: { count: vi.fn() },
    contentReport: { count: vi.fn() },
    post: { count: vi.fn(), findMany: vi.fn() },
    comment: { count: vi.fn(), findMany: vi.fn() },
    contentModerationAction: { count: vi.fn() },
    adminAuditLog: { count: vi.fn(), create: vi.fn() },
    save: { count: vi.fn() },
    follow: { count: vi.fn() },
    payment: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    refund: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    paymentDispute: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    bookingCancellationRequest: { findMany: vi.fn(), count: vi.fn() },
    financialReconciliationIssue: { count: vi.fn() },
  },
}))

vi.mock('@delve/database/decimal', () => {
  class Decimal {
    static ROUND_HALF_UP = 4
    constructor(private v: string | number | Decimal) {}
    toDecimalPlaces() {
      return this
    }
    toFixed() {
      return Number(this.toString()).toFixed(2)
    }
    toString() {
      return String(this.v)
    }
    isFinite() {
      return Number.isFinite(Number(this.toString()))
    }
    minus(other: Decimal | string | number) {
      return new Decimal(Number(this.toString()) - Number(String(other)))
    }
  }
  return { Decimal }
})

vi.mock('../src/modules/admin/admin-audit.js', () => ({ writeAdminAudit: vi.fn() }))

import { prisma } from '@delve/database'
import { writeAdminAudit } from '../src/modules/admin/admin-audit.js'
import { AppError } from '../src/middleware/error-handler.js'
import {
  adminGetTraveler,
  adminGetTravelerFinancial,
  adminListTravelerClaims,
  adminListTravelerJourneys,
  adminListTravelers,
  adminRestrictTraveler,
  adminRestoreTraveler,
} from '../src/modules/admin/admin-travelers.service.js'

const travelerA = {
  id: 'user-a',
  email: 'anna@example.com',
  username: 'anna',
  role: 'traveler' as const,
  accountStatus: 'active' as const,
  emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  travelerProfile: {
    displayName: 'Anna',
    bio: 'Hiker',
    avatarUrl: 'https://cdn.example/a.jpg',
    coverUrl: null,
    homeCity: 'Windhoek',
    homeCountryCode: 'NA',
    preferredLanguage: 'en',
    profileVisibility: 'PUBLIC' as const,
  },
  passwordHash: 'HASH_MUST_NOT_LEAK',
  _count: { bookings: 2, dealClaims: 1, journeys: 3 },
}

function mockDetailCounts() {
  vi.mocked(prisma.booking.count).mockResolvedValue(0)
  vi.mocked(prisma.dealClaim.count).mockResolvedValue(0)
  vi.mocked(prisma.journey.count).mockResolvedValue(0)
  vi.mocked(prisma.travelerEvent.count).mockResolvedValue(0)
  vi.mocked(prisma.eventAttendance.count).mockResolvedValue(0)
  vi.mocked(prisma.communityMembership.count).mockResolvedValue(0)
  vi.mocked(prisma.post.count).mockResolvedValue(0)
  vi.mocked(prisma.session.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.booking.findMany).mockResolvedValue([])
  vi.mocked(prisma.communityThread.findMany).mockResolvedValue([])
  vi.mocked(prisma.bookingCancellationRequest.count).mockResolvedValue(0)
  vi.mocked(prisma.refund.count).mockResolvedValue(0)
  vi.mocked(prisma.paymentDispute.count).mockResolvedValue(0)
  vi.mocked(prisma.financialReconciliationIssue.count).mockResolvedValue(0)
  vi.mocked(prisma.communityReport.count).mockResolvedValue(0)
  vi.mocked(prisma.contentReport.count).mockResolvedValue(0)
  vi.mocked(prisma.post.findMany).mockResolvedValue([])
  vi.mocked(prisma.travelerEvent.findMany).mockResolvedValue([])
  vi.mocked(prisma.journey.findMany).mockResolvedValue([])
  vi.mocked(prisma.comment.findMany).mockResolvedValue([])
  vi.mocked(prisma.contentModerationAction.count).mockResolvedValue(0)
  vi.mocked(prisma.adminAuditLog.count).mockResolvedValue(0)
}

describe('admin travelers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.paymentDispute.findMany).mockResolvedValue([])
    vi.mocked(prisma.bookingCancellationRequest.findMany).mockResolvedValue([])
    vi.mocked(prisma.refund.findMany).mockResolvedValue([])
  })

  it('paginates travelers with counts and does not expose secrets', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(1)
    vi.mocked(prisma.user.findMany).mockResolvedValue([travelerA] as never)
    const result = await adminListTravelers({ page: '1', pageSize: '25', q: 'anna' })
    expect(result.items[0]?.email).toBe('anna@example.com')
    expect(result.items[0]?.bookingCount).toBe(2)
    expect(JSON.stringify(result)).not.toContain('HASH_MUST_NOT_LEAK')
    expect(JSON.stringify(result)).not.toContain('passwordHash')
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 25,
        skip: 0,
        where: expect.objectContaining({ role: 'traveler' }),
      }),
    )
  })

  it('scopes list search to safe identity fields', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    await adminListTravelers({ q: 'anna', accountStatus: 'active' })
    const call = vi.mocked(prisma.user.findMany).mock.calls[0]?.[0] as { where: Record<string, unknown> }
    expect(JSON.stringify(call.where)).not.toMatch(/password|tokenHash|session/i)
    expect(call.where.accountStatus).toBe('active')
  })

  it('returns a safe traveler DTO without auth internals', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(travelerA as never)
    mockDetailCounts()
    vi.mocked(prisma.booking.count).mockResolvedValueOnce(4).mockResolvedValueOnce(1)
    vi.mocked(prisma.dealClaim.count).mockResolvedValueOnce(3).mockResolvedValueOnce(2)
    const detail = await adminGetTraveler('user-a')
    expect(detail.email).toBe('anna@example.com')
    expect(detail.marketplace.bookingCount).toBe(4)
    expect(detail.marketplace.completedBookingCount).toBe(1)
    expect(detail.canRestrict).toBe(true)
    expect(detail.safety.openReportsAgainstContent).toBe(0)
    expect(JSON.stringify(detail)).not.toContain('HASH')
    expect(JSON.stringify(detail)).not.toContain('token')
  })

  it('404s for missing travelers and admin users', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    await expect(adminGetTraveler('missing')).rejects.toMatchObject({ statusCode: 404 })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...travelerA, role: 'admin' } as never)
    await expect(adminGetTraveler('admin-1')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns only the requested traveler claims and preserves null snapshots', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(travelerA as never)
    vi.mocked(prisma.dealClaim.count).mockResolvedValue(1)
    vi.mocked(prisma.dealClaim.findMany).mockResolvedValue([
      {
        id: 'claim-a',
        code: 'DLV-1',
        status: 'REDEEMED',
        dealId: 'deal-a',
        titleSnapshot: 'Sunset',
        currencySnapshot: 'NAD',
        originalPriceSnapshot: null,
        dealPriceSnapshot: null,
        discountSummarySnapshot: '10% off',
        termsSnapshot: 'Bring ID',
        redemptionInstructionsSnapshot: 'Show code',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        redeemedAt: new Date('2026-02-02T00:00:00.000Z'),
        deal: { title: 'Sunset', business: { id: 'biz-a', name: 'Desert Sky' } },
        bookings: [{ id: 'bk-a', bookingReference: 'DLV-BK-AAAA' }],
      },
    ] as never)
    const result = await adminListTravelerClaims('user-a', { page: 1, pageSize: 25 })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.originalPriceSnapshot).toBeNull()
    expect(result.items[0]?.savingAmountSnapshot).toBeNull()
    expect(result.items[0]?.dealPriceSnapshot).toBeNull()
    expect(vi.mocked(prisma.dealClaim.findMany).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ where: { userId: 'user-a' } }),
    )
  })

  it('scopes journeys to the traveler author only', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(travelerA as never)
    vi.mocked(prisma.journey.count).mockResolvedValue(0)
    vi.mocked(prisma.journey.findMany).mockResolvedValue([])
    await adminListTravelerJourneys('user-a', { page: 1, pageSize: 25 })
    expect(vi.mocked(prisma.journey.findMany).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ where: { authorId: 'user-a', deletedAt: null } }),
    )
  })

  it('keeps claim snapshot money on the backend and does not mix travelers', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(travelerA as never)
    vi.mocked(prisma.dealClaim.count).mockResolvedValue(1)
    vi.mocked(prisma.dealClaim.findMany).mockResolvedValue([
      {
        id: 'claim-b',
        code: 'DLV-2',
        status: 'CONFIRMED',
        dealId: 'deal-b',
        titleSnapshot: 'Dune',
        currencySnapshot: 'USD',
        originalPriceSnapshot: '100.00',
        dealPriceSnapshot: '80.00',
        discountSummarySnapshot: 'USD 20 off',
        termsSnapshot: null,
        redemptionInstructionsSnapshot: null,
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        redeemedAt: null,
        deal: { title: 'Dune', business: { id: 'biz-b', name: 'Dunes' } },
        bookings: [],
      },
    ] as never)
    const result = await adminListTravelerClaims('user-a', {})
    expect(result.items[0]?.savingAmountSnapshot).toBe('20.00')
    expect(result.items[0]?.originalPriceSnapshot).toBe('100.00')
  })

  it('groups traveler finance by currency and omits settlement economics', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(travelerA as never)
    vi.mocked(prisma.payment.groupBy).mockResolvedValue([
      { currency: 'NAD', _sum: { amount: '50.00' }, _count: { _all: 1 } },
      { currency: 'USD', _sum: { amount: '20.00' }, _count: { _all: 1 } },
    ] as never)
    vi.mocked(prisma.refund.groupBy).mockResolvedValue([
      { currency: 'NAD', _sum: { amount: '10.00' }, _count: { _all: 1 } },
    ] as never)
    vi.mocked(prisma.paymentDispute.groupBy).mockResolvedValue([
      { currency: 'USD', _sum: { amount: '20.00' }, _count: { _all: 1 } },
    ] as never)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'pay-a',
        bookingId: 'bk-a',
        amount: '50.00',
        currency: 'NAD',
        status: 'PAID',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        paidAt: new Date('2026-03-01T00:00:00.000Z'),
        booking: { bookingReference: 'DLV-BK-AAAA' },
        paymentDisputes: [],
        stripePaymentIntentId: 'pi_secret',
        clientSecret: 'cs_secret',
      },
    ] as never)
    vi.mocked(prisma.refund.findMany).mockResolvedValue([])
    vi.mocked(prisma.paymentDispute.findMany).mockResolvedValue([])
    vi.mocked(prisma.payment.count).mockResolvedValue(1)
    vi.mocked(prisma.refund.count).mockResolvedValue(0)
    vi.mocked(prisma.paymentDispute.count).mockResolvedValue(0)
    const result = await adminGetTravelerFinancial('user-a', { page: 1, pageSize: 25 })
    expect(result.byCurrency.map(r => r.currency)).toEqual(['NAD', 'USD'])
    expect(result.byCurrency.find(r => r.currency === 'NAD')?.paymentsPaid).toBe('50.00')
    expect(result.byCurrency.find(r => r.currency === 'USD')?.paymentsPaid).toBe('20.00')
    expect(JSON.stringify(result)).not.toContain('pi_secret')
    expect(JSON.stringify(result)).not.toContain('cs_secret')
    expect(JSON.stringify(result)).not.toContain('businessNet')
    expect(vi.mocked(prisma.payment.findMany).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ where: { userId: 'user-a' } }),
    )
  })

  it('restricts an active traveler, revokes sessions, audits, and preserves history tables', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(travelerA as never)
      .mockResolvedValue({ ...travelerA, accountStatus: 'restricted' } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({ ...travelerA, accountStatus: 'restricted' } as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 2 } as never)
    mockDetailCounts()
    const result = await adminRestrictTraveler('admin-1', 'sess-admin', 'user-a')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { accountStatus: 'restricted' },
    })
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-a', revokedAt: null },
        data: expect.objectContaining({ revokedReason: 'admin_restricted' }),
      }),
    )
    expect(writeAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRAVELER_ACCOUNT_RESTRICTED', targetId: 'user-a' }),
    )
    expect(prisma.booking.findMany).not.toHaveBeenCalledWith(expect.objectContaining({ deleteMany: expect.anything() }))
    expect(result.canRestore).toBe(true)
  })

  it('rejects invalid restrict/restore transitions', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...travelerA, accountStatus: 'deactivated' } as never)
    await expect(adminRestrictTraveler('admin-1', 's', 'user-a')).rejects.toBeInstanceOf(AppError)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...travelerA, accountStatus: 'active' } as never)
    await expect(adminRestoreTraveler('admin-1', 's', 'user-a')).rejects.toBeInstanceOf(AppError)
  })

  it('restores restricted accounts to active when email is verified', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ ...travelerA, accountStatus: 'restricted' } as never)
      .mockResolvedValue({ ...travelerA, accountStatus: 'active' } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({ ...travelerA, accountStatus: 'active' } as never)
    mockDetailCounts()
    await adminRestoreTraveler('admin-1', 'sess-admin', 'user-a')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { accountStatus: 'active' },
    })
    expect(writeAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRAVELER_ACCOUNT_RESTORED', targetId: 'user-a' }),
    )
  })
})
