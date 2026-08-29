import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    business: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    businessMember: {
      findUnique: vi.fn(),
    },
    businessArea: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    listing: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@delve/database'
import { AppError } from '../src/middleware/error-handler.js'
import {
  createBusinessArea,
  deleteBusinessArea,
  listBusinessAreas,
  updateBusinessArea,
} from '../src/modules/business/business.service.js'
import { createListing, updateListing } from '../src/modules/listing/listing.service.ts'

const owner = {
  id: 'user-owner',
  email: 'owner@example.com',
  username: 'owner',
  emailVerifiedAt: new Date(),
  accountStatus: 'active',
}

const manager = {
  id: 'user-manager',
  email: 'manager@example.com',
  username: 'manager',
  emailVerifiedAt: new Date(),
  accountStatus: 'active',
}

const editor = {
  id: 'user-editor',
  email: 'editor@example.com',
  username: 'editor',
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

const businessA = {
  id: 'biz-a',
  name: 'Desert Sun Lodge',
  slug: 'desert-sun-lodge',
  status: 'VERIFIED',
}

const businessB = {
  id: 'biz-b',
  name: 'Coastal Retreat',
  slug: 'coastal-retreat',
  status: 'VERIFIED',
}

const areaA = {
  id: 'area-a-1',
  businessId: 'biz-a',
  name: 'Desert Sun Restaurant',
  category: 'Restaurant',
  description: 'Fine dining',
  logoUrl: null,
  coverUrl: null,
  createdAt: new Date('2026-08-29T10:00:00.000Z'),
  updatedAt: new Date('2026-08-29T10:00:00.000Z'),
}

const areaB = {
  id: 'area-b-1',
  businessId: 'biz-b',
  name: 'Coastal Spa',
  category: 'Spa',
  description: 'Wellness & massage',
  logoUrl: null,
  coverUrl: null,
  createdAt: new Date('2026-08-29T10:00:00.000Z'),
  updatedAt: new Date('2026-08-29T10:00:00.000Z'),
}

describe('BusinessArea Authorization & Ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows OWNER and MANAGER to list business areas', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'mem-1',
      userId: owner.id,
      businessId: businessA.id,
      role: 'OWNER',
    } as never)
    vi.mocked(prisma.businessArea.findMany).mockResolvedValue([areaA] as never)

    const list = await listBusinessAreas(owner.id, businessA.id)
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('Desert Sun Restaurant')
  })

  it('allows CONTENT_EDITOR to list business areas', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(editor as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'mem-editor',
      userId: editor.id,
      businessId: businessA.id,
      role: 'CONTENT_EDITOR',
    } as never)
    vi.mocked(prisma.businessArea.findMany).mockResolvedValue([areaA] as never)

    const list = await listBusinessAreas(editor.id, businessA.id)
    expect(list).toHaveLength(1)
  })

  it('blocks non-members from listing areas', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(stranger as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(null)

    await expect(listBusinessAreas(stranger.id, businessA.id)).rejects.toMatchObject({
      statusCode: 403,
      code: 'NOT_A_MEMBER',
    })
  })

  it('allows OWNER and MANAGER to create a BusinessArea', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(manager as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'mem-mgr',
      userId: manager.id,
      businessId: businessA.id,
      role: 'MANAGER',
    } as never)
    vi.mocked(prisma.businessArea.create).mockResolvedValue({
      ...areaA,
      name: 'Desert Sun Activities',
      category: 'Activities',
    } as never)

    const created = await createBusinessArea(manager.id, businessA.id, {
      name: 'Desert Sun Activities',
      category: 'Activities',
    })
    expect(created.name).toBe('Desert Sun Activities')
    expect(created.category).toBe('Activities')
  })

  it('blocks CONTENT_EDITOR from creating a BusinessArea', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(editor as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'mem-ed',
      userId: editor.id,
      businessId: businessA.id,
      role: 'CONTENT_EDITOR',
    } as never)

    await expect(
      createBusinessArea(editor.id, businessA.id, { name: 'Unauthorized Area', category: 'Spa' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'INSUFFICIENT_ROLE',
    })
  })

  it('blocks updating an area belonging to a different business', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'mem-owner',
      userId: owner.id,
      businessId: businessA.id,
      role: 'OWNER',
    } as never)

    // areaB belongs to businessB, not businessA
    vi.mocked(prisma.businessArea.findUnique).mockResolvedValue(areaB as never)

    await expect(
      updateBusinessArea(owner.id, businessA.id, areaB.id, { name: 'Hijacked Name' }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  })

  it('blocks deleting an area belonging to a different business', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'mem-owner',
      userId: owner.id,
      businessId: businessA.id,
      role: 'OWNER',
    } as never)

    vi.mocked(prisma.businessArea.findUnique).mockResolvedValue(areaB as never)

    await expect(deleteBusinessArea(owner.id, businessA.id, areaB.id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  })

  it('rejects cross-business businessAreaId when creating a listing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'mem-owner',
      userId: owner.id,
      businessId: businessA.id,
      role: 'OWNER',
    } as never)

    // areaB belongs to businessB, but listing is being created for businessA
    vi.mocked(prisma.businessArea.findUnique).mockResolvedValue(areaB as never)

    const dummyEnv = { PUBLIC_MEDIA_URL_BASE: 'https://media.example' } as never

    await expect(
      createListing(dummyEnv, owner.id, businessA.id, {
        title: 'Cross Business Listing',
        businessAreaId: areaB.id,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('accepts valid businessAreaId from the same business on listing creation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(owner as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'mem-owner',
      userId: owner.id,
      businessId: businessA.id,
      role: 'OWNER',
    } as never)

    // areaA belongs to businessA
    vi.mocked(prisma.businessArea.findUnique).mockResolvedValue(areaA as never)

    const createdListing = {
      id: 'lst-1',
      businessId: businessA.id,
      businessAreaId: areaA.id,
      title: 'Traditional Dinner Experience',
      description: null,
      status: 'DRAFT' as const,
      coverMediaId: null,
      priceAmount: null,
      currency: null,
      createdAt: new Date('2026-08-29T10:00:00.000Z'),
      updatedAt: new Date('2026-08-29T10:00:00.000Z'),
      media: [],
      businessArea: {
        id: areaA.id,
        name: areaA.name,
        category: areaA.category,
      },
    }

    vi.mocked(prisma.listing.create).mockResolvedValue(createdListing as never)

    const dummyEnv = { PUBLIC_MEDIA_URL_BASE: 'https://media.example' } as never

    const result = await createListing(dummyEnv, owner.id, businessA.id, {
      title: 'Traditional Dinner Experience',
      businessAreaId: areaA.id,
    })

    expect(result.businessAreaId).toBe(areaA.id)
    expect(result.businessArea?.name).toBe('Desert Sun Restaurant')
  })
})
