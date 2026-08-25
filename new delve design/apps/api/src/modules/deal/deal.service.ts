import { prisma } from '@delve/database'
import type {
  CreateDealBody,
  DealDto,
  DealDiscountType,
  DealPricing,
  DealStatus,
  PublicDealsQuery,
  UpdateDealBody,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { requireBusinessMembership } from '../business/business.service.js'
import { computeDealPrice, computedPriceToDto, DealPricingError } from './deal-pricing.js'
import { isDelvePreviewBusinessSlug } from './preview-deal.js'

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

/** Prisma Decimal or plain number from mocks / drivers. */
function decimalToNumber(value: { toString(): string } | number): number {
  return typeof value === 'number' ? value : Number(value.toString())
}

function assertDiscount(type: DealDiscountType, value: number) {
  if (type === 'PERCENTAGE') {
    if (value <= 0 || value > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Percentage discount must be greater than 0 and at most 100.')
    }
  } else if (value < 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Fixed discount must not be negative.')
  } else if (value > 1_000_000) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Fixed discount is too large.')
  }
}

function assertDateRange(start: Date, end: Date) {
  if (!(start instanceof Date) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError(400, 'VALIDATION_ERROR', 'startDate and endDate must be valid dates.')
  }
  if (start.getTime() >= end.getTime()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'startDate must be before endDate.')
  }
}

export function formatDealDiscountSummary(type: DealDiscountType, value: number, currency: string): string {
  if (type === 'PERCENTAGE') return `${value}% off`
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2)
  return `${currency} ${formatted} off`
}

function resolveStatus(status: DealStatus, startDate: Date, endDate: Date, now = new Date()): DealStatus {
  if (status === 'PUBLISHED' && endDate.getTime() < now.getTime()) return 'EXPIRED'
  return status
}

function isActiveDeal(status: DealStatus, startDate: Date, endDate: Date, now = new Date()): boolean {
  const effective = resolveStatus(status, startDate, endDate, now)
  if (effective !== 'PUBLISHED') return false
  const t = now.getTime()
  return startDate.getTime() <= t && endDate.getTime() >= t
}

function pricingFromError(err: unknown): never {
  if (err instanceof DealPricingError) {
    throw new AppError(400, err.code, err.message)
  }
  throw err
}

function resolveDealPricing(row: DealRow): DealPricing | null {
  const discountValue = decimalToNumber(row.discountValue)
  const frozen = row.publishedBasePrice != null && row.publishedCurrency
  const liveListing = row.listing?.priceAmount != null && row.listing.currency
  try {
    if (frozen) {
      return computedPriceToDto(
        computeDealPrice({
          listingPrice: row.publishedBasePrice,
          listingCurrency: row.publishedCurrency,
          discountType: row.discountType,
          discountValue,
          dealCurrency: row.publishedCurrency,
        }),
      )
    }
    const previewStatuses: DealStatus[] = ['DRAFT', 'PENDING_REVIEW', 'REJECTED']
    if (liveListing && previewStatuses.includes(row.status)) {
      return computedPriceToDto(
        computeDealPrice({
          listingPrice: row.listing!.priceAmount,
          listingCurrency: row.listing!.currency,
          discountType: row.discountType,
          discountValue,
          dealCurrency: row.listing!.currency,
        }),
      )
    }
  } catch {
    return null
  }
  return null
}

type DealRow = {
  id: string
  businessId: string
  listingId: string | null
  title: string
  description: string | null
  discountType: DealDiscountType
  discountValue: { toString(): string } | number
  currency: string
  startDate: Date
  endDate: Date
  status: DealStatus
  city?: string | null
  countryCode?: string | null
  category?: string | null
  featured?: boolean
  featuredRank?: number | null
  claimMethod?: DealDto['claimMethod']
  maxClaims?: number | null
  terms?: string | null
  eligibility?: string | null
  included?: string | null
  excluded?: string | null
  viewCount?: number
  claimCount?: number
  createdAt: Date
  updatedAt: Date
  coverMedia?: { secureUrl: string | null } | null
  publishedBasePrice?: { toString(): string } | number | null
  publishedCurrency?: string | null
  business: { id: string; name: string; slug: string; logoUrl: string | null }
  listing: {
    id: string
    title: string
    status: string
    priceAmount?: { toString(): string } | number | null
    currency?: string | null
  } | null
}

