import { prisma } from '@delve/database'
import type { Prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type {
  AdminAccountStatus,
  AdminTravelerActivityDto,
  AdminTravelerAttention,
  AdminTravelerClaim,
  AdminTravelerCommunity,
  AdminTravelerCommunityListDto,
  AdminTravelerDetail,
  AdminTravelerEvent,
  AdminTravelerEventListDto,
  AdminTravelerFinancialDto,
  AdminTravelerJourneyListDto,
  AdminTravelerListDto,
  AdminTravelerOpsSummary,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { snapshotSavingAmount } from '../deal/deal-pricing.js'
import { writeAdminAudit } from './admin-audit.js'
import { optionalDate, optionalString, paginated, parseAdminPage } from './admin-query.js'
import { adminTravelerSafetyCounts } from './admin-moderation.service.js'

const ACCOUNT_STATUSES: AdminAccountStatus[] = [
  'pending_verification',
  'active',
  'restricted',
  'disabled',
  'deactivated',
]
const OPEN_DISPUTE = ['NEEDS_RESPONSE', 'UNDER_REVIEW'] as const
const RESTRICTABLE: AdminAccountStatus[] = ['active', 'pending_verification']

function toMoneyString(value: { toString(): string } | number | null | undefined): string | null {
  if (value == null) return null
  const raw = typeof value === 'number' ? value : value.toString()
  return new Decimal(raw).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)
}

function moneyOrZero(value: { toString(): string } | number | null | undefined): string {
  return toMoneyString(value) ?? '0.00'
}

function optionalBool(value: unknown): boolean | undefined {
  if (value == null || value === '') return undefined
  if (value === true || value === 'true' || value === '1') return true
  if (value === false || value === 'false' || value === '0') return false
  throw new AppError(400, 'VALIDATION_ERROR', 'Invalid boolean filter')
}

function requireTravelerId(userId: string) {
  const id = userId.trim()
  if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'userId required')
  return id
}

async function requireTraveler(userId: string) {
  const id = requireTravelerId(userId)
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      accountStatus: true,
      emailVerifiedAt: true,
      createdAt: true,
      travelerProfile: {
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          coverUrl: true,
          homeCity: true,
          homeCountryCode: true,
          preferredLanguage: true,
          profileVisibility: true,
        },
      },
    },
  })
  if (!user || user.role !== 'traveler') throw new AppError(404, 'NOT_FOUND', 'Traveler not found.')
  return user
}

type ListQuery = {
  q?: unknown
  accountStatus?: unknown
  location?: unknown
  createdFrom?: unknown
  createdTo?: unknown
  hasBookings?: unknown
  hasOpenDispute?: unknown
  hasCancellationRequest?: unknown
  page?: unknown
  pageSize?: unknown
}

function travelerWhere(query: ListQuery): Prisma.UserWhereInput {
  const q = optionalString(query.q)
  const accountStatus = optionalString(query.accountStatus) as AdminAccountStatus | undefined
  const location = optionalString(query.location)
  const createdFrom = optionalDate(query.createdFrom, 'createdFrom')
  const createdTo = optionalDate(query.createdTo, 'createdTo')
  const hasBookings = optionalBool(query.hasBookings)
  const hasOpenDispute = optionalBool(query.hasOpenDispute)
  const hasCancellationRequest = optionalBool(query.hasCancellationRequest)
  if (accountStatus && !ACCOUNT_STATUSES.includes(accountStatus)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid account status')
  }

  const and: Prisma.UserWhereInput[] = []
  if (q) {
    and.push({
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { usernameNormalized: { contains: q.toLowerCase(), mode: 'insensitive' } },
        { travelerProfile: { is: { displayName: { contains: q, mode: 'insensitive' } } } },
        { travelerProfile: { is: { homeCity: { contains: q, mode: 'insensitive' } } } },
      ],
    })
  }
  if (location) {
    and.push({
      travelerProfile: {
        is: {
          OR: [
            { homeCity: { contains: location, mode: 'insensitive' } },
            { homeCountryCode: { equals: location.toUpperCase() } },
          ],
        },
      },
    })
  }
  if (hasBookings === true) and.push({ bookings: { some: {} } })
  if (hasBookings === false) and.push({ bookings: { none: {} } })
  if (hasOpenDispute === true) and.push({ paymentDisputes: { some: { status: { in: [...OPEN_DISPUTE] } } } })
  if (hasOpenDispute === false) and.push({ paymentDisputes: { none: { status: { in: [...OPEN_DISPUTE] } } } })
  if (hasCancellationRequest === true) {
    and.push({ bookings: { some: { cancellationRequests: { some: { status: 'PENDING' } } } } })
  }
  if (hasCancellationRequest === false) {
    and.push({ bookings: { none: { cancellationRequests: { some: { status: 'PENDING' } } } } })
  }

  return {
    role: 'traveler',
    ...(accountStatus ? { accountStatus } : {}),
    ...(createdFrom || createdTo
      ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdTo ? { lt: createdTo } : {}) } }
      : {}),
    ...(and.length ? { AND: and } : {}),
  }
}

