import { prisma } from '@delve/database'
import type { CreatePostBody } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { buildDeliveryUrl } from '../media/cloudinary.js'
import { createNotification } from '../notifications/notify.js'

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

  const post = await prisma.$transaction(async tx => {
    const created = await tx.post.create({
      data: {
        authorId,
        caption: body.caption?.trim() || '',
        location: body.location || null,
        visibility: body.visibility || 'PUBLIC',
        status: 'PUBLISHED',
        updatedAt: new Date(),
      },
    })
    if (mediaIds.length) {
      await tx.mediaAsset.updateMany({
        where: { id: { in: mediaIds }, uploadedByUserId: authorId },
        data: { postId: created.id },
      })
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
      ...(isOwner ? {} : { visibility: 'PUBLIC' }),
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })
  return Promise.all(rows.map(r => getPostDto(env, r.id, viewerId)))
}

/** Public Delvers feed: all published PUBLIC posts (not limited to follows). */
export async function listFeed(env: Env, viewerId: string | null) {
  const rows = await prisma.post.findMany({
    where: { status: 'PUBLISHED', deletedAt: null, visibility: 'PUBLIC' },
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
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null } })
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
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null } })
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
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null } })
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
    include: { media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
  })
  if (!post || post.status !== 'PUBLISHED' || post.deletedAt) {
    throw new AppError(404, 'NOT_FOUND', 'Post not found')
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
  }
}

export async function countPostsForUser(userId: string) {
  return prisma.post.count({ where: { authorId: userId, status: 'PUBLISHED', deletedAt: null } })
}
