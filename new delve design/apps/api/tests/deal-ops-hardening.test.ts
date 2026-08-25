import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    businessMember: { findMany: vi.fn(), findUnique: vi.fn() },
    deal: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    dealClaim: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    dealReport: { findUnique: vi.fn(), create: vi.fn() },
    dealAnalyticsEvent: { create: vi.fn(), count: vi.fn() },
    business: { findUnique: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

vi.mock('../src/modules/admin/admin-audit.js', () => ({
  writeAdminAudit: vi.fn(),
}))

vi.mock('../src/modules/notifications/notify.js', () => ({
  createNotification: vi.fn(),
}))

import { prisma } from '@delve/database'
import { adminModerateDeal, claimDeal, reportDeal } from '../src/modules/deal/deal-ops.service.js'

const owner = { id: 'u1', emailVerifiedAt: new Date(), accountStatus: 'active' }
const now = Date.now()
const activeDeal = {
  id: 'd1',
  businessId: 'b1',
  listingId: null,
  title: 'Spring Escape',
  description: null,
  discountType: 'PERCENTAGE',
  discountValue: 15,
  currency: 'USD',
  startDate: new Date(now - 60_000),
  endDate: new Date(now + 86_400_000),
  status: 'PUBLISHED',
  createdAt: new Date(),
  updatedAt: new Date(),
  claimCount: 0,
  maxClaims: 1,
  business: { id: 'b1', name: 'Desert Co', slug: 'desert-co', logoUrl: null, status: 'VERIFIED' },
  listing: null,
  coverMedia: null,
}

describe('deal ops hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.deal.updateMany).mockResolvedValue({ count: 0 } as never)
  })

  it('admin cannot approve a draft', async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({ ...activeDeal, status: 'DRAFT' } as never)
    await expect(adminModerateDeal('admin', 's1', 'd1', 'approve')).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
    })
  })

  it('does not return report resolution to travelers', async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(activeDeal as never)
    vi.mocked(prisma.dealReport.findUnique).mockResolvedValue({
      id: 'r1',
      dealId: 'd1',
      reporterId: 'u1',
      reason: 'SPAM',
      details: null,
      status: 'OPEN',
      resolution: 'secret admin note',
      createdAt: new Date(),
    } as never)
    const dto = await reportDeal('u1', 'd1', { reason: 'SPAM' })
    expect(dto).not.toHaveProperty('resolution')
  })

  it('blocks claims on Delve preview deals', async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue({
      ...activeDeal,
      business: { ...activeDeal.business, slug: 'delve-preview-copper-table' },
    } as never)
    await expect(claimDeal('u1', 'd1', {})).rejects.toMatchObject({
      code: 'PREVIEW_OFFER',
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('locks inventory inside the claim transaction', async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(activeDeal as never)
    vi.mocked(prisma.dealClaim.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: 'd1',
            claimCount: 0,
            maxClaims: 1,
            title: 'Spring Escape',
            discountType: 'PERCENTAGE',
            discountValue: 15,
            currency: 'USD',
            endDate: new Date(now + 86_400_000),
            terms: null,
            eligibility: null,
            included: null,
            excluded: null,
            claimMethod: 'IN_APP',
            publishedBasePrice: 100,
            publishedCurrency: 'USD',
          },
        ]),
        dealClaim: {
          create: vi.fn().mockResolvedValue({
            id: 'c1',
            dealId: 'd1',
            userId: 'u1',
            status: 'PENDING',
            code: 'DLV-TEST',
            note: null,
            titleSnapshot: 'Spring Escape',
            discountTypeSnapshot: 'PERCENTAGE',
            discountValueSnapshot: 15,
            currencySnapshot: 'USD',
            originalPriceSnapshot: 100,
            dealPriceSnapshot: 85,
            discountSummarySnapshot: '15% off',
            termsSnapshot: null,
            eligibilitySnapshot: null,
            includedSnapshot: null,
            excludedSnapshot: null,
            redemptionInstructionsSnapshot: 'Show this claim code at the business to redeem.',
            expiresAt: new Date(now + 86_400_000),
            redeemedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        deal: { update: vi.fn() },
        dealAnalyticsEvent: { create: vi.fn() },
      }
      return fn(tx as never)
    })
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([])

    const claim = await claimDeal('u1', 'd1', {})
    expect(claim.titleSnapshot).toBe('Spring Escape')
    expect(claim.discountValueSnapshot).toBe(15)
    expect(claim.originalPriceSnapshot).toBe(100)
    expect(claim.dealPriceSnapshot).toBe(85)
    expect(prisma.$transaction).toHaveBeenCalled()
  })
})
