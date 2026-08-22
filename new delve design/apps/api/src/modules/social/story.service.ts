import { prisma } from '@delve/database'
import type { CreateStoryBody, StoryAuthorDto, StoryRailDto, StorySlideDto, StoryViewerDto } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { rateLimit } from '../auth/rate-limit.js'
import { buildDeliveryUrl, destroyCloudinaryAsset } from '../media/cloudinary.js'
import { createNotification } from '../notifications/notify.js'
import { recordMediaMetric } from '../media/metrics.js'

/** Product caps — see docs/delvers-stories-scope.md */
const STORY_TTL_MS = 24 * 60 * 60 * 1000
const MAX_ACTIVE_SLIDES = 20
const MAX_SLIDES_PER_DAY = 20
const MAX_MEDIA_PER_REQUEST = 5
const MAX_RAIL_AUTHORS = 50
const MAX_VIEWER_SLIDES = 20
const MAX_STORY_NOTIFY_FOLLOWERS = 200
const CLEANUP_MEDIA_BATCH = 40

function now() {
  return new Date()
}

function mediaUrl(
  env: Env,
  row: {
    publicId: string
    version: number | null
    resourceType: string
    secureUrl: string | null
    width: number | null
    height: number | null
  },
) {
  if (!env.CLOUDINARY_CLOUD_NAME) return row.secureUrl || ''
  return buildDeliveryUrl({
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    publicId: row.publicId,
    version: row.version,
    resourceType: row.resourceType,
    width: 1080,
    crop: 'limit',
  })
}

function toSlideDto(
  env: Env,
  slide: {
    id: string
    caption: string
    location: string | null
    createdAt: Date
    expiresAt: Date
    media: {
      id: string
      publicId: string
      version: number | null
      resourceType: string
      secureUrl: string | null
      width: number | null
      height: number | null
    }
  },
): StorySlideDto {
  return {
    id: slide.id,
    caption: slide.caption,
    location: slide.location,
    createdAt: slide.createdAt.toISOString(),
    expiresAt: slide.expiresAt.toISOString(),
    media: {
      id: slide.media.id,
      url: mediaUrl(env, slide.media),
      resourceType: slide.media.resourceType,
      width: slide.media.width,
      height: slide.media.height,
    },
  }
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
    profileVisibility: user.travelerProfile?.profileVisibility ?? 'PUBLIC',
  }
}

/** Viewer may open author's stories under Phase 0 visibility rules. */
async function assertCanViewStories(viewerId: string, authorId: string) {
  if (viewerId === authorId) return

  const author = await prisma.user.findUnique({
    where: { id: authorId },
    include: { travelerProfile: true },
  })
  if (!author) throw new AppError(404, 'NOT_FOUND', 'Author not found')

  const visibility = author.travelerProfile?.profileVisibility ?? 'PUBLIC'
  if (visibility === 'PUBLIC') return

  const follow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: authorId } },
  })
  if (!follow) {
    throw new AppError(403, 'FORBIDDEN', 'This traveler’s stories are only visible to followers.')
  }
}