function toDealDto(row: DealRow, now = new Date()): DealDto {
  const discountValue = decimalToNumber(row.discountValue)
  const status = resolveStatus(row.status, row.startDate, row.endDate, now)
  const t = now.getTime()
  const start = row.startDate.getTime()
  const end = row.endDate.getTime()
  const publishedLike = status === 'PUBLISHED'
  return {
    id: row.id,
    businessId: row.businessId,
    listingId: row.listingId,
    title: row.title,
    description: row.description,
    discountType: row.discountType,
    discountValue,
    currency: row.currency,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    status,
    isActive: isActiveDeal(row.status, row.startDate, row.endDate, now),
    isScheduled: publishedLike && start > t && end >= t,
    discountSummary: formatDealDiscountSummary(row.discountType, discountValue, row.currency),
    coverUrl: row.coverMedia?.secureUrl ?? null,
    city: row.city ?? null,
    countryCode: row.countryCode ?? null,
    category: row.category ?? null,
    featured: Boolean(row.featured),
    featuredRank: row.featuredRank ?? null,
    claimMethod: row.claimMethod ?? 'IN_APP',
    maxClaims: row.maxClaims ?? null,
    terms: row.terms ?? null,
    eligibility: row.eligibility ?? null,
    included: row.included ?? null,
    excluded: row.excluded ?? null,
    viewCount: row.viewCount ?? 0,
    claimCount: row.claimCount ?? 0,
    listing: row.listing
      ? { id: row.listing.id, title: row.listing.title, status: row.listing.status }
      : null,
    business: {
      id: row.business.id,
      name: row.business.name,
      slug: row.business.slug,
      logoUrl: row.business.logoUrl,
    },
    pricing: resolveDealPricing(row),
    isPreview: isDelvePreviewBusinessSlug(row.business.slug),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const dealInclude = {
  business: { select: { id: true, name: true, slug: true, logoUrl: true } },
  listing: { select: { id: true, title: true, status: true, priceAmount: true, currency: true } },
  coverMedia: { select: { secureUrl: true } },
} as const

function extraCreateData(body: CreateDealBody) {
  return {
    coverMediaId: body.coverMediaId ?? null,
    city: body.city ?? null,
    countryCode: body.countryCode ?? null,
    category: body.category ?? null,
    claimMethod: body.claimMethod ?? 'IN_APP',
    maxClaims: body.maxClaims ?? null,
    terms: body.terms ?? null,
    eligibility: body.eligibility ?? null,
    included: body.included ?? null,
    excluded: body.excluded ?? null,
  }
}

async function loadDealListing(listingId: string, businessId: string) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, businessId },
    select: { id: true, priceAmount: true, currency: true },
  })
  if (!listing) {
    throw new AppError(400, 'VALIDATION_ERROR', 'listingId must belong to this business.')
  }
  return listing
}

async function assertListingBelongsToBusiness(listingId: string | null | undefined, businessId: string) {
  if (!listingId) return
  await loadDealListing(listingId, businessId)
}

function pricedDealFromListing(
  listing: { priceAmount: { toString(): string } | number | null; currency: string | null },
  discountType: DealDiscountType,
  discountValue: number,
  dealCurrency?: string | null,
) {
  try {
    return computeDealPrice({
      listingPrice: listing.priceAmount,
      listingCurrency: listing.currency,
      discountType,
      discountValue,
      dealCurrency: dealCurrency ?? listing.currency,
    })
  } catch (err) {
    pricingFromError(err)
  }
}

async function requirePricedListingForSubmission(
  listingId: string | null | undefined,
  businessId: string,
  discountType: DealDiscountType,
  discountValue: number,
  dealCurrency?: string | null,
) {
  if (!listingId) {
    throw new AppError(
      400,
      'LISTING_REQUIRED',
      'A priced listing is required before this deal can be submitted or published.',
    )
  }
  const listing = await loadDealListing(listingId, businessId)
  return pricedDealFromListing(listing, discountType, discountValue, dealCurrency)
}

export async function createDeal(userId: string, businessId: string, body: CreateDealBody): Promise<DealDto> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER'])

  const startDate = new Date(body.startDate)
  const endDate = new Date(body.endDate)
  assertDateRange(startDate, endDate)
  assertDiscount(body.discountType, body.discountValue)
  await assertListingBelongsToBusiness(body.listingId, businessId)

  const status = body.status ?? 'DRAFT'
  assertProviderStatus(status)
  let currency = (body.currency ?? 'USD').toUpperCase()
  if (status === 'PENDING_REVIEW') {
    const priced = await requirePricedListingForSubmission(
      body.listingId ?? null,
      businessId,
      body.discountType,
      body.discountValue,
      body.currency,
    )
    currency = priced.currency
  } else if (body.listingId) {
    const listing = await loadDealListing(body.listingId, businessId)
    if (listing.priceAmount != null && listing.currency) {
      currency = pricedDealFromListing(listing, body.discountType, body.discountValue, body.currency).currency
    }
  }

  const row = await prisma.deal.create({
    data: {
      businessId,
      listingId: body.listingId ?? null,
      title: body.title,
      description: body.description ?? null,
      discountType: body.discountType,
      discountValue: body.discountValue,
      currency,
      startDate,
      endDate,
      status,
      ...extraCreateData(body),
    },
    include: dealInclude,
  })
  return toDealDto(row)
}

