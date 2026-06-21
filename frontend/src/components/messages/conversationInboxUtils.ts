export type InboxParticipant = { id: number; username: string; display_name: string }

export type InboxConversation = {
  id: number
  participants_detail: InboxParticipant[]
  last_message: { body: string; sender_username: string } | null
  updated_at: string
  unread_count?: number
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
