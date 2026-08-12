import { prisma } from '@delve/database'
import type { CreateEventBody, UpdateEventBody } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { buildDeliveryUrl } from '../media/cloudinary.js'
import { createNotification } from '../notifications/notify.js'

async function creatorCard(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { travelerProfile: true },
  })
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Creator not found')
  return {
    id: user.id,
    username: user.username,
    displayName: user.travelerProfile?.displayName?.trim() || user.username,
    avatarUrl: user.travelerProfile?.avatarUrl ?? null,
  }
}

async function resolveCoverUrl(env: Env, coverMediaId: string | null | undefined, existing?: string | null) {
  if (!coverMediaId) return existing ?? null
  const media = await prisma.mediaAsset.findFirst({
    where: { id: coverMediaId, deletedAt: null, purpose: { in: ['cover', 'post'] } },
  })
  if (!media) throw new AppError(400, 'INVALID_MEDIA', 'Cover media is invalid.')
  if (!env.CLOUDINARY_CLOUD_NAME) return media.secureUrl
  return buildDeliveryUrl({
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    publicId: media.publicId,
    version: media.version,
    width: 1600,
    crop: 'fill',
    gravity: 'auto',
  })
}

export async function createEvent(env: Env, creatorId: string, body: CreateEventBody) {
  const coverUrl = await resolveCoverUrl(env, body.coverMediaId)
  const event = await prisma.travelerEvent.create({
    data: {
      creatorId,
      title: body.title,
      description: body.description || '',
      coverMediaId: body.coverMediaId || null,
      coverUrl,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      timezone: body.timezone || null,
      locationName: body.locationName || null,
      city: body.city || null,
      country: body.country || null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      category: body.category || null,
      visibility: body.visibility || 'PUBLIC',
      status: body.status || 'DRAFT',
      maxAttendees: body.maxAttendees ?? null,
      updatedAt: new Date(),
    },
  })
  return getEventDto(env, event.id, creatorId)
}

export async function updateEvent(env: Env, creatorId: string, eventId: string, body: UpdateEventBody) {
  const existing = await prisma.travelerEvent.findFirst({ where: { id: eventId, creatorId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Event not found')
  const coverUrl =
    body.coverMediaId !== undefined
      ? await resolveCoverUrl(env, body.coverMediaId, existing.coverUrl)
      : existing.coverUrl
  const updated = await prisma.travelerEvent.update({
    where: { id: eventId },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.coverMediaId !== undefined ? { coverMediaId: body.coverMediaId, coverUrl } : {}),
      ...(body.startAt !== undefined ? { startAt: new Date(body.startAt) } : {}),
      ...(body.endAt !== undefined ? { endAt: body.endAt ? new Date(body.endAt) : null } : {}),
      ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      ...(body.locationName !== undefined ? { locationName: body.locationName } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.country !== undefined ? { country: body.country } : {}),
      ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
      ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.maxAttendees !== undefined ? { maxAttendees: body.maxAttendees } : {}),
      updatedAt: new Date(),
    },
  })
  if (body.status === 'CANCELLED') {
    const attendees = await prisma.eventAttendance.findMany({ where: { eventId } })
    await Promise.all(
      attendees.map(a =>
        createNotification({
          userId: a.userId,
          type: 'EVENT_CANCELLED',
          title: 'Event cancelled',
          body: `"${updated.title}" was cancelled.`,
          entityType: 'event',
          entityId: eventId,
          actorId: creatorId,
        }),
      ),
    )
  }
  return getEventDto(env, eventId, creatorId)
}

export async function listEventsForUser(env: Env, profileUserId: string, viewerId: string | null) {
  const isOwner = viewerId === profileUserId
  const rows = await prisma.travelerEvent.findMany({
    where: {
      creatorId: profileUserId,
      ...(isOwner ? {} : { status: 'PUBLISHED', visibility: 'PUBLIC' }),
    },
    orderBy: { startAt: 'asc' },
    take: 60,
  })
  return Promise.all(rows.map(r => getEventDto(env, r.id, viewerId)))
}

export async function setAttendance(env: Env, userId: string, eventId: string, status: 'GOING' | 'INTERESTED') {
  const event = await prisma.travelerEvent.findFirst({ where: { id: eventId } })
  if (!event || event.status !== 'PUBLISHED') {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }
  if (status === 'GOING' && event.maxAttendees != null) {
    const going = await prisma.eventAttendance.count({ where: { eventId, status: 'GOING' } })
    const mine = await prisma.eventAttendance.findUnique({
      where: { eventId_userId: { eventId, userId } },
    })
    if (going >= event.maxAttendees && mine?.status !== 'GOING') {
      throw new AppError(409, 'EVENT_FULL', 'This event is at capacity.')
    }
  }
  await prisma.eventAttendance.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, status, updatedAt: new Date() },
    update: { status, updatedAt: new Date() },
  })
  await createNotification({
    userId: event.creatorId,
    type: 'EVENT_ATTENDANCE',
    title: 'Event attendance',
    body: `Someone marked ${status === 'GOING' ? 'Going' : 'Interested'}.`,
    entityType: 'event',
    entityId: eventId,
    actorId: userId,
  })
  return getEventDto(env, eventId, userId)
}

export async function clearAttendance(env: Env, userId: string, eventId: string) {
  await prisma.eventAttendance.deleteMany({ where: { eventId, userId } })
  return getEventDto(env, eventId, userId)
}

export async function getEventDto(env: Env, eventId: string, viewerId: string | null) {
  const event = await prisma.travelerEvent.findUnique({ where: { id: eventId } })
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')
  const isOwner = viewerId === event.creatorId
  if (!isOwner && event.status === 'DRAFT') {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }
  const [goingCount, interestedCount, mine] = await Promise.all([
    prisma.eventAttendance.count({ where: { eventId, status: 'GOING' } }),
    prisma.eventAttendance.count({ where: { eventId, status: 'INTERESTED' } }),
    viewerId
      ? prisma.eventAttendance.findUnique({ where: { eventId_userId: { eventId, userId: viewerId } } })
      : null,
  ])
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    coverUrl: event.coverUrl,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null,
    timezone: event.timezone,
    locationName: event.locationName,
    city: event.city,
    country: event.country,
    category: event.category,
    visibility: event.visibility,
    status: event.status,
    maxAttendees: event.maxAttendees,
    goingCount,
    interestedCount,
    myAttendance: mine?.status ?? null,
    creator: await creatorCard(event.creatorId),
    createdAt: event.createdAt.toISOString(),
  }
}
