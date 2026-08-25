import { randomBytes } from 'node:crypto'
import { prisma } from '@delve/database'
import type {
  CreateDealClaimBody,
  CreateDealReportBody,
  DealAnalyticsSummary,
  DealClaimDto,
  DealClaimLookupDto,
  DealClaimValidationStatus,
  DealDto,
  DealReportDto,
  ResolveDealReportBody,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { requireBusinessMembership } from '../business/business.service.js'
import { createNotification } from '../notifications/notify.js'
import {
  dealInclude,
  hideUnpublishedListing,
  persistExpiredDeals,
  persistExpiredClaims,
  requireVerifiedUser,
  toDealDto,
  formatDealDiscountSummary,
  freezeDealPricingForApprove,
} from './deal.service.js'
import { computeDealPrice, DealPricingError, snapshotSavingAmount } from './deal-pricing.js'
import { isDelvePreviewBusinessSlug, PREVIEW_OFFER_BLOCKED_MESSAGE } from './preview-deal.js'

function claimCode() {
  return `DLV-${randomBytes(4).toString('hex').toUpperCase()}`
}

function normalizeClaimCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

function decimalToNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null
  return typeof value === 'number' ? value : Number(value.toString())
}

function decimalInput(value: { toString(): string } | number | null | undefined) {
  if (value == null) return null
  return typeof value === 'number' ? value : value.toString()
}

function redemptionInstructions(method: string | undefined, terms: string | null | undefined) {
  const base =
    method === 'BOOKING_CODE'
      ? 'Present this claim code when booking.'
      : method === 'LINK'
        ? 'Use this claim code as instructed by the business.'
        : 'Show this claim code at the business to redeem.'
  const extra = terms?.trim()
  return extra ? `${base} ${extra}` : base
}

function travelerDisplayName(user?: {
  username: string
  travelerProfile?: { displayName: string } | null
} | null) {
  const name = user?.travelerProfile?.displayName?.trim()
  if (name) return name
  return user?.username || 'Traveler'
}

function toClaimDto(row: {
  id: string
  dealId: string
  userId: string
  status: DealClaimDto['status']
  code: string
  note: string | null
  titleSnapshot: string
  discountTypeSnapshot: DealClaimDto['discountTypeSnapshot']
  discountValueSnapshot: { toString(): string } | number
  currencySnapshot: string
  originalPriceSnapshot?: { toString(): string } | number | null
  dealPriceSnapshot?: { toString(): string } | number | null
  discountSummarySnapshot?: string | null
  termsSnapshot?: string | null
  eligibilitySnapshot?: string | null
  includedSnapshot?: string | null
  excludedSnapshot?: string | null
  redemptionInstructionsSnapshot?: string | null
  expiresAt?: Date | string | null
  redeemedAt?: Date | string | null
  createdAt: Date
  updatedAt: Date
  deal?: Parameters<typeof toDealDto>[0]
  user?: { username: string; travelerProfile?: { displayName: string } | null } | null
}): DealClaimDto {
  const discountValue =
    typeof row.discountValueSnapshot === 'number'
      ? row.discountValueSnapshot
      : Number(row.discountValueSnapshot.toString())
  const expiresAt =
    row.expiresAt instanceof Date
      ? row.expiresAt.toISOString()
      : row.expiresAt
        ? String(row.expiresAt)
        : row.createdAt.toISOString()
  const redeemedAt =
    row.redeemedAt instanceof Date
      ? row.redeemedAt.toISOString()
      : row.redeemedAt
        ? String(row.redeemedAt)
        : null
  return {
    id: row.id,
    dealId: row.dealId,
    userId: row.userId,
    status: row.status,
    code: row.code,
    note: row.note,
    titleSnapshot: row.titleSnapshot,
    discountTypeSnapshot: row.discountTypeSnapshot,
    discountValueSnapshot: discountValue,
    currencySnapshot: row.currencySnapshot,
    originalPriceSnapshot: decimalToNumber(row.originalPriceSnapshot),
    dealPriceSnapshot: decimalToNumber(row.dealPriceSnapshot),
    savingAmountSnapshot: (() => {
      const saving = snapshotSavingAmount(decimalInput(row.originalPriceSnapshot), decimalInput(row.dealPriceSnapshot))
      return saving == null ? null : Number(saving.toFixed(2))
    })(),
    discountSummarySnapshot:
      row.discountSummarySnapshot ||
      formatDealDiscountSummary(row.discountTypeSnapshot, discountValue, row.currencySnapshot),
    termsSnapshot: row.termsSnapshot ?? null,
    eligibilitySnapshot: row.eligibilitySnapshot ?? null,
    includedSnapshot: row.includedSnapshot ?? null,
    excludedSnapshot: row.excludedSnapshot ?? null,
    redemptionInstructionsSnapshot: row.redemptionInstructionsSnapshot ?? null,
    expiresAt,
    redeemedAt,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deal: row.deal ? hideUnpublishedListing(toDealDto(row.deal)) : undefined,
    traveler: row.user ? { displayName: travelerDisplayName(row.user) } : undefined,
  }
}

