import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    businessMember: { findUnique: vi.fn(), findMany: vi.fn() },
    listing: { findFirst: vi.fn() },
    deal: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    dealClaim: { findUnique: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../src/modules/admin/admin-audit.js', () => ({ writeAdminAudit: vi.fn() }))
vi.mock('../src/modules/notifications/notify.js', () => ({ createNotification: vi.fn() }))

import { prisma } from '@delve/database'
import { getPublicDeal } from '../src/modules/deal/deal.service.js'
import { adminModerateDeal, claimDeal } from '../src/modules/deal/deal-ops.service.js'

const owner = { id: 'u1', emailVerifiedAt: new Date(), accountStatus: 'active' }
const membership = { id: 'm1', userId: 'u1', businessId: 'b1', role: 'OWNER' }
const now = Date.now()

function listingRow(price: number | null) {
  return {
    id: 'l1',
    priceAmount: price,
    currency: price == null ? null : 'NAD',
  }
}

function dealRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    businessId: 'b1',
    listingId: 'l1',
    title: 'Sossusvlei Tour',
    description: null,
    discountType: 'PERCENTAGE',
    discountValue: 25,
    currency: 'NAD',
    startDate: new Date(now - 60_000),
    endDate: new Date(now + 86_400_000),
    status: 'PENDING_REVIEW',
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedBasePrice: null,
    publishedCurrency: null,
    business: { id: 'b1', name: 'Desert Co', slug: 'desert-co', logoUrl: null, status: 'VERIFIED' },
    listing: { id: 'l1', title: 'Sossusvlei Tour', status: 'PUBLISHED', priceAmount: 1200, currency: 'NAD' },
    coverMedia: null,
    ...overrides,
  }
}

