import { prisma } from '@delve/database'
import type {
  BlockedUserDto,
  ConversationSummary,
  DirectMessageDto,
  MessageSharedEntity,
  MessageThread,
  SendMessageBody,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { getPublicDeal } from '../deal/deal.service.js'
import { createNotification } from '../notifications/notify.js'
import { rateLimit } from '../auth/rate-limit.js'
import { isActiveMember } from '../community/community-permissions.js'
import { listTypingUserIds, setConversationTyping } from './message-typing.js'
import { publishMessageStream } from './message-events.js'

const CREATE_CONVERSATION_LIMIT = 20
const SEND_MESSAGE_LIMIT = 120
const PENDING_INITIATOR_MESSAGE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000

const conversationInclude = {
  messages: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { body: true, kind: true },
  },
  participants: { select: { userId: true } },
  journey: {
    select: {
      id: true,
      slug: true,
      title: true,
      coverUrl: true,
      startPlace: true,
      endPlace: true,
      durationDays: true,
      visibility: true,
      authorId: true,
      deletedAt: true,
    },
  },
  community: {
    select: {
      id: true,
      slug: true,
      name: true,
      avatarUrl: true,
      coverUrl: true,
      privacy: true,
      memberCount: true,
      deletedAt: true,
    },
  },
}

async function authorCard(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { travelerProfile: true },
  })
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')
  return {
    id: user.id,
    username: user.username,
    displayName: user.travelerProfile?.displayName?.trim() || user.username,
    avatarUrl: user.travelerProfile?.avatarUrl ?? null,
  }
}

function canViewJourney(
  row: { visibility: 'PUBLIC' | 'PRIVATE' | 'DRAFT'; authorId: string; deletedAt: Date | null },
  viewerId: string,
) {
  if (row.deletedAt) return false
  if (row.visibility === 'PUBLIC') return true
  return viewerId === row.authorId
}

async function areMutualFollows(userA: string, userB: string) {
  const [aFollowsB, bFollowsA] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userA, followingId: userB } },
    }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userB, followingId: userA } },
    }),
  ])
  return Boolean(aFollowsB && bFollowsA)
}

async function blockBetween(userA: string, userB: string) {
  return prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
  })
}

async function assertNotBlocked(userId: string, otherUserId: string) {
  const block = await blockBetween(userId, otherUserId)
  if (block) {
    throw new AppError(403, 'BLOCKED', 'You cannot message this traveler.')
  }
}

function assertRateLimit(key: string, limit: number) {
  const limited = rateLimit(key, limit, RATE_WINDOW_MS)
  if (!limited.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many messages. Try again later.')
  }
}

async function requireParticipant(userId: string, conversationId: string) {
  const row = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: {
      conversation: {
        include: conversationInclude,
      },
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Conversation not found')
  if (row.conversation.type === 'DIRECT') {
    const other = row.conversation.participants.find(p => p.userId !== userId)
    if (other) await assertNotBlocked(userId, other.userId)
  }
  return row
}

async function findDirectConversation(userA: string, userB: string) {
  const mine = await prisma.conversationParticipant.findMany({
    where: { userId: userA, conversation: { type: 'DIRECT' } },
    select: { conversationId: true },
  })
  if (!mine.length) return null
  const ids = mine.map(r => r.conversationId)
  const match = await prisma.conversationParticipant.findFirst({
    where: { conversationId: { in: ids }, userId: userB },
    include: { conversation: true },
  })
  return match?.conversation ?? null
}

async function unreadCount(conversationId: string, userId: string, lastReadAt: Date | null) {
  return prisma.directMessage.count({
    where: {
      conversationId,
      deletedAt: null,
      senderId: { not: userId },
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  })
}

function conversationAccess(
  requestStatus: 'ACCEPTED' | 'PENDING' | 'DECLINED',
  initiatedById: string | null,
  viewerId: string,
) {
  const isInitiator = initiatedById === viewerId
  const canReply = requestStatus !== 'PENDING' || isInitiator
  return { requestStatus, isInitiator, canReply }
}

type DbMessageKind = 'TEXT' | 'JOURNEY' | 'DEAL' | 'IMAGE'

function messagePreview(message: { body: string; kind: DbMessageKind } | undefined) {
  if (!message) return ''
  if (message.body.trim()) return message.body
  if (message.kind === 'JOURNEY') return 'Shared a Journey'
  if (message.kind === 'DEAL') return 'Shared a deal'
  if (message.kind === 'IMAGE') return 'Photo'
  return ''
}

async function hydrateMessageMedia(mediaId: string | null) {
  if (!mediaId) return undefined
  const row = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, deletedAt: null, status: { in: ['READY', 'PROCESSING'] } },
  })
  if (!row?.secureUrl) return undefined
  return {
    id: row.id,
    url: row.secureUrl,
    resourceType: row.resourceType === 'video' ? ('video' as const) : ('image' as const),
    width: row.width,
    height: row.height,
  }
}

