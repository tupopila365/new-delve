import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type {
  AdminBusinessActivityDto,
  AdminBusinessDetail,
  AdminBusinessListDto,
  AdminBusinessMember,
  AdminConnectSafeDto,
  AdminListingDetail,
  AdminListingListDto,
  AdminMarketplaceOpsSummary,
  BusinessStatus,
  ListingStatus,
  StripeConnectStatus,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { mediaAssetToDto } from '../media/media.service.js'
import { adminBusinessFinancialReport } from '../payment/financial-report.service.js'
import { adminRefreshConnectStatus } from '../payment/connect.service.js'
import { connectReadinessLabel, isSettlementReady } from '../payment/stripe-connect-status.js'
import { writeAdminAudit } from './admin-audit.js'
import { optionalDate, optionalString, paginated, parseAdminPage } from './admin-query.js'

function toMoneyString(value: { toString(): string } | number | null | undefined): string | null {
  if (value == null) return null
  const raw = typeof value === 'number' ? value : value.toString()
  return new Decimal(raw).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)
}

function connectSafe(b: {
  stripeAccountStatus: StripeConnectStatus
  stripeChargesEnabled: boolean
  stripePayoutsEnabled: boolean
  stripeDetailsSubmitted: boolean
}): AdminConnectSafeDto {
  const flags = {
    stripeAccountStatus: b.stripeAccountStatus,
    stripePayoutsEnabled: b.stripePayoutsEnabled,
    stripeChargesEnabled: b.stripeChargesEnabled,
  }
  return {
    status: b.stripeAccountStatus,
    chargesEnabled: b.stripeChargesEnabled,
    payoutsEnabled: b.stripePayoutsEnabled,
    detailsSubmitted: b.stripeDetailsSubmitted,
    settlementReady: isSettlementReady(flags),
    label: connectReadinessLabel(flags),
  }
}

function mapMember(row: {
  id: string
  role: AdminBusinessMember['role']
  createdAt: Date
  user: { username: string; email: string; travelerProfile: { displayName: string } | null }
}): AdminBusinessMember {
  const display = row.user.travelerProfile?.displayName?.trim() || null
  return {
    id: row.id,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    username: row.user.username,
    displayName: display,
    email: row.user.email,
  }
}

type BusinessListQuery = {
  q?: unknown
  status?: unknown
  category?: unknown
  country?: unknown
  city?: unknown
  connect?: unknown
  createdFrom?: unknown
  createdTo?: unknown
  page?: unknown
  pageSize?: unknown
}

function businessWhere(query: BusinessListQuery) {
  const q = optionalString(query.q)
  const status = optionalString(query.status) as BusinessStatus | undefined
  const category = optionalString(query.category)
  const country = optionalString(query.country)?.toUpperCase()
  const city = optionalString(query.city)
  const connect = optionalString(query.connect) as StripeConnectStatus | undefined
  const createdFrom = optionalDate(query.createdFrom, 'createdFrom')
  const createdTo = optionalDate(query.createdTo, 'createdTo')
  const statuses: BusinessStatus[] = ['DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED']
  const connectStatuses: StripeConnectStatus[] = ['NOT_CONNECTED', 'ONBOARDING', 'RESTRICTED', 'ACTIVE', 'DISABLED']
  if (status && !statuses.includes(status)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid business status')
  if (connect && !connectStatuses.includes(connect)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid Connect status')

  return {
    ...(status ? { status } : {}),
    ...(category ? { category: { equals: category, mode: 'insensitive' as const } } : {}),
    ...(country ? { countryCode: country } : {}),
    ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
    ...(connect ? { stripeAccountStatus: connect } : {}),
    ...(createdFrom || createdTo
      ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdTo ? { lt: createdTo } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { slug: { contains: q, mode: 'insensitive' as const } },
            { city: { contains: q, mode: 'insensitive' as const } },
            { countryCode: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }
}

export async function adminListBusinesses(query: BusinessListQuery): Promise<AdminBusinessListDto> {
  const { page, pageSize, skip } = parseAdminPage(query)
  const where = businessWhere(query)
  const [total, rows] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        _count: { select: { listings: true, bookings: true } },
      },
    }),
  ])
  const ids = rows.map(r => r.id)
  const publishedDeals = ids.length
    ? await prisma.deal.groupBy({
        by: ['businessId'],
        where: { businessId: { in: ids }, status: 'PUBLISHED' },
        _count: { _all: true },
      })
    : []
  const publishedMap = new Map(publishedDeals.map(r => [r.businessId, r._count._all]))
  return paginated(
    rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      city: row.city,
      countryCode: row.countryCode,
      status: row.status,
      listingCount: row._count.listings,
      publishedDealCount: publishedMap.get(row.id) ?? 0,
      bookingCount: row._count.bookings,
      connect: connectSafe(row),
      createdAt: row.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
  )
}

