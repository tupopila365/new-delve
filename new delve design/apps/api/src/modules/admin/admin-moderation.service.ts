import { prisma } from '@delve/database'
import type { Prisma } from '@delve/database'
import type {
  AdminModerationDecisionBody,
  AdminModerationDetail,
  AdminModerationOpsSummary,
  AdminModerationQueueDto,
  AdminModerationTargetType,
  ContentModerationActionType,
  ContentReportReason,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { optionalString, paginated, parseAdminPage } from '../admin/admin-query.js'
import { createNotification } from '../notifications/notify.js'

const OPEN_CONTENT = ['OPEN', 'UNDER_REVIEW'] as const
const OPEN_COMMUNITY = ['OPEN', 'REVIEWING'] as const

const ACTIONS: Record<AdminModerationTargetType, ContentModerationActionType[]> = {
  POST: ['NO_ACTION', 'HIDE', 'REMOVE', 'RESTORE'],
  EVENT: ['NO_ACTION', 'HIDE', 'REMOVE', 'RESTORE'],
  JOURNEY: ['NO_ACTION', 'HIDE', 'REMOVE', 'RESTORE'],
  COMMUNITY: ['NO_ACTION', 'PLATFORM_RESTRICT', 'RESTORE'],
  COMMUNITY_THREAD: ['NO_ACTION', 'REMOVE', 'RESTORE'],
}

type CaseKey = { targetType: AdminModerationTargetType; targetId: string }

function creatorRemovalCopy(type: AdminModerationTargetType) {
  if (type === 'EVENT') return 'One of your events was removed because it violated our platform rules.'
  if (type === 'JOURNEY') return 'One of your journeys was hidden because it violated our platform rules.'
  if (type === 'COMMUNITY') return 'A community you created was restricted because it violated our platform rules.'
  if (type === 'COMMUNITY_THREAD') return 'A community post was removed because it violated our platform rules.'
  return 'One of your Delve posts was removed because it violated our platform rules.'
}

function previewOf(text: string | null | undefined, fallback = 'Untitled') {
  const v = (text || '').replace(/\s+/g, ' ').trim()
  return v ? v.slice(0, 140) : fallback
}

function mapCommunityTarget(targetType: string, targetId: string): CaseKey | null {
  if (targetType === 'POST' || targetType === 'THREAD' || targetType === 'thread') {
    return { targetType: 'COMMUNITY_THREAD', targetId }
  }
  if (targetType === 'COMMUNITY') return { targetType: 'COMMUNITY', targetId }
  return null
}

async function markReportsInReview(targetType: AdminModerationTargetType, targetId: string, actorUserId: string) {
  if (targetType === 'COMMUNITY_THREAD' || targetType === 'COMMUNITY') {
    const updated = await prisma.communityReport.updateMany({
      where: {
        targetId,
        status: 'OPEN',
        ...(targetType === 'COMMUNITY' ? { communityId: targetId } : {}),
      },
      data: { status: 'REVIEWING' },
    })
    if (updated.count) {
      await writeAdminAudit({
        action: 'CONTENT_REPORT_REVIEW_STARTED',
        outcome: 'success',
        actorUserId,
        targetType,
        targetId,
      })
    }
    return
  }
  const mapped = targetType as 'POST' | 'EVENT' | 'JOURNEY'
  const updated = await prisma.contentReport.updateMany({
    where: { targetType: mapped, targetId, status: 'OPEN' },
    data: { status: 'UNDER_REVIEW' },
  })
  if (updated.count) {
    await writeAdminAudit({
      action: 'CONTENT_REPORT_REVIEW_STARTED',
      outcome: 'success',
      actorUserId,
      targetType,
      targetId,
    })
  }
}

export async function adminModerationOpsSummary(): Promise<AdminModerationOpsSummary> {
  const startToday = new Date()
  startToday.setUTCHours(0, 0, 0, 0)
  const soon = new Date(Date.now() + 7 * 24 * 3600_000)
  const now = new Date()
  const [openContent, openCommunity, resolvedContent, resolvedCommunity, hiddenPosts, hiddenEvents, hiddenJourneys, hiddenCommunities] =
    await Promise.all([
      prisma.contentReport.count({ where: { status: { in: [...OPEN_CONTENT] } } }),
      prisma.communityReport.count({ where: { status: { in: [...OPEN_COMMUNITY] } } }),
      prisma.contentReport.count({ where: { status: { in: ['RESOLVED', 'DISMISSED'] }, reviewedAt: { gte: startToday } } }),
      prisma.communityReport.count({
        where: { status: { in: ['RESOLVED', 'DISMISSED'] }, updatedAt: { gte: startToday } },
      }),
      prisma.post.count({ where: { moderationStatus: { in: ['HIDDEN', 'REMOVED'] } } }),
      prisma.travelerEvent.count({ where: { moderationStatus: { in: ['HIDDEN', 'REMOVED'] } } }),
      prisma.journey.count({ where: { moderationStatus: { in: ['HIDDEN', 'REMOVED'] } } }),
      prisma.community.count({ where: { moderationStatus: { in: ['HIDDEN', 'REMOVED'] } } }),
    ])
  const eventReports = await prisma.contentReport.findMany({
    where: { targetType: 'EVENT', status: { in: [...OPEN_CONTENT] } },
    select: { targetId: true },
    distinct: ['targetId'],
  })
  const upcomingEventsWithReports = eventReports.length
    ? await prisma.travelerEvent.count({
        where: {
          id: { in: eventReports.map(r => r.targetId) },
          startAt: { gte: now, lte: soon },
          moderationStatus: 'VISIBLE',
        },
      })
    : 0
  const grouped = await prisma.contentReport.groupBy({
    by: ['targetType', 'targetId'],
    where: { status: { in: [...OPEN_CONTENT] } },
    _count: { _all: true },
  })
  const communityGrouped = await prisma.communityReport.groupBy({
    by: ['targetType', 'targetId'],
    where: { status: { in: [...OPEN_COMMUNITY] } },
    _count: { _all: true },
  })
  const repeatTargetCount =
    grouped.filter(g => g._count._all >= 3).length + communityGrouped.filter(g => g._count._all >= 3).length
  return {
    openReportCount: openContent + openCommunity,
    needsReviewCount: openContent + openCommunity,
    repeatTargetCount,
    resolvedTodayCount: resolvedContent + resolvedCommunity,
    hiddenOrRemovedCount: hiddenPosts + hiddenEvents + hiddenJourneys + hiddenCommunities,
    communityOpenReportCount: openCommunity,
    upcomingEventsWithReports,
  }
}

async function collectOpenCases() {
  const [content, community, contentReasons, communityReasons] = await Promise.all([
    prisma.contentReport.groupBy({
      by: ['targetType', 'targetId'],
      where: { status: { in: [...OPEN_CONTENT] } },
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
    prisma.communityReport.groupBy({
      by: ['targetType', 'targetId'],
      where: { status: { in: [...OPEN_COMMUNITY] } },
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
    prisma.contentReport.groupBy({
      by: ['targetType', 'targetId', 'reason'],
      where: { status: { in: [...OPEN_CONTENT] } },
      _count: { _all: true },
    }),
    prisma.communityReport.groupBy({
      by: ['targetType', 'targetId', 'reason'],
      where: { status: { in: [...OPEN_COMMUNITY] } },
      _count: { _all: true },
    }),
  ])
  const map = new Map<
    string,
    {
      targetType: AdminModerationTargetType
      targetId: string
      openReportCount: number
      firstReportedAt: Date
      latestReportedAt: Date
      reasons: Map<string, number>
      source: 'CONTENT_REPORT' | 'COMMUNITY_REPORT' | 'MIXED'
    }
  >()
  function add(
    targetType: AdminModerationTargetType,
    targetId: string,
    count: number,
    min: Date | null,
    max: Date | null,
    source: 'CONTENT_REPORT' | 'COMMUNITY_REPORT',
  ) {
    const key = `${targetType}:${targetId}`
    const current = map.get(key)
    const first = min || new Date()
    const latest = max || first
    if (!current) {
      map.set(key, {
        targetType,
        targetId,
        openReportCount: count,
        firstReportedAt: first,
        latestReportedAt: latest,
        reasons: new Map(),
        source,
      })
      return
    }
    current.openReportCount += count
    if (first < current.firstReportedAt) current.firstReportedAt = first
    if (latest > current.latestReportedAt) current.latestReportedAt = latest
    current.source = current.source === source ? source : 'MIXED'
  }
  for (const row of content) {
    add(row.targetType, row.targetId, row._count._all, row._min.createdAt, row._max.createdAt, 'CONTENT_REPORT')
  }
  for (const row of community) {
    const mapped = mapCommunityTarget(row.targetType, row.targetId)
    if (!mapped) continue
    add(mapped.targetType, mapped.targetId, row._count._all, row._min.createdAt, row._max.createdAt, 'COMMUNITY_REPORT')
  }
  for (const row of contentReasons) {
    const item = map.get(`${row.targetType}:${row.targetId}`)
    if (item) item.reasons.set(row.reason, (item.reasons.get(row.reason) || 0) + row._count._all)
  }
  for (const row of communityReasons) {
    const mapped = mapCommunityTarget(row.targetType, row.targetId)
    if (!mapped) continue
    const item = map.get(`${mapped.targetType}:${mapped.targetId}`)
    if (item) item.reasons.set(row.reason, (item.reasons.get(row.reason) || 0) + row._count._all)
  }
  return [...map.values()].sort((a, b) => b.latestReportedAt.getTime() - a.latestReportedAt.getTime())
}

async function hydrateCreators(cases: Array<{ targetType: AdminModerationTargetType; targetId: string }>) {
  const posts = cases.filter(c => c.targetType === 'POST').map(c => c.targetId)
  const events = cases.filter(c => c.targetType === 'EVENT').map(c => c.targetId)
  const journeys = cases.filter(c => c.targetType === 'JOURNEY').map(c => c.targetId)
  const threads = cases.filter(c => c.targetType === 'COMMUNITY_THREAD').map(c => c.targetId)
  const communities = cases.filter(c => c.targetType === 'COMMUNITY').map(c => c.targetId)
  const [postRows, eventRows, journeyRows, threadRows, communityRows] = await Promise.all([
    posts.length
      ? prisma.post.findMany({
          where: { id: { in: posts } },
          select: {
            id: true,
            caption: true,
            status: true,
            moderationStatus: true,
            author: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
          },
        })
      : [],
    events.length
      ? prisma.travelerEvent.findMany({
          where: { id: { in: events } },
          select: {
            id: true,
            title: true,
            status: true,
            moderationStatus: true,
            city: true,
            locationName: true,
            creator: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
          },
        })
      : [],
    journeys.length
      ? prisma.journey.findMany({
          where: { id: { in: journeys } },
          select: {
            id: true,
            title: true,
            visibility: true,
            moderationStatus: true,
            startPlace: true,
            endPlace: true,
            author: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
          },
        })
      : [],
    threads.length
      ? prisma.communityThread.findMany({
          where: { id: { in: threads } },
          select: {
            id: true,
            title: true,
            status: true,
            community: { select: { name: true } },
            author: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
          },
        })
      : [],
    communities.length
      ? prisma.community.findMany({
          where: { id: { in: communities } },
          select: {
            id: true,
            name: true,
            moderationStatus: true,
            owner: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
          },
        })
      : [],
  ])
  const info = new Map<
    string,
    {
      preview: string
      creatorUserId: string | null
      creatorUsername: string | null
      creatorDisplayName: string | null
      creatorAccountStatus: AdminModerationDetail['creatorAccountStatus']
      contextLabel: string | null
      contentStatus: string
    }
  >()
  for (const row of postRows) {
    info.set(`POST:${row.id}`, {
      preview: previewOf(row.caption, 'Post'),
      creatorUserId: row.author.id,
      creatorUsername: row.author.username,
      creatorDisplayName: row.author.travelerProfile?.displayName || null,
      creatorAccountStatus: row.author.accountStatus,
      contextLabel: null,
      contentStatus: row.moderationStatus === 'VISIBLE' ? row.status : row.moderationStatus,
    })
  }
  for (const row of eventRows) {
    info.set(`EVENT:${row.id}`, {
      preview: previewOf(row.title, 'Event'),
      creatorUserId: row.creator.id,
      creatorUsername: row.creator.username,
      creatorDisplayName: row.creator.travelerProfile?.displayName || null,
      creatorAccountStatus: row.creator.accountStatus,
      contextLabel: [row.locationName, row.city].filter(Boolean).join(', ') || null,
      contentStatus: row.moderationStatus === 'VISIBLE' ? row.status : row.moderationStatus,
    })
  }
  for (const row of journeyRows) {
    info.set(`JOURNEY:${row.id}`, {
      preview: previewOf(row.title, 'Journey'),
      creatorUserId: row.author.id,
      creatorUsername: row.author.username,
      creatorDisplayName: row.author.travelerProfile?.displayName || null,
      creatorAccountStatus: row.author.accountStatus,
      contextLabel: `${row.startPlace} → ${row.endPlace}`,
      contentStatus: row.moderationStatus === 'VISIBLE' ? row.visibility : row.moderationStatus,
    })
  }
  for (const row of threadRows) {
    info.set(`COMMUNITY_THREAD:${row.id}`, {
      preview: previewOf(row.title, 'Thread'),
      creatorUserId: row.author.id,
      creatorUsername: row.author.username,
      creatorDisplayName: row.author.travelerProfile?.displayName || null,
      creatorAccountStatus: row.author.accountStatus,
      contextLabel: row.community.name,
      contentStatus: row.status,
    })
  }
  for (const row of communityRows) {
    info.set(`COMMUNITY:${row.id}`, {
      preview: previewOf(row.name, 'Community'),
      creatorUserId: row.owner?.id ?? null,
      creatorUsername: row.owner?.username ?? null,
      creatorDisplayName: row.owner?.travelerProfile?.displayName || null,
      creatorAccountStatus: row.owner?.accountStatus ?? null,
      contextLabel: null,
      contentStatus: row.moderationStatus,
    })
  }
  return info
}

export async function adminListModerationQueue(query: {
  status?: unknown
  targetType?: unknown
  reason?: unknown
  q?: unknown
  minReports?: unknown
  page?: unknown
  pageSize?: unknown
}): Promise<AdminModerationQueueDto> {
  const { page, pageSize, skip } = parseAdminPage(query)
  const targetType = optionalString(query.targetType) as AdminModerationTargetType | undefined
  const reason = optionalString(query.reason)
  const q = optionalString(query.q)?.toLowerCase()
  const minReports = Number.parseInt(String(query.minReports || '0'), 10) || 0
  void query.status
  let cases = await collectOpenCases()
  if (targetType) cases = cases.filter(c => c.targetType === targetType)
  if (minReports > 1) cases = cases.filter(c => c.openReportCount >= minReports)
  if (reason) cases = cases.filter(c => [...c.reasons.keys()].some(r => r.toLowerCase().includes(reason.toLowerCase())))
  const hydrated = await hydrateCreators(cases)
  if (q) {
    cases = cases.filter(c => {
      const info = hydrated.get(`${c.targetType}:${c.targetId}`)
      const blob = `${info?.preview || ''} ${info?.creatorUsername || ''} ${info?.creatorDisplayName || ''} ${info?.contextLabel || ''}`.toLowerCase()
      return blob.includes(q)
    })
  }
  const total = cases.length
  const slice = cases.slice(skip, skip + pageSize)
  return paginated(
    slice.map(c => {
      const info = hydrated.get(`${c.targetType}:${c.targetId}`)
      const topReasons = [...c.reasons.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([r, n]) => `${r} (${n})`)
      return {
        targetType: c.targetType,
        targetId: c.targetId,
        preview: info?.preview || 'Reported content',
        creatorUserId: info?.creatorUserId ?? null,
        creatorUsername: info?.creatorUsername ?? null,
        creatorDisplayName: info?.creatorDisplayName ?? null,
        creatorAccountStatus: info?.creatorAccountStatus ?? null,
        contextLabel: info?.contextLabel ?? null,
        openReportCount: c.openReportCount,
        topReasons,
        firstReportedAt: c.firstReportedAt.toISOString(),
        latestReportedAt: c.latestReportedAt.toISOString(),
        contentStatus: info?.contentStatus || 'UNKNOWN',
        source: c.source,
      }
    }),
    page,
    pageSize,
    total,
  )
}

export async function adminGetModerationCase(
  targetType: string,
  targetId: string,
  actorUserId?: string,
): Promise<AdminModerationDetail> {
  const type = targetType as AdminModerationTargetType
  if (!ACTIONS[type]) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid target type')
  const id = targetId.trim()
  if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'targetId required')
  if (actorUserId) await markReportsInReview(type, id, actorUserId)

  const contentReports =
    type === 'POST' || type === 'EVENT' || type === 'JOURNEY'
      ? await prisma.contentReport.findMany({
          where: { targetType: type, targetId: id },
          include: { reporter: { include: { travelerProfile: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : []
  const communityReports =
    type === 'COMMUNITY_THREAD' || type === 'COMMUNITY'
      ? await prisma.communityReport.findMany({
          where: type === 'COMMUNITY' ? { communityId: id } : { targetId: id },
          include: { reporter: { include: { travelerProfile: true } }, rule: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : []
  const history = await prisma.contentModerationAction.findMany({
    where: { targetType: type, targetId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  let preview = 'Reported content'
  let body: string | null = null
  let mediaUrls: string[] = []
  let createdAt: string | null = null
  let visibility: string | null = null
  let contentStatus = 'UNKNOWN'
  let moderationStatus: AdminModerationDetail['moderationStatus'] = null
  let creatorUserId: string | null = null
  let creatorUsername: string | null = null
  let creatorDisplayName: string | null = null
  let creatorAccountStatus: AdminModerationDetail['creatorAccountStatus'] = null
  const context = {
    communityId: null as string | null,
    communityName: null as string | null,
    communitySlug: null as string | null,
    location: null as string | null,
    startAt: null as string | null,
    memberRole: null as string | null,
  }
  let communityRules: AdminModerationDetail['communityRules'] = []
  let communityAudit: AdminModerationDetail['communityAudit'] = []

  if (type === 'POST') {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        media: { where: { deletedAt: null }, take: 8, select: { secureUrl: true } },
        author: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
      },
    })
    if (!post) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
    preview = previewOf(post.caption, 'Post')
    body = post.caption
    mediaUrls = post.media.map(m => m.secureUrl).filter((u): u is string => Boolean(u))
    createdAt = post.createdAt.toISOString()
    visibility = post.visibility
    contentStatus = post.status
    moderationStatus = post.moderationStatus
    creatorUserId = post.author.id
    creatorUsername = post.author.username
    creatorDisplayName = post.author.travelerProfile?.displayName || null
    creatorAccountStatus = post.author.accountStatus
  } else if (type === 'EVENT') {
    const event = await prisma.travelerEvent.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
        community: { select: { id: true, name: true, slug: true } },
      },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
    preview = event.title
    body = event.description
    mediaUrls = event.coverUrl ? [event.coverUrl] : []
    createdAt = event.createdAt.toISOString()
    visibility = event.visibility
    contentStatus = event.status
    moderationStatus = event.moderationStatus
    creatorUserId = event.creator.id
    creatorUsername = event.creator.username
    creatorDisplayName = event.creator.travelerProfile?.displayName || null
    creatorAccountStatus = event.creator.accountStatus
    context.location = [event.locationName, event.city].filter(Boolean).join(', ') || null
    context.startAt = event.startAt.toISOString()
    context.communityId = event.community?.id ?? null
    context.communityName = event.community?.name ?? null
    context.communitySlug = event.community?.slug ?? null
  } else if (type === 'JOURNEY') {
    const journey = await prisma.journey.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
      },
    })
    if (!journey) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
    const reported = await prisma.contentReport.count({ where: { targetType: 'JOURNEY', targetId: id } })
    if (journey.visibility !== 'PUBLIC' && reported === 0 && journey.moderationStatus === 'VISIBLE') {
      throw new AppError(404, 'NOT_FOUND', 'Content not found.')
    }
    preview = journey.title
    body = journey.summary
    mediaUrls = journey.coverUrl ? [journey.coverUrl] : []
    createdAt = journey.createdAt.toISOString()
    visibility = journey.visibility
    contentStatus = journey.visibility
    moderationStatus = journey.moderationStatus
    creatorUserId = journey.author.id
    creatorUsername = journey.author.username
    creatorDisplayName = journey.author.travelerProfile?.displayName || null
    creatorAccountStatus = journey.author.accountStatus
    context.location = `${journey.startPlace} → ${journey.endPlace}`
  } else if (type === 'COMMUNITY_THREAD') {
    const thread = await prisma.communityThread.findUnique({
      where: { id },
      include: {
        community: { include: { rules: { orderBy: { sortOrder: 'asc' }, take: 20 } } },
        author: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
      },
    })
    if (!thread) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
    preview = thread.title
    body = thread.body
    mediaUrls = thread.mediaUrls
    createdAt = thread.createdAt.toISOString()
    contentStatus = thread.status
    moderationStatus = thread.status === 'REMOVED' ? 'REMOVED' : 'VISIBLE'
    creatorUserId = thread.author.id
    creatorUsername = thread.author.username
    creatorDisplayName = thread.author.travelerProfile?.displayName || null
    creatorAccountStatus = thread.author.accountStatus
    context.communityId = thread.community.id
    context.communityName = thread.community.name
    context.communitySlug = thread.community.slug
    communityRules = thread.community.rules.map(r => ({ id: r.id, title: r.title, description: r.description }))
    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: thread.communityId, userId: thread.authorId } },
      select: { role: true },
    })
    context.memberRole = membership?.role ?? null
    const logs = await prisma.communityAuditLog.findMany({
      where: { communityId: thread.communityId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, createdAt: true },
    })
    communityAudit = logs.map(l => ({ action: l.action, createdAt: l.createdAt.toISOString() }))
  } else {
    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, accountStatus: true, travelerProfile: { select: { displayName: true } } } },
        rules: { orderBy: { sortOrder: 'asc' }, take: 20 },
      },
    })
    if (!community) throw new AppError(404, 'NOT_FOUND', 'Content not found.')
    preview = community.name
    body = community.description
    mediaUrls = [community.coverUrl, community.avatarUrl].filter((u): u is string => Boolean(u))
    createdAt = community.createdAt.toISOString()
    visibility = community.privacy
    contentStatus = community.moderationStatus
    moderationStatus = community.moderationStatus
    creatorUserId = community.owner?.id ?? null
    creatorUsername = community.owner?.username ?? null
    creatorDisplayName = community.owner?.travelerProfile?.displayName || null
    creatorAccountStatus = community.owner?.accountStatus ?? null
    context.communityId = community.id
    context.communityName = community.name
    context.communitySlug = community.slug
    communityRules = community.rules.map(r => ({ id: r.id, title: r.title, description: r.description }))
    const logs = await prisma.communityAuditLog.findMany({
      where: { communityId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, createdAt: true },
    })
    communityAudit = logs.map(l => ({ action: l.action, createdAt: l.createdAt.toISOString() }))
  }

  let creatorRemovedContentCount = 0
  let creatorResolvedReportCount = 0
  if (creatorUserId) {
    const [removedPosts, removedEvents, removedJourneys, resolved] = await Promise.all([
      prisma.post.count({ where: { authorId: creatorUserId, moderationStatus: { in: ['HIDDEN', 'REMOVED'] } } }),
      prisma.travelerEvent.count({ where: { creatorId: creatorUserId, moderationStatus: { in: ['HIDDEN', 'REMOVED'] } } }),
      prisma.journey.count({ where: { authorId: creatorUserId, moderationStatus: { in: ['HIDDEN', 'REMOVED'] } } }),
      prisma.contentReport.count({
        where: {
          status: { in: ['RESOLVED', 'DISMISSED'] },
          OR: [
            { targetType: 'POST', targetId: { in: await prisma.post.findMany({ where: { authorId: creatorUserId }, select: { id: true } }).then(r => r.map(x => x.id)) } },
          ],
        },
      }),
    ])
    creatorRemovedContentCount = removedPosts + removedEvents + removedJourneys
    creatorResolvedReportCount = resolved
  }

  const reports = [
    ...contentReports.map(r => ({
      id: r.id,
      source: 'CONTENT_REPORT' as const,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporterUsername: r.reporter.username,
      reporterDisplayName: r.reporter.travelerProfile?.displayName || null,
      communityRuleTitle: null,
    })),
    ...communityReports.map(r => ({
      id: r.id,
      source: 'COMMUNITY_REPORT' as const,
      reason: r.reason,
      details: r.description,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporterUsername: r.reporter.username,
      reporterDisplayName: r.reporter.travelerProfile?.displayName || null,
      communityRuleTitle: r.rule?.title ?? null,
    })),
  ]

  return {
    targetType: type,
    targetId: id,
    preview,
    body,
    mediaUrls,
    createdAt,
    visibility,
    contentStatus,
    moderationStatus,
    creatorUserId,
    creatorUsername,
    creatorDisplayName,
    creatorAccountStatus,
    creatorRemovedContentCount,
    creatorResolvedReportCount,
    context,
    communityRules,
    communityAudit,
    reports,
    history: history.map(h => ({
      id: h.id,
      action: h.action,
      reason: h.reason,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
    allowedActions: ACTIONS[type],
  }
}

async function closeReports(
  type: AdminModerationTargetType,
  targetId: string,
  actorUserId: string,
  resolution: 'RESOLVED' | 'DISMISSED',
) {
  const now = new Date()
  if (type === 'POST' || type === 'EVENT' || type === 'JOURNEY') {
    const open = await prisma.contentReport.findMany({
      where: { targetType: type, targetId, status: { in: [...OPEN_CONTENT] } },
      select: { id: true, reporterId: true },
    })
    await prisma.contentReport.updateMany({
      where: { targetType: type, targetId, status: { in: [...OPEN_CONTENT] } },
      data: { status: resolution, reviewedAt: now, reviewedByAdminId: actorUserId, resolution },
    })
    await writeAdminAudit({
      action: resolution === 'DISMISSED' ? 'CONTENT_REPORT_DISMISSED' : 'CONTENT_REPORT_RESOLVED',
      outcome: 'success',
      actorUserId,
      targetType: type,
      targetId,
    })
    await Promise.all(
      open.map(r =>
        createNotification({
          userId: r.reporterId,
          type: 'CONTENT_REPORT_REVIEWED',
          title: 'Report reviewed',
          body: 'Thanks for your report. It has been reviewed.',
          entityType: type.toLowerCase(),
          entityId: targetId,
        }),
      ),
    )
    return
  }
  await prisma.communityReport.updateMany({
    where: {
      status: { in: [...OPEN_COMMUNITY] },
      ...(type === 'COMMUNITY' ? { communityId: targetId } : { targetId }),
    },
    data: { status: resolution === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED' },
  })
  await writeAdminAudit({
    action: resolution === 'DISMISSED' ? 'CONTENT_REPORT_DISMISSED' : 'CONTENT_REPORT_RESOLVED',
    outcome: 'success',
    actorUserId,
    targetType: type,
    targetId,
  })
}

export async function adminDecideModerationCase(
  actorUserId: string,
  actorSessionId: string,
  targetType: string,
  targetId: string,
  body: AdminModerationDecisionBody,
) {
  const type = targetType as AdminModerationTargetType
  if (!ACTIONS[type]?.includes(body.action)) {
    throw new AppError(409, 'INVALID_ACTION', 'That moderation action is not allowed for this content type.')
  }
  const id = targetId.trim()
  const enforcement = body.action === 'HIDE' || body.action === 'REMOVE' || body.action === 'PLATFORM_RESTRICT'
  if (enforcement && !body.reason) {
    throw new AppError(400, 'VALIDATION_ERROR', 'An internal reason is required for this action.')
  }
  const current = await adminGetModerationCase(type, id)
  if (body.action === 'RESTORE' && current.moderationStatus === 'VISIBLE' && type !== 'COMMUNITY_THREAD') {
    throw new AppError(409, 'INVALID_ACTION', 'This content is already visible.')
  }
  if (body.action === 'RESTORE' && type === 'COMMUNITY_THREAD' && current.contentStatus !== 'REMOVED') {
    throw new AppError(409, 'INVALID_ACTION', 'This thread is not removed.')
  }

  const nextStatus = body.action === 'HIDE' ? 'HIDDEN' : body.action === 'REMOVE' || body.action === 'PLATFORM_RESTRICT' ? 'REMOVED' : body.action === 'RESTORE' ? 'VISIBLE' : null

  if (nextStatus && (type === 'POST' || type === 'EVENT' || type === 'JOURNEY' || type === 'COMMUNITY')) {
    if (type === 'POST') await prisma.post.update({ where: { id }, data: { moderationStatus: nextStatus } })
    if (type === 'EVENT') await prisma.travelerEvent.update({ where: { id }, data: { moderationStatus: nextStatus } })
    if (type === 'JOURNEY') await prisma.journey.update({ where: { id }, data: { moderationStatus: nextStatus } })
    if (type === 'COMMUNITY') await prisma.community.update({ where: { id }, data: { moderationStatus: nextStatus } })
  }
  if (type === 'COMMUNITY_THREAD' && (body.action === 'REMOVE' || body.action === 'RESTORE')) {
    await prisma.communityThread.update({
      where: { id },
      data: { status: body.action === 'REMOVE' ? 'REMOVED' : 'PUBLISHED' },
    })
  }

  await prisma.contentModerationAction.create({
    data: {
      targetType: type,
      targetId: id,
      action: body.action,
      reason: (body.reason as ContentReportReason | undefined) || null,
      note: body.note?.trim() || null,
      actorUserId,
    },
  })

  const auditAction =
    type === 'POST' && body.action === 'HIDE'
      ? 'POST_HIDDEN'
      : type === 'POST' && body.action === 'REMOVE'
        ? 'POST_REMOVED'
        : type === 'POST' && body.action === 'RESTORE'
          ? 'POST_RESTORED'
          : type === 'EVENT' && (body.action === 'REMOVE' || body.action === 'HIDE')
            ? 'EVENT_REMOVED'
            : type === 'EVENT' && body.action === 'RESTORE'
              ? 'EVENT_RESTORED'
              : type === 'JOURNEY' && (body.action === 'HIDE' || body.action === 'REMOVE')
                ? 'JOURNEY_HIDDEN'
                : type === 'JOURNEY' && body.action === 'RESTORE'
                  ? 'JOURNEY_RESTORED'
                  : type === 'COMMUNITY' && body.action === 'PLATFORM_RESTRICT'
                    ? 'COMMUNITY_PLATFORM_RESTRICTED'
                    : type === 'COMMUNITY_THREAD' && body.action === 'REMOVE'
                      ? 'COMMUNITY_THREAD_REMOVED'
                      : type === 'COMMUNITY_THREAD' && body.action === 'RESTORE'
                        ? 'COMMUNITY_THREAD_RESTORED'
                        : body.action === 'NO_ACTION'
                          ? 'CONTENT_REPORT_DISMISSED'
                          : 'CONTENT_REPORT_RESOLVED'

  await writeAdminAudit({
    action: auditAction,
    outcome: 'success',
    actorUserId,
    actorSessionId,
    targetType: type,
    targetId: id,
    reason: body.reason || null,
    metadata: { note: body.note || undefined },
  })

  const resolution = body.action === 'NO_ACTION' ? body.reportResolution || 'DISMISSED' : 'RESOLVED'
  await closeReports(type, id, actorUserId, resolution)

  if (current.creatorUserId && (body.action === 'HIDE' || body.action === 'REMOVE' || body.action === 'PLATFORM_RESTRICT')) {
    await createNotification({
      userId: current.creatorUserId,
      type: 'CONTENT_REMOVED',
      title: 'Content removed',
      body: creatorRemovalCopy(type),
      entityType: type.toLowerCase(),
      entityId: id,
    })
  }
  if (current.creatorUserId && body.action === 'RESTORE') {
    await createNotification({
      userId: current.creatorUserId,
      type: 'CONTENT_RESTORED',
      title: 'Content restored',
      body: 'Your content is visible on Delve again.',
      entityType: type.toLowerCase(),
      entityId: id,
    })
  }

  return adminGetModerationCase(type, id)
}

export async function adminListModerationPosts(query: {
  q?: unknown
  status?: unknown
  reported?: unknown
  page?: unknown
  pageSize?: unknown
}) {
  const { page, pageSize, skip } = parseAdminPage(query)
  const q = optionalString(query.q)
  const status = optionalString(query.status)
  const reportedIds = (
    await prisma.contentReport.findMany({ where: { targetType: 'POST' }, distinct: ['targetId'], select: { targetId: true } })
  ).map(r => r.targetId)
  const onlyReported = optionalString(query.reported) === 'true'
  const where: Prisma.PostWhereInput = {
    AND: [
      onlyReported
        ? { id: { in: reportedIds.length ? reportedIds : ['__none__'] } }
        : {
            OR: [
              { visibility: 'PUBLIC' },
              { moderationStatus: { not: 'VISIBLE' } },
              ...(reportedIds.length ? [{ id: { in: reportedIds } }] : []),
            ],
          },
      ...(q
        ? [
            {
              OR: [
                { caption: { contains: q, mode: 'insensitive' as const } },
                { author: { username: { contains: q, mode: 'insensitive' as const } } },
                { author: { travelerProfile: { is: { displayName: { contains: q, mode: 'insensitive' as const } } } } },
              ],
            },
          ]
        : []),
      ...(status === 'removed' ? [{ moderationStatus: { in: ['HIDDEN' as const, 'REMOVED' as const] } }] : []),
      ...(status === 'visible' ? [{ moderationStatus: 'VISIBLE' as const, status: 'PUBLISHED' as const, deletedAt: null }] : []),
    ],
  }
  const [total, rows] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        author: { select: { username: true, travelerProfile: { select: { displayName: true } } } },
        _count: { select: { media: true, reactions: true, comments: true } },
      },
    }),
  ])
  const ids = rows.map(r => r.id)
  const reports = ids.length
    ? await prisma.contentReport.groupBy({
        by: ['targetId'],
        where: { targetType: 'POST', targetId: { in: ids }, status: { in: [...OPEN_CONTENT] } },
        _count: { _all: true },
      })
    : []
  const reportMap = new Map(reports.map(r => [r.targetId, r._count._all]))
  return paginated(
    rows.map(row => ({
      id: row.id,
      captionPreview: previewOf(row.caption, 'Post'),
      authorUsername: row.author.username,
      authorDisplayName: row.author.travelerProfile?.displayName || null,
      createdAt: row.createdAt.toISOString(),
      mediaCount: row._count.media,
      likeCount: row._count.reactions,
      commentCount: row._count.comments,
      openReportCount: reportMap.get(row.id) ?? 0,
      visibility: row.visibility,
      moderationStatus: row.moderationStatus,
      authorDeleted: Boolean(row.deletedAt) || row.status === 'DELETED',
    })),
    page,
    pageSize,
    total,
  )
}