async function resolveMessageMedia(userId: string, mediaId: string) {
  const row = await prisma.mediaAsset.findFirst({
    where: {
      id: mediaId,
      uploadedByUserId: userId,
      purpose: 'message',
      deletedAt: null,
      status: { in: ['READY', 'PROCESSING'] },
      directMessage: null,
    },
  })
  if (!row) {
    throw new AppError(400, 'INVALID_MEDIA', 'Media is not available for this message.')
  }
  return row
}

async function notifyMessageRecipients(
  senderId: string,
  conversation: { id: string; type: 'DIRECT' | 'JOURNEY' | 'COMMUNITY'; participants: { userId: string }[] },
  preview: string,
) {
  const sender = await authorCard(senderId)
  const snippet = preview.length > 120 ? `${preview.slice(0, 117)}…` : preview
  const title =
    conversation.type === 'JOURNEY'
      ? 'New journey message'
      : conversation.type === 'COMMUNITY'
        ? 'New community message'
        : 'New message'
  await Promise.all(
    conversation.participants.map(async participant => {
      if (participant.userId === senderId) return
      const prefs = await prisma.notificationPreference.findUnique({
        where: { userId: participant.userId },
      })
      if (prefs && (!prefs.inApp || !prefs.providerMessages)) return
      await createNotification({
        userId: participant.userId,
        type: 'MESSAGE_RECEIVED',
        title,
        body: `${sender.displayName}: ${snippet}`,
        entityType: 'conversation',
        entityId: conversation.id,
        actorId: senderId,
      })
    }),
  )
}

async function typingAuthors(conversationId: string, viewerId: string) {
  const ids = listTypingUserIds(conversationId, viewerId)
  return Promise.all(ids.map(id => authorCard(id)))
}

async function resolveSharedEntity(
  userId: string,
  ref: NonNullable<SendMessageBody['sharedEntity']>,
): Promise<{ kind: 'JOURNEY' | 'DEAL'; entity: MessageSharedEntity; previewBody: string }> {
  if (ref.type === 'journey') {
    const journey = await prisma.journey.findFirst({
      where: { id: ref.id, deletedAt: null },
    })
    if (!journey || !canViewJourney(journey, userId)) {
      throw new AppError(404, 'NOT_FOUND', 'Journey not found.')
    }
    const entity: MessageSharedEntity = {
      type: 'journey',
      id: journey.id,
      title: journey.title,
      subtitle: `${journey.startPlace} → ${journey.endPlace}`,
      meta: `${journey.durationDays} days`,
      status: journey.visibility === 'PUBLIC' ? 'Public' : 'Private',
      image: journey.coverUrl,
    }
    return { kind: 'JOURNEY', entity, previewBody: `Shared ${journey.title}` }
  }

  const deal = await getPublicDeal(ref.id)
  const entity: MessageSharedEntity = {
    type: 'deal',
    id: deal.id,
    title: deal.title,
    subtitle: deal.business.name,
    meta: deal.listing?.title,
    status: deal.isActive ? 'Available' : 'Expired',
    price: deal.discountSummary,
    image: deal.business.logoUrl,
  }
  return { kind: 'DEAL', entity, previewBody: `Shared ${deal.title}` }
}

