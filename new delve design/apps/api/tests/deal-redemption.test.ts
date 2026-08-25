import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    businessMember: { findUnique: vi.fn() },
    business: { findUnique: vi.fn() },
    deal: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    dealClaim: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    dealAnalyticsEvent: { create: vi.fn(), count: vi.fn() },
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
import { writeAdminAudit } from '../src/modules/admin/admin-audit.js'
import { createNotification } from '../src/modules/notifications/notify.js'
import {
  listBusinessDealClaims,
  lookupBusinessDealClaim,
  redeemBusinessDealClaim,
} from '../src/modules/deal/deal-ops.service.js'

const owner = { id: 'u-owner', emailVerifiedAt: new Date(), accountStatus: 'active' }
const traveler = { id: 'u-traveler', emailVerifiedAt: new Date(), accountStatus: 'active' }
const future = new Date(Date.now() + 86_400_000)
const past = new Date(Date.now() - 86_400_000)

function membership(role: 'OWNER' | 'MANAGER' | 'CONTENT_EDITOR', businessId = 'b1') {
  return { id: 'm1', userId: owner.id, businessId, role }
}

function claimLock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    dealId: 'd1',
    userId: traveler.id,
    status: 'PENDING',
    businessId: 'b1',
    expiresAt: future,
    redeemedAt: null,
    titleSnapshot: '25% Off Sossusvlei Tour',
    ...overrides,
  }
}

function redeemedDto(redeemedAt: Date) {
  return {
    id: 'c1',
    dealId: 'd1',
    userId: traveler.id,
    status: 'REDEEMED',
    code: 'DLV-82K9L4',
    note: null,
    titleSnapshot: '25% Off Sossusvlei Tour',
    discountTypeSnapshot: 'PERCENTAGE',
    discountValueSnapshot: 25,
    currencySnapshot: 'NAD',
    originalPriceSnapshot: null,
    dealPriceSnapshot: null,
    discountSummarySnapshot: '25% off',
    termsSnapshot: 'Show at desk',
    eligibilitySnapshot: null,
    includedSnapshot: null,
    excludedSnapshot: null,
    redemptionInstructionsSnapshot: 'Show this claim code at the business to redeem.',
    expiresAt: future,
    redeemedAt,
    createdAt: new Date(),
    updatedAt: redeemedAt,
    deal: {
      id: 'd1',
      businessId: 'b1',
      listingId: null,
      title: '25% Off Sossusvlei Tour',
      description: null,
      discountType: 'PERCENTAGE',
      discountValue: 25,
      currency: 'NAD',
      startDate: new Date(),
      endDate: future,
      status: 'PUBLISHED',
      createdAt: new Date(),
      updatedAt: new Date(),
      business: { id: 'b1', name: 'Desert Co', slug: 'desert-co', logoUrl: null },
      listing: null,
      coverMedia: null,
    },
    user: { username: 'tupopila', travelerProfile: { displayName: 'Tupopila' } },
  }
}