export async function adminListModerationEvents(query: {
  q?: unknown
  reported?: unknown
  page?: unknown
  pageSize?: unknown
}) {
  const { page, pageSize, skip } = parseAdminPage(query)
  const q = optionalString(query.q)
  const reportedIds = (
    await prisma.contentReport.findMany({ where: { targetType: 'EVENT' }, distinct: ['targetId'], select: { targetId: true } })
  ).map(r => r.targetId)
  const onlyReported = optionalString(query.reported) === 'true'
  const where: Prisma.TravelerEventWhereInput = {
    AND: [
      onlyReported
        ? { id: { in: reportedIds.length ? reportedIds : ['__none__'] } }
        : {
            OR: [{ visibility: 'PUBLIC' }, { moderationStatus: { not: 'VISIBLE' } }, { id: { in: reportedIds.length ? reportedIds : ['__none__'] } }],
          },
      ...(q
        ? [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { city: { contains: q, mode: 'insensitive' as const } },
                { locationName: { contains: q, mode: 'insensitive' as const } },
                { creator: { username: { contains: q, mode: 'insensitive' as const } } },
              ],
            },
          ]
        : []),
    ],
  }
  const [total, rows] = await Promise.all([
    prisma.travelerEvent.count({ where }),
    prisma.travelerEvent.findMany({
      where,
      orderBy: { startAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        creator: { select: { username: true } },
        community: { select: { name: true } },
        _count: { select: { attendances: true } },
      },
    }),
  ])
  const ids = rows.map(r => r.id)
  const reports = ids.length
    ? await prisma.contentReport.groupBy({
        by: ['targetId'],
        where: { targetType: 'EVENT', targetId: { in: ids }, status: { in: [...OPEN_CONTENT] } },
        _count: { _all: true },
      })
    : []
  const reportMap = new Map(reports.map(r => [r.targetId, r._count._all]))
  const soon = Date.now() + 7 * 24 * 3600_000
  return paginated(
    rows.map(row => ({
      id: row.id,
      title: row.title,
      creatorUsername: row.creator.username,
      startAt: row.startAt.toISOString(),
      location: [row.locationName, row.city].filter(Boolean).join(', ') || null,
      status: row.status,
      moderationStatus: row.moderationStatus,
      attendanceCount: row._count.attendances,
      openReportCount: reportMap.get(row.id) ?? 0,
      communityName: row.community?.name ?? null,
      occurringSoon: row.startAt.getTime() >= Date.now() && row.startAt.getTime() <= soon,
    })),
    page,
    pageSize,
    total,
  )
}

