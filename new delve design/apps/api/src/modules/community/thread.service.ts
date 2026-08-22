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

async function toSummary(
  row: {
    id: string
    kind: CommunityThreadKind
    title: string
    body: string
    topic: string | null
    pinned: boolean
    official: boolean
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
  },
  saved: boolean,
): Promise<CommunityThreadSummary> {
  const [author, acceptedAuthor] = await Promise.all([
    authorCard(row.authorId),
    row.acceptedAnswer ? authorCard(row.acceptedAnswer.authorId) : Promise.resolve(null),
  ])
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    topic: row.topic,
    pinned: row.pinned,
    official: row.official,
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
  }
}

const threadInclude = {
  community: { select: { id: true, slug: true, name: true, destination: true } },
  acceptedAnswer: true,
} as const

/** Seed a few demo threads once communities exist and threads are empty. */
export async function ensureThreadSeed() {
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
  opts: { kind?: CommunityThreadKind; communityId?: string; q?: string } = {},
): Promise<CommunityThreadSummary[]> {
  await ensureThreadSeed()
  const q = opts.q?.trim()
  const rows = await prisma.communityThread.findMany({
    where: {
      deletedAt: null,
      community: { deletedAt: null },
      ...(opts.kind ? { kind: opts.kind } : {}),
      ...(opts.communityId ? { communityId: opts.communityId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { body: { contains: q, mode: 'insensitive' } },
              { topic: { contains: q, mode: 'insensitive' } },
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
  return Promise.all(rows.map(r => toSummary(r, saved.has(r.id))))
}

export async function getThread(threadId: string, viewerId: string | null): Promise<CommunityThreadDetail> {
  await ensureThreadSeed()
  const row = await prisma.communityThread.findFirst({
    where: { id: threadId, deletedAt: null, community: { deletedAt: null } },
    include: {
      ...threadInclude,
      answers: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 200,
      },
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Thread not found')

  const saved = await savedSet(viewerId, [row.id])
  const summary = await toSummary(row, saved.has(row.id))
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
    canAccept: viewerId === row.authorId,
  }
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
    if (!membership || (membership.status !== 'JOINED' && membership.status !== 'MODERATOR')) {
      throw new AppError(403, 'FORBIDDEN', 'Join this private community before posting.')
    }
  }

  const created = await prisma.communityThread.create({
    data: {
      communityId,
      authorId: userId,
      kind: body.kind,
      title: body.title.trim(),
      body: body.body?.trim() || '',
      topic: body.topic?.trim() || null,
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
    if (!membership || (membership.status !== 'JOINED' && membership.status !== 'MODERATOR')) {
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
    data: { acceptedAnswerId: answerId, updatedAt: new Date() },
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
