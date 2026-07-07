export type DmMessageReplyTo = {
  id: number
  sender_username: string
  body: string
  image?: string | null
  video?: string | null
  audio?: string | null
  is_deleted?: boolean
}

export type DmMessageDeleteScope = 'me' | 'everyone'

export function dmMessageDeletePath(conversationId: string | number, messageId: string | number) {
  return `/api/messaging/conversations/${encodeURIComponent(String(conversationId))}/messages/${encodeURIComponent(String(messageId))}/delete/`
}

export function dmMessageForwardPath(conversationId: string | number, messageId: string | number) {
  return `/api/messaging/conversations/${encodeURIComponent(String(conversationId))}/messages/${encodeURIComponent(String(messageId))}/forward/`
}

export function dmMessagePreview(message: {
  body?: string
  image?: string | null
  video?: string | null
  audio?: string | null
  is_deleted?: boolean
}): string {
  if (message.is_deleted) return 'This message was deleted'
  const text = message.body?.trim()
  if (text) return text
  if (message.video) return 'Video'
  if (message.image) return 'Photo'
  if (message.audio) return 'Voice note'
  return 'Message'
}

export function dmReplyPreviewLabel(reply: DmMessageReplyTo): string {
  return dmMessagePreview(reply)
}