async function hydrateSharedEntity(
  kind: DbMessageKind,
  sharedEntityId: string | null,
): Promise<MessageSharedEntity | undefined> {
  if (!sharedEntityId || kind === 'TEXT' || kind === 'IMAGE') return undefined
  if (kind === 'JOURNEY') {
    const journey = await prisma.journey.findFirst({
      where: { id: sharedEntityId, deletedAt: null },
    })
    if (!journey) return undefined
    return {
      type: 'journey',
      id: journey.id,
      title: journey.title,
      subtitle: `${journey.startPlace} → ${journey.endPlace}`,
      meta: `${journey.durationDays} days`,
      status: journey.visibility === 'PUBLIC' ? 'Public' : 'Private',
      image: journey.coverUrl,
    }
  }
  try {
    const deal = await getPublicDeal(sharedEntityId)
    return {
      type: 'deal',
      id: deal.id,
      title: deal.title,
      subtitle: deal.business.name,
      meta: deal.listing?.title,
      status: deal.isActive ? 'Available' : 'Expired',
      price: deal.discountSummary,
      image: deal.business.logoUrl,
    }
  } catch {
    return undefined
  }
}

function dtoKind(kind: DbMessageKind): DirectMessageDto['kind'] {
  if (kind === 'JOURNEY') return 'journey'
  if (kind === 'DEAL') return 'deal'
  if (kind === 'IMAGE') return 'image'
  return 'text'
}

async function messageToDto(
  message: {
    id: string
    conversationId: string
    kind: DbMessageKind
    body: string
    sharedEntityId: string | null
    mediaId: string | null
    createdAt: Date
    senderId: string
  },
  viewerId: string,
): Promise<DirectMessageDto> {
  const [sharedEntity, media] = await Promise.all([
    hydrateSharedEntity(message.kind, message.sharedEntityId),
    hydrateMessageMedia(message.mediaId),
  ])
  return {
    id: message.id,
    conversationId: message.conversationId,
    kind: dtoKind(message.kind),
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    sender: await authorCard(message.senderId),
    fromMe: message.senderId === viewerId,
    sharedEntity,
    media,
  }
}

async function toDirectSummary(
  participant: {
    archived: boolean
    muted: boolean
    lastReadAt: Date | null
    conversation: {
      id: string
      initiatedById: string | null
      requestStatus: 'ACCEPTED' | 'PENDING' | 'DECLINED'
      lastMessageAt: Date | null
      messages: { body: string; kind: DbMessageKind }[]
    }
  },
  otherUserId: string,
  viewerId: string,
): Promise<ConversationSummary> {
  const last = participant.conversation.messages[0]
  const unread = await unreadCount(participant.conversation.id, viewerId, participant.lastReadAt)
  const access = conversationAccess(
    participant.conversation.requestStatus,
    participant.conversation.initiatedById,
    viewerId,
  )
  return {
    id: participant.conversation.id,
    type: 'DIRECT',
    otherParticipant: await authorCard(otherUserId),
    preview: messagePreview(last) || 'No messages yet',
    lastMessageAt: participant.conversation.lastMessageAt?.toISOString() ?? null,
    unreadCount: unread,
    muted: participant.muted,
    archived: participant.archived,
    ...access,
  }
}

async function toJourneySummary(
  participant: {
    archived: boolean
    muted: boolean
    lastReadAt: Date | null
    conversation: {
      id: string
      lastMessageAt: Date | null
      messages: { body: string; kind: DbMessageKind }[]
      journey: {
        id: string
        slug: string
        title: string
        coverUrl: string | null
        startPlace: string
        endPlace: string
        durationDays: number | null
      } | null
      participants: { userId: string }[]
    }
  },
  viewerId: string,
): Promise<ConversationSummary | null> {
  const journey = participant.conversation.journey
  if (!journey) return null
  const last = participant.conversation.messages[0]
  const unread = await unreadCount(participant.conversation.id, viewerId, participant.lastReadAt)
  return {
    id: participant.conversation.id,
    type: 'JOURNEY',
    journey: {
      id: journey.id,
      slug: journey.slug,
      title: journey.title,
      coverUrl: journey.coverUrl,
      startPlace: journey.startPlace,
      endPlace: journey.endPlace,
      durationDays: journey.durationDays,
    },
    participantCount: participant.conversation.participants.length,
    preview: messagePreview(last) || 'No messages yet',
    lastMessageAt: participant.conversation.lastMessageAt?.toISOString() ?? null,
    unreadCount: unread,
    muted: participant.muted,
    archived: participant.archived,
    requestStatus: 'ACCEPTED',
    isInitiator: false,
    canReply: true,
  }
}

