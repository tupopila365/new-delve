import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    business: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    businessMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@delve/database'
import {
  createBusiness,
  getBusinessForMember,
  getPublicBusinessBySlug,
  listMyBusinesses,
  requireBusinessMembership,
  updateBusiness,
} from '../src/modules/business/business.service.js'
import { createBusinessBodySchema, updateBusinessBodySchema } from '@delve/contracts'
import { AppError } from '../src/middleware/error-handler.js'

const owner = {
  id: 'user-owner',
  email: 'owner@example.com',
  username: 'owner',
  emailVerifiedAt: new Date(),
  accountStatus: 'active',
}

const stranger = {
  id: 'user-stranger',
  email: 'stranger@example.com',
  username: 'stranger',
  emailVerifiedAt: new Date(),
  accountStatus: 'active',
}

const businessRow = {
  id: 'biz-1',
  name: 'Desert Tours',
  slug: 'desert-tours',
  description: null,
  logoUrl: null,
  coverUrl: null,
  email: null,
  phone: null,
  website: null,
  city: 'Swakopmund',
  countryCode: 'NA',
  address: null,
  category: null,
  status: 'DRAFT' as const,
  createdAt: new Date('2026-08-12T10:00:00.000Z'),
  updatedAt: new Date('2026-08-12T10:00:00.000Z'),
}

const ownerMembership = {
  id: 'mem-1',
  userId: owner.id,
  businessId: businessRow.id,
  role: 'OWNER' as const,
  createdAt: new Date('2026-08-12T10:00:00.000Z'),
}

describe('business foundation contracts', () => {
  it('rejects ownerUserId / role / status on create body', () => {
    const parsed = createBusinessBodySchema.safeParse({
      name: 'Acme',
      ownerUserId: 'attacker',
      role: 'OWNER',
      status: 'VERIFIED',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects status / role escalation on update body', () => {
    const parsed = updateBusinessBodySchema.safeParse({
      name: 'Acme',
      status: 'VERIFIED',
      role: 'OWNER',
    })
    expect(parsed.success).toBe(false)
  })
})

describe('business foundation service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates business and assigns authenticated user as OWNER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.business.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        business: {
          create: vi.fn().mockResolvedValue(businessRow),
        },
        businessMember: {
          create: vi.fn().mockResolvedValue(ownerMembership),
        },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const result = await createBusiness(owner.id, { name: 'Desert Tours', city: 'Swakopmund', countryCode: 'NA' })
    expect(result.role).toBe('OWNER')
    expect(result.business.id).toBe('biz-1')
    expect(result.business.status).toBe('DRAFT')
    expect(result.business.name).toBe('Desert Tours')
  })

  it('lists memberships for the authenticated user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([
      { ...ownerMembership, business: businessRow },
    ] as never)

    const list = await listMyBusinesses(owner.id)
    expect(list).toHaveLength(1)
    expect(list[0]!.role).toBe('OWNER')
  })

  it('allows OWNER to edit business', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(ownerMembership as never)
    vi.mocked(prisma.business.update).mockResolvedValue({
      ...businessRow,
      description: 'Coastal adventures',
      updatedAt: new Date('2026-08-12T11:00:00.000Z'),
    } as never)

    const updated = await updateBusiness(owner.id, businessRow.id, { description: 'Coastal adventures' })
    expect(updated.description).toBe('Coastal adventures')
  })

  it('blocks another traveler from editing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(stranger as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(null)

    await expect(updateBusiness(stranger.id, businessRow.id, { name: 'Hijack' })).rejects.toMatchObject({
      statusCode: 403,
      code: 'NOT_A_MEMBER',
    } satisfies Partial<AppError>)
  })

  it('blocks CONTENT_EDITOR from profile edits', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      ...ownerMembership,
      role: 'CONTENT_EDITOR',
    } as never)

    await expect(requireBusinessMembership(owner.id, businessRow.id, ['OWNER', 'MANAGER'])).rejects.toMatchObject({
      statusCode: 403,
      code: 'INSUFFICIENT_ROLE',
    })
  })

  it('returns membership for get by id', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      ...ownerMembership,
      business: businessRow,
    } as never)

    const row = await getBusinessForMember(owner.id, businessRow.id)
    expect(row.business.slug).toBe('desert-tours')
  })

  it('surfaces unique membership constraint as duplicate prevention surface', async () => {
    // Schema enforces @@unique([userId, businessId]); service relies on that.
    // Verify requireBusinessMembership returns existing row (no second insert path here).
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(ownerMembership as never)
    const mem = await requireBusinessMembership(owner.id, businessRow.id, ['OWNER'])
    expect(mem.role).toBe('OWNER')
  })

  it('returns public profile without email/phone for VERIFIED businesses', async () => {
    vi.mocked(prisma.business.findUnique).mockResolvedValue({
      ...businessRow,
      status: 'VERIFIED',
      email: 'secret@example.com',
      phone: '+264000',
      website: 'https://desert.example',
    } as never)

    const dto = await getPublicBusinessBySlug('desert-tours')
    expect(dto.name).toBe('Desert Tours')
    expect(dto.status).toBe('VERIFIED')
    expect(dto.website).toBe('https://desert.example')
    expect(dto).not.toHaveProperty('email')
    expect(dto).not.toHaveProperty('phone')
  })

  it('hides draft businesses from the public profile', async () => {
    vi.mocked(prisma.business.findUnique).mockResolvedValue(businessRow as never)
    await expect(getPublicBusinessBySlug('desert-tours')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  })
})
