import { prisma } from '@delve/database'
import type { SaveBody } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { getPostDto } from './post.service.js'
import { getEventDto } from './event.service.js'

export async function saveTarget(userId: string, body: SaveBody) {
  await assertTargetExists(body)
  await prisma.save.upsert({
    where: {
      userId_targetType_targetId: {
        userId,
        targetType: body.targetType,
        targetId: body.targetId,
      },
    },
    create: { userId, targetType: body.targetType, targetId: body.targetId },
    update: {},
  })
  return { saved: true }
}

export async function unsaveTarget(userId: string, body: SaveBody) {
  await prisma.save.deleteMany({
    where: { userId, targetType: body.targetType, targetId: body.targetId },
  })
  return { saved: false }
}

export async function listSaves(env: Env, userId: string) {
  const rows = await prisma.save.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return Promise.all(
    rows.map(async row => {
      let preview: { title?: string; imageUrl?: string | null; subtitle?: string } | undefined
      try {
        if (row.targetType === 'POST') {
          const post = await getPostDto(env, row.targetId, userId)
          preview = {
            title: post.caption.slice(0, 80) || 'Post',
            imageUrl: post.media[0]?.url ?? null,
            subtitle: `@${post.author.username}`,
          }
        } else if (row.targetType === 'EVENT') {
          const event = await getEventDto(env, row.targetId, userId)
          preview = {
            title: event.title,
            imageUrl: event.coverUrl,
            subtitle: event.city || event.locationName || undefined,
          }
        } else if (row.targetType === 'COMMUNITY_THREAD') {
          const thread = await prisma.communityThread.findFirst({
            where: { id: row.targetId, deletedAt: null },
            include: { community: { select: { name: true } } },
          })
          preview = thread
            ? { title: thread.title, subtitle: thread.community.name, imageUrl: null }
            : { title: 'Community thread', subtitle: 'Unavailable' }
        } else if (row.targetType === 'JOURNEY') {
          const journey = await prisma.journey.findFirst({
            where: { id: row.targetId, deletedAt: null },
          })
          preview = journey
            ? {
                title: journey.title,
                imageUrl: journey.coverUrl,
                subtitle: `${journey.startPlace} → ${journey.endPlace}`,
              }
            : { title: 'Journey', subtitle: 'Unavailable' }
        } else {
          preview = { title: `${row.targetType} saved`, subtitle: 'Coming soon' }
        }
      } catch {
        preview = { title: 'Unavailable', subtitle: row.targetType }
      }
      return {
        id: row.id,
        targetType: row.targetType,
        targetId: row.targetId,
        createdAt: row.createdAt.toISOString(),
        preview,
      }
    }),
  )
}

async function assertTargetExists(body: SaveBody) {
  if (body.targetType === 'POST') {
    const post = await prisma.post.findFirst({
      where: { id: body.targetId, status: 'PUBLISHED', deletedAt: null },
    })
    if (!post) throw new AppError(404, 'NOT_FOUND', 'Post not found')
    return
  }
  if (body.targetType === 'EVENT') {
    const event = await prisma.travelerEvent.findFirst({
      where: { id: body.targetId, status: { in: ['PUBLISHED', 'CANCELLED', 'COMPLETED'] } },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')
    return
  }
  if (body.targetType === 'COMMUNITY_THREAD') {
    const thread = await prisma.communityThread.findFirst({
      where: { id: body.targetId, deletedAt: null },
    })
    if (!thread) throw new AppError(404, 'NOT_FOUND', 'Thread not found')
    return
  }
  if (body.targetType === 'JOURNEY') {
    const journey = await prisma.journey.findFirst({
      where: { id: body.targetId, deletedAt: null, visibility: { in: ['PUBLIC', 'PRIVATE', 'DRAFT'] } },
    })
    if (!journey) throw new AppError(404, 'NOT_FOUND', 'Journey not found')
    return
  }
  // LISTING / DEAL reserved for later modules — allow save record for forward compat only if we choose.
  throw new AppError(400, 'UNSUPPORTED_SAVE', 'That save type is not available yet.')
}
