import { prisma } from '@delve/database'
import type {
  CommunityAnswerDto,
  CommunityThreadDetail,
  CommunityThreadKind,
  CommunityThreadSummary,
  CreateCommunityAnswerBody,
  CreateCommunityThreadBody,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { ensureCommunitySeed } from './community.service.js'
import { createCommunityActivityNotification } from '../notifications/notify.js'
import { isModerationBlocked, publicModerationWhere } from '../safety/moderation-visibility.js'
import type { MembershipCtx } from './community-permissions.js'
import { canModerateContent } from './community-permissions.js'

async function authorCard(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { travelerProfile: true },
  })
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Author not found')
  return {
    id: user.id,
    username: user.username,
    displayName: user.travelerProfile?.displayName?.trim() || user.username,
    avatarUrl: user.travelerProfile?.avatarUrl ?? null,
  }
}

async function savedSet(viewerId: string | null, threadIds: string[]) {
  if (!viewerId || threadIds.length === 0) return new Set<string>()
  const rows = await prisma.save.findMany({
    where: {
      userId: viewerId,
      targetType: 'COMMUNITY_THREAD',
      targetId: { in: threadIds },
    },
    select: { targetId: true },
  })
  return new Set(rows.map(r => r.targetId))
}

async function reactionMeta(viewerId: string | null, threadIds: string[]) {
  if (threadIds.length === 0) {
    return { countMap: new Map<string, number>(), likedSet: new Set<string>() }
  }
  const [counts, liked] = await Promise.all([
    prisma.communityThreadReaction.groupBy({
      by: ['threadId'],
      where: { threadId: { in: threadIds } },
      _count: { _all: true },
    }),
    viewerId
      ? prisma.communityThreadReaction.findMany({
          where: { userId: viewerId, threadId: { in: threadIds } },
          select: { threadId: true },
        })
      : Promise.resolve([]),
  ])
  return {
    countMap: new Map(counts.map(c => [c.threadId, c._count._all])),
    likedSet: new Set(liked.map(l => l.threadId)),
  }
}

async function viewerCanModerateCommunity(communityId: string, viewerId: string | null) {
  if (!viewerId) return false
  const membership = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId: viewerId } },
  })
  return canModerateContent(activeMembership(membership))
}

async function toSummary(
  row: {
    id: string
    kind: CommunityThreadKind
    status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REMOVED'
    title: string
    body: string
    topic: string | null
    locationName: string | null
    mediaUrls: string[]
    pinned: boolean
    official: boolean
    answered?: boolean
    answerCount: number
    createdAt: Date
    authorId: string
    acceptedAnswerId: string | null
    community: { id: string; slug: string; name: string; destination: string }
    acceptedAnswer: {
      id: string
      body: string
      helpfulCount: number
      authorId: string
    } | null
    journey?: {
      id: string
      title: string
      coverUrl: string | null
      durationDays: number | null
      _count: { stops: number }
    } | null
    event?: {
      id: string
      title: string
      coverUrl: string | null
      startAt: Date
      city: string | null
    } | null
  },
  saved: boolean,
  likeCount: number,
  likedByMe: boolean,
): Promise<CommunityThreadSummary> {
  const [author, acceptedAuthor] = await Promise.all([
    authorCard(row.authorId),
    row.acceptedAnswer ? authorCard(row.acceptedAnswer.authorId) : Promise.resolve(null),
  ])
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    body: row.body,
    topic: row.topic,
    locationName: row.locationName,
    mediaUrls: row.mediaUrls,
    pinned: row.pinned,
    official: row.official,
    answered: row.answered,
    answerCount: row.answerCount,
    createdAt: row.createdAt.toISOString(),
    author,
    community: {
      id: row.community.id,
      slug: row.community.slug,
      name: row.community.name,
      destination: row.community.destination,
    },
    acceptedAnswer:
      row.acceptedAnswer && acceptedAuthor
        ? {
            id: row.acceptedAnswer.id,
            body: row.acceptedAnswer.body,
            helpfulCount: row.acceptedAnswer.helpfulCount,
            author: acceptedAuthor,
          }
        : null,
    savedByMe: saved,
    likeCount,
    likedByMe,
    linkedJourney: row.journey
      ? {
          id: row.journey.id,
          title: row.journey.title,
          coverUrl: row.journey.coverUrl,
          durationDays: row.journey.durationDays,
          stopCount: row.journey._count.stops,
        }
      : null,
    linkedEvent: row.event
      ? {
          id: row.event.id,
          title: row.event.title,
          coverUrl: row.event.coverUrl,
          startAt: row.event.startAt.toISOString(),
          city: row.event.city,
        }
      : null,
  }
}

