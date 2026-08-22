import { prisma } from '@delve/database'

import type { CreateEventBody, EventListQuery, UpdateEventBody } from '@delve/contracts'

import type { Env } from '../../config/env.js'

import { AppError } from '../../middleware/error-handler.js'

import { buildDeliveryUrl } from '../media/cloudinary.js'

import { createNotification } from '../notifications/notify.js'



type EventRow = {

  id: string

  creatorId: string

  title: string

  description: string

  coverUrl: string | null

  startAt: Date

  endAt: Date | null

  timezone: string | null

  locationName: string | null

  city: string | null

  country: string | null

  category: string | null

  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'

  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'

  maxAttendees: number | null

  createdAt: Date

}



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



async function resolveCoverFromMedia(

  env: Env,

  coverMediaId: string | null | undefined,

  existing?: string | null,

) {

  if (!coverMediaId) return { coverUrl: existing ?? null }

  const media = await prisma.mediaAsset.findFirst({

    where: { id: coverMediaId, deletedAt: null, purpose: { in: ['cover', 'post'] } },

  })

  if (!media) throw new AppError(400, 'INVALID_MEDIA', 'Cover media is invalid.')

  const isVideo = media.resourceType === 'video'

  if (!env.CLOUDINARY_CLOUD_NAME) {

    return { coverUrl: media.secureUrl }

  }

  const coverUrl = buildDeliveryUrl({

    cloudName: env.CLOUDINARY_CLOUD_NAME,

    publicId: media.publicId,

    version: media.version,

    resourceType: media.resourceType,

    width: isVideo ? undefined : 1600,

    crop: isVideo ? undefined : 'fill',

    gravity: isVideo ? undefined : 'auto',

  })

  return { coverUrl }

}



async function viewerFollowsCreator(viewerId: string, creatorId: string) {

  const row = await prisma.follow.findUnique({

    where: { followerId_followingId: { followerId: viewerId, followingId: creatorId } },

  })

  return Boolean(row)

}



async function assertCanViewEvent(event: EventRow, viewerId: string | null) {

  if (viewerId === event.creatorId) return

  if (event.status === 'DRAFT') {

    throw new AppError(404, 'NOT_FOUND', 'Event not found')

  }

  if (event.visibility === 'PRIVATE') {

    throw new AppError(404, 'NOT_FOUND', 'Event not found')

  }

  if (event.visibility === 'FOLLOWERS') {

    if (!viewerId || !(await viewerFollowsCreator(viewerId, event.creatorId))) {

      throw new AppError(404, 'NOT_FOUND', 'Event not found')

    }

  }

}



function discoverVisibilityFilter(viewerId: string | null) {

  if (!viewerId) return { visibility: 'PUBLIC' as const }

  return {

    OR: [

      { visibility: 'PUBLIC' as const },

      {

        visibility: 'FOLLOWERS' as const,

        creator: { followsIncoming: { some: { followerId: viewerId } } },

      },

      { creatorId: viewerId },

    ],

  }

}



function profileListVisibilityFilter(viewerId: string | null, profileUserId: string) {

  if (viewerId === profileUserId) return {}

  return {

    status: 'PUBLISHED' as const,

    OR: [

      { visibility: 'PUBLIC' as const },

      ...(viewerId

        ? [

            {

              visibility: 'FOLLOWERS' as const,

              creator: { followsIncoming: { some: { followerId: viewerId } } },

            },

          ]

        : []),

    ],

  }

}



async function notifyAttendeesOfUpdate(eventId: string, title: string, actorId: string) {

  const attendees = await prisma.eventAttendance.findMany({ where: { eventId } })

  await Promise.all(

    attendees.map(a =>

      createNotification({

        userId: a.userId,

        type: 'EVENT_UPDATED',

        title: 'Event updated',

        body: `"${title}" was updated by the host.`,

        entityType: 'event',

        entityId: eventId,

        actorId,

      }),

    ),

  )

}



export async function createEvent(env: Env, creatorId: string, body: CreateEventBody) {

  const { coverUrl } = await resolveCoverFromMedia(env, body.coverMediaId)

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

      ? (await resolveCoverFromMedia(env, body.coverMediaId, existing.coverUrl)).coverUrl

      : existing.coverUrl

  const scheduleChanged =

    (body.startAt !== undefined && new Date(body.startAt).getTime() !== existing.startAt.getTime())

    || (body.endAt !== undefined

      && (body.endAt ? new Date(body.endAt).getTime() : null)

        !== (existing.endAt?.getTime() ?? null))

    || (body.locationName !== undefined && body.locationName !== existing.locationName)

    || (body.city !== undefined && body.city !== existing.city)

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

  } else if (scheduleChanged && updated.status === 'PUBLISHED') {

    await notifyAttendeesOfUpdate(eventId, updated.title, creatorId)

  }

  return getEventDto(env, eventId, creatorId)

}



export async function listDiscoverEvents(

  env: Env,

  viewerId: string | null,

  query: Pick<EventListQuery, 'city' | 'after'>,

) {

  const after = query.after ? new Date(query.after) : new Date()

  const city = query.city?.trim()

  const rows = await prisma.travelerEvent.findMany({

    where: {

      status: 'PUBLISHED',

      startAt: { gte: after },

      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),

      ...discoverVisibilityFilter(viewerId),

    },

    orderBy: { startAt: 'asc' },

    take: 60,

  })

  return Promise.all(rows.map(r => getEventDto(env, r.id, viewerId)))

}



