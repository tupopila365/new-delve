import { prisma } from '@delve/database'

export type NotificationType =
  | 'NEW_FOLLOWER'
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'EVENT_ATTENDANCE'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'STORY_FROM_FOLLOWED'

export async function createNotification(input: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  entityType?: string
  entityId?: string
  actorId?: string
}) {
  if (input.actorId && input.actorId === input.userId) return null
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body || '',
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
    },
  })
}