const threadInclude = {
  community: { select: { id: true, slug: true, name: true, destination: true } },
  acceptedAnswer: true,
  journey: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
      durationDays: true,
      _count: { select: { stops: true } },
    },
  },
  event: { select: { id: true, title: true, coverUrl: true, startAt: true, city: true } },
} as const

/** Seed demo threads only when COMMUNITY_SEED=true */
export async function ensureThreadSeed() {
  if (process.env.COMMUNITY_SEED !== 'true') return
  await ensureCommunitySeed()
  const count = await prisma.communityThread.count({ where: { deletedAt: null } })
  if (count > 0) return

  const communities = await prisma.community.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true },
  })
  const bySlug = new Map(communities.map(c => [c.slug, c.id]))
  const anyUser = await prisma.user.findFirst({
    where: { accountStatus: { not: 'deactivated' } },
    orderBy: { createdAt: 'asc' },
  })
  if (!anyUser) return

  const samples: Array<{
    slug: string
    kind: CommunityThreadKind
    title: string
    body: string
    topic?: string
    pinned?: boolean
  }> = [
    {
      slug: 'windhoek-travelers',
      kind: 'QUESTION',
      title: 'What is the easiest way to get from Windhoek airport to the city?',
      body: 'Landing late afternoon — shuttle, taxi, or bus?',
      topic: 'Transport',
    },
    {
      slug: 'swakopmund-locals',
      kind: 'QUESTION',
      title: 'Are there buses from Swakopmund to Walvis Bay on Sundays?',
      body: 'Need a reliable option for a Sunday morning transfer.',
      topic: 'Transport',
    },
    {
      slug: 'namibia-road-trips',
      kind: 'DISCUSSION',
      title: 'Planning a five-day coast road trip — stop recommendations?',
      body: 'We have five days and a rental from Windhoek. Want Sossusvlei then the coast to Swakopmund.',
      topic: 'Trip planning',
      pinned: true,
    },
    {
      slug: 'windhoek-travelers',
      kind: 'DISCUSSION',
      title: 'Best stops between Windhoek and Swakopmund',
      body: 'Solitaire, Büllsport, Khomas Hochland — what is actually worth stopping for?',
      topic: 'Route advice',
    },
    {
      slug: 'budget-namibia',
      kind: 'QUESTION',
      title: 'Is a rental car necessary for Sossusvlei, or can I go by tour?',
      body: 'Trying to keep costs down for two people.',
      topic: 'Budget',
    },
  ]

  for (const s of samples) {
    const communityId = bySlug.get(s.slug)
    if (!communityId) continue
    await prisma.communityThread.create({
      data: {
        communityId,
        authorId: anyUser.id,
        kind: s.kind,
        title: s.title,
        body: s.body,
        topic: s.topic || null,
        pinned: Boolean(s.pinned),
      },
    })
    await prisma.community.update({
      where: { id: communityId },
      data: { lastActivityAt: new Date() },
    })
  }
}