function validationStatus(status: DealClaimDto['status'], expiresAt: Date, now = new Date()): DealClaimValidationStatus {
  if (status === 'REDEEMED') return 'ALREADY_REDEEMED'
  if (status === 'CANCELLED') return 'CANCELLED'
  if (status === 'EXPIRED' || expiresAt.getTime() < now.getTime()) return 'EXPIRED'
  if (status === 'PENDING' || status === 'CONFIRMED') return 'VALID'
  return 'INVALID'
}

const CLAIM_NOT_FOUND = () => new AppError(404, 'CLAIM_NOT_FOUND', 'Claim not found.')

const REDEEM_ROLES = ['OWNER', 'MANAGER'] as const
const VIEW_CLAIM_ROLES = ['OWNER', 'MANAGER', 'CONTENT_EDITOR'] as const

async function loadPublicDealRow(dealId: string) {
  await persistExpiredDeals()
  const row = await prisma.deal.findFirst({
    where: { id: dealId, business: { status: 'VERIFIED' } },
    include: dealInclude,
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  const dto = hideUnpublishedListing(toDealDto(row))
  if (!dto.isActive && !dto.isScheduled) {
    throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  }
  return { row, dto }
}

async function notifyBusinessMembers(businessId: string, type: 'DEAL_CLAIMED' | 'DEAL_APPROVED' | 'DEAL_REJECTED', title: string, entityId: string, actorId?: string) {
  const members = await prisma.businessMember.findMany({
    where: { businessId, role: { in: ['OWNER', 'MANAGER'] } },
    select: { userId: true },
  })
  await Promise.all(
    members.map(m =>
      createNotification({
        userId: m.userId,
        type,
        title,
        entityType: 'deal',
        entityId,
        actorId,
      }),
    ),
  )
}

export async function claimDeal(userId: string, dealId: string, body: CreateDealClaimBody = {}): Promise<DealClaimDto> {
  await requireVerifiedUser(userId)
  const { row, dto } = await loadPublicDealRow(dealId)
  if (isDelvePreviewBusinessSlug(row.business.slug)) {
    throw new AppError(403, 'PREVIEW_OFFER', PREVIEW_OFFER_BLOCKED_MESSAGE)
  }
  if (!dto.isActive) {
    throw new AppError(400, 'DEAL_NOT_ACTIVE', 'This deal is not currently claimable.')
  }
  const existing = await prisma.dealClaim.findUnique({
    where: { userId_dealId: { userId, dealId } },
  })
  if (existing) return toClaimDto(existing)

  const created = await prisma.$transaction(async tx => {
    const locked = await tx.$queryRaw<
      Array<{
        id: string
        claimCount: number
        maxClaims: number | null
        title: string
        discountType: DealClaimDto['discountTypeSnapshot']
        discountValue: unknown
        currency: string
        endDate: Date
        terms: string | null
        eligibility: string | null
        included: string | null
        excluded: string | null
        claimMethod: string
        publishedBasePrice: unknown
        publishedCurrency: string | null
      }>
    >`
      SELECT id, "claimCount", "maxClaims", title, "discountType", "discountValue", currency,
             "endDate", terms, eligibility, included, excluded, "claimMethod",
             "publishedBasePrice", "publishedCurrency"
      FROM "Deal"
      WHERE id = ${dealId}
      FOR UPDATE
    `
    const deal = locked[0]
    if (!deal) throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
    if (deal.maxClaims != null && deal.claimCount >= deal.maxClaims) {
      throw new AppError(409, 'DEAL_SOLD_OUT', 'This deal has no remaining claims.')
    }
    const discountValue = Number(deal.discountValue)
    let priced
    try {
      priced = computeDealPrice({
        listingPrice: deal.publishedBasePrice == null ? null : String(deal.publishedBasePrice),
        listingCurrency: deal.publishedCurrency,
        discountType: deal.discountType,
        discountValue,
        dealCurrency: deal.publishedCurrency,
      })
    } catch (err) {
      if (err instanceof DealPricingError) {
        throw new AppError(
          400,
          err.code === 'DEAL_PRICE_UNAVAILABLE' ? 'DEAL_PRICE_UNAVAILABLE' : err.code,
          err.code === 'DEAL_PRICE_UNAVAILABLE'
            ? 'This deal cannot currently be claimed because pricing is unavailable.'
            : err.message,
        )
      }
      throw err
    }
    const claim = await tx.dealClaim.create({
      data: {
        dealId,
        userId,
        note: body.note ?? null,
        code: claimCode(),
        titleSnapshot: deal.title,
        discountTypeSnapshot: deal.discountType,
        discountValueSnapshot: discountValue,
        currencySnapshot: priced.currency,
        originalPriceSnapshot: priced.originalPrice,
        dealPriceSnapshot: priced.dealPrice,
        discountSummarySnapshot: formatDealDiscountSummary(deal.discountType, discountValue, priced.currency),
        termsSnapshot: deal.terms,
        eligibilitySnapshot: deal.eligibility,
        includedSnapshot: deal.included,
        excludedSnapshot: deal.excluded,
        redemptionInstructionsSnapshot: redemptionInstructions(deal.claimMethod, deal.terms),
        expiresAt: deal.endDate,
      },
    })
    await tx.deal.update({
      where: { id: dealId },
      data: { claimCount: { increment: 1 } },
    })
    await tx.dealAnalyticsEvent.create({
      data: { dealId, userId, kind: 'CLAIM' },
    })
    return claim
  })
  await notifyBusinessMembers(row.businessId, 'DEAL_CLAIMED', `New claim on ${row.title}`, dealId, userId)
  return toClaimDto(created)
}

const claimTravelerInclude = {
  username: true,
  travelerProfile: { select: { displayName: true } },
} as const

export async function getMyDealClaim(userId: string, dealId: string): Promise<DealClaimDto | null> {
  await requireVerifiedUser(userId)
  await persistExpiredClaims()
  const row = await prisma.dealClaim.findUnique({
    where: { userId_dealId: { userId, dealId } },
    include: { deal: { include: dealInclude } },
  })
  return row ? toClaimDto(row) : null
}

export async function listMyDealClaims(userId: string): Promise<DealClaimDto[]> {
  await requireVerifiedUser(userId)
  await persistExpiredClaims()
  const rows = await prisma.dealClaim.findMany({
    where: { userId },
    include: { deal: { include: dealInclude } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return rows.map(r => toClaimDto(r))
}

export async function getMyDealClaimById(userId: string, claimId: string): Promise<DealClaimDto> {
  await requireVerifiedUser(userId)
  await persistExpiredClaims()
  const row = await prisma.dealClaim.findFirst({
    where: { id: claimId, userId },
    include: { deal: { include: dealInclude } },
  })
  if (!row) throw CLAIM_NOT_FOUND()
  return toClaimDto(row)
}

export async function listBusinessDealClaims(
  userId: string,
  businessId: string,
  filter: 'active' | 'redeemed' | 'expired' | 'cancelled' | 'all' = 'all',
): Promise<DealClaimDto[]> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, [...VIEW_CLAIM_ROLES])
  await persistExpiredClaims()
  const activeStatuses: DealClaimDto['status'][] = ['PENDING', 'CONFIRMED']
  const statusWhere =
    filter === 'active'
      ? { status: { in: activeStatuses } }
      : filter === 'redeemed'
        ? { status: 'REDEEMED' as const }
        : filter === 'expired'
          ? { status: 'EXPIRED' as const }
          : filter === 'cancelled'
            ? { status: 'CANCELLED' as const }
            : {}
  const rows = await prisma.dealClaim.findMany({
    where: { deal: { businessId }, ...statusWhere },
    include: {
      deal: { include: dealInclude },
      user: { select: claimTravelerInclude },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return rows.map(r => toClaimDto(r))
}

export async function lookupBusinessDealClaim(
  userId: string,
  businessId: string,
  rawCode: string,
): Promise<DealClaimLookupDto> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, [...REDEEM_ROLES])
  const previewBiz = await prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } })
  if (isDelvePreviewBusinessSlug(previewBiz?.slug)) {
    throw new AppError(403, 'PREVIEW_OFFER', PREVIEW_OFFER_BLOCKED_MESSAGE)
  }
  await persistExpiredClaims()
  const code = normalizeClaimCode(rawCode)
  const row = await prisma.dealClaim.findUnique({
    where: { code },
    include: {
      deal: { select: { id: true, title: true, businessId: true } },
      user: { select: claimTravelerInclude },
    },
  })
  if (!row || row.deal.businessId !== businessId) throw CLAIM_NOT_FOUND()
  const expiresAt = row.expiresAt
  return {
    claimId: row.id,
    claimCode: row.code,
    status: row.status,
    validationStatus: validationStatus(row.status, expiresAt),
    claimedAt: row.createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    redeemedAt: row.redeemedAt?.toISOString() ?? null,
    deal: { id: row.deal.id, title: row.titleSnapshot },
    traveler: { displayName: travelerDisplayName(row.user) },
    pricing: {
      discountTypeSnapshot: row.discountTypeSnapshot,
      discountValueSnapshot: Number(row.discountValueSnapshot.toString()),
      currencySnapshot: row.currencySnapshot,
      discountSummarySnapshot: row.discountSummarySnapshot,
      dealPriceSnapshot: decimalToNumber(row.dealPriceSnapshot),
      originalPriceSnapshot: decimalToNumber(row.originalPriceSnapshot),
      savingAmountSnapshot: (() => {
        const saving = snapshotSavingAmount(decimalInput(row.originalPriceSnapshot), decimalInput(row.dealPriceSnapshot))
        return saving == null ? null : Number(saving.toFixed(2))
      })(),
    },
  }
}

export async function redeemBusinessDealClaim(
  userId: string,
  businessId: string,
  claimId: string,
): Promise<DealClaimDto> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, [...REDEEM_ROLES])
  const previewBiz = await prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } })
  if (isDelvePreviewBusinessSlug(previewBiz?.slug)) {
    throw new AppError(403, 'PREVIEW_OFFER', PREVIEW_OFFER_BLOCKED_MESSAGE)
  }

  const result = await prisma.$transaction(async tx => {
    const locked = await tx.$queryRaw<
      Array<{
        id: string
        dealId: string
        userId: string
        status: DealClaimDto['status']
        businessId: string
        expiresAt: Date
        redeemedAt: Date | null
        titleSnapshot: string
      }>
    >`
      SELECT c.id, c."dealId", c."userId", c.status, d."businessId", c."expiresAt", c."redeemedAt", c."titleSnapshot"
      FROM "DealClaim" c
      INNER JOIN "Deal" d ON d.id = c."dealId"
      WHERE c.id = ${claimId}
      FOR UPDATE OF c
    `
    const claim = locked[0]
    if (!claim || claim.businessId !== businessId) throw CLAIM_NOT_FOUND()
    const now = new Date()
    if (claim.status === 'REDEEMED' || claim.redeemedAt) {
      throw new AppError(409, 'ALREADY_REDEEMED', 'This claim has already been redeemed.')
    }
    if (claim.status === 'CANCELLED') {
      throw new AppError(400, 'CLAIM_CANCELLED', 'This claim has been cancelled.')
    }
    if (claim.status === 'EXPIRED' || claim.expiresAt.getTime() < now.getTime()) {
      throw new AppError(400, 'CLAIM_EXPIRED', 'This claim has expired.')
    }
    if (claim.status !== 'PENDING' && claim.status !== 'CONFIRMED') {
      throw new AppError(400, 'CLAIM_NOT_REDEEMABLE', 'This claim cannot be redeemed.')
    }
    const updated = await tx.dealClaim.update({
      where: { id: claim.id },
      data: { status: 'REDEEMED', redeemedAt: now },
      include: {
        deal: { include: dealInclude },
        user: { select: claimTravelerInclude },
      },
    })
    await tx.dealAnalyticsEvent.create({
      data: { dealId: claim.dealId, userId: claim.userId, kind: 'REDEEM' },
    })
    return { updated, title: claim.titleSnapshot, travelerUserId: claim.userId, dealId: claim.dealId }
  })

  await writeAdminAudit({
    action: 'DEAL_CLAIM_REDEEMED',
    outcome: 'success',
    actorUserId: userId,
    targetType: 'deal_claim',
    targetId: claimId,
    metadata: { claimId, dealId: result.dealId, businessId },
  })
  await createNotification({
    userId: result.travelerUserId,
    type: 'DEAL_CLAIM_UPDATED',
    title: `Your deal at ${result.updated.deal.business.name} was redeemed.`,
    entityType: 'deal',
    entityId: result.dealId,
    actorId: userId,
  })
  return toClaimDto(result.updated)
}

