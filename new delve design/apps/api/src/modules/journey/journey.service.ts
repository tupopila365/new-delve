import { prisma } from '@delve/database'
import type {
  CreateJourneyBody,
  JourneyCommentDto,
  JourneyDetail,
  JourneyPartyType,
  JourneyStopDto,
  JourneySummary,
  JourneyVisibility,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { getPublicProfileByUsername } from '../social/profile-public.service.js'
import { createNotification } from '../notifications/notify.js'

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `${base || 'journey'}-${Date.now().toString(36)}`
}

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

async function saveCounts(journeyIds: string[]) {
  if (!journeyIds.length) return new Map<string, number>()
  const rows = await prisma.save.groupBy({
    by: ['targetId'],
    where: { targetType: 'JOURNEY', targetId: { in: journeyIds } },
    _count: { _all: true },
  })
  return new Map(rows.map(r => [r.targetId, r._count._all]))
}

async function savedSet(viewerId: string | null, journeyIds: string[]) {
  if (!viewerId || !journeyIds.length) return new Set<string>()
  const rows = await prisma.save.findMany({
    where: { userId: viewerId, targetType: 'JOURNEY', targetId: { in: journeyIds } },
    select: { targetId: true },
  })
  return new Set(rows.map(r => r.targetId))
}

async function likeCounts(journeyIds: string[]) {
  if (!journeyIds.length) return new Map<string, number>()
  const rows = await prisma.journeyReaction.groupBy({
    by: ['journeyId'],
    where: { journeyId: { in: journeyIds } },
    _count: { _all: true },
  })
  return new Map(rows.map(r => [r.journeyId, r._count._all]))
}

async function likedSet(viewerId: string | null, journeyIds: string[]) {
  if (!viewerId || !journeyIds.length) return new Set<string>()
  const rows = await prisma.journeyReaction.findMany({
    where: { userId: viewerId, journeyId: { in: journeyIds } },
    select: { journeyId: true },
  })
  return new Set(rows.map(r => r.journeyId))
}

async function commentCounts(journeyIds: string[]) {
  if (!journeyIds.length) return new Map<string, number>()
  const rows = await prisma.journeyComment.groupBy({
    by: ['journeyId'],
    where: { journeyId: { in: journeyIds }, deletedAt: null },
    _count: { _all: true },
  })
  return new Map(rows.map(r => [r.journeyId, r._count._all]))
}

async function socialCounts(viewerId: string | null, journeyIds: string[]) {
  const [saves, saved, likes, liked, comments] = await Promise.all([
    saveCounts(journeyIds),
    savedSet(viewerId, journeyIds),
    likeCounts(journeyIds),
    likedSet(viewerId, journeyIds),
    commentCounts(journeyIds),
  ])
  return { saves, saved, likes, liked, comments }
}

function stopDto(s: {
  id: string
  sortOrder: number
  place: string
  region: string
  arrivalDay: number
  durationDays: number
  notes: string
  highlights: string[]
  mediaUrls: string[]
  transportModeToNext: string | null
  transportDurationToNext: string | null
  transportNotes: string | null
  historicalCostHint: string | null
}): JourneyStopDto {
  return {
    id: s.id,
    sortOrder: s.sortOrder,
    place: s.place,
    region: s.region,
    arrivalDay: s.arrivalDay,
    durationDays: s.durationDays,
    notes: s.notes,
    highlights: s.highlights,
    mediaUrls: s.mediaUrls,
    transportModeToNext: s.transportModeToNext,
    transportDurationToNext: s.transportDurationToNext,
    transportNotes: s.transportNotes,
    historicalCostHint: s.historicalCostHint,
  }
}