export async function listThreads(
  viewerId: string | null,
  opts: { kind?: CommunityThreadKind; communityId?: string; q?: string; kinds?: CommunityThreadKind[] } = {},
): Promise<CommunityThreadSummary[]> {
  await ensureThreadSeed()
  const q = opts.q?.trim()
  const canMod = opts.communityId ? await viewerCanModerateCommunity(opts.communityId, viewerId) : false
  const kindFilter = opts.kinds?.length ? { kind: { in: opts.kinds } } : opts.kind ? { kind: opts.kind } : {}

  const rows = await prisma.communityThread.findMany({
    where: {
      deletedAt: null,
      status: canMod ? { in: ['PUBLISHED', 'PENDING'] } : 'PUBLISHED',
      community: { deletedAt: null, ...publicModerationWhere() },
      ...kindFilter,
      ...(opts.communityId ? { communityId: opts.communityId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { body: { contains: q, mode: 'insensitive' } },
              { topic: { contains: q, mode: 'insensitive' } },
              { locationName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: threadInclude,
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 60,
  })
  const saved = await savedSet(
    viewerId,
    rows.map(r => r.id),
  )
  const reactions = await reactionMeta(
    viewerId,
    rows.map(r => r.id),
  )
  return Promise.all(
    rows.map(r =>
      toSummary(r, saved.has(r.id), reactions.countMap.get(r.id) ?? 0, reactions.likedSet.has(r.id)),
    ),
  )
}

export async function getThread(threadId: string, viewerId: string | null): Promise<CommunityThreadDetail> {
  await ensureThreadSeed()
  const row = await prisma.communityThread.findFirst({
    where: { id: threadId, deletedAt: null, community: { deletedAt: null, ...publicModerationWhere() } },
    include: {
      ...threadInclude,
      answers: {
        where: { deletedAt: null, ...publicModerationWhere() },
        orderBy: { createdAt: 'asc' },
        take: 200,
      },
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Thread not found')
  if (row.status === 'REMOVED' && !(await viewerCanModerateCommunity(row.communityId, viewerId))) {
    throw new AppError(404, 'CONTENT_UNAVAILABLE', 'This content is unavailable.')
  }

  const saved = await savedSet(viewerId, [row.id])
  const reactions = await reactionMeta(viewerId, [row.id])
  const canMod = await viewerCanModerateCommunity(row.communityId, viewerId)
  const summary = await toSummary(
    row,
    saved.has(row.id),
    reactions.countMap.get(row.id) ?? 0,
    reactions.likedSet.has(row.id),
  )
  const answers: CommunityAnswerDto[] = await Promise.all(
    row.answers.map(async a => ({
      id: a.id,
      body: a.body,
      helpfulCount: a.helpfulCount,
      createdAt: a.createdAt.toISOString(),
      author: await authorCard(a.authorId),
      isAccepted: row.acceptedAnswerId === a.id,
    })),
  )

  return {
    ...summary,
    answers,
    canAccept: viewerId === row.authorId && row.kind === 'QUESTION',
    canModerate: canMod,
  }
}

function activeMembership(
  row: { status: string; role: string; mutedUntil: Date | null } | null,
): MembershipCtx {
  if (!row) return null
  return {
    status: row.status as MembershipCtx extends null ? never : NonNullable<MembershipCtx>['status'],
    role: row.role as MembershipCtx extends null ? never : NonNullable<MembershipCtx>['role'],
    mutedUntil: row.mutedUntil,
  }
}

function canParticipate(m: MembershipCtx): boolean {
  if (!m || m.status === 'BANNED' || m.status === 'REQUESTED') return false
  if (m.mutedUntil && m.mutedUntil.getTime() > Date.now()) return false
  return m.status === 'JOINED' || m.status === 'MODERATOR'
}

export async function createThread(
  userId: string,
  communityId: string,
  body: CreateCommunityThreadBody,
): Promise<CommunityThreadDetail> {
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
  })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')
  if (community.privacy === 'PRIVATE') {
    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId, userId } },
    })
    if (!canParticipate(activeMembership(membership))) {
      throw new AppError(403, 'FORBIDDEN', 'Join this private community before posting.')
    }
  } else {
    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId, userId } },
    })
    if (membership?.status === 'BANNED') {
      throw new AppError(403, 'FORBIDDEN', 'You are banned from this community.')
    }
  }

  const postStatus = community.requirePostApproval ? 'PENDING' : 'PUBLISHED'

  const created = await prisma.communityThread.create({
    data: {
      communityId,
      authorId: userId,
      kind: body.kind,
      status: postStatus,
      title: body.title.trim(),
      body: body.body?.trim() || '',
      topic: body.topic?.trim() || null,
      locationName: body.locationName?.trim() || null,
      mediaUrls: body.mediaUrls ?? [],
      journeyId: body.journeyId ?? null,
      eventId: body.eventId ?? null,
      listingId: body.listingId ?? null,
    },
  })
  await prisma.community.update({
    where: { id: communityId },
    data: { lastActivityAt: new Date() },
  })
  return getThread(created.id, userId)
}

export async function addAnswer(
  userId: string,
  threadId: string,
  body: CreateCommunityAnswerBody,
): Promise<CommunityThreadDetail> {
  const thread = await prisma.communityThread.findFirst({
    where: { id: threadId, deletedAt: null },
    include: { community: true },
  })
  if (!thread || thread.community.deletedAt) throw new AppError(404, 'NOT_FOUND', 'Thread not found')

  if (thread.community.privacy === 'PRIVATE') {
    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: thread.communityId, userId } },
    })
    if (!canParticipate(activeMembership(membership))) {
      throw new AppError(403, 'FORBIDDEN', 'Join this private community before replying.')
    }
  }

  await prisma.$transaction(async tx => {
    await tx.communityAnswer.create({
      data: {
        threadId,
        authorId: userId,
        body: body.body.trim(),
      },
    })
    await tx.communityThread.update({
      where: { id: threadId },
      data: { answerCount: { increment: 1 }, updatedAt: new Date() },
    })
    await tx.community.update({
      where: { id: thread.communityId },
      data: { lastActivityAt: new Date() },
    })
  })

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    include: { travelerProfile: true },
  })
  const actorName = actor?.travelerProfile?.displayName?.trim() || actor?.username || 'Someone'
  await createCommunityActivityNotification({
    userId: thread.authorId,
    type: 'COMMUNITY_THREAD_REPLY',
    title: thread.kind === 'QUESTION' ? 'New answer' : 'New reply',
    body: `${actorName} replied on “${thread.title.slice(0, 80)}”`,
    entityType: 'community_thread',
    entityId: threadId,
    actorId: userId,
  })

  return getThread(threadId, userId)
}