export async function createStorySlides(env: Env, authorId: string, body: CreateStoryBody, ip: string) {
  const mediaIds = [...new Set(body.mediaIds)].slice(0, MAX_MEDIA_PER_REQUEST)
  if (!mediaIds.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'At least one media item is required.')
  }

  const hourLimit = rateLimit(`story-create:${authorId}`, 10, 60 * 60 * 1000)
  const dayLimit = rateLimit(`story-create-day:${authorId}`, MAX_SLIDES_PER_DAY, 24 * 60 * 60 * 1000)
  const ipLimit = rateLimit(`story-create-ip:${ip}`, 40, 60 * 60 * 1000)
  if (!hourLimit.ok || !dayLimit.ok || !ipLimit.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many story uploads. Try again later.')
  }

  const owned = await prisma.mediaAsset.findMany({
    where: {
      id: { in: mediaIds },
      uploadedByUserId: authorId,
      deletedAt: null,
      purpose: 'story',
      status: { in: ['READY', 'PROCESSING'] },
    },
  })
  if (owned.length !== mediaIds.length) {
    throw new AppError(400, 'INVALID_MEDIA', 'One or more media items are invalid for stories.')
  }

  const alreadyLinked = await prisma.storySlide.count({
    where: { mediaId: { in: mediaIds }, deletedAt: null },
  })
  if (alreadyLinked > 0) {
    throw new AppError(400, 'MEDIA_IN_USE', 'One or more media items are already used in a story.')
  }

  const dayAgo = new Date(Date.now() - STORY_TTL_MS)
  const [activeCount, createdLastDay] = await Promise.all([
    prisma.storySlide.count({
      where: { authorId, deletedAt: null, expiresAt: { gt: now() } },
    }),
    prisma.storySlide.count({
      where: { authorId, createdAt: { gte: dayAgo } },
    }),
  ])
  if (activeCount + mediaIds.length > MAX_ACTIVE_SLIDES) {
    throw new AppError(
      400,
      'STORY_LIMIT',
      `You can have at most ${MAX_ACTIVE_SLIDES} active story slides.`,
    )
  }
  if (createdLastDay + mediaIds.length > MAX_SLIDES_PER_DAY) {
    throw new AppError(
      400,
      'STORY_DAILY_LIMIT',
      `You can publish at most ${MAX_SLIDES_PER_DAY} story slides per day.`,
    )
  }

  const createdAt = now()
  const expiresAt = new Date(createdAt.getTime() + STORY_TTL_MS)
  const caption = body.caption?.trim() || ''
  const location = body.location?.trim() || null

  const created = await prisma.$transaction(async tx => {
    const rows = []
    for (const mediaId of mediaIds) {
      rows.push(
        await tx.storySlide.create({
          data: {
            authorId,
            mediaId,
            caption,
            location,
            createdAt,
            expiresAt,
          },
          include: { media: true },
        }),
      )
    }
    return rows
  })

  // Optional: one alert per publish batch for followers with community activity on.
  void notifyFollowersOfStory(authorId, created[0]?.id).catch(() => undefined)

  return created.map(slide => toSlideDto(env, slide))
}

async function notifyFollowersOfStory(authorId: string, slideId: string | undefined) {
  if (!slideId) return
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    include: { travelerProfile: true },
  })
  if (!author) return
  const displayName = author.travelerProfile?.displayName?.trim() || author.username

  const followers = await prisma.follow.findMany({
    where: { followingId: authorId },
    select: { followerId: true },
    take: MAX_STORY_NOTIFY_FOLLOWERS,
  })
  if (!followers.length) return

  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: followers.map(f => f.followerId) } },
  })
  const prefByUser = new Map(prefs.map(p => [p.userId, p]))
  const recipients = followers
    .map(f => f.followerId)
    .filter(id => {
      const p = prefByUser.get(id)
      if (!p) return true
      return p.inApp && p.communityActivity
    })
    .slice(0, MAX_STORY_NOTIFY_FOLLOWERS)

  await Promise.all(
    recipients.map(userId =>
      createNotification({
        userId,
        type: 'STORY_FROM_FOLLOWED',
        title: 'New story',
        body: `${displayName} shared a story.`,
        entityType: 'story',
        entityId: authorId,
        actorId: authorId,
      }),
    ),
  )
}