export async function searchEvents(env: Env, viewerId: string | null, q: string) {

  const term = q.trim()

  if (term.length < 2) return []

  const rows = await prisma.travelerEvent.findMany({

    where: {

      status: 'PUBLISHED',

      startAt: { gte: new Date() },

      ...discoverVisibilityFilter(viewerId),

      OR: [

        { title: { contains: term, mode: 'insensitive' } },

        { description: { contains: term, mode: 'insensitive' } },

        { city: { contains: term, mode: 'insensitive' } },

        { locationName: { contains: term, mode: 'insensitive' } },

        { country: { contains: term, mode: 'insensitive' } },

        { category: { contains: term, mode: 'insensitive' } },

      ],

    },

    orderBy: { startAt: 'asc' },

    take: 40,

  })

  const visible = await Promise.all(

    rows.map(async row => {

      try {

        await assertCanViewEvent(row, viewerId)

        return row

      } catch {

        return null

      }

    }),

  )

  return Promise.all(

    visible.filter((r): r is (typeof rows)[number] => Boolean(r)).map(r => getEventDto(env, r.id, viewerId)),

  )

}



export async function listMyHostingEvents(env: Env, userId: string) {

  const rows = await prisma.travelerEvent.findMany({

    where: { creatorId: userId },

    orderBy: { startAt: 'asc' },

    take: 60,

  })

  return Promise.all(rows.map(r => getEventDto(env, r.id, userId)))

}



export async function listMyAttendingEvents(env: Env, userId: string) {

  const rows = await prisma.eventAttendance.findMany({

    where: { userId },

    include: { event: true },

    orderBy: { event: { startAt: 'asc' } },

    take: 60,

  })

  const events = rows.map(r => r.event)

  const visible = await Promise.all(

    events.map(async event => {

      try {

        await assertCanViewEvent(event, userId)

        return event

      } catch {

        return null

      }

    }),

  )

  return Promise.all(

    visible.filter((e): e is (typeof events)[number] => Boolean(e)).map(e => getEventDto(env, e.id, userId)),

  )

}



export async function listEventsForUser(env: Env, profileUserId: string, viewerId: string | null) {

  const rows = await prisma.travelerEvent.findMany({

    where: {

      creatorId: profileUserId,

      ...profileListVisibilityFilter(viewerId, profileUserId),

    },

    orderBy: { startAt: 'asc' },

    take: 60,

  })

  const visible = await Promise.all(

    rows.map(async row => {

      try {

        await assertCanViewEvent(row, viewerId)

        return row

      } catch {

        return null

      }

    }),

  )

  return Promise.all(

    visible.filter((r): r is (typeof rows)[number] => Boolean(r)).map(r => getEventDto(env, r.id, viewerId)),

  )

}



export async function setAttendance(env: Env, userId: string, eventId: string, status: 'GOING' | 'INTERESTED') {

  const event = await prisma.travelerEvent.findFirst({ where: { id: eventId } })

  if (!event || event.status !== 'PUBLISHED') {

    throw new AppError(404, 'NOT_FOUND', 'Event not found')

  }

  await assertCanViewEvent(event, userId)

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

  const event = await prisma.travelerEvent.findUnique({

    where: { id: eventId },

    include: { coverMedia: true },

  })

  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')

  await assertCanViewEvent(event, viewerId)

  const isOwner = viewerId === event.creatorId

  const [goingCount, interestedCount, mine, saved] = await Promise.all([

    prisma.eventAttendance.count({ where: { eventId, status: 'GOING' } }),

    prisma.eventAttendance.count({ where: { eventId, status: 'INTERESTED' } }),

    viewerId

      ? prisma.eventAttendance.findUnique({ where: { eventId_userId: { eventId, userId: viewerId } } })

      : null,

    viewerId

      ? prisma.save.findFirst({

          where: { userId: viewerId, targetType: 'EVENT', targetId: eventId },

        })

      : null,

  ])

  return {

    id: event.id,

    title: event.title,

    description: event.description,

    coverUrl: event.coverUrl,

    coverResourceType: event.coverMedia?.resourceType === 'video'

      ? 'video'

      : event.coverUrl

        ? 'image'

        : null,

    startAt: event.startAt.toISOString(),

    endAt: event.endAt?.toISOString() ?? null,

    timezone: event.timezone,

    locationName: event.locationName,

    city: event.city,

    country: event.country,

    latitude: event.latitude,

    longitude: event.longitude,

    category: event.category,

    visibility: event.visibility,

    status: event.status,

    maxAttendees: event.maxAttendees,

    goingCount,

    interestedCount,

    myAttendance: mine?.status ?? null,

    isOwner,

    savedByMe: Boolean(saved),

    creator: await creatorCard(event.creatorId),

    createdAt: event.createdAt.toISOString(),

  }

}



export async function listEventAttendees(

  env: Env,

  eventId: string,

  viewerId: string | null,

  status?: 'GOING' | 'INTERESTED',

) {

  const event = await prisma.travelerEvent.findUnique({ where: { id: eventId } })

  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')

  await assertCanViewEvent(event, viewerId)

  const rows = await prisma.eventAttendance.findMany({

    where: {

      eventId,

      ...(status ? { status } : {}),

    },

    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],

    take: 100,

  })

  return Promise.all(

    rows.map(async row => ({

      user: await creatorCard(row.userId),

      status: row.status,

      updatedAt: row.updatedAt.toISOString(),

    })),

  )

}