export async function acceptAnswer(userId: string, threadId: string, answerId: string) {
  const thread = await prisma.communityThread.findFirst({
    where: { id: threadId, deletedAt: null },
  })
  if (!thread) throw new AppError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Only the question author can accept an answer.')
  }
  if (thread.kind !== 'QUESTION') {
    throw new AppError(400, 'INVALID_KIND', 'Only questions can have an accepted answer.')
  }
  const answer = await prisma.communityAnswer.findFirst({
    where: { id: answerId, threadId, deletedAt: null },
  })
  if (!answer) throw new AppError(404, 'NOT_FOUND', 'Answer not found')

  await prisma.communityThread.update({
    where: { id: threadId },
    data: { acceptedAnswerId: answerId, answered: true, updatedAt: new Date() },
  })
  return getThread(threadId, userId)
}

export async function markAnswerHelpful(userId: string, answerId: string) {
  const answer = await prisma.communityAnswer.findFirst({
    where: { id: answerId, deletedAt: null },
  })
  if (!answer) throw new AppError(404, 'NOT_FOUND', 'Answer not found')
  // Lightweight bump — no per-user unique vote table in Phase 5
  void userId
  await prisma.communityAnswer.update({
    where: { id: answerId },
    data: { helpfulCount: { increment: 1 } },
  })
  return getThread(answer.threadId, userId)
}

export async function likeThread(userId: string, threadId: string) {
  const thread = await prisma.communityThread.findFirst({ where: { id: threadId, deletedAt: null } })
  if (!thread) throw new AppError(404, 'NOT_FOUND', 'Thread not found')
  await prisma.communityThreadReaction.upsert({
    where: { userId_threadId: { userId, threadId } },
    create: { userId, threadId },
    update: {},
  })
  return getThread(threadId, userId)
}

export async function unlikeThread(userId: string, threadId: string) {
  await prisma.communityThreadReaction.deleteMany({ where: { userId, threadId } })
  return getThread(threadId, userId)
}

async function requireThreadModerator(threadId: string, userId: string) {
  const thread = await prisma.communityThread.findFirst({
    where: { id: threadId, deletedAt: null },
    include: { community: true },
  })
  if (!thread || thread.community.deletedAt) throw new AppError(404, 'NOT_FOUND', 'Thread not found')
  const canMod = await viewerCanModerateCommunity(thread.communityId, userId)
  if (!canMod) throw new AppError(403, 'FORBIDDEN', 'Not allowed')
  return thread
}

export async function pinThread(userId: string, threadId: string, pinned: boolean) {
  await requireThreadModerator(threadId, userId)
  await prisma.communityThread.update({ where: { id: threadId }, data: { pinned } })
  return getThread(threadId, userId)
}

export async function removeThread(userId: string, threadId: string) {
  await requireThreadModerator(threadId, userId)
  await prisma.communityThread.update({
    where: { id: threadId },
    data: { status: 'REMOVED', deletedAt: new Date() },
  })
  return { ok: true }
}

export async function approveThread(userId: string, threadId: string) {
  const thread = await requireThreadModerator(threadId, userId)
  if (thread.status !== 'PENDING') throw new AppError(400, 'INVALID_STATE', 'Post is not pending approval')
  await prisma.communityThread.update({
    where: { id: threadId },
    data: { status: 'PUBLISHED' },
  })
  await createCommunityActivityNotification({
    userId: thread.authorId,
    type: 'COMMUNITY_POST_APPROVED',
    title: 'Post approved',
    body: `Your post “${thread.title.slice(0, 80)}” is now live.`,
    entityType: 'community_thread',
    entityId: threadId,
    actorId: userId,
  })
  return getThread(threadId, userId)
}

export async function markThreadAnswered(userId: string, threadId: string) {
  const thread = await requireThreadModerator(threadId, userId)
  if (thread.kind !== 'QUESTION') throw new AppError(400, 'INVALID_KIND', 'Only questions can be marked answered')
  await prisma.communityThread.update({ where: { id: threadId }, data: { answered: true } })
  return getThread(threadId, userId)
}