export async function updateDealClaimStatus(
  userId: string,
  claimId: string,
  status: DealClaimDto['status'],
): Promise<DealClaimDto> {
  await requireVerifiedUser(userId)
  const claim = await prisma.dealClaim.findUnique({
    where: { id: claimId },
    include: { deal: true },
  })
  if (!claim) throw CLAIM_NOT_FOUND()
  await requireBusinessMembership(userId, claim.deal.businessId, [...REDEEM_ROLES])
  if (status === 'REDEEMED') {
    throw new AppError(400, 'USE_REDEEM_ENDPOINT', 'Redeem claims through the redemption endpoint.')
  }
  const allowed: Record<string, DealClaimDto['status'][]> = {
    PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
    CONFIRMED: ['CANCELLED', 'EXPIRED'],
    REDEEMED: [],
    CANCELLED: [],
    EXPIRED: [],
  }
  if (!allowed[claim.status]?.includes(status)) {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'That claim status change is not allowed.')
  }
  const updated = await prisma.dealClaim.update({
    where: { id: claimId },
    data: { status },
  })
  await createNotification({
    userId: claim.userId,
    type: 'DEAL_CLAIM_UPDATED',
    title: `Your claim for ${claim.deal.title} is ${status.toLowerCase()}`,
    entityType: 'deal',
    entityId: claim.dealId,
    actorId: userId,
  })
  return toClaimDto(updated)
}

