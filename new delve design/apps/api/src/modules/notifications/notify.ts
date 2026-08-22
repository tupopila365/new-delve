import { prisma } from '@delve/database'

export type NotificationType =
  | 'NEW_FOLLOWER'
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'EVENT_ATTENDANCE'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'STORY_FROM_FOLLOWED'
  | 'COMMUNITY_JOIN_REQUEST'
  | 'COMMUNITY_JOIN_APPROVED'
  | 'COMMUNITY_THREAD_REPLY'
  | 'JOURNEY_LIKED'
  | 'JOURNEY_COMMENTED'
  | 'MESSAGE_RECEIVED'

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

/** Honors inApp + communityActivity preference (default allow if no prefs row). */
export async function createCommunityActivityNotification(input: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  entityType?: string
  entityId?: string
  actorId?: string
}) {
  if (input.actorId && input.actorId === input.userId) return null
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId: input.userId } })
  if (prefs && (!prefs.inApp || !prefs.communityActivity)) return null
  return createNotification(input)
}