describe('deal claim redemption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.deal.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.dealClaim.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(membership('OWNER') as never)
    vi.mocked(prisma.business.findUnique).mockResolvedValue({ slug: 'desert-co' } as never)
  })

  it('lets OWNER list own business claims', async () => {
    vi.mocked(prisma.dealClaim.findMany).mockResolvedValue([
      { ...redeemedDto(new Date()), status: 'PENDING', redeemedAt: null },
    ] as never)
    const rows = await listBusinessDealClaims(owner.id, 'b1')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.titleSnapshot).toBe('25% Off Sossusvlei Tour')
    expect(rows[0]!.traveler?.displayName).toBe('Tupopila')
  })

  it('lets MANAGER redeem a valid claim', async () => {
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(membership('MANAGER') as never)
    const redeemedAt = new Date()
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([claimLock()]),
        dealClaim: { update: vi.fn().mockResolvedValue(redeemedDto(redeemedAt)) },
        dealAnalyticsEvent: { create: vi.fn() },
      }
      return fn(tx as never)
    })
    const dto = await redeemBusinessDealClaim(owner.id, 'b1', 'c1')
    expect(dto.status).toBe('REDEEMED')
    expect(dto.redeemedAt).toBe(redeemedAt.toISOString())
    expect(dto.discountSummarySnapshot).toBe('25% off')
    expect(writeAdminAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DEAL_CLAIM_REDEEMED' }))
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DEAL_CLAIM_UPDATED', userId: traveler.id }),
    )
  })

  it('blocks CONTENT_EDITOR from redeeming', async () => {
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(membership('CONTENT_EDITOR') as never)
    await expect(redeemBusinessDealClaim(owner.id, 'b1', 'c1')).rejects.toMatchObject({
      code: 'INSUFFICIENT_ROLE',
    })
  })

  it('does not leak another business claim on lookup', async () => {
    vi.mocked(prisma.dealClaim.findUnique).mockResolvedValue({
      id: 'c-other',
      code: 'DLV-OTHER1',
      status: 'PENDING',
      createdAt: new Date(),
      expiresAt: future,
      redeemedAt: null,
      titleSnapshot: 'Secret',
      discountTypeSnapshot: 'PERCENTAGE',
      discountValueSnapshot: 10,
      currencySnapshot: 'USD',
      discountSummarySnapshot: '10% off',
      originalPriceSnapshot: null,
      dealPriceSnapshot: null,
      deal: { id: 'd2', title: 'Secret', businessId: 'b2' },
      user: { username: 'x', travelerProfile: { displayName: 'X' } },
    } as never)
    await expect(lookupBusinessDealClaim(owner.id, 'b1', 'DLV-OTHER1')).rejects.toMatchObject({
      code: 'CLAIM_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('blocks a traveler with no membership from redeeming', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(traveler as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(null)
    await expect(redeemBusinessDealClaim(traveler.id, 'b1', 'c1')).rejects.toMatchObject({
      code: 'NOT_A_MEMBER',
    })
  })

  it('blocks anonymous redemption', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    await expect(redeemBusinessDealClaim('missing', 'b1', 'c1')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('redeems a valid claim once', async () => {
    const analytics = vi.fn()
    const redeemedAt = new Date()
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([claimLock()]),
        dealClaim: { update: vi.fn().mockResolvedValue(redeemedDto(redeemedAt)) },
        dealAnalyticsEvent: { create: analytics },
      }
      return fn(tx as never)
    })
    await redeemBusinessDealClaim(owner.id, 'b1', 'c1')
    expect(analytics).toHaveBeenCalledWith({ data: { dealId: 'd1', userId: traveler.id, kind: 'REDEEM' } })
  })

  it('rejects a second redemption with 409', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([claimLock({ status: 'REDEEMED', redeemedAt: new Date() })]),
        dealClaim: { update: vi.fn() },
        dealAnalyticsEvent: { create: vi.fn() },
      }
      return fn(tx as never)
    })
    await expect(redeemBusinessDealClaim(owner.id, 'b1', 'c1')).rejects.toMatchObject({
      code: 'ALREADY_REDEEMED',
      statusCode: 409,
    })
  })

  it('rejects expired claims', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([claimLock({ expiresAt: past })]),
        dealClaim: { update: vi.fn() },
        dealAnalyticsEvent: { create: vi.fn() },
      }
      return fn(tx as never)
    })
    await expect(redeemBusinessDealClaim(owner.id, 'b1', 'c1')).rejects.toMatchObject({
      code: 'CLAIM_EXPIRED',
    })
  })

  it('rejects cancelled claims', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([claimLock({ status: 'CANCELLED' })]),
        dealClaim: { update: vi.fn() },
        dealAnalyticsEvent: { create: vi.fn() },
      }
      return fn(tx as never)
    })
    await expect(redeemBusinessDealClaim(owner.id, 'b1', 'c1')).rejects.toMatchObject({
      code: 'CLAIM_CANCELLED',
    })
  })

  it('allows exactly one concurrent redemption', async () => {
    let status = 'PENDING' as string
    let chain = Promise.resolve()
    const analytics = vi.fn()
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const run = chain.then(async () => {
        const tx = {
          $queryRaw: vi.fn().mockImplementation(async () => [claimLock({ status, redeemedAt: status === 'REDEEMED' ? new Date() : null })]),
          dealClaim: {
            update: vi.fn().mockImplementation(async () => {
              status = 'REDEEMED'
              return redeemedDto(new Date())
            }),
          },
          dealAnalyticsEvent: { create: analytics },
        }
        return fn(tx as never)
      })
      chain = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    })

    const results = await Promise.allSettled([
      redeemBusinessDealClaim(owner.id, 'b1', 'c1'),
      redeemBusinessDealClaim(owner.id, 'b1', 'c1'),
    ])
    const ok = results.filter(r => r.status === 'fulfilled')
    const denied = results.filter(r => r.status === 'rejected')
    expect(ok).toHaveLength(1)
    expect(denied).toHaveLength(1)
    expect(denied[0]).toMatchObject({ status: 'rejected' })
    if (denied[0]!.status === 'rejected') {
      expect(denied[0].reason).toMatchObject({ code: 'ALREADY_REDEEMED' })
    }
    expect(analytics).toHaveBeenCalledTimes(1)
  })

  it('keeps claim snapshots after redemption', async () => {
    const redeemedAt = new Date()
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([claimLock()]),
        dealClaim: { update: vi.fn().mockResolvedValue(redeemedDto(redeemedAt)) },
        dealAnalyticsEvent: { create: vi.fn() },
      }
      return fn(tx as never)
    })
    const dto = await redeemBusinessDealClaim(owner.id, 'b1', 'c1')
    expect(dto.titleSnapshot).toBe('25% Off Sossusvlei Tour')
    expect(dto.discountValueSnapshot).toBe(25)
    expect(dto.currencySnapshot).toBe('NAD')
    expect(dto.termsSnapshot).toBe('Show at desk')
  })
})