export async function reportDeal(userId: string, dealId: string, body: CreateDealReportBody): Promise<DealReportDto> {
  await requireVerifiedUser(userId)
  await loadPublicDealRow(dealId)
  const existing = await prisma.dealReport.findUnique({
    where: { reporterId_dealId: { reporterId: userId, dealId } },
  })
  if (existing) {
    return {
      id: existing.id,
      dealId: existing.dealId,
      reporterId: existing.reporterId,
      reason: existing.reason,
      details: existing.details,
      status: existing.status,
      createdAt: existing.createdAt.toISOString(),
    }
  }
  const created = await prisma.dealReport.create({
    data: {
      dealId,
      reporterId: userId,
      reason: body.reason,
      details: body.details ?? null,
    },
  })
  await prisma.dealAnalyticsEvent.create({
    data: { dealId, userId, kind: 'CLICK' },
  }).catch(() => undefined)
  return {
    id: created.id,
    dealId: created.dealId,
    reporterId: created.reporterId,
    reason: created.reason,
    details: created.details,
    status: created.status,
    createdAt: created.createdAt.toISOString(),
  }
}

export async function recordDealAnalytics(dealId: string, kind: 'IMPRESSION' | 'CLICK', userId?: string | null) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } })
  if (!deal) return
  await prisma.dealAnalyticsEvent.create({
    data: { dealId, kind, userId: userId || null },
  })
  if (kind === 'IMPRESSION') {
    await prisma.deal.update({ where: { id: dealId }, data: { viewCount: { increment: 1 } } })
  }
}

