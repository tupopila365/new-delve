import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    businessMember: { findUnique: vi.fn() },
    listing: { findFirst: vi.fn() },
    deal: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import { prisma } from '@delve/database'
import { createDealBodySchema } from '@delve/contracts'
import {
  createDeal,
  listPublicActiveDeals,
  updateDeal,
} from '../src/modules/deal/deal.service.js'

const owner = {
  id: 'u1',
  emailVerifiedAt: new Date(),
  accountStatus: 'active',
}

const membership = { id: 'm1', userId: 'u1', businessId: 'b1', role: 'OWNER' }

const business = { id: 'b1', name: 'Desert Co', slug: 'desert-co', logoUrl: null }

function dealRow(overrides: Record<string, unknown> = {}) {
  const start = new Date(Date.now() - 60_000)
  const end = new Date(Date.now() + 86_400_000)
  return {
    id: 'd1',
    businessId: 'b1',
    listingId: null,
    title: 'Spring Escape',
    description: null,
    discountType: 'PERCENTAGE',
    discountValue: 15,
    currency: 'USD',
    startDate: start,
    endDate: end,
    status: 'PUBLISHED',
    createdAt: new Date(),
    updatedAt: new Date(),
    business,
    listing: null,
    ...overrides,
  }
}

describe('deal contracts', () => {
  it('rejects percentage outside bounds', () => {
    const parsed = createDealBodySchema.safeParse({
      title: 'Bad',
      discountType: 'PERCENTAGE',
      discountValue: 150,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 1000).toISOString(),
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects negative fixed amount', () => {
    const parsed = createDealBodySchema.safeParse({
      title: 'Bad',
      discountType: 'FIXED_AMOUNT',
      discountValue: -5,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 1000).toISOString(),
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects start after end', () => {
    const parsed = createDealBodySchema.safeParse({
      title: 'Bad',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      startDate: new Date(Date.now() + 5000).toISOString(),
      endDate: new Date().toISOString(),
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects provider self-publish on create', () => {
    const parsed = createDealBodySchema.safeParse({
      title: 'Live now',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 1000).toISOString(),
      status: 'PUBLISHED',
    })
    expect(parsed.success).toBe(false)
  })
})

describe('deal service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(membership as never)
  })

  it('creates a deal for the business owner', async () => {
    vi.mocked(prisma.deal.create).mockResolvedValue(dealRow({ status: 'DRAFT' }) as never)
    const dto = await createDeal('u1', 'b1', {
      title: 'Spring Escape',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      startDate: new Date(Date.now() - 1000).toISOString(),
      endDate: new Date(Date.now() + 86_400_000).toISOString(),
      status: 'DRAFT',
    })
    expect(dto.title).toBe('Spring Escape')
    expect(dto.discountSummary).toBe('15% off')
    expect(dto.business.name).toBe('Desert Co')
  })

  it('lists only active published deals publicly', async () => {
    vi.mocked(prisma.deal.findMany).mockResolvedValue([dealRow()] as never)

    const rows = await listPublicActiveDeals()
    expect(rows.every(d => d.isActive)).toBe(true)
    expect(rows).toHaveLength(1)
  })

  it('filters public deals by businessId when provided', async () => {
    vi.mocked(prisma.deal.findMany).mockResolvedValue([dealRow()] as never)
    await listPublicActiveDeals(10, 'b1')
    expect(prisma.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'b1',
          status: 'PUBLISHED',
          business: { status: 'VERIFIED' },
        }),
      }),
    )
  })

  it('blocks non-members from updating', async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(dealRow() as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(null)

    await expect(updateDeal('stranger', 'd1', { title: 'Hijack' })).rejects.toMatchObject({
      code: 'NOT_A_MEMBER',
      statusCode: 403,
    })
  })

  it('ignores includeScheduled on public discovery', async () => {
    vi.mocked(prisma.deal.findMany).mockResolvedValue([dealRow()] as never)
    await listPublicActiveDeals(10, null, { includeScheduled: true })
    expect(prisma.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PUBLISHED',
          startDate: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      }),
    )
  })

  it('blocks provider from publishing via update', async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(dealRow({ status: 'DRAFT' }) as never)
    await expect(updateDeal('u1', 'd1', { status: 'PUBLISHED' as never })).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
    })
  })
})