export async function adminListTravelers(query: ListQuery): Promise<AdminTravelerListDto> {
  const { page, pageSize, skip } = parseAdminPage(query)
  const where = travelerWhere(query)
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        email: true,
        username: true,
        accountStatus: true,
        createdAt: true,
        travelerProfile: { select: { displayName: true, homeCity: true, homeCountryCode: true } },
        _count: { select: { bookings: true, dealClaims: true, journeys: true } },
      },
    }),
  ])
  const ids = rows.map(r => r.id)
  const [openDisputes, pendingCancels, failedRefunds] = ids.length
    ? await Promise.all([
        prisma.paymentDispute.findMany({
          where: { userId: { in: ids }, status: { in: [...OPEN_DISPUTE] } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        prisma.bookingCancellationRequest.findMany({
          where: { status: 'PENDING', booking: { userId: { in: ids } } },
          select: { booking: { select: { userId: true } } },
        }),
        prisma.refund.findMany({
          where: { userId: { in: ids }, status: 'FAILED' },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ])
    : [[], [], []]
  const attentionIds = new Set<string>([
    ...openDisputes.map(r => r.userId),
    ...pendingCancels.map(r => r.booking.userId),
    ...failedRefunds.map(r => r.userId),
    ...rows.filter(r => r.accountStatus === 'restricted' || r.accountStatus === 'disabled').map(r => r.id),
  ])
  return paginated(
    rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.travelerProfile?.displayName?.trim() || null,
      email: row.email,
      homeCity: row.travelerProfile?.homeCity ?? null,
      homeCountryCode: row.travelerProfile?.homeCountryCode ?? null,
      accountStatus: row.accountStatus,
      bookingCount: row._count.bookings,
      claimCount: row._count.dealClaims,
      journeyCount: row._count.journeys,
      createdAt: row.createdAt.toISOString(),
      attention: attentionIds.has(row.id),
    })),
    page,
    pageSize,
    total,
  )
}

export async function adminTravelerOpsSummary(): Promise<AdminTravelerOpsSummary> {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const [travelerCount, newThisMonthCount, restrictedCount] = await Promise.all([
    prisma.user.count({ where: { role: 'traveler' } }),
    prisma.user.count({ where: { role: 'traveler', createdAt: { gte: start } } }),
    prisma.user.count({ where: { role: 'traveler', accountStatus: 'restricted' } }),
  ])
  return { travelerCount, newThisMonthCount, restrictedCount }
}

async function loadAttention(userId: string, accountStatus: AdminAccountStatus): Promise<AdminTravelerAttention[]> {
  const [bookingIds, threadIds] = await Promise.all([
    prisma.booking.findMany({ where: { userId }, select: { id: true } }),
    prisma.communityThread.findMany({ where: { authorId: userId }, select: { id: true } }),
  ])
  const [pendingCancel, refundProcessing, openDispute, failedRefund, criticalRecon, openThreadReports] =
    await Promise.all([
      prisma.bookingCancellationRequest.count({
        where: { status: 'PENDING', booking: { userId } },
      }),
      prisma.refund.count({ where: { userId, status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.paymentDispute.count({ where: { userId, status: { in: [...OPEN_DISPUTE] } } }),
      prisma.refund.count({ where: { userId, status: 'FAILED' } }),
      bookingIds.length
        ? prisma.financialReconciliationIssue.count({
            where: {
              status: 'OPEN',
              severity: 'CRITICAL',
              bookingId: { in: bookingIds.map(b => b.id) },
            },
          })
        : Promise.resolve(0),
      threadIds.length
        ? prisma.communityReport.count({
            where: {
              status: 'OPEN',
              targetType: { in: ['THREAD', 'thread', 'CommunityThread'] },
              targetId: { in: threadIds.map(t => t.id) },
            },
          })
        : Promise.resolve(0),
    ])
  const items: AdminTravelerAttention[] = []
  if (accountStatus === 'restricted' || accountStatus === 'disabled') {
    items.push({
      code: 'ACCOUNT_RESTRICTED',
      label: 'Account is restricted from sign-in and protected API access',
      tone: 'critical',
    })
  }
  if (accountStatus === 'deactivated') {
    items.push({ code: 'ACCOUNT_DEACTIVATED', label: 'Account is self-deactivated', tone: 'warning' })
  }
  if (pendingCancel > 0) {
    items.push({ code: 'PENDING_CANCELLATION', label: `${pendingCancel} pending cancellation request(s)`, tone: 'warning' })
  }
  if (refundProcessing > 0) {
    items.push({ code: 'REFUND_PROCESSING', label: `${refundProcessing} refund(s) processing`, tone: 'warning' })
  }
  if (openDispute > 0) {
    items.push({ code: 'OPEN_DISPUTE', label: `${openDispute} open payment dispute(s)`, tone: 'critical' })
  }
  if (failedRefund > 0) {
    items.push({ code: 'FAILED_REFUND', label: `${failedRefund} failed refund(s)`, tone: 'critical' })
  }
  if (criticalRecon > 0) {
    items.push({
      code: 'CRITICAL_RECON',
      label: `${criticalRecon} critical reconciliation issue(s) on their bookings`,
      tone: 'critical',
    })
  }
  if (openThreadReports > 0) {
    items.push({
      code: 'REPORTED_THREADS',
      label: `${openThreadReports} open report(s) on community threads they authored`,
      tone: 'warning',
    })
  }
  return items
}

export async function adminGetTraveler(userId: string): Promise<AdminTravelerDetail> {
  const user = await requireTraveler(userId)
  const [
    bookingCount,
    completedBookingCount,
    claimCount,
    redeemedClaimCount,
    journeyCount,
    eventCreatedCount,
    eventAttendingCount,
    communityCount,
    postCount,
    lastSession,
    attention,
    safety,
  ] = await Promise.all([
    prisma.booking.count({ where: { userId: user.id } }),
    prisma.booking.count({ where: { userId: user.id, status: 'COMPLETED' } }),
    prisma.dealClaim.count({ where: { userId: user.id } }),
    prisma.dealClaim.count({ where: { userId: user.id, status: 'REDEEMED' } }),
    prisma.journey.count({ where: { authorId: user.id, deletedAt: null } }),
    prisma.travelerEvent.count({ where: { creatorId: user.id } }),
    prisma.eventAttendance.count({ where: { userId: user.id } }),
    prisma.communityMembership.count({ where: { userId: user.id } }),
    prisma.post.count({ where: { authorId: user.id, deletedAt: null, status: 'PUBLISHED' } }),
    prisma.session.findFirst({
      where: { userId: user.id },
      orderBy: { lastSeenAt: 'desc' },
      select: { lastSeenAt: true },
    }),
    loadAttention(user.id, user.accountStatus),
    adminTravelerSafetyCounts(user.id),
  ])
  const profile = user.travelerProfile
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: profile?.displayName?.trim() || null,
    bio: profile?.bio ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    coverUrl: profile?.coverUrl ?? null,
    homeCity: profile?.homeCity ?? null,
    homeCountryCode: profile?.homeCountryCode ?? null,
    preferredLanguage: profile?.preferredLanguage ?? 'en',
    profileVisibility: profile?.profileVisibility ?? 'PUBLIC',
    accountStatus: user.accountStatus,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt.toISOString(),
    lastSeenAt: lastSession?.lastSeenAt ? lastSession.lastSeenAt.toISOString() : null,
    marketplace: {
      bookingCount,
      completedBookingCount,
      claimCount,
      redeemedClaimCount,
      journeyCount,
      eventCreatedCount,
      eventAttendingCount,
      communityCount,
      postCount,
    },
    attention: withSafetyAttention(attention, safety),
    canRestrict: RESTRICTABLE.includes(user.accountStatus),
    canRestore: user.accountStatus === 'restricted',
    safety,
  }
}

function withSafetyAttention(
  attention: AdminTravelerAttention[],
  safety: { openReportsAgainstContent: number; removedContentCount: number },
) {
  const items = [...attention]
  if (safety.openReportsAgainstContent > 0 && !items.some(i => i.code === 'REPORTED_THREADS' || i.code === 'REPORTED_CONTENT')) {
    items.push({
      code: 'REPORTED_CONTENT',
      label: `${safety.openReportsAgainstContent} open report(s) against authored content`,
      tone: 'warning',
    })
  }
  if (safety.removedContentCount > 0) {
    items.push({
      code: 'REMOVED_CONTENT',
      label: `${safety.removedContentCount} hidden or removed content item(s)`,
      tone: 'info',
    })
  }
  return items
}

function mapClaim(row: {
  id: string
  code: string
  status: string
  dealId: string
  titleSnapshot: string
  currencySnapshot: string
  originalPriceSnapshot: { toString(): string } | null
  dealPriceSnapshot: { toString(): string } | null
  discountSummarySnapshot: string
  termsSnapshot: string | null
  redemptionInstructionsSnapshot: string | null
  createdAt: Date
  redeemedAt: Date | null
  deal: { title: string; business: { id: string; name: string } | null } | null
  bookings: Array<{ id: string; bookingReference: string }>
}): AdminTravelerClaim {
  const saving = snapshotSavingAmount(row.originalPriceSnapshot, row.dealPriceSnapshot)
  const booking = row.bookings[0]
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    dealId: row.dealId,
    dealTitle: row.deal?.title || row.titleSnapshot,
    businessId: row.deal?.business?.id ?? null,
    businessName: row.deal?.business?.name ?? null,
    titleSnapshot: row.titleSnapshot,
    currencySnapshot: row.currencySnapshot,
    originalPriceSnapshot: toMoneyString(row.originalPriceSnapshot),
    dealPriceSnapshot: toMoneyString(row.dealPriceSnapshot),
    savingAmountSnapshot: saving == null ? null : saving.toFixed(2),
    discountSummarySnapshot: row.discountSummarySnapshot,
    termsSnapshot: row.termsSnapshot,
    redemptionInstructionsSnapshot: row.redemptionInstructionsSnapshot,
    bookingId: booking?.id ?? null,
    bookingReference: booking?.bookingReference ?? null,
    claimedAt: row.createdAt.toISOString(),
    redeemedAt: row.redeemedAt ? row.redeemedAt.toISOString() : null,
  }
}

export async function adminListTravelerClaims(userId: string, query: { page?: unknown; pageSize?: unknown }) {
  const user = await requireTraveler(userId)
  const { page, pageSize, skip } = parseAdminPage(query)
  const where = { userId: user.id }
  const [total, rows] = await Promise.all([
    prisma.dealClaim.count({ where }),
    prisma.dealClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        deal: { select: { title: true, business: { select: { id: true, name: true } } } },
        bookings: { select: { id: true, bookingReference: true }, take: 1, orderBy: { createdAt: 'desc' } },
      },
    }),
  ])
  return paginated(rows.map(mapClaim), page, pageSize, total)
}

