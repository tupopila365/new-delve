import { prisma } from '@delve/database'
import type {
  CreateJourneyBody,
  JourneyCollaboratorRole,
  JourneyCommentDto,
  JourneyDetail,
  JourneyLifecycleStatus,
  JourneyListQuery,
  JourneyPartyType,
  JourneyPersonalisationDto,
  JourneyStopDto,
  JourneySummary,
  JourneyVisibility,
  PatchJourneyPersonalisationBody,
  ReorderJourneyStopItem,
  ReorderJourneyStopsBody,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { getPublicProfileByUsername } from '../social/profile-public.service.js'
import { createNotification } from '../notifications/notify.js'
import { isModerationBlocked, publicModerationWhere } from '../safety/moderation-visibility.js'

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
  mediaResourceTypes?: string[]
  transportModeToNext: string | null
  transportDurationToNext: string | null
  transportNotes: string | null
  historicalCostHint: string | null
}): JourneyStopDto {
  const urls = s.mediaUrls
  const rawTypes = s.mediaResourceTypes ?? []
  const mediaResourceTypes = urls.map((url, i) => {
    const t = rawTypes[i]
    if (t === 'video' || t === 'image') return t
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url) || /\/video\/upload\//i.test(url)) return 'video' as const
    return 'image' as const
  })
  return {
    id: s.id,
    sortOrder: s.sortOrder,
    place: s.place,
    region: s.region,
    arrivalDay: s.arrivalDay,
    durationDays: s.durationDays,
    notes: s.notes,
    highlights: s.highlights,
    mediaUrls: urls,
    mediaResourceTypes,
    transportModeToNext: s.transportModeToNext,
    transportDurationToNext: s.transportDurationToNext,
    transportNotes: s.transportNotes,
    historicalCostHint: s.historicalCostHint,
  }
}

function deriveLifecycle(row: {
  visibility: JourneyVisibility
  startDate: Date | null
  endDate: Date | null
}): JourneyLifecycleStatus {
  if (row.visibility === 'DRAFT') return 'DRAFT'
  const now = Date.now()
  const start = row.startDate?.getTime() ?? null
  const end = row.endDate?.getTime() ?? null
  if (start != null && start > now) return 'UPCOMING'
  if (end != null && end < now) return 'COMPLETED'
  if (start != null && start <= now && (end == null || end >= now)) return 'ACTIVE'
  return 'UPCOMING'
}

