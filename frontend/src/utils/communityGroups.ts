export type CommunityGroupTopic =
  | 'general'
  | 'safety'
  | 'transport'
  | 'food'
  | 'stay'
  | 'prices'
  | 'visas'
  | '4x4'
  | 'photography'

export type CommunityGroup = {
  id: number
  slug: string
  name: string
  description: string
  topic: CommunityGroupTopic
  visibility: 'public' | 'private'
  member_count: number
  last_message_preview?: string | null
  last_active_at?: string | null
  cover_src?: string | null
  joined: boolean
  pending_request: boolean
  created_at?: string
  created_by?: {
    id: number
    username: string
    display_name: string
    avatar?: string | null
  }
  my_role?: 'admin' | 'member' | null
  tag_slugs?: string[]
}

export type GroupMessageReaction = {
  emoji: string
  count: number
  reacted_by_me: boolean
}

export type GroupMessageReplyTo = {
  id: number
  sender_username: string
  body: string
  image?: string | null
  video?: string | null
  audio?: string | null
  is_deleted?: boolean
}

export type GroupMessage = {
  id: number | string
  sender_username: string
  body: string
  image?: string | null
  video?: string | null
  audio?: string | null
  created_at: string
  reply_to?: GroupMessageReplyTo | null
  forwarded_from?: GroupMessageReplyTo | null
  reactions?: GroupMessageReaction[]
  is_deleted?: boolean
  can_unsend?: boolean
  author?: {
    id: number
    username: string
    display_name: string
    avatar?: string | null
  }
}

export type GroupMessageDeleteScope = 'me' | 'everyone'

export const GROUP_MESSAGE_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const

export type GroupMessagesPage = {
  results: GroupMessage[]
  has_more: boolean
  next_before_id: number | null
}

export type GroupMember = {
  user: {
    id: number
    username: string
    display_name: string
    avatar?: string | null
  }
  role: 'admin' | 'member'
  joined_at: string
}

export const COMMUNITY_GROUP_TOPICS: { id: CommunityGroupTopic; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'safety', label: 'Safety' },
  { id: 'transport', label: 'Transport' },
  { id: 'food', label: 'Food' },
  { id: 'stay', label: 'Stay' },
  { id: 'prices', label: 'Prices' },
  { id: 'visas', label: 'Visas' },
  { id: '4x4', label: '4×4' },
  { id: 'photography', label: 'Photos' },
]

function topicParam(topicLabel: string | null): string | undefined {
  if (!topicLabel) return undefined
  const row = COMMUNITY_GROUP_TOPICS.find((t) => t.label === topicLabel)
  return row?.id
}

export function groupsCreatePath() {
  return '/api/communities/groups/'
}

export function groupsListPath(opts?: { mine?: boolean; q?: string; topic?: string | null; tag?: string | null }) {
  const params = new URLSearchParams()
  if (opts?.mine) params.set('mine', '1')
  if (opts?.q?.trim()) params.set('q', opts.q.trim())
  const topic = topicParam(opts?.topic ?? null)
  if (topic) params.set('topic', topic)
  if (opts?.tag?.trim()) params.set('tag', opts.tag.trim())
  const qs = params.toString()
  return `/api/communities/groups/${qs ? `?${qs}` : ''}`
}

export function communityGroupsTagPath(slug: string): string {
  return `/community?view=groups&tag=${encodeURIComponent(slug)}`
}

export function groupDetailPath(slug: string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/`
}

export function groupJoinPath(slug: string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/join/`
}

export function groupLeavePath(slug: string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/leave/`
}

export function groupMembersPath(slug: string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/members/`
}

export function groupAddMembersPath(slug: string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/members/add/`
}

export function groupPendingMembersPath(slug: string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/members/pending/`
}

export function groupReviewMemberPath(slug: string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/members/review/`
}

export function groupMessagesPath(slug: string, opts?: { limit?: number; beforeId?: number }) {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.beforeId != null) params.set('before_id', String(opts.beforeId))
  const qs = params.toString()
  return `/api/communities/groups/${encodeURIComponent(slug)}/messages/${qs ? `?${qs}` : ''}`
}

export function groupMessageReactPath(slug: string, messageId: number | string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/messages/${encodeURIComponent(String(messageId))}/react/`
}

export function groupMessageDeletePath(slug: string, messageId: number | string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/messages/${encodeURIComponent(String(messageId))}/delete/`
}

export function groupMessageForwardPath(slug: string, messageId: number | string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/messages/${encodeURIComponent(String(messageId))}/forward/`
}

export function groupsInboxPath() {
  return '/api/communities/groups/inbox/'
}

export function groupReadPath(slug: string) {
  return `/api/communities/groups/${encodeURIComponent(slug)}/read/`
}

export type InboxGroupThread = {
  id: number
  slug: string
  name: string
  cover_src?: string | null
  member_count: number
  last_message: { body: string; sender_username: string; created_at: string } | null
  updated_at: string
  unread_count?: number
}

export function groupInfoPath(slug: string) {
  return `/community/g/${encodeURIComponent(slug)}/info`
}

export function groupChatPath(slug: string) {
  return `/community/g/${encodeURIComponent(slug)}`
}

export function groupShareUrl(slug: string): string {
  if (typeof window === 'undefined') return `/community/g/${slug}`
  return `${window.location.origin}/community/g/${encodeURIComponent(slug)}`
}

export function feedSearchPath(q: string, kind?: 'question' | 'tip') {
  const params = new URLSearchParams()
  params.set('q', q.trim())
  if (kind) params.set('kind', kind)
  params.set('limit', '8')
  return `/api/social/feed/?${params.toString()}`
}
