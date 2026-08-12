import { prisma } from '@delve/database'

export async function listNotifications(userId: string) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return rows.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    entityType: n.entityType,
    entityId: n.entityId,
    actorId: n.actorId,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }))
}

export async function markNotificationRead(userId: string, id: string) {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  })
  return { message: 'Marked read' }
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
  return { message: 'All marked read' }
}