async function toSummary(
  row: {
    id: string
    slug: string
    title: string
    summary: string
    coverUrl: string | null
    coverResourceType?: string | null
    startDate?: Date | null
    endDate?: Date | null
    status?: any
    isOngoing?: boolean
    clonedFromId?: string | null
    startPlace: string
    endPlace: string
    countries: string[]
    durationDays: number | null
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
    _count?: { stops: number; collaborators?: number }
    stops?: { place: string }[]
  },
  opts: {
    stopCount?: number
    saveCount: number
    savedByMe: boolean
    likeCount?: number
    commentCount?: number
    likedByMe?: boolean
    collaboratorCount?: number
  },
): Promise<JourneySummary> {
  const startDate = row.startDate?.toISOString() ?? null
  const endDate = row.endDate?.toISOString() ?? null
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverUrl: row.coverUrl,
    coverResourceType:
      row.coverResourceType === 'video' ? 'video' : row.coverUrl ? 'image' : null,
    startDate,
    endDate,
    status: row.status,
    isOngoing: row.isOngoing ?? false,
    clonedFromId: row.clonedFromId ?? null,
    lifecycleStatus: deriveLifecycle({
      visibility: row.visibility,
      startDate: row.startDate ?? null,
      endDate: row.endDate ?? null,
    }),
    startPlace: row.startPlace,
    endPlace: row.endPlace,
    countries: row.countries,
    durationDays: row.durationDays,
    stopCount: opts.stopCount ?? row._count?.stops ?? 0,
    collaboratorCount: opts.collaboratorCount ?? row._count?.collaborators ?? 0,
    stopPreview: row.stops?.map(s => s.place) ?? [],
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
                mediaResourceTypes: (stop.mediaResourceTypes || []).slice(0, (stop.mediaUrls || []).length),
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

export async function listJourneys(viewerId: string | null, query: JourneyListQuery = {}) {
  await ensureJourneySeed()
  const q = query.q?.trim()
  const destination = query.destination?.trim()
  const filter = query.filter || 'forYou'

  const followingOnly = filter === 'following'
  if (followingOnly && !viewerId) return []

  const rows = await prisma.journey.findMany({
    where: {
      deletedAt: null,
      visibility: 'PUBLIC',
      ...publicModerationWhere(),
      ...(followingOnly
        ? { author: { followsIncoming: { some: { followerId: viewerId! } } } }
        : {}),
      ...(destination
        ? {
            OR: [
              { startPlace: { contains: destination, mode: 'insensitive' } },
              { endPlace: { contains: destination, mode: 'insensitive' } },
              { countries: { has: destination } },
            ],
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
              { startPlace: { contains: q, mode: 'insensitive' } },
              { endPlace: { contains: q, mode: 'insensitive' } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { stops: true } },
      stops: { orderBy: { sortOrder: 'asc' }, take: 4, select: { place: true } },
    },
    orderBy: filter === 'trending'
      ? [{ viewCount: 'desc' }, { publishedAt: 'desc' }]
      : [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 60,
  })
  const ids = rows.map(r => r.id)
  const counts = await socialCounts(viewerId, ids)
  let summaries = await Promise.all(
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
  if (filter === 'trending') {
    summaries.sort(
      (a, b) =>
        b.likeCount - a.likeCount
        || b.saveCount - a.saveCount
        || b.viewCount - a.viewCount,
    )
  }
  return summaries
}

export async function listUserJourneys(username: string, viewerId: string | null) {
  await ensureJourneySeed()
  const profile = await getPublicProfileByUsername(username, viewerId)
  const isOwner = viewerId === profile.id
  const rows = await prisma.journey.findMany({
    where: {
      authorId: profile.id,
      deletedAt: null,
      ...(isOwner ? {} : { visibility: 'PUBLIC', ...publicModerationWhere() }),
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
    include: {
      _count: { select: { stops: true } },
      stops: { orderBy: { sortOrder: 'asc' }, take: 4, select: { place: true } },
    },
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
      collaborators: {
        include: { user: { include: { travelerProfile: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { stops: true, collaborators: true } },
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (!canView(row, viewerId)) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (isModerationBlocked(row.moderationStatus) && viewerId !== row.authorId) {
    throw new AppError(404, 'CONTENT_UNAVAILABLE', 'This content is unavailable.')
  }

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
    collaboratorCount: row._count.collaborators,
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
  const eventLinks = await prisma.journeyEvent.findMany({
    where: { journeyId: row.id },
    include: { event: true },
    orderBy: { createdAt: 'asc' },
  })
  const dealLinks = await prisma.journeyDeal.findMany({
    where: { journeyId: row.id },
    include: { deal: { include: { coverMedia: { select: { secureUrl: true } } } } },
    orderBy: { createdAt: 'asc' },
  })
  const bookingLinks = await prisma.journeyBooking.findMany({
    where: { journeyId: row.id },
    include: { booking: true },
    orderBy: { createdAt: 'asc' },
  })
  return {
    ...summary,
    stops: row.stops.map(stopDto),
    collaborators: (row.collaborators || []).map(c => ({
      id: c.id,
      userId: c.userId,
      username: c.user.username,
      displayName: c.user.travelerProfile?.displayName?.trim() || c.user.username,
      avatarUrl: c.user.travelerProfile?.avatarUrl ?? null,
      role: c.role,
      createdAt: c.createdAt.toISOString(),
    })),
    media: [...new Set(media)],
    events: eventLinks.map(link => ({
      id: link.event.id,
      title: link.event.title,
      coverUrl: link.event.coverUrl,
      startAt: link.event.startAt.toISOString(),
      city: link.event.city,
      locationName: link.event.locationName,
      category: link.event.category,
    })),
    deals: dealLinks.map(link => ({
      id: link.deal.id,
      title: link.deal.title,
      coverUrl: link.deal.coverMedia?.secureUrl ?? null,
      discountSummary:
        link.deal.discountType === 'PERCENTAGE'
          ? `${Number(link.deal.discountValue)}% off`
          : `${link.deal.currency} ${Number(link.deal.discountValue)} off`,
      city: link.deal.city,
      endDate: link.deal.endDate.toISOString(),
    })),
    bookings: bookingLinks.map(link => ({
      id: link.booking.id,
      bookingReference: link.booking.bookingReference,
      listingTitle: link.booking.listingTitleSnapshot,
      status: link.booking.status,
      startDateTime: link.booking.startDateTime?.toISOString() ?? null,
      finalAmount: Number(link.booking.finalAmount.toString()).toFixed(2),
      currency: link.booking.currency,
    })),
  }
}

export async function createJourney(userId: string, body: CreateJourneyBody): Promise<JourneyDetail> {
  const visibility = body.visibility || 'PUBLIC'
  const isOngoing = Boolean(body.isOngoing)
  const status = body.status || (isOngoing ? 'ACTIVE' : 'PLANNING')

  const created = await prisma.journey.create({
    data: {
      slug: slugify(body.title),
      authorId: userId,
      title: body.title.trim(),
      summary: body.summary?.trim() || '',
      coverUrl: body.coverUrl || null,
      coverResourceType: body.coverResourceType || (body.coverUrl ? 'image' : null),
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: isOngoing ? null : (body.endDate ? new Date(body.endDate) : null),
      status,
      isOngoing,
      clonedFromId: body.clonedFromId || null,
      startPlace: body.startPlace.trim(),
      endPlace: body.endPlace.trim(),
      countries: body.countries?.length ? body.countries : [],
      durationDays: isOngoing ? null : (body.durationDays ?? body.stops.length),
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
          mediaResourceTypes: (stop.mediaResourceTypes || []).slice(0, (stop.mediaUrls || []).length),
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
  const isOngoing = body.isOngoing !== undefined ? Boolean(body.isOngoing) : existing.isOngoing
  const status = body.status || existing.status
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
        coverResourceType: body.coverResourceType || (body.coverUrl ? 'image' : null),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: isOngoing ? null : (body.endDate ? new Date(body.endDate) : null),
        status,
        isOngoing,
        startPlace: body.startPlace.trim(),
        endPlace: body.endPlace.trim(),
        countries: body.countries?.length ? body.countries : existing.countries,
        durationDays: isOngoing ? null : (body.durationDays ?? body.stops.length),
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
            mediaResourceTypes: (stop.mediaResourceTypes || []).slice(0, (stop.mediaUrls || []).length),
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

export async function forkJourney(userId: string, sourceJourneyId: string): Promise<JourneyDetail> {
  const source = await prisma.journey.findFirst({
    where: { id: sourceJourneyId, deletedAt: null },
    include: { stops: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!source) throw new AppError(404, 'NOT_FOUND', 'Source journey not found')

  if (source.visibility === 'PRIVATE' && source.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot fork private journeys.')
  }

  const created = await prisma.journey.create({
    data: {
      slug: slugify(`${source.title} Fork`),
      authorId: userId,
      title: `${source.title} (Fork)`,
      summary: source.summary,
      coverUrl: source.coverUrl,
      coverResourceType: source.coverResourceType,
      startPlace: source.startPlace,
      endPlace: source.endPlace,
      countries: source.countries,
      durationDays: source.durationDays,
      status: 'PLANNING',
      isOngoing: source.isOngoing,
      clonedFromId: source.id,
      transportModes: source.transportModes,
      currency: source.currency,
      partyType: source.partyType,
      tags: source.tags,
      visibility: 'PRIVATE',
      stops: {
        create: source.stops.map(s => ({
          sortOrder: s.sortOrder,
          place: s.place,
          region: s.region,
          arrivalDay: s.arrivalDay,
          durationDays: s.durationDays,
          notes: s.notes,
          highlights: s.highlights,
          mediaUrls: s.mediaUrls,
          mediaResourceTypes: s.mediaResourceTypes,
          transportModeToNext: s.transportModeToNext,
          transportDurationToNext: s.transportDurationToNext,
          transportNotes: s.transportNotes,
          historicalCostHint: s.historicalCostHint,
        })),
      },
    },
  })

  return getJourney(created.id, userId)
}

export async function reorderJourneyStops(
  userId: string,
  journeyId: string,
  items: ReorderJourneyStopItem[],
): Promise<JourneyDetail> {
  const journey = await prisma.journey.findFirst({
    where: { id: journeyId, deletedAt: null },
    include: {
      collaborators: { where: { userId } },
    },
  })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')

  const isAuthor = journey.authorId === userId
  const isEditorOrAdmin = journey.collaborators.some(
    c => c.role === 'ADMIN' || c.role === 'EDITOR',
  )

  if (!isAuthor && !isEditorOrAdmin) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You must be an ADMIN or EDITOR collaborator on this journey to reorder stops.',
    )
  }

  await prisma.$transaction(async tx => {
    for (const item of items) {
      await tx.journeyStop.updateMany({
        where: {
          id: item.stopId,
          journeyId: journeyId,
        },
        data: {
          sortOrder: item.orderIndex,
        },
      })
    }
  })

  return getJourney(journeyId, userId)
}

/** Patch cover URL only (Media Studio journey context). */
export async function updateJourneyCover(
  userId: string,
  journeyId: string,
  coverUrl: string,
  coverResourceType?: 'image' | 'video' | null,
) {
  const existing = await prisma.journey.findFirst({
    where: { id: journeyId, deletedAt: null },
  })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (existing.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only edit your own journeys.')
  }
  await prisma.journey.update({
    where: { id: journeyId },
    data: {
      coverUrl: coverUrl.trim() || null,
      coverResourceType: coverResourceType || (coverUrl ? 'image' : null),
    },
  })
  return getJourney(journeyId, userId)
}

export async function addCollaborator(
  journeyId: string,
  currentUserId: string,
  targetUserId: string,
  role: JourneyCollaboratorRole = 'EDITOR',
): Promise<JourneyDetail> {
  const journey = await prisma.journey.findFirst({
    where: { id: journeyId, deletedAt: null },
    include: {
      collaborators: { where: { userId: currentUserId } },
    },
  })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')

  const isAuthor = journey.authorId === currentUserId
  const isCurrentAdmin = journey.collaborators.some(c => c.role === 'ADMIN')

  if (!isAuthor && !isCurrentAdmin) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You must be the journey author or an ADMIN collaborator to invite co-authors.',
    )
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  })
  if (!targetUser) throw new AppError(404, 'NOT_FOUND', 'Target user not found')

  await prisma.journeyCollaborator.upsert({
    where: {
      journeyId_userId: {
        journeyId,
        userId: targetUserId,
      },
    },
    create: {
      journeyId,
      userId: targetUserId,
      role,
    },
    update: {
      role,
    },
  })

  // Notify invited user
  try {
    await createNotification({
      recipientUserId: targetUserId,
      actorUserId: currentUserId,
      type: 'JOURNEY_COLLABORATION_INVITE',
      targetType: 'JOURNEY',
      targetId: journeyId,
      bodyPreview: `You were invited as an ${role.toLowerCase()} to collaborate on ${journey.title}`,
    })
  } catch {}

  return getJourney(journeyId, currentUserId)
}

export async function removeCollaborator(
  journeyId: string,
  currentUserId: string,
  targetUserId: string,
): Promise<JourneyDetail> {
  const journey = await prisma.journey.findFirst({
    where: { id: journeyId, deletedAt: null },
    include: {
      collaborators: { where: { userId: currentUserId } },
    },
  })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')

  const isAuthor = journey.authorId === currentUserId
  const isCurrentAdmin = journey.collaborators.some(c => c.role === 'ADMIN')
  const isSelf = currentUserId === targetUserId

  if (!isAuthor && !isCurrentAdmin && !isSelf) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You do not have permission to remove this collaborator.',
    )
  }

  await prisma.journeyCollaborator.deleteMany({
    where: {
      journeyId,
      userId: targetUserId,
    },
  })

  return getJourney(journeyId, currentUserId)
}

async function requireViewableJourney(journeyId: string, viewerId: string | null) {
  const row = await prisma.journey.findFirst({ where: { id: journeyId, deletedAt: null } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (!canView(row, viewerId)) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (isModerationBlocked(row.moderationStatus) && viewerId !== row.authorId) {
    throw new AppError(404, 'CONTENT_UNAVAILABLE', 'This content is unavailable.')
  }
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

async function assertEventLinkable(eventId: string, userId: string) {
  const event = await prisma.travelerEvent.findUnique({ where: { id: eventId } })
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')
  if (event.creatorId === userId) return event
  if (event.status === 'DRAFT' || event.visibility === 'PRIVATE') {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }
  if (event.visibility === 'FOLLOWERS') {
    const follows = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: event.creatorId } },
    })
    if (!follows) throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }
  return event
}

export async function addEventToJourney(userId: string, journeyId: string, eventId: string) {
  const journey = await prisma.journey.findFirst({ where: { id: journeyId, deletedAt: null } })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (journey.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only add events to your own journeys.')
  }
  await assertEventLinkable(eventId, userId)
  await prisma.journeyEvent.upsert({
    where: { journeyId_eventId: { journeyId, eventId } },
    create: { journeyId, eventId, addedById: userId },
    update: {},
  })
  return getJourney(journeyId, userId)
}

export async function removeEventFromJourney(userId: string, journeyId: string, eventId: string) {
  const journey = await prisma.journey.findFirst({ where: { id: journeyId, deletedAt: null } })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (journey.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only remove events from your own journeys.')
  }
  await prisma.journeyEvent.deleteMany({ where: { journeyId, eventId } })
  return getJourney(journeyId, userId)
}

export async function addDealToJourney(userId: string, journeyId: string, dealId: string) {
  const journey = await prisma.journey.findFirst({ where: { id: journeyId, deletedAt: null } })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (journey.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only add deals to your own journeys.')
  }
  const { getPublicDeal } = await import('../deal/deal.service.js')
  const deal = await getPublicDeal(dealId)
  if (!deal.isActive) {
    throw new AppError(400, 'DEAL_NOT_ACTIVE', 'Only active deals can be added to a journey.')
  }
  await prisma.journeyDeal.upsert({
    where: { journeyId_dealId: { journeyId, dealId } },
    create: { journeyId, dealId, addedById: userId },
    update: {},
  })
  const { recordJourneyAddAnalytics } = await import('../deal/deal-ops.service.js')
  await recordJourneyAddAnalytics(dealId, userId).catch(() => undefined)
  return getJourney(journeyId, userId)
}

export async function removeDealFromJourney(userId: string, journeyId: string, dealId: string) {
  const journey = await prisma.journey.findFirst({ where: { id: journeyId, deletedAt: null } })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (journey.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only remove deals from your own journeys.')
  }
  await prisma.journeyDeal.deleteMany({ where: { journeyId, dealId } })
  return getJourney(journeyId, userId)
}

export async function addBookingToJourney(userId: string, journeyId: string, bookingId: string) {
  const journey = await prisma.journey.findFirst({ where: { id: journeyId, deletedAt: null } })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (journey.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only add bookings to your own journeys.')
  }
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking || booking.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  }
  await prisma.journeyBooking.upsert({
    where: { journeyId_bookingId: { journeyId, bookingId } },
    create: { journeyId, bookingId, addedById: userId },
    update: {},
  })
  return getJourney(journeyId, userId)
}

export async function removeBookingFromJourney(userId: string, journeyId: string, bookingId: string) {
  const journey = await prisma.journey.findFirst({ where: { id: journeyId, deletedAt: null } })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (journey.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only remove bookings from your own journeys.')
  }
  await prisma.journeyBooking.deleteMany({ where: { journeyId, bookingId } })
  return getJourney(journeyId, userId)
}

// ─── Personalisation ─────────────────────────────────────────────────────────

/** Returns all personalisation rows for the user's journeys. */
export async function listMyPersonalisations(userId: string): Promise<JourneyPersonalisationDto[]> {
  const rows = await prisma.journeyPersonalisation.findMany({
    where: { userId },
    select: { journeyId: true, customTitle: true, notes: true, sortOrder: true },
  })
  return rows.map(r => ({
    journeyId: r.journeyId,
    customTitle: r.customTitle ?? null,
    notes: r.notes ?? null,
    sortOrder: r.sortOrder ?? null,
  }))
}

/**
 * Upsert customTitle and/or notes for a single journey.
 * Only the journey's author may personalise it.
 */
export async function patchPersonalisation(
  userId: string,
  journeyId: string,
  body: PatchJourneyPersonalisationBody,
): Promise<JourneyPersonalisationDto> {
  const journey = await prisma.journey.findFirst({ where: { id: journeyId, deletedAt: null } })
  if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
  if (journey.authorId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only personalise your own journeys.')
  }
  const row = await prisma.journeyPersonalisation.upsert({
    where: { userId_journeyId: { userId, journeyId } },
    create: {
      userId,
      journeyId,
      customTitle: body.customTitle ?? null,
      notes: body.notes ?? null,
    },
    update: {
      ...(body.customTitle !== undefined ? { customTitle: body.customTitle } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    select: { journeyId: true, customTitle: true, notes: true, sortOrder: true },
  })
  return {
    journeyId: row.journeyId,
    customTitle: row.customTitle ?? null,
    notes: row.notes ?? null,
    sortOrder: row.sortOrder ?? null,
  }
}

/**
 * Bulk-update sort order for the user's journeys.
 * orderedIds is the full desired ordering (index = sortOrder value).
 * Only IDs that belong to the calling user are written.
 */
export async function patchMyJourneyOrder(
  userId: string,
  orderedIds: string[],
): Promise<void> {
  // Verify every ID belongs to the user (ignore unknown/foreign IDs silently)
  const myJourneys = await prisma.journey.findMany({
    where: { authorId: userId, id: { in: orderedIds }, deletedAt: null },
    select: { id: true },
  })
  const mySet = new Set(myJourneys.map(j => j.id))
  const validIds = orderedIds.filter(id => mySet.has(id))

  await prisma.$transaction(
    validIds.map((id, idx) =>
      prisma.journeyPersonalisation.upsert({
        where: { userId_journeyId: { userId, journeyId: id } },
        create: { userId, journeyId: id, sortOrder: idx },
        update: { sortOrder: idx },
      })
    )
  )
}
