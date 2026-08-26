import { prisma } from '@delve/database'
import type { CreatePostBody } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { buildDeliveryUrl } from '../media/cloudinary.js'
import { createNotification } from '../notifications/notify.js'
import { isModerationBlocked, publicModerationWhere } from '../safety/moderation-visibility.js'

function mediaUrl(env: Env, row: { publicId: string; version: number | null; purpose: string; secureUrl: string | null }) {
  if (!env.CLOUDINARY_CLOUD_NAME) return row.secureUrl || ''
  return buildDeliveryUrl({
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    publicId: row.publicId,
    version: row.version,
    width: row.purpose === 'avatar' ? 192 : 1200,
    crop: row.purpose === 'avatar' ? 'fill' : 'limit',
  })
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

export async function createPost(env: Env, authorId: string, body: CreatePostBody) {
  const mediaIds = body.mediaIds || []
  if (mediaIds.length) {
    const owned = await prisma.mediaAsset.count({
      where: { id: { in: mediaIds }, uploadedByUserId: authorId, deletedAt: null, purpose: 'post' },
    })
    if (owned !== mediaIds.length) {
      throw new AppError(400, 'INVALID_MEDIA', 'One or more media items are invalid.')
    }
  }

  let eventId: string | null = null
  let journeyId: string | null = null
  let eventLocation: string | null = null
  let defaultCaption = ''
  if (body.eventId) {
    const event = await prisma.travelerEvent.findUnique({ where: { id: body.eventId } })
    if (!event || event.status === 'DRAFT') {
      throw new AppError(404, 'NOT_FOUND', 'Event not found')
    }
    if (event.visibility === 'PRIVATE' && event.creatorId !== authorId) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found')
    }
    if (event.visibility === 'FOLLOWERS' && event.creatorId !== authorId) {
      const follows = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: authorId, followingId: event.creatorId } },
      })
      if (!follows) throw new AppError(404, 'NOT_FOUND', 'Event not found')
    }
    eventId = event.id
    eventLocation = [event.city, event.country].filter(Boolean).join(', ') || event.locationName
    defaultCaption = `Check out this event: ${event.title}`
  }

  if (body.journeyId) {
    const journey = await prisma.journey.findFirst({
      where: { id: body.journeyId, deletedAt: null },
      include: { _count: { select: { stops: true } } },
    })
    if (!journey || journey.visibility === 'DRAFT') {
      throw new AppError(404, 'NOT_FOUND', 'Journey not found')
    }
    if (journey.visibility === 'PRIVATE' && journey.authorId !== authorId) {
      throw new AppError(404, 'NOT_FOUND', 'Journey not found')
    }
    journeyId = journey.id
    if (!eventLocation) {
      eventLocation = [journey.startPlace, journey.endPlace].filter(Boolean).join(' → ')
    }
    if (!defaultCaption) {
      defaultCaption = `Check out this journey: ${journey.title}`
    }
  }

  const post = await prisma.$transaction(async tx => {
    const created = await tx.post.create({
      data: {
        authorId,
        caption: body.caption?.trim() || defaultCaption,
        location: body.location !== undefined ? body.location : eventLocation,
        eventId,
        journeyId,
        visibility: body.visibility || 'PUBLIC',
        status: 'PUBLISHED',
        updatedAt: new Date(),
      },
    })
    if (mediaIds.length) {
      for (let i = 0; i < mediaIds.length; i++) {
        await tx.mediaAsset.update({
          where: { id: mediaIds[i] },
          data: { postId: created.id, sortOrder: i },
        })
      }
    }
    return created
  })

  return getPostDto(env, post.id, authorId)
}

export async function listPostsForUser(env: Env, profileUserId: string, viewerId: string | null) {
  const isOwner = viewerId === profileUserId
  const rows = await prisma.post.findMany({
    where: {
      authorId: profileUserId,
      status: 'PUBLISHED',
      deletedAt: null,
      ...(isOwner ? {} : { visibility: 'PUBLIC', ...publicModerationWhere() }),
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })
  return Promise.all(rows.map(r => getPostDto(env, r.id, viewerId)))
}

/** Public Delvers feed: all published PUBLIC posts (not limited to follows). */
export async function listFeed(env: Env, viewerId: string | null) {
  const rows = await prisma.post.findMany({
    where: { status: 'PUBLISHED', deletedAt: null, visibility: 'PUBLIC', ...publicModerationWhere() },
    orderBy: { createdAt: 'desc' },
    take: 80,
  })
  return Promise.all(rows.map(r => getPostDto(env, r.id, viewerId)))
}

/** Search public Delvers posts by caption, location, or author. */
export async function searchPosts(env: Env, q: string, viewerId: string | null) {
  const query = q.trim()
  if (query.length < 2) return []
  const rows = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      deletedAt: null,
      visibility: 'PUBLIC',
      ...publicModerationWhere(),
      OR: [
        { caption: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { author: { usernameNormalized: { contains: query.toLowerCase() } } },
        { author: { travelerProfile: { displayName: { contains: query, mode: 'insensitive' } } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })
  return Promise.all(rows.map(r => getPostDto(env, r.id, viewerId)))
}

export async function softDeletePost(authorId: string, postId: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, authorId } })
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post not found')
  await prisma.post.update({
    where: { id: postId },
    data: { status: 'DELETED', deletedAt: new Date(), updatedAt: new Date() },
  })
  return { message: 'Post deleted' }
}