async function toSummary(
  row: {
    id: string
    slug: string
    title: string
    summary: string
    coverUrl: string | null
    startPlace: string
    endPlace: string
    countries: string[]
    durationDays: number
    transportModes: string[]
    historicalCost: string | null
    currency: string
    partyType: JourneyPartyType
    tags: string[]
    visibility: JourneyVisibility
    takeaway: string
    viewCount: number
    publishedAt: Date | null
    createdAt: Date
    authorId: string
    _count?: { stops: number }
  },
  opts: {
    stopCount?: number
    saveCount: number
    savedByMe: boolean
    likeCount?: number
    commentCount?: number
    likedByMe?: boolean
  },
): Promise<JourneySummary> {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverUrl: row.coverUrl,
    startPlace: row.startPlace,
    endPlace: row.endPlace,
    countries: row.countries,
    durationDays: row.durationDays,
    stopCount: opts.stopCount ?? row._count?.stops ?? 0,
    transportModes: row.transportModes,
    historicalCost: row.historicalCost,
    currency: row.currency,
    partyType: row.partyType,
    tags: row.tags,
    visibility: row.visibility,
    takeaway: row.takeaway,
    viewCount: row.viewCount,
    saveCount: opts.saveCount,
    likeCount: opts.likeCount ?? 0,
    commentCount: opts.commentCount ?? 0,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    author: await authorCard(row.authorId),
    savedByMe: opts.savedByMe,
    likedByMe: opts.likedByMe ?? false,
  }
}

let seedPromise: Promise<void> | null = null

export async function ensureJourneySeed() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const count = await prisma.journey.count({ where: { deletedAt: null } })
      if (count > 0) return
      const author = await prisma.user.findFirst({
        where: { accountStatus: { not: 'deactivated' } },
        orderBy: { createdAt: 'asc' },
      })
      if (!author) return

      const samples: Array<{
        slug: string
        title: string
        summary: string
        coverUrl: string
        startPlace: string
        endPlace: string
        durationDays: number
        historicalCost: string
        partyType: JourneyPartyType
        tags: string[]
        transportModes: string[]
        takeaway: string
        stops: CreateJourneyBody['stops']
      }> = [
        {
          slug: 'namibia-dunes-to-coast',
          title: 'Namibia in 10 Days: Dunes to Coast',
          summary:
            'A loop from Windhoek through Sossusvlei, the Namib coast, and back — the route I wish someone had told me about before I went.',
          coverUrl:
            'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=900&h=600&fit=crop&auto=format',
          startPlace: 'Windhoek',
          endPlace: 'Windhoek',
          durationDays: 10,
          historicalCost: '14200',
          partyType: 'COUPLE',
          tags: ['nature', 'adventure', 'mid-range'],
          transportModes: ['Car rental', 'On foot'],
          takeaway: 'Book the dune lodge early and fuel up at Solitaire.',
          stops: [
            {
              place: 'Windhoek',
              region: 'Khomas',
              arrivalDay: 1,
              durationDays: 1,
              notes: 'Pick up the rental and stock up — last reliable supermarket for days.',
              highlights: ['Car hire', 'Grocery stock-up'],
              mediaUrls: [
                'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=600&h=400&fit=crop&auto=format',
              ],
              transportModeToNext: 'Car rental',
              transportDurationToNext: '5 hrs',
            },
            {
              place: 'Solitaire',
              region: 'Hardap',
              arrivalDay: 2,
              durationDays: 1,
              notes: 'Apple pie stop and last fuel before Sesriem.',
              highlights: ['Apple pie', 'Fuel up'],
              transportModeToNext: 'Car rental',
              transportDurationToNext: '1.5 hrs',
            },
            {
              place: 'Sossusvlei',
              region: 'Hardap',
              arrivalDay: 3,
              durationDays: 3,
              notes: 'Park gate opens at sunrise. Worth a guided morning for Deadvlei.',
              highlights: ['Dune 45', 'Deadvlei', 'Stargazing'],
              mediaUrls: [
                'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=600&h=400&fit=crop&auto=format',
              ],
              transportModeToNext: 'Car rental',
              transportDurationToNext: '4.5 hrs',
            },
            {
              place: 'Swakopmund',
              region: 'Erongo',
              arrivalDay: 6,
              durationDays: 3,
              notes: 'Coast fog, oysters, and a slower pace after the dunes.',
              highlights: ['Waterfront', 'Local food'],
              transportModeToNext: 'Car rental',
              transportDurationToNext: '4 hrs',
            },
            {
              place: 'Windhoek',
              region: 'Khomas',
              arrivalDay: 9,
              durationDays: 2,
              notes: 'Return the car and decompress.',
              highlights: ['Drop-off'],
            },
          ],
        },
        {
          slug: 'swakopmund-walvis-weekend',
          title: 'Swakopmund & Walvis Bay Weekend',
          summary: 'Foggy mornings, lagoon flamingos, and seafood — a compact coast escape.',
          coverUrl:
            'https://images.unsplash.com/photo-1651149164822-210246e81f99?w=900&h=600&fit=crop&auto=format',
          startPlace: 'Swakopmund',
          endPlace: 'Walvis Bay',
          durationDays: 3,
          historicalCost: '4200',
          partyType: 'SOLO',
          tags: ['coast', 'budget', 'nature'],
          transportModes: ['Bus', 'On foot'],
          takeaway: 'Pack layers — the coast is colder than Windhoek.',
          stops: [
            {
              place: 'Swakopmund',
              region: 'Erongo',
              arrivalDay: 1,
              durationDays: 2,
              notes: 'Walk the jetty and try the fish market.',
              highlights: ['Jetty', 'Fish market'],
              transportModeToNext: 'Bus',
              transportDurationToNext: '30 min',
            },
            {
              place: 'Walvis Bay',
              region: 'Erongo',
              arrivalDay: 3,
              durationDays: 1,
              notes: 'Lagoon birds and a short boat tour if the weather allows.',
              highlights: ['Lagoon', 'Flamingos'],
            },
          ],
        },
      ]

      for (const s of samples) {
        await prisma.journey.create({
          data: {
            slug: s.slug,
            authorId: author.id,
            title: s.title,
            summary: s.summary,
            coverUrl: s.coverUrl,
            startPlace: s.startPlace,
            endPlace: s.endPlace,
            countries: ['Namibia'],
            durationDays: s.durationDays,
            transportModes: s.transportModes,
            historicalCost: s.historicalCost,
            currency: 'N$',
            partyType: s.partyType,
            tags: s.tags,
            visibility: 'PUBLIC',
            takeaway: s.takeaway,
            publishedAt: new Date(),
            stops: {
              create: s.stops.map((stop, i) => ({
                sortOrder: i + 1,
                place: stop.place,
                region: stop.region || '',
                arrivalDay: stop.arrivalDay || i + 1,
                durationDays: stop.durationDays || 1,
                notes: stop.notes || '',
                highlights: stop.highlights || [],
                mediaUrls: stop.mediaUrls || [],
                transportModeToNext: stop.transportModeToNext ?? null,
                transportDurationToNext: stop.transportDurationToNext ?? null,
                transportNotes: stop.transportNotes ?? null,
                historicalCostHint: stop.historicalCostHint ?? null,
              })),
            },
          },
        })
      }
    })().finally(() => {
      seedPromise = null
    })
  }
  return seedPromise
}