export async function listBusinessDeals(userId: string, businessId: string): Promise<DealDto[]> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER', 'CONTENT_EDITOR'])

  const rows = await prisma.deal.findMany({
    where: { businessId },
    include: dealInclude,
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(row => toDealDto(row))
}

export async function getDeal(userId: string, dealId: string): Promise<DealDto> {
  await requireVerifiedUser(userId)
  const row = await prisma.deal.findUnique({
    where: { id: dealId },
    include: dealInclude,
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  await requireBusinessMembership(userId, row.businessId, ['OWNER', 'MANAGER', 'CONTENT_EDITOR'])
  return toDealDto(row)
}

export async function updateDeal(userId: string, dealId: string, body: UpdateDealBody): Promise<DealDto> {
  await requireVerifiedUser(userId)
  const existing = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  await requireBusinessMembership(userId, existing.businessId, ['OWNER', 'MANAGER'])

  const discountType = (body.discountType ?? existing.discountType) as DealDiscountType
  const discountValue =
    body.discountValue !== undefined ? body.discountValue : decimalToNumber(existing.discountValue)
  assertDiscount(discountType, discountValue)

  const startDate = body.startDate ? new Date(body.startDate) : existing.startDate
  const endDate = body.endDate ? new Date(body.endDate) : existing.endDate
  assertDateRange(startDate, endDate)

  if (body.listingId !== undefined) {
    await assertListingBelongsToBusiness(body.listingId, existing.businessId)
  }
  if (body.status !== undefined) {
    assertProviderStatus(body.status, existing.status as DealStatus)
  }

  const listingId = body.listingId !== undefined ? body.listingId : existing.listingId
  const nextStatus = (body.status ?? existing.status) as DealStatus
  let currency = body.currency !== undefined ? body.currency : existing.currency
  const freezeReset =
    nextStatus === 'DRAFT' || nextStatus === 'PENDING_REVIEW'
      ? { publishedBasePrice: null, publishedCurrency: null }
      : {}

  if (nextStatus === 'PENDING_REVIEW') {
    const priced = await requirePricedListingForSubmission(
      listingId,
      existing.businessId,
      discountType,
      discountValue,
      currency,
    )
    currency = priced.currency
  } else if (listingId) {
    const listing = await loadDealListing(listingId, existing.businessId)
    if (listing.priceAmount != null && listing.currency) {
      currency = pricedDealFromListing(listing, discountType, discountValue, currency).currency
    }
  }

  const row = await prisma.deal.update({
    where: { id: dealId },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.listingId !== undefined ? { listingId: body.listingId } : {}),
      ...(body.discountType !== undefined ? { discountType: body.discountType } : {}),
      ...(body.discountValue !== undefined ? { discountValue: body.discountValue } : {}),
      currency,
      ...freezeReset,
      ...(body.startDate !== undefined ? { startDate } : {}),
      ...(body.endDate !== undefined ? { endDate } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.coverMediaId !== undefined ? { coverMediaId: body.coverMediaId } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.countryCode !== undefined ? { countryCode: body.countryCode } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.claimMethod !== undefined ? { claimMethod: body.claimMethod } : {}),
      ...(body.maxClaims !== undefined ? { maxClaims: body.maxClaims } : {}),
      ...(body.terms !== undefined ? { terms: body.terms } : {}),
      ...(body.eligibility !== undefined ? { eligibility: body.eligibility } : {}),
      ...(body.included !== undefined ? { included: body.included } : {}),
      ...(body.excluded !== undefined ? { excluded: body.excluded } : {}),
    },
    include: dealInclude,
  })
  return toDealDto(row)
}

export async function previewDealPrice(
  userId: string,
  businessId: string,
  input: { listingId: string; discountType: DealDiscountType; discountValue: number; currency?: string },
): Promise<DealPricing> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER', 'CONTENT_EDITOR'])
  const priced = await requirePricedListingForSubmission(
    input.listingId,
    businessId,
    input.discountType,
    input.discountValue,
    input.currency,
  )
  return computedPriceToDto(priced)
}

/**
 * Freeze live listing price onto the Deal at admin approve.
 * Public DTOs and new claims use publishedBasePrice/publishedCurrency until the deal
 * returns to DRAFT or PENDING_REVIEW (clears freeze) and is approved again (refreshes freeze).
 * Listing price edits never mutate published deals or existing claim snapshots.
 */
