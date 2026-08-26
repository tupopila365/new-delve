import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    business: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    businessMember: { findMany: vi.fn() },
    listing: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    deal: { count: vi.fn(), groupBy: vi.fn() },
    dealReport: { count: vi.fn() },
    booking: { count: vi.fn() },
    payment: { findMany: vi.fn() },
    businessPayable: { count: vi.fn(), findMany: vi.fn() },
    refund: { findMany: vi.fn() },
    paymentDispute: { count: vi.fn(), findMany: vi.fn() },
    transferReversal: { findMany: vi.fn() },
    financialReconciliationIssue: { count: vi.fn() },
    financialRecoveryCase: { count: vi.fn(), findMany: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}))

vi.mock('@delve/database/decimal', () => {
  class Decimal {
    constructor(private v: string | number) {}
    toDecimalPlaces() {
      return this
    }
    toFixed() {
      return Number(this.v).toFixed(2)
    }
    toString() {
      return String(this.v)
    }
  }
  return { Decimal }
})

vi.mock('../src/modules/admin/admin-audit.js', () => ({ writeAdminAudit: vi.fn() }))
vi.mock('../src/modules/payment/financial-report.service.js', () => ({
  adminBusinessFinancialReport: vi.fn(async () => ({ period: {}, byCurrency: [] })),
}))
vi.mock('../src/modules/payment/connect.service.js', () => ({
  adminRefreshConnectStatus: vi.fn(async () => ({
    status: 'ACTIVE',
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
    requirementsDueCount: 0,
    settlementReady: true,
    onboardingCompletedAt: null,
  })),
}))
vi.mock('../src/modules/media/media.service.js', () => ({
  mediaAssetToDto: vi.fn((_env: unknown, row: { id: string }) => ({
    id: row.id,
    publicId: 'p',
    version: 1,
    resourceType: 'image',
    format: 'jpg',
    bytes: 1,
    width: 1,
    height: 1,
    duration: null,
    status: 'READY',
    purpose: 'listing',
    altText: null,
    delivery: { url: 'https://cdn.example/x.jpg' },
    createdAt: new Date().toISOString(),
  })),
}))

import { prisma } from '@delve/database'
import { writeAdminAudit } from '../src/modules/admin/admin-audit.js'
import {
  adminGetBusiness,
  adminGetListing,
  adminListBusinesses,
  adminListListings,
  adminRejectBusinessVerification,
  adminVerifyBusiness,
} from '../src/modules/admin/admin-marketplace.service.js'
import { connectReadinessLabel, isSettlementReady } from '../src/modules/payment/stripe-connect-status.js'
import { AppError } from '../src/middleware/error-handler.js'

const biz = {
  id: 'biz-a',
  name: 'Desert Sky',
  slug: 'desert-sky',
  description: 'Tours',
  logoUrl: null,
  coverUrl: null,
  email: 'ops@desert.test',
  phone: null,
  website: null,
  city: 'Swakopmund',
  countryCode: 'NA',
  address: null,
  category: 'Tours',
  status: 'PENDING_VERIFICATION',
  stripeAccountId: 'acct_secret',
  stripeAccountStatus: 'ONBOARDING',
  stripeChargesEnabled: false,
  stripePayoutsEnabled: false,
  stripeDetailsSubmitted: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  members: [
    {
      id: 'm1',
      role: 'OWNER',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      user: { username: 'owner1', email: 'owner@desert.test', travelerProfile: { displayName: 'Ada' }, passwordHash: 'nope' },
    },
  ],
  _count: { listings: 2, bookings: 4 },
}

