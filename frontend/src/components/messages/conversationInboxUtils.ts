export type InboxParticipant = {
  id: number
  username: string
  display_name: string
  avatar?: string | null
}

export type InboxContext = {
  type: string
  id: number | null
  label: string
  href: string | null
}

export type InboxConversation = {
  id: number
  pair_key?: string | null
  other?: InboxParticipant | null
  context?: InboxContext | null
  participants_detail: InboxParticipant[]
  last_message: { body: string; sender_username: string } | null
  updated_at: string
  unread_count?: number
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

export type InboxEntry =
  | { kind: 'dm'; data: InboxConversation }
  | { kind: 'group'; data: InboxGroupThread }

export function mergeInboxEntries(
  conversations: InboxConversation[],
  groups: InboxGroupThread[],
): InboxEntry[] {
  const entries: InboxEntry[] = [
    ...conversations.map((data) => ({ kind: 'dm' as const, data })),
    ...groups.map((data) => ({ kind: 'group' as const, data })),
  ]
  return entries.sort((a, b) => {
    const aTime = Date.parse(a.data.updated_at)
    const bTime = Date.parse(b.data.updated_at)
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
  })
}

export function groupPreviewText(
  thread: InboxGroupThread,
  myUsername: string,
): { text: string; fromYou: boolean } {
  if (!thread.last_message) return { text: 'No messages yet', fromYou: false }
  const body = thread.last_message.body.trim()
  const clipped = body.length > 52 ? `${body.slice(0, 52)}…` : body
  const fromYou = thread.last_message.sender_username === myUsername
  return { text: fromYou ? `You: ${clipped}` : clipped, fromYou }
}

export function groupInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'G'
}

export function conversationOther(
  conversation: InboxConversation,
  myUsername: string,
): InboxParticipant | undefined {
  if (conversation.other) return conversation.other
  return conversation.participants_detail.find((p) => p.username !== myUsername)
}

export function formatConversationTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const today = date.toDateString() === now.toDateString()
  if (today) return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 6)
  if (date >= weekAgo) return date.toLocaleDateString(undefined, { weekday: 'short' })
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function participantLabel(participant?: InboxParticipant): string {
  return participant?.display_name?.trim() || participant?.username || 'Conversation'
}

export function participantInitial(participant?: InboxParticipant): string {
  return participantLabel(participant).charAt(0).toUpperCase() || 'D'
}

export function previewText(
  conversation: InboxConversation,
  myUsername: string,
): { text: string; fromYou: boolean } {
  if (!conversation.last_message) return { text: 'No messages yet', fromYou: false }
  const body = conversation.last_message.body.trim()
  const clipped = body.length > 52 ? `${body.slice(0, 52)}…` : body
  const fromYou = conversation.last_message.sender_username === myUsername
  return { text: fromYou ? `You: ${clipped}` : clipped, fromYou }
}