export async function getStoryRail(env: Env, viewerId: string): Promise<StoryRailDto> {
  void env
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  })
  const authorIds = [viewerId, ...following.map(f => f.followingId)]

  const slides = await prisma.storySlide.findMany({
    where: {
      authorId: { in: authorIds },
      deletedAt: null,
      expiresAt: { gt: now() },
    },
    select: { authorId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!slides.length) return { authors: [] }

  const byAuthor = new Map<string, { latestAt: Date; slideCount: number }>()
  for (const slide of slides) {
    const cur = byAuthor.get(slide.authorId)
    if (!cur) {
      byAuthor.set(slide.authorId, { latestAt: slide.createdAt, slideCount: 1 })
    } else {
      cur.slideCount += 1
      if (slide.createdAt > cur.latestAt) cur.latestAt = slide.createdAt
    }
  }

  const candidateIds = [...byAuthor.keys()]
  const profiles = await prisma.user.findMany({
    where: { id: { in: candidateIds } },
    include: { travelerProfile: true },
  })
  const profileById = new Map(profiles.map(u => [u.id, u]))

  const views = await prisma.storyView.findMany({
    where: { viewerId, authorId: { in: candidateIds } },
  })
  const viewByAuthor = new Map(views.map(v => [v.authorId, v.lastViewedAt]))

  // PRIVATE authors: only self (already on rail) or followers (already filtered by follow list).
  // PUBLIC: same rail rule (self + following). No extra discovery.
  const authors: StoryAuthorDto[] = []
  for (const authorId of candidateIds) {
    const user = profileById.get(authorId)
    const stats = byAuthor.get(authorId)
    if (!user || !stats) continue

    const visibility = user.travelerProfile?.profileVisibility ?? 'PUBLIC'
    if (visibility === 'PRIVATE' && authorId !== viewerId) {
      // Must already be following to be in authorIds; keep.
    }

    const lastViewed = viewByAuthor.get(authorId)
    const unseen = authorId === viewerId ? false : !lastViewed || lastViewed < stats.latestAt

    authors.push({
      id: user.id,
      username: user.username,
      displayName: user.travelerProfile?.displayName?.trim() || user.username,
      avatarUrl: user.travelerProfile?.avatarUrl ?? null,
      isOwn: authorId === viewerId,
      unseen,
      latestAt: stats.latestAt.toISOString(),
      slideCount: stats.slideCount,
    })
  }

  authors.sort((a, b) => {
    if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1
    if (a.unseen !== b.unseen) return a.unseen ? -1 : 1
    return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
  })

  return { authors: authors.slice(0, MAX_RAIL_AUTHORS) }
}

export async function getStoriesForUser(env: Env, viewerId: string, authorId: string): Promise<StoryViewerDto> {
  await assertCanViewStories(viewerId, authorId)

  const author = await authorCard(authorId)
  const slides = await prisma.storySlide.findMany({
    where: {
      authorId,
      deletedAt: null,
      expiresAt: { gt: now() },
    },
    include: { media: true },
    orderBy: { createdAt: 'asc' },
    take: MAX_VIEWER_SLIDES,
  })

  if (!slides.length) {
    throw new AppError(404, 'NOT_FOUND', 'No active stories for this traveler.')
  }

  return {
    author: {
      id: author.id,
      username: author.username,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
    },
    slides: slides.map(s => toSlideDto(env, s)),
  }
}

export async function markStoriesViewed(viewerId: string, authorId: string) {
  await assertCanViewStories(viewerId, authorId)

  const active = await prisma.storySlide.count({
    where: { authorId, deletedAt: null, expiresAt: { gt: now() } },
  })
  if (!active && viewerId !== authorId) {
    throw new AppError(404, 'NOT_FOUND', 'No active stories for this traveler.')
  }

  await prisma.storyView.upsert({
    where: { viewerId_authorId: { viewerId, authorId } },
    create: { viewerId, authorId, lastViewedAt: now() },
    update: { lastViewedAt: now() },
  })

  return { viewed: true, authorId }
}

export async function deleteStorySlide(authorId: string, slideId: string) {
  const slide = await prisma.storySlide.findFirst({
    where: { id: slideId, authorId, deletedAt: null },
  })
  if (!slide) throw new AppError(404, 'NOT_FOUND', 'Story slide not found')

  await prisma.storySlide.update({
    where: { id: slideId },
    data: { deletedAt: now() },
  })

  return { message: 'Story deleted', id: slideId }
}

/**
 * Soft-delete expired slides and destroy their Cloudinary assets (batched).
 * Safe to call from media ops cleanup on a schedule.
 */
export async function cleanupExpiredStories(env: Env) {
  const cutoff = now()
  const soft = await prisma.storySlide.updateMany({
    where: { deletedAt: null, expiresAt: { lte: cutoff } },
    data: { deletedAt: cutoff },
  })

  const candidates = await prisma.storySlide.findMany({
    where: {
      expiresAt: { lte: cutoff },
      media: {
        deletedAt: null,
        status: { notIn: ['DELETED', 'DELETION_PENDING'] },
      },
    },
    include: {
      media: {
        select: {
          id: true,
          publicId: true,
          resourceType: true,
        },
      },
    },
    take: CLEANUP_MEDIA_BATCH,
    orderBy: { expiresAt: 'asc' },
  })

  let destroyedMedia = 0
  for (const slide of candidates) {
    const m = slide.media
    const resourceType =
      m.resourceType === 'video' ? 'video' : m.resourceType === 'raw' ? 'raw' : 'image'
    try {
      const destroyed = await destroyCloudinaryAsset(env, m.publicId, resourceType)
      if (!destroyed.ok) {
        recordMediaMetric('deletion_failed', { category: destroyed.result || 'story_cleanup' })
        continue
      }
      await prisma.mediaAsset.update({
        where: { id: m.id },
        data: { status: 'DELETED', deletedAt: cutoff },
      })
      destroyedMedia += 1
    } catch {
      recordMediaMetric('deletion_failed', { category: 'story_cleanup_network' })
    }
  }

  return { expiredSlides: soft.count, destroyedMedia }
}