export async function adminListTravelerJourneys(
  userId: string,
  query: { page?: unknown; pageSize?: unknown },
): Promise<AdminTravelerJourneyListDto> {
  const user = await requireTraveler(userId)
  const { page, pageSize, skip } = parseAdminPage(query)
  const where = { authorId: user.id, deletedAt: null }
  const [total, rows] = await Promise.all([
    prisma.journey.count({ where }),
    prisma.journey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { _count: { select: { stops: true, bookings: true } } },
    }),
  ])
  return paginated(
    rows.map(row => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      startPlace: row.startPlace,
      endPlace: row.endPlace,
      visibility: row.visibility,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      endDate: row.endDate ? row.endDate.toISOString() : null,
      stopCount: row._count.stops,
      linkedBookingCount: row._count.bookings,
      createdAt: row.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
  )
}

export async function adminListTravelerEvents(
  userId: string,
  query: { page?: unknown; pageSize?: unknown },
): Promise<AdminTravelerEventListDto> {
  const user = await requireTraveler(userId)
  const { page, pageSize, skip } = parseAdminPage(query)
  const where = {
    OR: [{ creatorId: user.id }, { attendances: { some: { userId: user.id } } }],
  }
  const [total, rows] = await Promise.all([
    prisma.travelerEvent.count({ where }),
    prisma.travelerEvent.findMany({
      where,
      orderBy: { startAt: 'desc' },
      skip,
      take: pageSize,
      include: { attendances: { where: { userId: user.id }, select: { status: true } } },
    }),
  ])
  return paginated(
    rows.map((row): AdminTravelerEvent => {
      const attendance = row.attendances[0]
      let relation: AdminTravelerEvent['relation'] = 'created'
      if (row.creatorId !== user.id) {
        relation = attendance?.status === 'INTERESTED' ? 'interested' : 'going'
      }
      return {
        id: row.id,
        title: row.title,
        relation,
        status: row.status,
        locationName: row.locationName,
        city: row.city,
        startAt: row.startAt.toISOString(),
      }
    }),
    page,
    pageSize,
    total,
  )
}

