import type { GroupMessage, GroupMessageReplyTo } from '../../../utils/communityGroups'

export function groupMessagePreview(message: Pick<GroupMessage, 'body' | 'image' | 'video' | 'audio' | 'is_deleted'>): string {
  if (message.is_deleted) return 'This message was deleted'
  const text = message.body?.trim()
  if (text) return text
  if (message.video) return 'Video'
  if (message.image) return 'Photo'
  if (message.audio) return 'Voice note'
  return 'Message'
}

export function replyPreviewLabel(reply: GroupMessageReplyTo): string {
  return groupMessagePreview(reply)
}