async function toCommunitySummary(
  participant: {
    archived: boolean
    muted: boolean
    lastReadAt: Date | null
    conversation: {
      id: string
      lastMessageAt: Date | null
      messages: { body: string; kind: DbMessageKind }[]
      community: {
        id: string
        slug: string
        name: string
        avatarUrl: string | null
        coverUrl: string | null
        privacy: 'PUBLIC' | 'PRIVATE'
        memberCount: number
        deletedAt: Date | null
      } | null
      participants: { userId: string }[]
    }
  },
  viewerId: string,
): Promise<ConversationSummary | null> {
  const community = participant.conversation.community
  if (!community || community.deletedAt) return null
  const last = participant.conversation.messages[0]
  const unread = await unreadCount(participant.conversation.id, viewerId, participant.lastReadAt)
  return {
    id: participant.conversation.id,
    type: 'COMMUNITY',
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
      avatarUrl: community.avatarUrl,
      coverUrl: community.coverUrl,
      privacy: community.privacy,
      memberCount: community.memberCount,
    },
    participantCount: participant.conversation.participants.length,
    preview: messagePreview(last) || 'No messages yet',
    lastMessageAt: participant.conversation.lastMessageAt?.toISOString() ?? null,
    unreadCount: unread,
    muted: participant.muted,
    archived: participant.archived,
    requestStatus: 'ACCEPTED',
    isInitiator: false,
    canReply: true,
  }
}

export async function listConversations(
  userId: string,
  archived = false,
): Promise<ConversationSummary[]> {
  const blocked = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  })
  const blockedIds = new Set(
    blocked.flatMap(b => (b.blockerId === userId ? [b.blockedId] : [b.blockerId])),
  )

  const rows = await prisma.conversationParticipant.findMany({
    where: { userId, archived },
    include: {
      conversation: {
        include: conversationInclude,
      },
    },
    orderBy: { conversation: { lastMessageAt: 'desc' } },
    take: 80,
  })

  const summaries = await Promise.all(
    rows.map(async row => {
      if (row.conversation.type === 'JOURNEY') {
        return toJourneySummary(row, userId)
      }
      if (row.conversation.type === 'COMMUNITY') {
        return toCommunitySummary(row, userId)
      }
      const other = row.conversation.participants.find(p => p.userId !== userId)
      if (!other) return null
      if (blockedIds.has(other.userId)) return null
      if (row.conversation.requestStatus === 'DECLINED') return null
      return toDirectSummary(row, other.userId, userId)
    }),
  )
  return summaries.filter((s): s is ConversationSummary => Boolean(s))
}

