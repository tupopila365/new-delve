import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type {
  CreateListingBody,
  ListingDto,
  ListingMediaDto,
  ListingPublicDto,
  UpdateListingBody,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { requireBusinessMembership } from '../business/business.service.js'
import { mediaAssetToDto } from '../media/media.service.js'

async function requireVerifiedUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  if (user.accountStatus === 'deactivated') {
    throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'This account has been deactivated.')
  }
  if (user.accountStatus === 'disabled' || user.accountStatus === 'restricted') {
    throw new AppError(403, 'ACCOUNT_RESTRICTED', 'This account is restricted. Contact support.')
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before continuing.')
  }
  return user
}

type MediaRow = {
  id: string
  publicId: string
  version: number | null
  resourceType: string
  format: string | null
  bytes: number | null
  width: number | null
  height: number | null
  duration: number | null
  status: string
  purpose: string
  altText: string | null
  createdAt: Date
  deletedAt: Date | null
}

type BusinessAreaSummaryRow = {
  id: string
  name: string
  category: string
}

type ListingCore = {
  id: string
  businessId: string
  businessAreaId?: string | null
  businessArea?: BusinessAreaSummaryRow | null
  title: string
  description: string | null
  status: ListingDto['status']
  coverMediaId: string | null
  priceAmount: { toString(): string } | number | null
  currency: string | null
  createdAt: Date
  updatedAt: Date
  media: MediaRow[]
}

type BusinessSummaryRow = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  city: string | null
  countryCode: string | null
  category: string | null
}

function toMoneyString(value: { toString(): string } | number): string {
  const raw = typeof value === 'number' ? value : value.toString()
  return new Decimal(raw).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)
}

function listingPricingDto(listing: ListingCore): ListingDto['pricing'] {
  if (listing.priceAmount == null || !listing.currency) return null
  return { amount: toMoneyString(listing.priceAmount), currency: listing.currency }
}

function toListingDto(env: Env, listing: ListingCore): ListingDto {
  const media: ListingMediaDto[] = listing.media
    .filter(m => !m.deletedAt && (m.status === 'READY' || m.status === 'PROCESSING'))
    .map(m => ({
      ...mediaAssetToDto(env, m),
      isCover: listing.coverMediaId === m.id,
    }))

  return {
    id: listing.id,
    businessId: listing.businessId,
    businessAreaId: listing.businessAreaId ?? null,
    businessArea: listing.businessArea
      ? {
          id: listing.businessArea.id,
          name: listing.businessArea.name,
          category: listing.businessArea.category,
        }
      : null,
    title: listing.title,
    description: listing.description,
    status: listing.status,
    coverMediaId: listing.coverMediaId,
    pricing: listingPricingDto(listing),
    media,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  }
}

function toListingPublicDto(env: Env, listing: ListingCore & { business: BusinessSummaryRow }): ListingPublicDto {
  return {
    ...toListingDto(env, listing),
    business: {
      id: listing.business.id,
      name: listing.business.name,
      slug: listing.business.slug,
      logoUrl: listing.business.logoUrl,
      city: listing.business.city,
      countryCode: listing.business.countryCode,
      category: listing.business.category,
    },
  }
}

const listingInclude = {
  businessArea: {
    select: {
      id: true,
      name: true,
      category: true,
    },
  },
  media: {
    where: { deletedAt: null, purpose: 'listing' as const },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
}

const listingPublicInclude = {
  ...listingInclude,
  business: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      city: true,
      countryCode: true,
      category: true,
      status: true,
    },
  },
}

async function validateBusinessAreaOwnership(businessId: string, businessAreaId?: string | null) {
  if (!businessAreaId) return
  const area = await prisma.businessArea.findUnique({
    where: { id: businessAreaId },
    select: { id: true, businessId: true },
  })
  if (!area || area.businessId !== businessId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'businessAreaId must belong to the same business.')
  }
}

export async function createListing(
  env: Env,
  userId: string,
  businessId: string,
  body: CreateListingBody,
): Promise<ListingDto> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER'])
  await validateBusinessAreaOwnership(businessId, body.businessAreaId)

  const listing = await prisma.listing.create({
    data: {
      businessId,
      businessAreaId: body.businessAreaId ?? null,
      title: body.title,
      description: body.description ?? null,
      status: 'DRAFT',
      priceAmount: body.priceAmount ?? null,
      currency: body.currency ?? null,
    },
    include: listingInclude,
  })
  return toListingDto(env, listing)
}

