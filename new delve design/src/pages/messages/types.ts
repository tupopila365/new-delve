export type ConversationType =
  | 'personal'
  | 'journey'
  | 'community'
  | 'business'
  | 'transport'
  | 'support'
  | 'request'

export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'queued'

export type MessageKind =
  | 'text'
  | 'system'
  | 'image'
  | 'location'
  | 'deal'
  | 'journey'
  | 'booking'
  | 'transport'
  | 'removed'
  | 'restricted'

export interface SharedEntity {
  type: 'deal' | 'journey' | 'booking' | 'transport' | 'listing' | 'community' | 'place'
  title: string
  subtitle?: string
  meta?: string
  status?: string
  price?: string
  image?: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  from: 'me' | 'other' | 'system'
  senderName?: string
  kind: MessageKind
  text?: string
  time: string
  createdAt?: string
  delivery?: DeliveryStatus
  edited?: boolean
  replyTo?: string
  entity?: SharedEntity
  mediaUrl?: string
  mediaResourceType?: 'image' | 'video'
  locationLabel?: string
  reactions?: { emoji: string; count: number; mine?: boolean }[]
  moderationStatus?: 'ok' | 'removed' | 'restricted'
}

export interface Conversation {
  id: string
  type: ConversationType
  name: string
  handle: string
  avatar: string | null
  preview: string
  time: string
  unread: number
  muted: boolean
  pinned: boolean
  verified: boolean
  archived?: boolean
  isRequest?: boolean
  canReply?: boolean
  otherUserId?: string
  journeyId?: string
  journeySlug?: string
  communityId?: string
  communitySlug?: string
  draft?: string
  typing?: boolean
  contextLabel?: string
  bookingRef?: string
  supportCaseRef?: string
  responseExpectation?: string
  transportMode?: string
  onlineAllowed?: boolean
  readReceiptsAllowed?: boolean
}

export type InboxFilter =
  | 'All'
  | 'Unread'
  | 'Personal'
  | 'Journeys'
  | 'Communities'
  | 'Businesses'
  | 'Transport'
  | 'Support'
  | 'Requests'
  | 'Archived'

export type SafetyCaseStatus =
  | 'Submitted'
  | 'Under review'
  | 'Awaiting traveler'
  | 'Resolved'
  | 'Closed'