export async function getOrCreateDirectConversation(
  userId: string,
  participantUserId: string,
): Promise<ConversationSummary> {
  if (userId === participantUserId) {
    throw new AppError(400, 'INVALID_PARTICIPANT', 'You cannot message yourself.')
  }
  await assertNotBlocked(userId, participantUserId)

  const other = await prisma.user.findFirst({
    where: { id: participantUserId, accountStatus: { not: 'deactivated' } },
    include: { travelerProfile: true },
  })
  if (!other?.travelerProfile) {
    throw new AppError(404, 'NOT_FOUND', 'Traveler not found.')
  }

  const existing = await findDirectConversation(userId, participantUserId)
  if (existing) {
    if (existing.requestStatus === 'DECLINED') {
      throw new AppError(403, 'REQUEST_DECLINED', 'This message request was declined.')
    }
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: existing.id, userId } },
      include: { conversation: { include: conversationInclude } },
    })
    if (!participant) throw new AppError(404, 'NOT_FOUND', 'Conversation not found')
    return toDirectSummary(participant, participantUserId, userId)
  }

  assertRateLimit(`dm-create:${userId}`, CREATE_CONVERSATION_LIMIT)

  const mutual = await areMutualFollows(userId, participantUserId)
  const requestStatus = mutual ? 'ACCEPTED' : 'PENDING'

  const created = await prisma.$transaction(async tx => {
    const conversation = await tx.conversation.create({
      data: {
        type: 'DIRECT',
        initiatedById: userId,
        requestStatus,
      },
    })
    await tx.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, userId },
        { conversationId: conversation.id, userId: participantUserId },
      ],
    })
    return conversation
  })

  return {
    id: created.id,
    type: 'DIRECT',
    otherParticipant: await authorCard(participantUserId),
    preview: 'No messages yet',
    lastMessageAt: null,
    unreadCount: 0,
    muted: false,
    archived: false,
    requestStatus,
    isInitiator: true,
    canReply: true,
  }
}

export async function getOrCreateJourneyConversation(
  userId: string,
  journeyId: string,
): Promise<ConversationSummary> {
  const journey = await prisma.journey.findFirst({
    where: { id: journeyId, deletedAt: null },
  })
  if (!journey || !canViewJourney(journey, userId)) {
    throw new AppError(404, 'NOT_FOUND', 'Journey not found.')
  }

  let conversation = await prisma.conversation.findFirst({
    where: { type: 'JOURNEY', journeyId },
    include: conversationInclude,
  })

  if (!conversation) {
    conversation = await prisma.$transaction(async tx => {
      const created = await tx.conversation.create({
        data: {
          type: 'JOURNEY',
          journeyId,
          requestStatus: 'ACCEPTED',
        },
        include: conversationInclude,
      })
      await tx.conversationParticipant.create({
        data: { conversationId: created.id, userId: journey.authorId },
      })
      return created
    })
  }

  const existingParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: conversation.id, userId } },
  })
  if (!existingParticipant) {
    await prisma.conversationParticipant.create({
      data: { conversationId: conversation.id, userId },
    })
    conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
      include: conversationInclude,
    })
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: conversation.id, userId } },
    include: { conversation: { include: conversationInclude } },
  })
  if (!participant) throw new AppError(404, 'NOT_FOUND', 'Conversation not found')
  const summary = await toJourneySummary(participant, userId)
  if (!summary) throw new AppError(404, 'NOT_FOUND', 'Conversation not found')
  return summary
}

export async function getOrCreateCommunityConversation(
  userId: string,
  communityId: string,
): Promise<ConversationSummary> {
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
  })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found.')

  const membership = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
  })
  if (
    !isActiveMember(
      membership
        ? { status: membership.status, role: membership.role, mutedUntil: membership.mutedUntil }
        : null,
    )
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Join this community to use the group chat.')
  }

  let conversation = await prisma.conversation.findFirst({
    where: { type: 'COMMUNITY', communityId },
    include: conversationInclude,
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        type: 'COMMUNITY',
        communityId,
        requestStatus: 'ACCEPTED',
      },
      include: conversationInclude,
    })
  }

  const existingParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: conversation.id, userId } },
  })
  if (!existingParticipant) {
    await prisma.conversationParticipant.create({
      data: { conversationId: conversation.id, userId },
    })
    conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
      include: conversationInclude,
    })
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: conversation.id, userId } },
    include: { conversation: { include: conversationInclude } },
  })
  if (!participant) throw new AppError(404, 'NOT_FOUND', 'Conversation not found')
  const summary = await toCommunitySummary(participant, userId)
  if (!summary) throw new AppError(404, 'NOT_FOUND', 'Conversation not found')
  return summary
}

