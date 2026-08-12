import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    businessMember: { findUnique: vi.fn() },
    business: { findUnique: vi.fn() },
    listing: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    mediaAsset: { findFirst: vi.fn() },
  },
}))

import { prisma } from '@delve/database'
import { loadEnv } from '../src/config/env.js'
import { createListing, getListing, listPublicListings } from '../src/modules/listing/listing.service.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/delve',
  SESSION_SECRET: 'test-session-secret-at-least-32-chars!!',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  ADMIN_WEB_URL: 'http://localhost:5174',
  ADMIN_WEB_ORIGIN: 'http://localhost:5174',
} as NodeJS.ProcessEnv)

const user = {
  id: 'u1',
  emailVerifiedAt: new Date(),
  accountStatus: 'active',
}

const membership = {
  id: 'm1',
  userId: 'u1',
  businessId: 'b1',
  role: 'OWNER',
}

describe('listing media foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never)
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(membership as never)
  })

  it('creates a listing with empty media array', async () => {
    vi.mocked(prisma.listing.create).mockResolvedValue({
      id: 'l1',
      businessId: 'b1',
      title: 'Desert Day Tour',
      description: null,
      status: 'DRAFT',
      coverMediaId: null,
      createdAt: new Date('2026-08-12T12:00:00.000Z'),
      updatedAt: new Date('2026-08-12T12:00:00.000Z'),
      media: [],
    } as never)

    const dto = await createListing(env, 'u1', 'b1', { title: 'Desert Day Tour' })
    expect(dto.media).toEqual([])
    expect(dto.coverMediaId).toBeNull()
    expect(dto.title).toBe('Desert Day Tour')
  })

  it('returns listing media with isCover flags', async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValue({
      id: 'l1',
      businessId: 'b1',
      title: 'Desert Day Tour',
      description: null,
      status: 'DRAFT',
      coverMediaId: 'media-1',
      createdAt: new Date('2026-08-12T12:00:00.000Z'),
      updatedAt: new Date('2026-08-12T12:00:00.000Z'),
      media: [
        {
          id: 'media-1',
          publicId: 'delve/listings/a',
          version: 1,
          resourceType: 'image',
          format: 'jpg',
          bytes: 1000,
          width: 800,
          height: 600,
          duration: null,
          status: 'READY',
          purpose: 'listing',
          altText: null,
          createdAt: new Date('2026-08-12T12:00:00.000Z'),
          deletedAt: null,
        },
      ],
    } as never)

    const dto = await getListing(env, 'u1', 'l1')
    expect(dto.media).toHaveLength(1)
    expect(dto.media[0]!.isCover).toBe(true)
    expect(dto.media[0]!.delivery.url).toContain('res.cloudinary.com')
  })

  it('lists only published listings for verified businesses publicly', async () => {
    vi.mocked(prisma.listing.findMany).mockResolvedValue([
      {
        id: 'l1',
        businessId: 'b1',
        title: 'Published Tour',
        description: null,
        status: 'PUBLISHED',
        coverMediaId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        media: [],
        business: {
          id: 'b1',
          name: 'Desert Co',
          slug: 'desert-co',
          logoUrl: null,
          city: 'Swakopmund',
          countryCode: 'NA',
          category: 'Activity',
          status: 'VERIFIED',
        },
      },
    ] as never)

    const rows = await listPublicListings(env, { city: 'Swakopmund' })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.business.slug).toBe('desert-co')
    expect(prisma.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PUBLISHED',
          business: expect.objectContaining({ status: 'VERIFIED' }),
        }),
      }),
    )
  })
})