export async function adminListTravelerCommunities(
  userId: string,
  query: { page?: unknown; pageSize?: unknown },
): Promise<AdminTravelerCommunityListDto> {
  const user = await requireTraveler(userId)
  const { page, pageSize, skip } = parseAdminPage(query)
  const where = { userId: user.id }
  const [total, rows] = await Promise.all([
    prisma.communityMembership.count({ where }),
    prisma.communityMembership.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { community: { select: { id: true, name: true, slug: true } } },
    }),
  ])
  return paginated(
    rows.map(
      (row): AdminTravelerCommunity => ({
        id: row.community.id,
        name: row.community.name,
        slug: row.community.slug,
        role: row.role,
        membershipStatus: row.status,
        joinedAt: row.createdAt.toISOString(),
      }),
    ),
    page,
    pageSize,
    total,
  )
}

export async function adminGetTravelerActivity(
  userId: string,
  query: { page?: unknown; pageSize?: unknown },
): Promise<AdminTravelerActivityDto> {
  const user = await requireTraveler(userId)
  const { page, pageSize, skip } = parseAdminPage(query)
  const postWhere = { authorId: user.id, deletedAt: null, status: 'PUBLISHED' as const, visibility: 'PUBLIC' as const }
  const [total, rows, commentCount, saveCount, followingCount, followerCount] = await Promise.all([
    prisma.post.count({ where: postWhere }),
    prisma.post.findMany({
      where: postWhere,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { _count: { select: { media: true, reactions: true, comments: true } } },
    }),
    prisma.comment.count({ where: { authorId: user.id, deletedAt: null } }),
    prisma.save.count({ where: { userId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    prisma.follow.count({ where: { followingId: user.id } }),
  ])
  return {
    posts: paginated(
      rows.map(row => ({
        id: row.id,
        captionPreview: row.caption.slice(0, 180),
        createdAt: row.createdAt.toISOString(),
        mediaCount: row._count.media,
        reactionCount: row._count.reactions,
        commentCount: row._count.comments,
      })),
      page,
      pageSize,
      total,
    ),
    commentCount,
    saveCount,
    followingCount,
    followerCount,
  }
}

export async function adminGetTravelerFinancial(
  userId: string,
  query: { page?: unknown; pageSize?: unknown },
): Promise<AdminTravelerFinancialDto> {
  const user = await requireTraveler(userId)
  const { page, pageSize, skip } = parseAdminPage(query)
  const scope = { userId: user.id }
  const [payGroups, refundGroups, disputeGroups, payments, refunds, disputes, paymentTotal, refundTotal, disputeTotal] =
    await Promise.all([
      prisma.payment.groupBy({
        by: ['currency'],
        where: { ...scope, status: 'PAID' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.refund.groupBy({
        by: ['currency'],
        where: { ...scope, status: 'SUCCEEDED' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.paymentDispute.groupBy({
        by: ['currency'],
        where: { ...scope, status: { in: [...OPEN_DISPUTE] } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payment.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          bookingId: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          paidAt: true,
          booking: { select: { bookingReference: true } },
          paymentDisputes: { where: { status: { in: [...OPEN_DISPUTE] } }, select: { id: true }, take: 1 },
        },
      }),
      prisma.refund.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          bookingId: true,
          amount: true,
          currency: true,
          status: true,
          reason: true,
          createdAt: true,
          succeededAt: true,
          booking: { select: { bookingReference: true } },
        },
      }),
      prisma.paymentDispute.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          evidenceDueAt: true,
          booking: { select: { bookingReference: true } },
        },
      }),
      prisma.payment.count({ where: scope }),
      prisma.refund.count({ where: scope }),
      prisma.paymentDispute.count({ where: scope }),
    ])
  const currencies = new Set([...payGroups.map(g => g.currency), ...refundGroups.map(g => g.currency), ...disputeGroups.map(g => g.currency)])
  const payMap = new Map(payGroups.map(g => [g.currency, g]))
  const refundMap = new Map(refundGroups.map(g => [g.currency, g]))
  const disputeMap = new Map(disputeGroups.map(g => [g.currency, g]))
  const maxTotal = Math.max(paymentTotal, refundTotal, disputeTotal)
  return {
    byCurrency: [...currencies].sort().map(currency => ({
      currency,
      paymentsPaid: moneyOrZero(payMap.get(currency)?._sum.amount),
      paymentCount: payMap.get(currency)?._count._all ?? 0,
      refundsSucceeded: moneyOrZero(refundMap.get(currency)?._sum.amount),
      refundCount: refundMap.get(currency)?._count._all ?? 0,
      disputesOpenAmount: moneyOrZero(disputeMap.get(currency)?._sum.amount),
      openDisputeCount: disputeMap.get(currency)?._count._all ?? 0,
    })),
    payments: payments.map(row => ({
      id: row.id,
      bookingId: row.bookingId,
      bookingReference: row.booking.bookingReference,
      amount: moneyOrZero(row.amount),
      currency: row.currency,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
      hasOpenDispute: row.paymentDisputes.length > 0,
    })),
    refunds: refunds.map(row => ({
      id: row.id,
      bookingId: row.bookingId,
      bookingReference: row.booking.bookingReference,
      amount: moneyOrZero(row.amount),
      currency: row.currency,
      status: row.status,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
      succeededAt: row.succeededAt ? row.succeededAt.toISOString() : null,
    })),
    disputes: disputes.map(row => ({
      id: row.id,
      bookingReference: row.booking.bookingReference,
      amount: moneyOrZero(row.amount),
      currency: row.currency,
      status: row.status,
      evidenceDueAt: row.evidenceDueAt ? row.evidenceDueAt.toISOString() : null,
    })),
    page,
    pageSize,
    hasNext: page * pageSize < maxTotal,
  }
}

export async function adminRestrictTraveler(actorUserId: string, actorSessionId: string, userId: string) {
  const user = await requireTraveler(userId)
  if (!RESTRICTABLE.includes(user.accountStatus)) {
    throw new AppError(409, 'INVALID_STATUS', 'This traveler cannot be restricted from the current account status.')
  }
  await prisma.user.update({ where: { id: user.id }, data: { accountStatus: 'restricted' } })
  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: 'admin_restricted' },
  })
  await writeAdminAudit({
    action: 'TRAVELER_ACCOUNT_RESTRICTED',
    outcome: 'success',
    actorUserId,
    actorSessionId,
    targetType: 'User',
    targetId: user.id,
    metadata: { from: user.accountStatus, to: 'restricted' },
  })
  return adminGetTraveler(user.id)
}

export async function adminRestoreTraveler(actorUserId: string, actorSessionId: string, userId: string) {
  const user = await requireTraveler(userId)
  if (user.accountStatus !== 'restricted') {
    throw new AppError(409, 'INVALID_STATUS', 'Only restricted traveler accounts can be restored.')
  }
  const next: AdminAccountStatus = user.emailVerifiedAt ? 'active' : 'pending_verification'
  await prisma.user.update({ where: { id: user.id }, data: { accountStatus: next } })
  await writeAdminAudit({
    action: 'TRAVELER_ACCOUNT_RESTORED',
    outcome: 'success',
    actorUserId,
    actorSessionId,
    targetType: 'User',
    targetId: user.id,
    metadata: { from: 'restricted', to: next },
  })
  return adminGetTraveler(user.id)
}