describe('admin marketplace businesses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.deal.groupBy).mockResolvedValue([])
    vi.mocked(prisma.deal.count).mockResolvedValue(0)
    vi.mocked(prisma.listing.count).mockResolvedValue(0)
    vi.mocked(prisma.booking.count).mockResolvedValue(0)
    vi.mocked(prisma.dealReport.count).mockResolvedValue(0)
    vi.mocked(prisma.paymentDispute.count).mockResolvedValue(0)
    vi.mocked(prisma.businessPayable.count).mockResolvedValue(0)
    vi.mocked(prisma.financialReconciliationIssue.count).mockResolvedValue(0)
    vi.mocked(prisma.financialRecoveryCase.count).mockResolvedValue(0)
  })

  it('paginates businesses and never returns stripe account ids', async () => {
    vi.mocked(prisma.business.count).mockResolvedValue(1)
    vi.mocked(prisma.business.findMany).mockResolvedValue([biz] as never)
    const result = await adminListBusinesses({ page: '1', pageSize: '25' })
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(25)
    expect(result.total).toBe(1)
    expect(result.items[0]?.name).toBe('Desert Sky')
    expect(JSON.stringify(result)).not.toContain('acct_secret')
    expect(JSON.stringify(result)).not.toContain('passwordHash')
    expect(prisma.business.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 25, skip: 0 }))
  })

  it('filters by status without loading every business', async () => {
    vi.mocked(prisma.business.count).mockResolvedValue(0)
    vi.mocked(prisma.business.findMany).mockResolvedValue([])
    await adminListBusinesses({ status: 'VERIFIED', page: '2', pageSize: '50' })
    expect(prisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50,
        take: 50,
        where: expect.objectContaining({ status: 'VERIFIED' }),
      }),
    )
  })

  it('returns 404 for missing business detail', async () => {
    vi.mocked(prisma.business.findUnique).mockResolvedValue(null)
    await expect(adminGetBusiness('missing')).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })
  })

  it('does not leak members or finance from another business', async () => {
    vi.mocked(prisma.business.findUnique).mockResolvedValue(biz as never)
    const detail = await adminGetBusiness('biz-a')
    expect(detail.id).toBe('biz-a')
    expect(detail.owner?.email).toBe('owner@desert.test')
    expect(detail.connect.label).toBe('Setup incomplete')
    expect(detail.canVerify).toBe(true)
    expect(JSON.stringify(detail)).not.toContain('acct_secret')
    expect(JSON.stringify(detail)).not.toContain('passwordHash')
    expect(prisma.listing.count).toHaveBeenCalledWith({ where: { businessId: 'biz-a' } })
    expect(prisma.deal.count).toHaveBeenCalledWith({ where: { businessId: 'biz-a' } })
  })

  it('verifies eligible businesses and writes audit', async () => {
    vi.mocked(prisma.business.findUnique).mockResolvedValueOnce(biz as never).mockResolvedValue({ ...biz, status: 'VERIFIED', members: biz.members } as never)
    vi.mocked(prisma.business.update).mockResolvedValue({ ...biz, status: 'VERIFIED' } as never)
    const result = await adminVerifyBusiness('admin-1', 'sess-1', 'biz-a')
    expect(result.status).toBe('VERIFIED')
    expect(writeAdminAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'BUSINESS_VERIFIED', targetId: 'biz-a' }))
  })

  it('rejects invalid verification transitions', async () => {
    vi.mocked(prisma.business.findUnique).mockResolvedValue({ ...biz, status: 'VERIFIED' } as never)
    await expect(adminVerifyBusiness('admin-1', 'sess-1', 'biz-a')).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
    })
    expect(prisma.business.update).not.toHaveBeenCalled()
  })

  it('rejects verification for draft or pending only', async () => {
    vi.mocked(prisma.business.findUnique).mockResolvedValueOnce({ ...biz, status: 'VERIFIED' } as never)
    await expect(adminRejectBusinessVerification('admin-1', 'sess-1', 'biz-a')).rejects.toBeInstanceOf(AppError)
  })
})

describe('admin marketplace listings', () => {
  const env = { CLOUDINARY_CLOUD_NAME: 'delve' } as never

  it('paginates and distinguishes null vs zero price', async () => {
    vi.mocked(prisma.listing.count).mockResolvedValue(2)
    vi.mocked(prisma.listing.findMany).mockResolvedValue([
      {
        id: 'l1',
        title: 'Free walk',
        status: 'PUBLISHED',
        priceAmount: 0,
        currency: 'NAD',
        businessId: 'biz-a',
        createdAt: new Date(),
        updatedAt: new Date(),
        business: { id: 'biz-a', name: 'Desert Sky', status: 'VERIFIED' },
        _count: { deals: 0, bookings: 1 },
      },
      {
        id: 'l2',
        title: 'Quote later',
        status: 'DRAFT',
        priceAmount: null,
        currency: null,
        businessId: 'biz-a',
        createdAt: new Date(),
        updatedAt: new Date(),
        business: { id: 'biz-a', name: 'Desert Sky', status: 'VERIFIED' },
        _count: { deals: 0, bookings: 0 },
      },
    ] as never)
    const result = await adminListListings(env, { businessId: 'biz-a', page: '1', pageSize: '25' })
    expect(result.items[0]?.pricing).toEqual({ amount: '0.00', currency: 'NAD' })
    expect(result.items[1]?.pricing).toBeNull()
  })

  it('returns 404 for missing listing', async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(null)
    await expect(adminGetListing(env, 'nope')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('connect readiness labels', () => {
  it('never treats not-connected as settlement ready', () => {
    expect(
      isSettlementReady({ stripeAccountStatus: 'NOT_CONNECTED', stripePayoutsEnabled: false, stripeChargesEnabled: false }),
    ).toBe(false)
    expect(
      connectReadinessLabel({ stripeAccountStatus: 'NOT_CONNECTED', stripePayoutsEnabled: false, stripeChargesEnabled: false }),
    ).toBe('Not connected')
    expect(
      connectReadinessLabel({ stripeAccountStatus: 'ACTIVE', stripePayoutsEnabled: true, stripeChargesEnabled: true }),
    ).toBe('Settlement ready')
  })
})