function canView(
  row: { visibility: JourneyVisibility; authorId: string },
  viewerId: string | null,
) {
  if (row.visibility === 'PUBLIC') return true
  return Boolean(viewerId && viewerId === row.authorId)
}

export async function listJourneys(viewerId: string | null, q?: string) {
  await ensureJourneySeed()
  const query = q?.trim()
  const rows = await prisma.journey.findMany({
    where: {
      deletedAt: null,
      visibility: 'PUBLIC',
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { summary: { contains: query, mode: 'insensitive' } },
              { startPlace: { contains: query, mode: 'insensitive' } },
              { endPlace: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { stops: true } } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 60,
  })
  const ids = rows.map(r => r.id)
  const counts = await socialCounts(viewerId, ids)
  return Promise.all(
    rows.map(r =>
      toSummary(r, {
        stopCount: r._count.stops,
        saveCount: counts.saves.get(r.id) || 0,
        savedByMe: counts.saved.has(r.id),
        likeCount: counts.likes.get(r.id) || 0,
        commentCount: counts.comments.get(r.id) || 0,
        likedByMe: counts.liked.has(r.id),
      }),
    ),
  )
}

export async function listUserJourneys(username: string, viewerId: string | null) {
  await ensureJourneySeed()
  const profile = await getPublicProfileByUsername(username, viewerId)
  const isOwner = viewerId === profile.id
  const rows = await prisma.journey.findMany({
    where: {
      authorId: profile.id,
      deletedAt: null,
      ...(isOwner ? {} : { visibility: 'PUBLIC' }),
    },
    include: { _count: { select: { stops: true } } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 60,
  })
  const ids = rows.map(r => r.id)
  const counts = await socialCounts(viewerId, ids)
  return Promise.all(
    rows.map(r =>
      toSummary(r, {
        stopCount: r._count.stops,
        saveCount: counts.saves.get(r.id) || 0,
        savedByMe: counts.saved.has(r.id),
        likeCount: counts.likes.get(r.id) || 0,
        commentCount: counts.comments.get(r.id) || 0,
        likedByMe: counts.liked.has(r.id),
      }),
    ),
  )
}

export async function listMyJourneys(userId: string) {
  await ensureJourneySeed()
  const rows = await prisma.journey.findMany({
    where: { authorId: userId, deletedAt: null },
    include: { _count: { select: { stops: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 80,
  })
  const ids = rows.map(r => r.id)
  const counts = await socialCounts(userId, ids)
  return Promise.all(
    rows.map(r =>
      toSummary(r, {
        stopCount: r._count.stops,
        saveCount: counts.saves.get(r.id) || 0,
        savedByMe: counts.saved.has(r.id),
        likeCount: counts.likes.get(r.id) || 0,
        commentCount: counts.comments.get(r.id) || 0,
        likedByMe: counts.liked.has(r.id),
      }),
    ),
  )
}

export async function getJourney(slugOrId: string, viewerId: string | null): Promise<JourneyDetail> {
  await ensureJourneySeed()
  const row = await prisma.journey.findFirst({
    where: {
      deletedAt: null,
      OR: [{ slug: slugOrId }, { id: slugOrId }],
    },
    include: {
      stops: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { stops: true } },
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (!canView(row, viewerId)) throw new AppError(404, 'NOT_FOUND', 'Journey not found')

  if (row.visibility === 'PUBLIC') {
    await prisma.journey.update({
      where: { id: row.id },
      data: { viewCount: { increment: 1 } },
    })
    row.viewCount += 1
  }

  const counts = await socialCounts(viewerId, [row.id])
  const summary = await toSummary(row, {
    stopCount: row._count.stops,
    saveCount: counts.saves.get(row.id) || 0,
    savedByMe: counts.saved.has(row.id),
    likeCount: counts.likes.get(row.id) || 0,
    commentCount: counts.comments.get(row.id) || 0,
    likedByMe: counts.liked.has(row.id),
  })
  const media = [
    ...(row.coverUrl ? [row.coverUrl] : []),
    ...row.stops.flatMap(s => s.mediaUrls),
  ]
  return {
    ...summary,
    stops: row.stops.map(stopDto),
    media: [...new Set(media)],
  }
}

export async function createJourney(userId: string, body: CreateJourneyBody): Promise<JourneyDetail> {
  const visibility = body.visibility || 'PUBLIC'
  const created = await prisma.journey.create({
    data: {
      slug: slugify(body.title),
      authorId: userId,
      title: body.title.trim(),
      summary: body.summary?.trim() || '',
      coverUrl: body.coverUrl || null,
      startPlace: body.startPlace.trim(),
      endPlace: body.endPlace.trim(),
      countries: body.countries?.length ? body.countries : ['Namibia'],
      durationDays: body.durationDays || body.stops.length,
      transportModes: body.transportModes || [],
      historicalCost: body.historicalCost || null,
      currency: body.currency || 'N$',
      partyType: body.partyType || 'SOLO',
      tags: body.tags || [],
      visibility,
      takeaway: body.takeaway?.trim() || '',
      publishedAt: visibility === 'PUBLIC' ? new Date() : null,
      stops: {
        create: body.stops.map((stop, i) => ({
          sortOrder: i + 1,
          place: stop.place.trim(),
          region: stop.region?.trim() || '',
          arrivalDay: stop.arrivalDay || i + 1,
          durationDays: stop.durationDays || 1,
          notes: stop.notes?.trim() || '',
          highlights: stop.highlights || [],
          mediaUrls: stop.mediaUrls || [],
          transportModeToNext: stop.transportModeToNext ?? null,
          transportDurationToNext: stop.transportDurationToNext ?? null,
          transportNotes: stop.transportNotes ?? null,
          historicalCostHint: stop.historicalCostHint ?? null,
        })),
      },
    },
  })
  return getJourney(created.id, userId)
}

export async function updateJourney(
  userId: string,
  journeyId: string,
  body: CreateJourneyBody,
): Promise<JourneyDetail> {
  const existing = await prisma.journey.findFirst({
    where: { id: journeyId, deletedAt: null },
  })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (existing.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only edit your own journeys.')
  }

  const visibility = body.visibility || existing.visibility
  const publishedAt =
    visibility === 'PUBLIC'
      ? existing.publishedAt || new Date()
      : visibility === 'DRAFT'
        ? null
        : existing.publishedAt

  await prisma.$transaction(async tx => {
    await tx.journeyStop.deleteMany({ where: { journeyId } })
    await tx.journey.update({
      where: { id: journeyId },
      data: {
        title: body.title.trim(),
        summary: body.summary?.trim() || '',
        coverUrl: body.coverUrl || null,
        startPlace: body.startPlace.trim(),
        endPlace: body.endPlace.trim(),
        countries: body.countries?.length ? body.countries : existing.countries,
        durationDays: body.durationDays || body.stops.length,
        transportModes: body.transportModes || [],
        historicalCost: body.historicalCost || null,
        currency: body.currency || existing.currency,
        partyType: body.partyType || existing.partyType,
        tags: body.tags || [],
        visibility,
        takeaway: body.takeaway?.trim() || '',
        publishedAt,
        stops: {
          create: body.stops.map((stop, i) => ({
            sortOrder: i + 1,
            place: stop.place.trim(),
            region: stop.region?.trim() || '',
            arrivalDay: stop.arrivalDay || i + 1,
            durationDays: stop.durationDays || 1,
            notes: stop.notes?.trim() || '',
            highlights: stop.highlights || [],
            mediaUrls: stop.mediaUrls || [],
            transportModeToNext: stop.transportModeToNext ?? null,
            transportDurationToNext: stop.transportDurationToNext ?? null,
            transportNotes: stop.transportNotes ?? null,
            historicalCostHint: stop.historicalCostHint ?? null,
          })),
        },
      },
    })
  })

  return getJourney(journeyId, userId)
}

/** Patch cover URL only (Media Studio journey context). */
export async function updateJourneyCover(userId: string, journeyId: string, coverUrl: string) {
  const existing = await prisma.journey.findFirst({
    where: { id: journeyId, deletedAt: null },
  })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (existing.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only edit your own journeys.')
  }
  await prisma.journey.update({
    where: { id: journeyId },
    data: { coverUrl: coverUrl.trim() || null },
  })
  return getJourney(journeyId, userId)
}

async function requireViewableJourney(journeyId: string, viewerId: string | null) {
  const row = await prisma.journey.findFirst({ where: { id: journeyId, deletedAt: null } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (!canView(row, viewerId)) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  return row
}

export async function listJourneyComments(journeyId: string, viewerId: string | null): Promise<JourneyCommentDto[]> {
  await requireViewableJourney(journeyId, viewerId)
  const rows = await prisma.journeyComment.findMany({
    where: { journeyId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  return Promise.all(
    rows.map(async c => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: await authorCard(c.authorId),
    })),
  )
}

export async function addJourneyComment(
  userId: string,
  journeyId: string,
  body: string,
): Promise<JourneyCommentDto> {
  const journey = await requireViewableJourney(journeyId, userId)
  const comment = await prisma.journeyComment.create({
    data: { journeyId, authorId: userId, body, updatedAt: new Date() },
  })
  await createNotification({
    userId: journey.authorId,
    type: 'JOURNEY_COMMENTED',
    title: 'New comment on your journey',
    body: 'Someone commented on your journey.',
    entityType: 'journey',
    entityId: journeyId,
    actorId: userId,
  })
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: await authorCard(userId),
  }
}

export async function deleteJourneyComment(userId: string, commentId: string) {
  const comment = await prisma.journeyComment.findFirst({
    where: { id: commentId, authorId: userId, deletedAt: null },
  })
  if (!comment) throw new AppError(404, 'NOT_FOUND', 'Comment not found')
  await prisma.journeyComment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  })
  return { message: 'Comment deleted' }
}

export async function likeJourney(userId: string, journeyId: string) {
  const journey = await requireViewableJourney(journeyId, userId)
  await prisma.journeyReaction.upsert({
    where: { userId_journeyId: { userId, journeyId } },
    create: { userId, journeyId },
    update: {},
  })
  await createNotification({
    userId: journey.authorId,
    type: 'JOURNEY_LIKED',
    title: 'New like on your journey',
    body: 'Someone liked your journey.',
    entityType: 'journey',
    entityId: journeyId,
    actorId: userId,
  })
  return getJourney(journeyId, userId)
}

export async function unlikeJourney(userId: string, journeyId: string) {
  await requireViewableJourney(journeyId, userId)
  await prisma.journeyReaction.deleteMany({ where: { userId, journeyId } })
  return getJourney(journeyId, userId)
}