export async function adminListDeals(status?: string): Promise<DealDto[]> {
  await persistExpiredDeals()
  const rows = await prisma.deal.findMany({
    where: status ? { status: status as DealDto['status'] } : {},
    include: dealInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return rows.map(r => toDealDto(r))
}

export async function adminModerateDeal(
  adminUserId: string,
  sessionId: string,
  dealId: string,
  action: 'approve' | 'reject' | 'archive',
  reason?: string,
): Promise<DealDto> {
  const existing = await prisma.deal.findUnique({ where: { id: dealId }, include: dealInclude })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  const from = existing.status
  if (action === 'approve' && from !== 'PENDING_REVIEW') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'Only deals pending review can be approved.')
  }
  if (action === 'reject' && from !== 'PENDING_REVIEW') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'Only deals pending review can be rejected.')
  }
  if (action === 'archive' && from !== 'PUBLISHED' && from !== 'EXPIRED' && from !== 'REJECTED') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'Only published, expired, or rejected deals can be archived.')
  }
  const status = action === 'approve' ? 'PUBLISHED' : action === 'reject' ? 'REJECTED' : 'ARCHIVED'
  const freeze =
    action === 'approve'
      ? await freezeDealPricingForApprove({
          listingId: existing.listingId,
          businessId: existing.businessId,
          discountType: existing.discountType,
          discountValue: existing.discountValue,
          currency: existing.currency,
        })
      : null
  const row = await prisma.deal.update({
    where: { id: dealId },
    data: {
      status,
      ...(freeze
        ? {
            publishedBasePrice: freeze.publishedBasePrice,
            publishedCurrency: freeze.publishedCurrency,
            currency: freeze.currency,
          }
        : {}),
    },
    include: dealInclude,
  })
  const auditAction = action === 'approve' ? 'DEAL_APPROVED' : action === 'reject' ? 'DEAL_REJECTED' : 'DEAL_ARCHIVED'
  await writeAdminAudit({
    action: auditAction,
    outcome: 'success',
    actorUserId: adminUserId,
    actorSessionId: sessionId,
    targetType: 'deal',
    targetId: dealId,
    reason: reason ?? null,
  })
  if (action === 'approve' || action === 'reject') {
    await notifyBusinessMembers(
      existing.businessId,
      action === 'approve' ? 'DEAL_APPROVED' : 'DEAL_REJECTED',
      action === 'approve' ? `${existing.title} was approved` : `${existing.title} was rejected`,
      dealId,
      adminUserId,
    )
  }
  return toDealDto(row)
}