export async function adminMarketplaceOpsSummary(): Promise<AdminMarketplaceOpsSummary> {
  const [pendingVerificationCount, stripeSetupIssueCount] = await Promise.all([
    prisma.business.count({ where: { status: 'PENDING_VERIFICATION' } }),
    prisma.business.count({
      where: { stripeAccountStatus: { in: ['ONBOARDING', 'RESTRICTED', 'DISABLED'] } },
    }),
  ])
  return { pendingVerificationCount, stripeSetupIssueCount }
}

async function loadAttention(businessId: string, status: BusinessStatus, connect: AdminConnectSafeDto) {
  const [openReports, activeDisputes, blockedSettlements, criticalIssues, openRecovery] = await Promise.all([
    prisma.dealReport.count({ where: { status: 'OPEN', deal: { businessId } } }),
    prisma.paymentDispute.count({ where: { businessId, status: { in: ['NEEDS_RESPONSE', 'UNDER_REVIEW'] } } }),
    prisma.businessPayable.count({ where: { businessId, status: 'BLOCKED' } }),
    prisma.financialReconciliationIssue.count({
      where: { businessId, status: 'OPEN', severity: 'CRITICAL' },
    }),
    prisma.financialRecoveryCase.count({ where: { businessId, status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
  ])
  const attention: AdminBusinessDetail['attention'] = []
  if (status === 'PENDING_VERIFICATION') {
    attention.push({ code: 'VERIFICATION_PENDING', label: 'Verification pending', tone: 'warning' })
  }
  if (status === 'DRAFT') {
    attention.push({ code: 'DRAFT', label: 'Business is still a draft', tone: 'info' })
  }
  if (status === 'REJECTED') {
    attention.push({ code: 'VERIFICATION_REJECTED', label: 'Verification was rejected', tone: 'warning' })
  }
  if (status === 'SUSPENDED') {
    attention.push({ code: 'SUSPENDED', label: 'Business is suspended', tone: 'critical' })
  }
  if (connect.status === 'ONBOARDING' || connect.label === 'Setup incomplete') {
    attention.push({ code: 'CONNECT_INCOMPLETE', label: 'Stripe setup incomplete', tone: 'warning' })
  }
  if (connect.label === 'Payouts disabled' || connect.status === 'DISABLED') {
    attention.push({ code: 'PAYOUTS_DISABLED', label: 'Payouts disabled', tone: 'critical' })
  }
  if (connect.status === 'RESTRICTED') {
    attention.push({ code: 'CONNECT_RESTRICTED', label: 'Stripe account restricted', tone: 'critical' })
  }
  if (openReports > 0) {
    attention.push({ code: 'OPEN_DEAL_REPORTS', label: `${openReports} open deal report${openReports === 1 ? '' : 's'}`, tone: 'warning' })
  }
  if (activeDisputes > 0) {
    attention.push({ code: 'ACTIVE_DISPUTE', label: `${activeDisputes} active dispute${activeDisputes === 1 ? '' : 's'}`, tone: 'critical' })
  }
  if (blockedSettlements > 0) {
    attention.push({ code: 'BLOCKED_SETTLEMENT', label: `${blockedSettlements} blocked settlement${blockedSettlements === 1 ? '' : 's'}`, tone: 'warning' })
  }
  if (criticalIssues > 0) {
    attention.push({ code: 'CRITICAL_RECON', label: `${criticalIssues} critical reconciliation issue${criticalIssues === 1 ? '' : 's'}`, tone: 'critical' })
  }
  if (openRecovery > 0) {
    attention.push({ code: 'OPEN_RECOVERY', label: `${openRecovery} open recovery case${openRecovery === 1 ? '' : 's'}`, tone: 'critical' })
  }
  return attention
}

export async function adminGetBusiness(businessId: string): Promise<AdminBusinessDetail> {
  const row = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      members: {
        include: { user: { select: { username: true, email: true, travelerProfile: { select: { displayName: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Business not found.')

  const [
    listingCount,
    publishedListingCount,
    dealCount,
    publishedDealCount,
    bookingCount,
    completedBookingCount,
  ] = await Promise.all([
    prisma.listing.count({ where: { businessId } }),
    prisma.listing.count({ where: { businessId, status: 'PUBLISHED' } }),
    prisma.deal.count({ where: { businessId } }),
    prisma.deal.count({ where: { businessId, status: 'PUBLISHED' } }),
    prisma.booking.count({ where: { businessId } }),
    prisma.booking.count({ where: { businessId, status: 'COMPLETED' } }),
  ])

  const connect = connectSafe(row)
  const members = row.members.map(mapMember)
  const owner = members.find(m => m.role === 'OWNER') ?? null
  const attention = await loadAttention(businessId, row.status, connect)

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logoUrl,
    coverUrl: row.coverUrl,
    email: row.email,
    phone: row.phone,
    website: row.website,
    city: row.city,
    countryCode: row.countryCode,
    address: row.address,
    category: row.category,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    connect,
    marketplace: {
      listingCount,
      publishedListingCount,
      dealCount,
      publishedDealCount,
      bookingCount,
      completedBookingCount,
    },
    owner,
    memberCount: members.length,
    attention,
    canVerify: row.status === 'DRAFT' || row.status === 'PENDING_VERIFICATION' || row.status === 'REJECTED',
    canRejectVerification: row.status === 'DRAFT' || row.status === 'PENDING_VERIFICATION',
  }
}

export async function adminListBusinessMembers(businessId: string): Promise<AdminBusinessMember[]> {
  const exists = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } })
  if (!exists) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  const rows = await prisma.businessMember.findMany({
    where: { businessId },
    include: { user: { select: { username: true, email: true, travelerProfile: { select: { displayName: true } } } } },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(mapMember)
}

export async function adminVerifyBusiness(adminUserId: string, sessionId: string, businessId: string) {
  const existing = await prisma.business.findUnique({ where: { id: businessId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  if (existing.status !== 'DRAFT' && existing.status !== 'PENDING_VERIFICATION' && existing.status !== 'REJECTED') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'Only draft, pending, or rejected businesses can be verified.')
  }
  const updated = await prisma.business.update({
    where: { id: businessId },
    data: { status: 'VERIFIED' },
  })
  await writeAdminAudit({
    action: 'BUSINESS_VERIFIED',
    outcome: 'success',
    actorUserId: adminUserId,
    actorSessionId: sessionId,
    targetType: 'business',
    targetId: businessId,
    metadata: { from: existing.status },
  })
  return adminGetBusiness(updated.id)
}

export async function adminRejectBusinessVerification(
  adminUserId: string,
  sessionId: string,
  businessId: string,
  reason?: string,
) {
  const existing = await prisma.business.findUnique({ where: { id: businessId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  if (existing.status !== 'DRAFT' && existing.status !== 'PENDING_VERIFICATION') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'Only draft or pending businesses can have verification rejected.')
  }
  await prisma.business.update({
    where: { id: businessId },
    data: { status: 'REJECTED' },
  })
  await writeAdminAudit({
    action: 'BUSINESS_VERIFICATION_REJECTED',
    outcome: 'success',
    actorUserId: adminUserId,
    actorSessionId: sessionId,
    targetType: 'business',
    targetId: businessId,
    reason: reason ?? null,
    metadata: { from: existing.status },
  })
  return adminGetBusiness(businessId)
}

export async function adminRefreshBusinessConnect(env: Env, businessId: string): Promise<AdminConnectSafeDto> {
  const exists = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } })
  if (!exists) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  const dto = await adminRefreshConnectStatus(env, businessId)
  return {
    status: dto.status,
    chargesEnabled: dto.chargesEnabled,
    payoutsEnabled: dto.payoutsEnabled,
    detailsSubmitted: dto.detailsSubmitted,
    settlementReady: dto.settlementReady,
    label: connectReadinessLabel({
      stripeAccountStatus: dto.status,
      stripePayoutsEnabled: dto.payoutsEnabled,
      stripeChargesEnabled: dto.chargesEnabled,
    }),
  }
}

export async function adminGetBusinessFinance(businessId: string, query: { preset?: string; from?: string; to?: string; currency?: string }) {
  const exists = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } })
  if (!exists) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  return adminBusinessFinancialReport(businessId, query)
}

export async function adminGetBusinessActivity(businessId: string): Promise<AdminBusinessActivityDto> {
  const exists = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } })
  if (!exists) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  const [payments, payables, refunds, disputes, reversals, recoveries] = await Promise.all([
    prisma.payment.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, status: true, amount: true, currency: true, paidAt: true, createdAt: true },
    }),
    prisma.businessPayable.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, status: true, businessNetAmount: true, currency: true, transferredAt: true, createdAt: true },
    }),
    prisma.refund.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, status: true, amount: true, currency: true, succeededAt: true, createdAt: true },
    }),
    prisma.paymentDispute.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, status: true, amount: true, currency: true, createdAt: true },
    }),
    prisma.transferReversal.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, status: true, amount: true, currency: true, succeededAt: true, createdAt: true },
    }),
    prisma.financialRecoveryCase.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, status: true, amount: true, currency: true, createdAt: true },
    }),
  ])
  const items = [
    ...payments.map(r => ({
      kind: 'PAYMENT' as const,
      id: r.id,
      label: 'Traveler payment',
      status: r.status,
      amount: toMoneyString(r.amount),
      currency: r.currency,
      at: (r.paidAt ?? r.createdAt).toISOString(),
      href: '/payments',
    })),
    ...payables.map(r => ({
      kind: 'SETTLEMENT' as const,
      id: r.id,
      label: 'Business settlement',
      status: r.status,
      amount: toMoneyString(r.businessNetAmount),
      currency: r.currency,
      at: (r.transferredAt ?? r.createdAt).toISOString(),
      href: '/payments/settlements',
    })),
    ...refunds.map(r => ({
      kind: 'REFUND' as const,
      id: r.id,
      label: 'Refund',
      status: r.status,
      amount: toMoneyString(r.amount),
      currency: r.currency,
      at: (r.succeededAt ?? r.createdAt).toISOString(),
      href: '/payments/refunds',
    })),
    ...disputes.map(r => ({
      kind: 'DISPUTE' as const,
      id: r.id,
      label: 'Dispute',
      status: r.status,
      amount: toMoneyString(r.amount),
      currency: r.currency,
      at: r.createdAt.toISOString(),
      href: '/payments/disputes',
    })),
    ...reversals.map(r => ({
      kind: 'REVERSAL' as const,
      id: r.id,
      label: 'Transfer reversal',
      status: r.status,
      amount: toMoneyString(r.amount),
      currency: r.currency,
      at: (r.succeededAt ?? r.createdAt).toISOString(),
      href: '/payments/refunds',
    })),
    ...recoveries.map(r => ({
      kind: 'RECOVERY' as const,
      id: r.id,
      label: 'Recovery case',
      status: r.status,
      amount: toMoneyString(r.amount),
      currency: r.currency,
      at: r.createdAt.toISOString(),
      href: '/payments/reconciliation',
    })),
  ]
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 20)
  return { items }
}