export async function likePost(env: Env, userId: string, postId: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null, ...publicModerationWhere() } })
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post not found')
  await prisma.reaction.upsert({
    where: { userId_postId_type: { userId, postId, type: 'LIKE' } },
    create: { userId, postId, type: 'LIKE' },
    update: {},
  })
  await createNotification({
    userId: post.authorId,
    type: 'POST_LIKED',
    title: 'New like',
    body: 'Someone liked your post.',
    entityType: 'post',
    entityId: postId,
    actorId: userId,
  })
  return getPostDto(env, postId, userId)
}

export async function unlikePost(env: Env, userId: string, postId: string) {
  await prisma.reaction.deleteMany({ where: { userId, postId, type: 'LIKE' } })
  return getPostDto(env, postId, userId)
}

export async function listComments(postId: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null, ...publicModerationWhere() } })
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post not found')
  const rows = await prisma.comment.findMany({
    where: { postId, deletedAt: null },
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

export async function addComment(userId: string, postId: string, body: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null, ...publicModerationWhere() } })
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post not found')
  const comment = await prisma.comment.create({
    data: { postId, authorId: userId, body, updatedAt: new Date() },
  })
  await createNotification({
    userId: post.authorId,
    type: 'POST_COMMENTED',
    title: 'New comment',
    body: 'Someone commented on your post.',
    entityType: 'post',
    entityId: postId,
    actorId: userId,
  })
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: await authorCard(userId),
  }
}

export async function deleteComment(userId: string, commentId: string) {
  const comment = await prisma.comment.findFirst({ where: { id: commentId, authorId: userId, deletedAt: null } })
  if (!comment) throw new AppError(404, 'NOT_FOUND', 'Comment not found')
  await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  })
  return { message: 'Comment deleted' }
}

export async function getPostDto(env: Env, postId: string, viewerId: string | null) {
  const post = await prisma.post.findFirst({
    where: { id: postId },
    include: {
      media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      event: { include: { coverMedia: { select: { resourceType: true } } } },
      journey: { include: { _count: { select: { stops: true } } } },
    },
  })
  if (!post || post.status !== 'PUBLISHED' || post.deletedAt) {
    throw new AppError(404, 'NOT_FOUND', 'Post not found')
  }
  if (isModerationBlocked(post.moderationStatus) && viewerId !== post.authorId) {
    throw new AppError(404, 'CONTENT_UNAVAILABLE', 'This content is unavailable.')
  }
  const [likeCount, commentCount, liked, saved] = await Promise.all([
    prisma.reaction.count({ where: { postId, type: 'LIKE' } }),
    prisma.comment.count({ where: { postId, deletedAt: null } }),
    viewerId
      ? prisma.reaction.findUnique({
          where: { userId_postId_type: { userId: viewerId, postId, type: 'LIKE' } },
        })
      : null,
    viewerId
      ? prisma.save.findUnique({
          where: {
            userId_targetType_targetId: { userId: viewerId, targetType: 'POST', targetId: postId },
          },
        })
      : null,
  ])
  return {
    id: post.id,
    caption: post.caption,
    location: post.location,
    visibility: post.visibility,
    createdAt: post.createdAt.toISOString(),
    author: await authorCard(post.authorId),
    media: post.media.map(m => ({
      id: m.id,
      url: mediaUrl(env, m),
      resourceType: m.resourceType,
      width: m.width,
      height: m.height,
    })),
    likeCount,
    commentCount,
    likedByMe: Boolean(liked),
    savedByMe: Boolean(saved),
    linkedEvent: post.event
      ? {
          id: post.event.id,
          title: post.event.title,
          coverUrl: post.event.coverUrl,
          coverResourceType:
            post.event.coverMedia?.resourceType === 'video'
              ? ('video' as const)
              : post.event.coverUrl
                ? ('image' as const)
                : null,
          startAt: post.event.startAt.toISOString(),
          city: post.event.city,
          locationName: post.event.locationName,
        }
      : null,
    linkedJourney: post.journey
      ? {
          id: post.journey.id,
          title: post.journey.title,
          coverUrl: post.journey.coverUrl,
          startPlace: post.journey.startPlace,
          endPlace: post.journey.endPlace,
          durationDays: post.journey.durationDays,
          stopCount: post.journey._count.stops,
        }
      : null,
  }
}

export async function countPostsForUser(userId: string) {
  return prisma.post.count({ where: { authorId: userId, status: 'PUBLISHED', deletedAt: null, ...publicModerationWhere() } })
}
