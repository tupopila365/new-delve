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
  | 'COMMUNITY_POST_APPROVED'
  | 'JOURNEY_LIKED'
  | 'JOURNEY_COMMENTED'
  | 'EVENT_LIKED'
  | 'DEAL_CLAIMED'
  | 'DEAL_CLAIM_UPDATED'
  | 'DEAL_APPROVED'
  | 'DEAL_REJECTED'
  | 'MESSAGE_RECEIVED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED'
  | 'PAYMENT_PAID'
  | 'PAYMENT_FAILED'
  | 'SETTLEMENT_ELIGIBLE'
  | 'SETTLEMENT_TRANSFERRED'
  | 'BOOKING_CANCELLATION_REQUESTED'
  | 'REFUND_PROCESSING'
  | 'REFUND_SUCCEEDED'
  | 'REFUND_FAILED'
  | 'SETTLEMENT_REVERSED'
  | 'PAYMENT_DISPUTE_OPENED'
  | 'PAYMENT_DISPUTE_WON'
  | 'PAYMENT_DISPUTE_LOST'
  | 'PAYMENT_DISPUTE_BLOCKED'
  | 'PAYMENT_DISPUTE_REVERSED'

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
