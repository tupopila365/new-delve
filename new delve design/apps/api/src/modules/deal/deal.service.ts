import { prisma } from '@delve/database'
import type {
  CreateDealBody,
  DealDto,
  DealDiscountType,
  DealStatus,
  UpdateDealBody,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { requireBusinessMembership } from '../business/business.service.js'

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

function discountSummary(type: DealDiscountType, value: number, currency: string): string {
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
  createdAt: Date
  updatedAt: Date
  business: { id: string; name: string; slug: string; logoUrl: string | null }
  listing: { id: string; title: string; status: string } | null
}

function toDealDto(row: DealRow, now = new Date()): DealDto {
  const discountValue = decimalToNumber(row.discountValue)
  const status = resolveStatus(row.status, row.startDate, row.endDate, now)
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
    discountSummary: discountSummary(row.discountType, discountValue, row.currency),
    listing: row.listing
      ? { id: row.listing.id, title: row.listing.title, status: row.listing.status }
      : null,
    business: {
      id: row.business.id,
      name: row.business.name,
      slug: row.business.slug,
      logoUrl: row.business.logoUrl,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const dealInclude = {
  business: { select: { id: true, name: true, slug: true, logoUrl: true } },
  listing: { select: { id: true, title: true, status: true } },
} as const

async function assertListingBelongsToBusiness(listingId: string | null | undefined, businessId: string) {
  if (!listingId) return
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, businessId },
    select: { id: true },
  })
  if (!listing) {
    throw new AppError(400, 'VALIDATION_ERROR', 'listingId must belong to this business.')
  }
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
  const currency = body.currency ?? 'USD'

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

  const row = await prisma.deal.update({
    where: { id: dealId },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.listingId !== undefined ? { listingId: body.listingId } : {}),
      ...(body.discountType !== undefined ? { discountType: body.discountType } : {}),
      ...(body.discountValue !== undefined ? { discountValue: body.discountValue } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.startDate !== undefined ? { startDate } : {}),
      ...(body.endDate !== undefined ? { endDate } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
    include: dealInclude,
  })
  return toDealDto(row)
}

/** Traveler-facing: published deals that are currently active (not expired / not future-only). */
export async function listPublicActiveDeals(
  limit = 40,
  businessId?: string | null,
): Promise<DealDto[]> {
  const now = new Date()
  const rows = await prisma.deal.findMany({
    where: {
      status: 'PUBLISHED',
      startDate: { lte: now },
      endDate: { gte: now },
      business: { status: 'VERIFIED' },
      ...(businessId ? { businessId } : {}),
    },
    include: dealInclude,
    orderBy: { endDate: 'asc' },
    take: Math.min(100, Math.max(1, limit)),
  })
  return rows.map(row => toDealDto(row, now)).filter(d => d.isActive).map(hideUnpublishedListing)
}

export async function getPublicDeal(dealId: string): Promise<DealDto> {
  const row = await prisma.deal.findFirst({
    where: {
      id: dealId,
      business: { status: 'VERIFIED' },
    },
    include: dealInclude,
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  const dto = hideUnpublishedListing(toDealDto(row))
  if (!dto.isActive) {
    throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  }
  return dto
}

/** Draft/paused/archived listing titles must not leak on traveler surfaces. */
function hideUnpublishedListing(dto: DealDto): DealDto {
  if (dto.listing && dto.listing.status !== 'PUBLISHED') {
    return { ...dto, listing: null, listingId: null }
  }
  return dto
}
