import { prisma } from '@delve/database'

import type {
  CreateEventBody,
  EventCollaboratorRole,
  EventListQuery,
  UpdateEventBody,
} from '@delve/contracts'

import type { Env } from '../../config/env.js'

import { AppError } from '../../middleware/error-handler.js'

import { buildDeliveryUrl } from '../media/cloudinary.js'

import { mediaAssetToDto } from '../media/media.service.js'

import { createNotification } from '../notifications/notify.js'

import { isModerationBlocked, publicModerationWhere } from '../safety/moderation-visibility.js'



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

  moderationStatus?: 'VISIBLE' | 'HIDDEN' | 'REMOVED'

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

  if (coverMediaId === null) return { coverUrl: null }

  if (!coverMediaId) return { coverUrl: existing ?? null }

  const media = await prisma.mediaAsset.findFirst({

    where: { id: coverMediaId, deletedAt: null, purpose: { in: ['cover', 'post', 'event'] } },

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

  if (isModerationBlocked(event.moderationStatus)) {
    throw new AppError(404, 'CONTENT_UNAVAILABLE', 'This content is unavailable.')
  }

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



/** Upcoming, in progress, or started in the last day with no end time. */
function discoverScheduleFilter(now: Date) {
  const startedRecently = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return {
    OR: [
      { startAt: { gte: now } },
      { endAt: { gte: now } },
      { AND: [{ endAt: null }, { startAt: { gte: startedRecently } }] },
    ],
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




async function resolveCommunityId(communityId: string | null | undefined, userId: string) {
  if (communityId === undefined) return undefined
  if (communityId === null || communityId === '') return null
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
  })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')
  if (community.privacy === 'PRIVATE') {
    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId, userId } },
    })
    if (!membership || membership.status === 'REQUESTED') {
      throw new AppError(403, 'FORBIDDEN', 'Join this community before linking an event.')
    }
  }
  return communityId
}

async function resolveBusinessId(businessId: string | null | undefined, userId: string) {
  if (businessId === undefined) return undefined
  if (businessId === null || businessId === '') return null
  const membership = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId, businessId } },
  })
  if (!membership) {
    throw new AppError(403, 'FORBIDDEN', 'You can only host events for businesses you belong to.')
  }
  return businessId
}

export async function createEvent(env: Env, creatorId: string, body: CreateEventBody) {

  const { coverUrl } = await resolveCoverFromMedia(env, body.coverMediaId)

  const communityId = await resolveCommunityId(body.communityId, creatorId)

  const businessId = await resolveBusinessId(body.businessId, creatorId)

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

      communityId: communityId ?? null,

      businessId: businessId ?? null,

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

  const nextCommunityId =
    body.communityId !== undefined
      ? await resolveCommunityId(body.communityId, creatorId)
      : undefined

  const nextBusinessId =
    body.businessId !== undefined
      ? await resolveBusinessId(body.businessId, creatorId)
      : undefined

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

      ...(nextCommunityId !== undefined ? { communityId: nextCommunityId } : {}),

      ...(nextBusinessId !== undefined ? { businessId: nextBusinessId } : {}),

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

  query: Pick<EventListQuery, 'city' | 'after' | 'category' | 'following' | 'sort'>,

) {

  const after = query.after ? new Date(query.after) : new Date()

  const city = query.city?.trim()

  const category = query.category?.trim()

  const followingOnly = query.following === 'true'

  const visibilityFilter = followingOnly && viewerId

    ? { creator: { followsIncoming: { some: { followerId: viewerId } } } }

    : discoverVisibilityFilter(viewerId)

  const rows = await prisma.travelerEvent.findMany({

    where: {

      status: 'PUBLISHED',

      ...publicModerationWhere(),

      AND: [discoverScheduleFilter(after), visibilityFilter],

      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),

      ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),

    },

    orderBy: { startAt: 'asc' },

    take: 120,

  })

  const dtos = await Promise.all(rows.map(r => getEventDto(env, r.id, viewerId)))

  if (query.sort === 'popular') {
    dtos.sort((a, b) => b.goingCount - a.goingCount || a.startAt.localeCompare(b.startAt))
  }

  return dtos

}