export async function listBusinessListings(
  env: Env,
  userId: string,
  businessId: string,
): Promise<ListingDto[]> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER', 'CONTENT_EDITOR'])

  const rows = await prisma.listing.findMany({
    where: { businessId },
    include: listingInclude,
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(row => toListingDto(env, row))
}

export async function getListing(env: Env, userId: string, listingId: string): Promise<ListingDto> {
  await requireVerifiedUser(userId)
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: listingInclude,
  })
  if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found.')
  await requireBusinessMembership(userId, listing.businessId, ['OWNER', 'MANAGER', 'CONTENT_EDITOR'])
  return toListingDto(env, listing)
}

/** Public-safe single listing — published only, with business summary. */
export async function getListingPublic(env: Env, listingId: string): Promise<ListingPublicDto> {
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      status: 'PUBLISHED',
      business: { status: 'VERIFIED' },
    },
    include: listingPublicInclude,
  })
  if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found.')
  return toListingPublicDto(env, listing)
}

export type PublicListingFilters = {
  limit?: number
  city?: string | null
  category?: string | null
  q?: string | null
}

/**
 * Traveler discovery: published listings for VERIFIED businesses only.
 * Optional city/category filter against BusinessArea fields or fallback Business fields.
 */
export async function listPublicListings(
  env: Env,
  filters: PublicListingFilters = {},
): Promise<ListingPublicDto[]> {
  const limit = Math.min(100, Math.max(1, filters.limit ?? 40))
  const city = filters.city?.trim() || null
  const category = filters.category?.trim() || null
  const q = filters.q?.trim() || null

  const rows = await prisma.listing.findMany({
    where: {
      status: 'PUBLISHED',
      business: {
        status: 'VERIFIED',
        ...(city
          ? { city: { equals: city, mode: 'insensitive' as const } }
          : {}),
      },
      ...(category
        ? {
            OR: [
              { businessArea: { category: { equals: category, mode: 'insensitive' as const } } },
              {
                businessAreaId: null,
                business: { category: { equals: category, mode: 'insensitive' as const } },
              },
            ],
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
              { business: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    },
    include: listingPublicInclude,
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })
  return rows.map(row => toListingPublicDto(env, row))
}

/** Traveler-facing: published listings for a public business profile. */
export async function listPublicListingsByBusiness(
  env: Env,
  businessId: string,
  limit = 40,
): Promise<ListingPublicDto[]> {
  if (!businessId.trim()) throw new AppError(400, 'VALIDATION_ERROR', 'businessId required')

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, status: true },
  })
  if (!business || business.status !== 'VERIFIED') {
    throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  }

  const rows = await prisma.listing.findMany({
    where: { businessId, status: 'PUBLISHED' },
    include: listingPublicInclude,
    orderBy: { updatedAt: 'desc' },
    take: Math.min(100, Math.max(1, limit)),
  })
  return rows.map(row => toListingPublicDto(env, row))
}

export async function updateListing(
  env: Env,
  userId: string,
  listingId: string,
  body: UpdateListingBody,
): Promise<ListingDto> {
  await requireVerifiedUser(userId)
  const existing = await prisma.listing.findUnique({ where: { id: listingId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Listing not found.')
  await requireBusinessMembership(userId, existing.businessId, ['OWNER', 'MANAGER'])

  if (body.businessAreaId !== undefined && body.businessAreaId !== null) {
    await validateBusinessAreaOwnership(existing.businessId, body.businessAreaId)
  }

  if (body.coverMediaId) {
    const media = await prisma.mediaAsset.findFirst({
      where: {
        id: body.coverMediaId,
        listingId,
        deletedAt: null,
        purpose: 'listing',
        resourceType: 'image',
      },
    })
    if (!media) {
      throw new AppError(400, 'VALIDATION_ERROR', 'coverMediaId must reference an image on this listing.')
    }
  }

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.businessAreaId !== undefined ? { businessAreaId: body.businessAreaId } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.coverMediaId !== undefined ? { coverMediaId: body.coverMediaId } : {}),
      ...(body.priceAmount !== undefined
        ? { priceAmount: body.priceAmount, currency: body.priceAmount == null ? null : (body.currency ?? existing.currency) }
        : body.currency !== undefined
          ? { currency: body.currency }
          : {}),
    },
    include: listingInclude,
  })
  return toListingDto(env, listing)
}

export async function countListingsForBusiness(businessId: string): Promise<number> {
  return prisma.listing.count({ where: { businessId } })
}