export async function adminFeatureDeal(
  adminUserId: string,
  sessionId: string,
  dealId: string,
  featured: boolean,
  featuredRank?: number | null,
): Promise<DealDto> {
  const existing = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Deal not found.')
  if (featured) {
    const now = new Date()
    if (
      existing.status !== 'PUBLISHED' ||
      existing.endDate.getTime() < now.getTime() ||
      existing.startDate.getTime() > now.getTime()
    ) {
      throw new AppError(400, 'DEAL_NOT_FEATUREABLE', 'Only currently active published deals can be featured.')
    }
  }
  const row = await prisma.deal.update({
    where: { id: dealId },
    data: {
      featured,
      featuredRank: featured ? (featuredRank ?? 0) : null,
    },
    include: dealInclude,
  })
  await writeAdminAudit({
    action: 'DEAL_FEATURED',
    outcome: 'success',
    actorUserId: adminUserId,
    actorSessionId: sessionId,
    targetType: 'deal',
    targetId: dealId,
    metadata: { featured, featuredRank: featuredRank ?? null },
  })
  return toDealDto(row)
}

export async function adminListDealReports(status?: string): Promise<DealReportDto[]> {
  const rows = await prisma.dealReport.findMany({
    where: status ? { status: status as DealReportDto['status'] } : { status: 'OPEN' },
    include: { deal: { include: dealInclude } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return rows.map(r => ({
    id: r.id,
    dealId: r.dealId,
    reporterId: r.reporterId,
    reason: r.reason,
    details: r.details,
    status: r.status,
    resolution: r.resolution,
    createdAt: r.createdAt.toISOString(),
    deal: hideUnpublishedListing(toDealDto(r.deal)),
  }))
}

export async function adminResolveDealReport(
  adminUserId: string,
  sessionId: string,
  reportId: string,
  body: ResolveDealReportBody,
): Promise<DealReportDto> {
  const existing = await prisma.dealReport.findUnique({ where: { id: reportId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Report not found.')
  const updated = await prisma.dealReport.update({
    where: { id: reportId },
    data: {
      status: body.status,
      resolution: body.resolution ?? null,
      reviewedById: adminUserId,
      reviewedAt: new Date(),
    },
    include: { deal: { include: dealInclude } },
  })
  await writeAdminAudit({
    action: 'DEAL_REPORT_RESOLVED',
    outcome: 'success',
    actorUserId: adminUserId,
    actorSessionId: sessionId,
    targetType: 'deal_report',
    targetId: reportId,
    reason: body.resolution ?? null,
  })
  return {
    id: updated.id,
    dealId: updated.dealId,
    reporterId: updated.reporterId,
    reason: updated.reason,
    details: updated.details,
    status: updated.status,
    resolution: updated.resolution,
    createdAt: updated.createdAt.toISOString(),
    deal: hideUnpublishedListing(toDealDto(updated.deal)),
  }
}

export async function adminDealAnalytics(dealId?: string): Promise<DealAnalyticsSummary & { dealId?: string }> {
  const where = dealId ? { dealId } : {}
  const [impressions, clicks, claims, redemptions, saves, journeyAdds] = await Promise.all([
    prisma.dealAnalyticsEvent.count({ where: { ...where, kind: 'IMPRESSION' } }),
    prisma.dealAnalyticsEvent.count({ where: { ...where, kind: 'CLICK' } }),
    prisma.dealAnalyticsEvent.count({ where: { ...where, kind: 'CLAIM' } }),
    prisma.dealAnalyticsEvent.count({ where: { ...where, kind: 'REDEEM' } }),
    prisma.dealAnalyticsEvent.count({ where: { ...where, kind: 'SAVE' } }),
    prisma.dealAnalyticsEvent.count({ where: { ...where, kind: 'JOURNEY_ADD' } }),
  ])
  return { impressions, clicks, claims, redemptions, saves, journeyAdds, ...(dealId ? { dealId } : {}) }
}

export async function recordSaveAnalytics(dealId: string, userId: string) {
  await prisma.dealAnalyticsEvent.create({
    data: { dealId, userId, kind: 'SAVE' },
  })
}

export async function recordJourneyAddAnalytics(dealId: string, userId: string) {
  await prisma.dealAnalyticsEvent.create({
    data: { dealId, userId, kind: 'JOURNEY_ADD' },
  })
}