describe('published deal price freeze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(membership as never)
    vi.mocked(prisma.deal.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.dealClaim.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([])
  })

  it('freezes 1200+25% as 900 on approve and ignores later listing 1400', async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(dealRow() as never)
    vi.mocked(prisma.listing.findFirst).mockResolvedValue(listingRow(1200) as never)
    const published = {
      ...dealRow({
        status: 'PUBLISHED',
        publishedBasePrice: 1200,
        publishedCurrency: 'NAD',
        listing: { id: 'l1', title: 'Sossusvlei Tour', status: 'PUBLISHED', priceAmount: 1400, currency: 'NAD' },
      }),
    }
    vi.mocked(prisma.deal.update).mockResolvedValue(published as never)

    const approved = await adminModerateDeal('admin', 's1', 'd1', 'approve')
    expect(approved.pricing?.dealAmount).toBe('900.00')
    expect(approved.pricing?.originalAmount).toBe('1200.00')

    vi.mocked(prisma.deal.findFirst).mockResolvedValue(published as never)
    const publicDto = await getPublicDeal('d1')
    expect(publicDto.pricing?.dealAmount).toBe('900.00')
    expect(publicDto.pricing?.originalAmount).toBe('1200.00')
  })

  it('fails approval when listing price is missing', async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(dealRow() as never)
    vi.mocked(prisma.listing.findFirst).mockResolvedValue(listingRow(null) as never)
    await expect(adminModerateDeal('admin', 's1', 'd1', 'approve')).rejects.toMatchObject({
      code: 'DEAL_PRICE_UNAVAILABLE',
    })
  })

  it('snapshots claim prices from the freeze and keeps them if listing changes', async () => {
    const published = dealRow({
      status: 'PUBLISHED',
      publishedBasePrice: 1200,
      publishedCurrency: 'NAD',
      listing: { id: 'l1', title: 'Sossusvlei Tour', status: 'PUBLISHED', priceAmount: 1400, currency: 'NAD' },
    })
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(published as never)
    vi.mocked(prisma.dealClaim.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const create = vi.fn().mockResolvedValue({
        id: 'c1',
        dealId: 'd1',
        userId: 'u1',
        status: 'PENDING',
        code: 'DLV-AA11BB22',
        note: null,
        titleSnapshot: 'Sossusvlei Tour',
        discountTypeSnapshot: 'PERCENTAGE',
        discountValueSnapshot: 25,
        currencySnapshot: 'NAD',
        originalPriceSnapshot: 1200,
        dealPriceSnapshot: 900,
        discountSummarySnapshot: '25% off',
        termsSnapshot: null,
        eligibilitySnapshot: null,
        includedSnapshot: null,
        excludedSnapshot: null,
        redemptionInstructionsSnapshot: 'Show this claim code at the business to redeem.',
        expiresAt: new Date(now + 86_400_000),
        redeemedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: 'd1',
            claimCount: 0,
            maxClaims: null,
            title: 'Sossusvlei Tour',
            discountType: 'PERCENTAGE',
            discountValue: 25,
            currency: 'NAD',
            endDate: new Date(now + 86_400_000),
            terms: null,
            eligibility: null,
            included: null,
            excluded: null,
            claimMethod: 'IN_APP',
            publishedBasePrice: 1200,
            publishedCurrency: 'NAD',
          },
        ]),
        dealClaim: { create },
        deal: { update: vi.fn() },
        dealAnalyticsEvent: { create: vi.fn() },
      }
      return fn(tx as never)
    })

    const claim = await claimDeal('u1', 'd1', {})
    expect(claim.originalPriceSnapshot).toBe(1200)
    expect(claim.dealPriceSnapshot).toBe(900)
    expect(claim.savingAmountSnapshot).toBe(300)
  })

  it('re-approval refreshes freeze from the current listing price', async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(
      dealRow({ status: 'PENDING_REVIEW', publishedBasePrice: null, publishedCurrency: null }) as never,
    )
    vi.mocked(prisma.listing.findFirst).mockResolvedValue(listingRow(1400) as never)
    const republished = dealRow({
      status: 'PUBLISHED',
      publishedBasePrice: 1400,
      publishedCurrency: 'NAD',
      listing: { id: 'l1', title: 'Sossusvlei Tour', status: 'PUBLISHED', priceAmount: 1400, currency: 'NAD' },
    })
    vi.mocked(prisma.deal.update).mockResolvedValue(republished as never)
    const approved = await adminModerateDeal('admin', 's1', 'd1', 'approve')
    expect(approved.pricing?.originalAmount).toBe('1400.00')
    expect(approved.pricing?.dealAmount).toBe('1050.00')
    expect(approved.pricing?.savingAmount).toBe('350.00')
  })

  it('rejects claiming a published deal with no freeze', async () => {
    const published = dealRow({ status: 'PUBLISHED', publishedBasePrice: null, publishedCurrency: null })
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(published as never)
    vi.mocked(prisma.dealClaim.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: 'd1',
            claimCount: 0,
            maxClaims: null,
            title: 'Sossusvlei Tour',
            discountType: 'PERCENTAGE',
            discountValue: 25,
            currency: 'NAD',
            endDate: new Date(now + 86_400_000),
            terms: null,
            eligibility: null,
            included: null,
            excluded: null,
            claimMethod: 'IN_APP',
            publishedBasePrice: null,
            publishedCurrency: null,
          },
        ]),
        dealClaim: { create: vi.fn() },
        deal: { update: vi.fn() },
        dealAnalyticsEvent: { create: vi.fn() },
      }
      return fn(tx as never)
    })
    await expect(claimDeal('u1', 'd1', {})).rejects.toMatchObject({ code: 'DEAL_PRICE_UNAVAILABLE' })
  })

  it('returns a legacy claim with null snapshots', async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(dealRow({ status: 'PUBLISHED' }) as never)
    vi.mocked(prisma.dealClaim.findUnique).mockResolvedValue({
      id: 'legacy',
      dealId: 'd1',
      userId: 'u1',
      status: 'PENDING',
      code: 'DLV-OLD',
      note: null,
      titleSnapshot: 'Old',
      discountTypeSnapshot: 'PERCENTAGE',
      discountValueSnapshot: 10,
      currencySnapshot: 'USD',
      originalPriceSnapshot: null,
      dealPriceSnapshot: null,
      discountSummarySnapshot: '10% off',
      termsSnapshot: null,
      eligibilitySnapshot: null,
      includedSnapshot: null,
      excludedSnapshot: null,
      redemptionInstructionsSnapshot: null,
      expiresAt: new Date(now + 1000),
      redeemedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    const existing = await claimDeal('u1', 'd1', {})
    expect(existing.originalPriceSnapshot).toBeNull()
    expect(existing.dealPriceSnapshot).toBeNull()
  })
})