export async function searchEvents(env: Env, viewerId: string | null, q: string) {

  const term = q.trim()

  if (term.length < 2) return []

  const rows = await prisma.travelerEvent.findMany({

    where: {

      status: 'PUBLISHED',

      ...publicModerationWhere(),

      AND: [discoverScheduleFilter(new Date()), discoverVisibilityFilter(viewerId)],

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
    include: {
      coverMedia: true,
      collaborators: {
        include: {
          user: {
            include: {
              travelerProfile: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      community: { select: { id: true, slug: true, name: true } },
      business: { select: { id: true, slug: true, name: true, logoUrl: true } },
      media: {
        where: { deletedAt: null, purpose: 'event' },
        include: {
          uploadedBy: {
            include: {
              travelerProfile: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')

  await assertCanViewEvent(event, viewerId)

  const isOwner = viewerId === event.creatorId

  const [goingCount, interestedCount, mine, saved, likeCount, liked] = await Promise.all([
    prisma.eventAttendance.count({ where: { eventId, status: 'GOING' } }),
    prisma.eventAttendance.count({ where: { eventId, status: 'INTERESTED' } }),
    viewerId
      ? prisma.eventAttendance.findUnique({ where: { eventId_userId: { eventId, userId: viewerId } } })
      : Promise.resolve(null),
    viewerId
      ? prisma.save.findUnique({
          where: { userId_targetType_targetId: { userId: viewerId, targetType: 'EVENT', targetId: eventId } },
        })
      : Promise.resolve(null),
    prisma.eventReaction.count({ where: { eventId } }),
    viewerId
      ? prisma.eventReaction.findUnique({ where: { userId_eventId: { userId: viewerId, eventId } } })
      : Promise.resolve(null),
  ])

  const canUploadMedia = Boolean(
    viewerId && event.status !== 'CANCELLED' && (isOwner || mine?.status === 'GOING'),
  )

  return {
    id: event.id,
    creatorId: event.creatorId,
    title: event.title,
    description: event.description,
    category: event.category,
    coverMediaId: event.coverMediaId,
    coverUrl: event.coverUrl,
    coverResourceType:
      event.coverMedia?.resourceType === 'video'
        ? ('video' as const)
        : event.coverUrl
          ? ('image' as const)
          : null,
    coverMedia: event.coverMedia ? mediaAssetToDto(env, event.coverMedia) : null,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt ? event.endAt.toISOString() : null,
    timezone: event.timezone,
    locationName: event.locationName,
    city: event.city,
    country: event.country,
    latitude: event.latitude,
    longitude: event.longitude,
    communityId: event.communityId,
    community: event.community
      ? { id: event.community.id, slug: event.community.slug, name: event.community.name }
      : null,
    businessId: event.businessId,
    business: event.business
      ? {
          id: event.business.id,
          slug: event.business.slug,
          name: event.business.name,
          logoUrl: event.business.logoUrl,
        }
      : null,
    visibility: event.visibility,
    status: event.status,
    maxAttendees: event.maxAttendees,
    goingCount,
    interestedCount,
    myAttendance: mine?.status ?? null,
    isOwner,
    savedByMe: Boolean(saved),
    likeCount,
    likedByMe: Boolean(liked),
    canUploadMedia,
    media: event.media.map(m => ({
      ...mediaAssetToDto(env, m),
      isCover: event.coverMediaId === m.id,
      uploadedByUserId: m.uploadedByUserId,
      isMine: viewerId ? m.uploadedByUserId === viewerId : false,
      uploadedBy: m.uploadedBy
        ? {
            id: m.uploadedBy.id,
            username: m.uploadedBy.username,
            displayName: m.uploadedBy.travelerProfile?.displayName?.trim() || m.uploadedBy.username,
            avatarUrl: m.uploadedBy.travelerProfile?.avatarUrl ?? null,
          }
        : undefined,
    })),
    collaborators: event.collaborators.map(c => ({
      id: c.id,
      userId: c.userId,
      username: c.user.username,
      displayName: c.user.travelerProfile?.displayName?.trim() || c.user.username,
      avatarUrl: c.user.travelerProfile?.avatarUrl ?? null,
      role: c.role,
      createdAt: c.createdAt.toISOString(),
    })),
    creator: await creatorCard(event.creatorId),
    createdAt: event.createdAt.toISOString(),
  }
}

export async function addEventCollaborator(
  env: Env,
  eventId: string,
  currentUserId: string,
  targetUserId: string,
  role: EventCollaboratorRole = 'CO_HOST',
) {
  const event = await prisma.travelerEvent.findUnique({
    where: { id: eventId },
    include: {
      collaborators: { where: { userId: currentUserId } },
    },
  })
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')

  const isCreator = event.creatorId === currentUserId
  const isHost = event.collaborators.some(c => c.role === 'HOST')

  if (!isCreator && !isHost) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You must be the event creator or a HOST to invite co-hosts.',
    )
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!targetUser) throw new AppError(404, 'NOT_FOUND', 'Target user not found')

  await prisma.eventCollaborator.upsert({
    where: {
      eventId_userId: {
        eventId,
        userId: targetUserId,
      },
    },
    create: {
      eventId,
      userId: targetUserId,
      role,
    },
    update: {
      role,
    },
  })

  try {
    await createNotification({
      userId: targetUserId,
      type: 'EVENT_UPDATED',
      title: 'Event co-host invitation',
      body: `You were invited as a ${role.toLowerCase().replace('_', '-')} for "${event.title}".`,
      entityType: 'event',
      entityId: eventId,
      actorId: currentUserId,
    })
  } catch {}

  return getEventDto(env, eventId, currentUserId)
}

export async function removeEventCollaborator(
  env: Env,
  eventId: string,
  currentUserId: string,
  targetUserId: string,
) {
  const event = await prisma.travelerEvent.findUnique({
    where: { id: eventId },
    include: {
      collaborators: { where: { userId: currentUserId } },
    },
  })
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')

  const isCreator = event.creatorId === currentUserId
  const isHost = event.collaborators.some(c => c.role === 'HOST')
  const isSelf = currentUserId === targetUserId

  if (!isCreator && !isHost && !isSelf) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You do not have permission to remove this collaborator.',
    )
  }

  await prisma.eventCollaborator.deleteMany({
    where: {
      eventId,
      userId: targetUserId,
    },
  })

  return getEventDto(env, eventId, currentUserId)
}

export async function likeEvent(env: Env, userId: string, eventId: string) {
  const event = await prisma.travelerEvent.findFirst({ where: { id: eventId } })
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')
  await assertCanViewEvent(event, userId)
  await prisma.eventReaction.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId },
    update: {},
  })
  await createNotification({
    userId: event.creatorId,
    type: 'EVENT_LIKED',
    title: 'New like on your event',
    body: 'Someone liked your event.',
    entityType: 'event',
    entityId: eventId,
    actorId: userId,
  })
  return getEventDto(env, eventId, userId)
}

export async function unlikeEvent(env: Env, userId: string, eventId: string) {
  const event = await prisma.travelerEvent.findFirst({ where: { id: eventId } })
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')
  await assertCanViewEvent(event, userId)
  await prisma.eventReaction.deleteMany({ where: { userId, eventId } })
  return getEventDto(env, eventId, userId)
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

export async function deleteEventMedia(env: Env, userId: string, eventId: string, mediaId: string) {
  const event = await prisma.travelerEvent.findUnique({
    where: { id: eventId },
    select: { id: true, creatorId: true, coverMediaId: true },
  })
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')

  const media = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, eventId, deletedAt: null },
  })
  if (!media) throw new AppError(404, 'NOT_FOUND', 'Media not found')

  const isEventOwner = event.creatorId === userId
  const isMediaOwner = media.uploadedByUserId === userId

  if (!isEventOwner && !isMediaOwner) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this media.')
  }

  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: { status: 'DELETED', deletedAt: new Date() },
  })

  if (event.coverMediaId === mediaId) {
    await prisma.travelerEvent.update({
      where: { id: eventId },
      data: { coverMediaId: null, coverUrl: null },
    })
  }

  return getEventDto(env, eventId, userId)
}