export async function removeCommunityChatParticipant(communityId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { type: 'COMMUNITY', communityId },
    select: { id: true },
  })
  if (!conversation) return
  await prisma.conversationParticipant.deleteMany({
    where: { conversationId: conversation.id, userId },
  })
}

export async function listMessages(
  userId: string,
  conversationId: string,
  after?: string,
): Promise<MessageThread> {
  await requireParticipant(userId, conversationId)
  const afterDate = after ? new Date(after) : null
  const rows = await prisma.directMessage.findMany({
    where: {
      conversationId,
      deletedAt: null,
      ...(afterDate && !Number.isNaN(afterDate.getTime()) ? { createdAt: { gt: afterDate } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: afterDate ? 100 : 200,
  })
  const [messages, typingUsers] = await Promise.all([
    Promise.all(rows.map(m => messageToDto(m, userId))),
    typingAuthors(conversationId, userId),
  ])
  return { messages, typingUsers }
}

export async function setTyping(userId: string, conversationId: string, typing: boolean) {
  const participant = await requireParticipant(userId, conversationId)
  setConversationTyping(conversationId, userId, typing)
  const author = typing ? await authorCard(userId) : undefined
  for (const p of participant.conversation.participants) {
    if (p.userId === userId) continue
    publishMessageStream(p.userId, {
      type: 'typing',
      data: { conversationId, userId, typing, author: typing ? author : undefined },
    })
  }
  return { typing, conversationId }
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  input: SendMessageBody,
): Promise<DirectMessageDto> {
  const participant = await requireParticipant(userId, conversationId)
  const conversation = participant.conversation

  if (conversation.type === 'DIRECT') {
    const access = conversationAccess(conversation.requestStatus, conversation.initiatedById, userId)
    if (!access.canReply) {
      throw new AppError(403, 'REQUEST_PENDING', 'Accept the message request to reply.')
    }
    if (conversation.requestStatus === 'PENDING' && access.isInitiator) {
      const sentWhilePending = await prisma.directMessage.count({
        where: { conversationId, senderId: userId, deletedAt: null },
      })
      if (sentWhilePending >= PENDING_INITIATOR_MESSAGE_LIMIT) {
        throw new AppError(
          403,
          'PENDING_LIMIT',
          'Wait for them to accept your request before sending more messages.',
        )
      }
    }
  }

  assertRateLimit(`dm-send:${userId}`, SEND_MESSAGE_LIMIT)

  const caption = input.body?.trim() || ''
  let kind: DbMessageKind = 'TEXT'
  let body = caption
  let sharedEntityId: string | null = null
  let sharedEntity: MessageSharedEntity | undefined
  let mediaId: string | null = null
  let media: DirectMessageDto['media']

  if (input.mediaId) {
    const asset = await resolveMessageMedia(userId, input.mediaId)
    kind = 'IMAGE'
    mediaId = asset.id
    body = caption || 'Photo'
    media = {
      id: asset.id,
      url: asset.secureUrl || '',
      resourceType: asset.resourceType === 'video' ? 'video' : 'image',
      width: asset.width,
      height: asset.height,
    }
  } else if (input.sharedEntity) {
    const resolved = await resolveSharedEntity(userId, input.sharedEntity)
    kind = resolved.kind
    sharedEntityId = resolved.entity.id
    sharedEntity = resolved.entity
    body = caption || resolved.previewBody
  } else if (!caption) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Message body is required.')
  }

  const now = new Date()
  const message = await prisma.$transaction(async tx => {
    const created = await tx.directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        kind,
        body,
        sharedEntityId,
        mediaId,
        updatedAt: now,
      },
    })
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now, updatedAt: now },
    })
    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    })
    return created
  })

  setConversationTyping(conversationId, userId, false)

  void notifyMessageRecipients(userId, conversation, body).catch(() => undefined)

  void (async () => {
    for (const p of conversation.participants) {
      const dto = await messageToDto(message, p.userId)
      publishMessageStream(p.userId, { type: 'message', data: { conversationId, message: dto } })
      publishMessageStream(p.userId, { type: 'inbox', data: { conversationId } })
    }
  })().catch(() => undefined)

  return {
    id: message.id,
    conversationId: message.conversationId,
    kind: dtoKind(message.kind),
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    sender: await authorCard(userId),
    fromMe: true,
    sharedEntity,
    media,
  }
}

