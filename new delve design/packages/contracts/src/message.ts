import { z } from 'zod'

export const conversationRequestStatusSchema = z.enum(['ACCEPTED', 'PENDING', 'DECLINED'])

export type ConversationRequestStatus = z.infer<typeof conversationRequestStatusSchema>

export const messageAuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})

export type MessageAuthor = z.infer<typeof messageAuthorSchema>

export const journeyChatContextSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  coverUrl: z.string().nullable(),
  startPlace: z.string(),
  endPlace: z.string(),
  durationDays: z.number().int().positive().nullable(),
})

export type JourneyChatContext = z.infer<typeof journeyChatContextSchema>

export const communityChatContextSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  privacy: z.enum(['PUBLIC', 'PRIVATE']),
  memberCount: z.number().int().nonnegative(),
})

export type CommunityChatContext = z.infer<typeof communityChatContextSchema>

const conversationBaseSchema = z.object({
  id: z.string(),
  preview: z.string(),
  lastMessageAt: z.string().datetime().nullable(),
  unreadCount: z.number().int().nonnegative(),
  muted: z.boolean(),
  archived: z.boolean(),
})

export const directConversationSummarySchema = conversationBaseSchema.extend({
  type: z.literal('DIRECT'),
  otherParticipant: messageAuthorSchema,
  requestStatus: conversationRequestStatusSchema,
  isInitiator: z.boolean(),
  canReply: z.boolean(),
})

export type DirectConversationSummary = z.infer<typeof directConversationSummarySchema>

export const journeyConversationSummarySchema = conversationBaseSchema.extend({
  type: z.literal('JOURNEY'),
  journey: journeyChatContextSchema,
  participantCount: z.number().int().nonnegative(),
  requestStatus: z.literal('ACCEPTED'),
  isInitiator: z.literal(false),
  canReply: z.literal(true),
})

export type JourneyConversationSummary = z.infer<typeof journeyConversationSummarySchema>

export const communityConversationSummarySchema = conversationBaseSchema.extend({
  type: z.literal('COMMUNITY'),
  community: communityChatContextSchema,
  participantCount: z.number().int().nonnegative(),
  requestStatus: z.literal('ACCEPTED'),
  isInitiator: z.literal(false),
  canReply: z.literal(true),
})

export type CommunityConversationSummary = z.infer<typeof communityConversationSummarySchema>

export const conversationSummarySchema = z.discriminatedUnion('type', [
  directConversationSummarySchema,
  journeyConversationSummarySchema,
  communityConversationSummarySchema,
])

export type ConversationSummary = z.infer<typeof conversationSummarySchema>

export const messageSharedEntitySchema = z.object({
  type: z.enum(['journey', 'deal']),
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  meta: z.string().optional(),
  status: z.string().optional(),
  price: z.string().optional(),
  image: z.string().nullable().optional(),
})

export type MessageSharedEntity = z.infer<typeof messageSharedEntitySchema>

export const messageKindSchema = z.enum(['text', 'journey', 'deal', 'image', 'system'])

export type MessageKind = z.infer<typeof messageKindSchema>

export const messageMediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  resourceType: z.enum(['image', 'video']),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
})

export type MessageMedia = z.infer<typeof messageMediaSchema>

export const directMessageDtoSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  kind: messageKindSchema,
  body: z.string(),
  createdAt: z.string().datetime(),
  sender: messageAuthorSchema,
  fromMe: z.boolean(),
  sharedEntity: messageSharedEntitySchema.optional(),
  media: messageMediaSchema.optional(),
})

export type DirectMessageDto = z.infer<typeof directMessageDtoSchema>

export const messageThreadSchema = z.object({
  messages: z.array(directMessageDtoSchema),
  typingUsers: z.array(messageAuthorSchema),
})

export type MessageThread = z.infer<typeof messageThreadSchema>

export const createConversationBodySchema = z
  .object({
    participantUserId: z.string().min(1).optional(),
    journeyId: z.string().min(1).optional(),
    communityId: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    data =>
      [data.participantUserId, data.journeyId, data.communityId].filter(Boolean).length === 1,
    { message: 'Provide exactly one of participantUserId, journeyId, or communityId.' },
  )

export type CreateConversationBody = z.infer<typeof createConversationBodySchema>

export const sharedEntityRefSchema = z.object({
  type: z.enum(['journey', 'deal']),
  id: z.string().min(1),
})

export const sendMessageBodySchema = z
  .object({
    body: z.string().trim().max(4000).optional(),
    sharedEntity: sharedEntityRefSchema.optional(),
    mediaId: z.string().min(1).optional(),
  })
  .strict()
  .refine(data => Boolean(data.body?.trim()) || Boolean(data.sharedEntity) || Boolean(data.mediaId), {
    message: 'Message body, sharedEntity, or mediaId is required.',
  })

export type SendMessageBody = z.infer<typeof sendMessageBodySchema>

export const typingBodySchema = z
  .object({
    typing: z.boolean(),
  })
  .strict()

export type TypingBody = z.infer<typeof typingBodySchema>

export const blockedUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  blockedAt: z.string().datetime(),
})

export type BlockedUserDto = z.infer<typeof blockedUserSchema>

export const blockUserBodySchema = z
  .object({
    userId: z.string().min(1),
  })
  .strict()

export type BlockUserBody = z.infer<typeof blockUserBodySchema>