export async function freezeDealPricingForApprove(deal: {
  listingId: string | null
  businessId: string
  discountType: DealDiscountType
  discountValue: { toString(): string } | number
  currency: string
}) {
  const priced = await requirePricedListingForSubmission(
    deal.listingId,
    deal.businessId,
    deal.discountType,
    decimalToNumber(deal.discountValue),
    deal.currency,
  )
  return {
    publishedBasePrice: priced.originalPrice,
    publishedCurrency: priced.currency,
    currency: priced.currency,
  }
}

export async function persistExpiredDeals(now = new Date()) {
  try {
    await prisma.deal.updateMany({
      where: { status: 'PUBLISHED', endDate: { lt: now } },
      data: { status: 'EXPIRED', featured: false, featuredRank: null },
    })
  } catch {
    /* schema not migrated yet — ignore */
  }
}

export async function persistExpiredClaims(now = new Date()) {
  try {
    await prisma.dealClaim.updateMany({
      where: { status: { in: ['PENDING', 'CONFIRMED'] }, expiresAt: { lt: now } },
      data: { status: 'EXPIRED' },
    })
  } catch {
    /* schema not migrated yet — ignore */
  }
}

const PUBLIC_HIDDEN_STATUSES: DealStatus[] = ['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'ARCHIVED']

function assertProviderStatus(next: DealStatus | undefined, existing?: DealStatus) {
  if (next === undefined) return
  if (next !== 'DRAFT' && next !== 'PENDING_REVIEW') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'Providers can only set DRAFT or PENDING_REVIEW.')
  }
  if (!existing) return
  if (existing === 'PUBLISHED' || existing === 'EXPIRED' || existing === 'ARCHIVED') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'Published deals are moderated by Delve admin.')
  }
  if (existing === 'REJECTED' && next !== 'DRAFT' && next !== 'PENDING_REVIEW') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'Rejected deals can be revised as DRAFT or resubmitted.')
  }
}

/** Traveler-facing published deals (active window unless includeScheduled). */
export async function listPublicActiveDeals(
  limit = 40,
  businessId?: string | null,
  query: PublicDealsQuery = {},
): Promise<DealDto[]> {
  const now = new Date()
  await persistExpiredDeals(now)
  const take = Math.min(100, Math.max(1, query.limit ?? limit))
  const q = query.q?.trim()
  const featuredOnly = query.featured === true
  const sort = query.sort ?? (featuredOnly ? 'featured' : 'endingSoon')
  const bizId = query.businessId ?? businessId ?? null
  // Public discovery never includes future scheduled deals.

  const orderBy =
    sort === 'newest'
      ? [{ createdAt: 'desc' as const }]
      : sort === 'featured'
        ? [{ featuredRank: 'asc' as const }, { endDate: 'asc' as const }]
        : sort === 'discount'
          ? [{ discountValue: 'desc' as const }]
          : [{ endDate: 'asc' as const }]

  const rows = await prisma.deal.findMany({
    where: {
      status: 'PUBLISHED',
      endDate: { gte: now },
      startDate: { lte: now },
      business: { status: 'VERIFIED' },
      ...(bizId ? { businessId: bizId } : {}),
      ...(featuredOnly ? { featured: true } : {}),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { city: { contains: q, mode: 'insensitive' } },
              { category: { contains: q, mode: 'insensitive' } },
              { business: { name: { contains: q, mode: 'insensitive' } } },
              { listing: { title: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: dealInclude,
    orderBy,
    take,
  })
  return rows.map(row => hideUnpublishedListing(toDealDto(row, now))).filter(d => d.isActive)
}

export async function searchPublicDeals(q: string, limit = 10): Promise<DealDto[]> {
  if (!q.trim()) return []
  return listPublicActiveDeals(limit, null, { q: q.trim(), limit })
}

export async function getPublicDeal(dealId: string): Promise<DealDto> {
  await persistExpiredDeals()
  const row = await prisma.deal.findFirst({
    where: {
      id: dealId,
      business: { status: 'VERIFIED' },
    },
    include: dealInclude,
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  const dto = hideUnpublishedListing(toDealDto(row))
  if (PUBLIC_HIDDEN_STATUSES.includes(dto.status) || dto.isScheduled) {
    throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  }
  if (!dto.isActive && dto.status !== 'EXPIRED') {
    throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  }
  return dto
}

/** Draft/paused/archived listing titles must not leak on traveler surfaces. */
export function hideUnpublishedListing(dto: DealDto): DealDto {
  if (dto.listing && dto.listing.status !== 'PUBLISHED') {
    return { ...dto, listing: null, listingId: null }
  }
  return dto
}

export { toDealDto, dealInclude, requireVerifiedUser }