export async function adminListModerationJourneys(query: {
  q?: unknown
  reported?: unknown
  page?: unknown
  pageSize?: unknown
}) {
  const { page, pageSize, skip } = parseAdminPage(query)
  const q = optionalString(query.q)
  const reportedIds = (
    await prisma.contentReport.findMany({ where: { targetType: 'JOURNEY' }, distinct: ['targetId'], select: { targetId: true } })
  ).map(r => r.targetId)
  const onlyReported = optionalString(query.reported) === 'true'
  const where: Prisma.JourneyWhereInput = {
    deletedAt: null,
    AND: [
      onlyReported
        ? { id: { in: reportedIds.length ? reportedIds : ['__none__'] } }
        : {
            OR: [{ visibility: 'PUBLIC' }, { moderationStatus: { not: 'VISIBLE' } }, { id: { in: reportedIds.length ? reportedIds : ['__none__'] } }],
          },
      ...(q
        ? [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { startPlace: { contains: q, mode: 'insensitive' as const } },
                { endPlace: { contains: q, mode: 'insensitive' as const } },
                { author: { username: { contains: q, mode: 'insensitive' as const } } },
              ],
            },
          ]
        : []),
    ],
  }
  const [total, rows] = await Promise.all([
    prisma.journey.count({ where }),
    prisma.journey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { author: { select: { username: true } } },
    }),
  ])
  const ids = rows.map(r => r.id)
  const reports = ids.length
    ? await prisma.contentReport.groupBy({
        by: ['targetId'],
        where: { targetType: 'JOURNEY', targetId: { in: ids }, status: { in: [...OPEN_CONTENT] } },
        _count: { _all: true },
      })
    : []
  const reportMap = new Map(reports.map(r => [r.targetId, r._count._all]))
  const reportedSet = new Set(reportedIds)
  return paginated(
    rows.map(row => ({
      id: row.id,
      title: row.title,
      authorUsername: row.author.username,
      destination: `${row.startPlace} → ${row.endPlace}`,
      visibility: row.visibility,
      moderationStatus: row.moderationStatus,
      openReportCount: reportMap.get(row.id) ?? 0,
      createdAt: row.createdAt.toISOString(),
      reported: reportedSet.has(row.id),
    })),
    page,
    pageSize,
    total,
  )
}