export async function acceptConversationRequest(userId: string, conversationId: string) {
  const participant = await requireParticipant(userId, conversationId)
  const conversation = participant.conversation

  if (conversation.type !== 'DIRECT') {
    throw new AppError(400, 'INVALID_STATE', 'This conversation is not a message request.')
  }
  if (conversation.requestStatus !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATE', 'This conversation is not a pending request.')
  }
  if (conversation.initiatedById === userId) {
    throw new AppError(400, 'INVALID_STATE', 'You cannot accept your own request.')
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { requestStatus: 'ACCEPTED', updatedAt: new Date() },
  })

  const other = conversation.participants.find(p => p.userId !== userId)
  if (!other) throw new AppError(404, 'NOT_FOUND', 'Conversation not found')

  const refreshed = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: { conversation: { include: conversationInclude } },
  })
  if (!refreshed) throw new AppError(404, 'NOT_FOUND', 'Conversation not found')
  return toDirectSummary(refreshed, other.userId, userId)
}

export async function declineConversationRequest(userId: string, conversationId: string) {
  const participant = await requireParticipant(userId, conversationId)
  const conversation = participant.conversation

  if (conversation.type !== 'DIRECT') {
    throw new AppError(400, 'INVALID_STATE', 'This conversation is not a message request.')
  }
  if (conversation.requestStatus !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATE', 'This conversation is not a pending request.')
  }
  if (conversation.initiatedById === userId) {
    throw new AppError(400, 'INVALID_STATE', 'You cannot decline your own request.')
  }

  await prisma.$transaction(async tx => {
    await tx.conversation.update({
      where: { id: conversationId },
      data: { requestStatus: 'DECLINED', updatedAt: new Date() },
    })
    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { archived: true },
    })
  })

  return { declined: true, conversationId }
}

export async function markConversationRead(userId: string, conversationId: string) {
  await requireParticipant(userId, conversationId)
  const now = new Date()
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: now },
  })
  return { read: true, conversationId }
}

export async function archiveConversation(userId: string, conversationId: string) {
  await requireParticipant(userId, conversationId)
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { archived: true },
  })
  return { archived: true, conversationId }
}

export async function unarchiveConversation(userId: string, conversationId: string) {
  await requireParticipant(userId, conversationId)
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { archived: false },
  })
  return { archived: false, conversationId }
}

export async function setConversationMuted(userId: string, conversationId: string, muted: boolean) {
  await requireParticipant(userId, conversationId)
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { muted },
  })
  return { muted, conversationId }
}

export async function blockUser(userId: string, blockedUserId: string): Promise<{ blocked: true }> {
  if (userId === blockedUserId) {
    throw new AppError(400, 'INVALID_BLOCK', 'You cannot block yourself.')
  }
  const target = await prisma.user.findFirst({
    where: { id: blockedUserId, accountStatus: { not: 'deactivated' } },
  })
  if (!target) throw new AppError(404, 'NOT_FOUND', 'Traveler not found.')

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: blockedUserId } },
    create: { blockerId: userId, blockedId: blockedUserId },
    update: {},
  })

  const existing = await findDirectConversation(userId, blockedUserId)
  if (existing) {
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: existing.id, userId } },
      data: { archived: true },
    })
  }

  return { blocked: true }
}

export async function unblockUser(userId: string, blockedUserId: string) {
  await prisma.userBlock.deleteMany({
    where: { blockerId: userId, blockedId: blockedUserId },
  })
  return { unblocked: true }
}

export async function listBlockedUsers(userId: string): Promise<BlockedUserDto[]> {
  const rows = await prisma.userBlock.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return Promise.all(
    rows.map(async row => {
      const card = await authorCard(row.blockedId)
      return {
        ...card,
        blockedAt: row.createdAt.toISOString(),
      }
    }),
  )
}