type ListingListQuery = {
  q?: unknown
  businessId?: unknown
  status?: unknown
  priced?: unknown
  currency?: unknown
  createdFrom?: unknown
  createdTo?: unknown
  page?: unknown
  pageSize?: unknown
}

export async function adminListListings(env: Env, query: ListingListQuery): Promise<AdminListingListDto> {
  void env
  const { page, pageSize, skip } = parseAdminPage(query)
  const q = optionalString(query.q)
  const businessId = optionalString(query.businessId)
  const status = optionalString(query.status) as ListingStatus | undefined
  const pricedRaw = optionalString(query.priced)
  const currency = optionalString(query.currency)?.toUpperCase()
  const createdFrom = optionalDate(query.createdFrom, 'createdFrom')
  const createdTo = optionalDate(query.createdTo, 'createdTo')
  const listingStatuses: ListingStatus[] = ['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED']
  if (status && !listingStatuses.includes(status)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid listing status')
  if (pricedRaw && pricedRaw !== 'priced' && pricedRaw !== 'unpriced') {
    throw new AppError(400, 'VALIDATION_ERROR', 'priced must be priced or unpriced')
  }

  const where = {
    ...(businessId ? { businessId } : {}),
    ...(status ? { status } : {}),
    ...(pricedRaw === 'priced' ? { priceAmount: { not: null } } : {}),
    ...(pricedRaw === 'unpriced' ? { priceAmount: null } : {}),
    ...(currency ? { currency } : {}),
    ...(createdFrom || createdTo
      ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdTo ? { lt: createdTo } : {}) } }
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
  }

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        business: { select: { id: true, name: true, status: true } },
        _count: { select: { deals: true, bookings: true } },
      },
    }),
  ])

  return paginated(
    rows.map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      pricing: row.priceAmount != null && row.currency ? { amount: toMoneyString(row.priceAmount)!, currency: row.currency } : null,
      businessId: row.businessId,
      businessName: row.business.name,
      businessStatus: row.business.status,
      dealCount: row._count.deals,
      bookingCount: row._count.bookings,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    page,
    pageSize,
    total,
  )
}

export async function adminGetListing(env: Env, listingId: string): Promise<AdminListingDetail> {
  const row = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      business: { select: { id: true, name: true, status: true } },
      coverMedia: true,
      media: {
        where: { deletedAt: null, purpose: 'listing' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      _count: { select: { deals: true, bookings: true } },
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Listing not found.')
  const media = row.media
    .filter(m => m.status === 'READY' || m.status === 'PROCESSING')
    .map(m => ({ ...mediaAssetToDto(env, m), isCover: row.coverMediaId === m.id }))
  const cover = media.find(m => m.isCover)
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    pricing: row.priceAmount != null && row.currency ? { amount: toMoneyString(row.priceAmount)!, currency: row.currency } : null,
    businessId: row.businessId,
    businessName: row.business.name,
    businessStatus: row.business.status,
    dealCount: row._count.deals,
    bookingCount: row._count.bookings,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    coverUrl: cover?.delivery.url ?? (row.coverMedia ? mediaAssetToDto(env, row.coverMedia).delivery.url : null),
    media,
  }
}