export async function adminListModerationCommunities(query: { q?: unknown; page?: unknown; pageSize?: unknown }) {
  const { page, pageSize, skip } = parseAdminPage(query)
  const q = optionalString(query.q)
  const where: Prisma.CommunityWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { destination: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const [total, rows] = await Promise.all([
    prisma.community.count({ where }),
    prisma.community.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
  ])
  const ids = rows.map(r => r.id)
  const reports = ids.length
    ? await prisma.communityReport.groupBy({
        by: ['communityId'],
        where: { communityId: { in: ids }, status: { in: [...OPEN_COMMUNITY] } },
        _count: { _all: true },
      })
    : []
  const reportMap = new Map(reports.map(r => [r.communityId, r._count._all]))
  return paginated(
    rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      privacy: row.privacy,
      memberCount: row.memberCount,
      moderationStatus: row.moderationStatus,
      openReportCount: reportMap.get(row.id) ?? 0,
      createdAt: row.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
  )
}

export async function adminTravelerSafetyCounts(userId: string) {
  const [posts, events, journeys, threads] = await Promise.all([
    prisma.post.findMany({ where: { authorId: userId }, select: { id: true, moderationStatus: true } }),
    prisma.travelerEvent.findMany({ where: { creatorId: userId }, select: { id: true, moderationStatus: true } }),
    prisma.journey.findMany({ where: { authorId: userId }, select: { id: true, moderationStatus: true } }),
    prisma.communityThread.findMany({ where: { authorId: userId }, select: { id: true, status: true } }),
  ])
  const postIds = posts.map(p => p.id)
  const eventIds = events.map(p => p.id)
  const journeyIds = journeys.map(p => p.id)
  const threadIds = threads.map(p => p.id)
  const [openPosts, openEvents, openJourneys, openThreads, resolved] = await Promise.all([
    postIds.length ? prisma.contentReport.count({ where: { targetType: 'POST', targetId: { in: postIds }, status: { in: [...OPEN_CONTENT] } } }) : 0,
    eventIds.length ? prisma.contentReport.count({ where: { targetType: 'EVENT', targetId: { in: eventIds }, status: { in: [...OPEN_CONTENT] } } }) : 0,
    journeyIds.length ? prisma.contentReport.count({ where: { targetType: 'JOURNEY', targetId: { in: journeyIds }, status: { in: [...OPEN_CONTENT] } } }) : 0,
    threadIds.length
      ? prisma.communityReport.count({ where: { targetId: { in: threadIds }, status: { in: [...OPEN_COMMUNITY] } } })
      : 0,
    postIds.length
      ? prisma.contentReport.count({ where: { targetType: 'POST', targetId: { in: postIds }, status: { in: ['RESOLVED', 'DISMISSED'] } } })
      : 0,
  ])
  const removedContentCount =
    posts.filter(p => p.moderationStatus !== 'VISIBLE').length +
    events.filter(p => p.moderationStatus !== 'VISIBLE').length +
    journeys.filter(p => p.moderationStatus !== 'VISIBLE').length +
    threads.filter(p => p.status === 'REMOVED').length
  return {
    openReportsAgainstContent: openPosts + openEvents + openJourneys + openThreads,
    removedContentCount,
    resolvedReportCount: resolved,
  }
}
