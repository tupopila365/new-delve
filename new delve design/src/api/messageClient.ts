import type {
  BlockedUserDto,
  ConversationSummary,
  CreateConversationBody,
  DirectMessageDto,
  SendMessageBody,
} from '@delve/contracts'
import { authorizedJson } from './authClient'

export async function listConversations(archived = false) {
  const qs = archived ? '?archived=true' : ''
  return authorizedJson<ConversationSummary[]>(`/conversations${qs}`)
}

export async function createConversation(body: CreateConversationBody) {
  return authorizedJson<ConversationSummary>('/conversations', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function openJourneyConversation(journeyId: string) {
  return authorizedJson<ConversationSummary>(
    `/journeys/${encodeURIComponent(journeyId)}/conversation`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function fetchConversationMessages(conversationId: string, after?: string) {
  const qs = after ? `?after=${encodeURIComponent(after)}` : ''
  return authorizedJson<import('@delve/contracts').MessageThread>(
    `/conversations/${encodeURIComponent(conversationId)}/messages${qs}`,
  )
}

export async function signalConversationTyping(conversationId: string, typing: boolean) {
  return authorizedJson<{ typing: boolean; conversationId: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/typing`,
    { method: 'POST', body: JSON.stringify({ typing }) },
  )
}

export async function sendConversationMessage(conversationId: string, body: SendMessageBody) {
  return authorizedJson<DirectMessageDto>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

export async function acceptConversationRequest(conversationId: string) {
  return authorizedJson<ConversationSummary>(
    `/conversations/${encodeURIComponent(conversationId)}/accept`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function declineConversationRequest(conversationId: string) {
  return authorizedJson<{ declined: boolean; conversationId: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/decline`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function markConversationRead(conversationId: string) {
  return authorizedJson<{ read: boolean; conversationId: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function archiveConversation(conversationId: string) {
  return authorizedJson<{ archived: boolean; conversationId: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/archive`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function unarchiveConversation(conversationId: string) {
  return authorizedJson<{ archived: boolean; conversationId: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/unarchive`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function muteConversation(conversationId: string, muted: boolean) {
  return authorizedJson<{ muted: boolean; conversationId: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/mute`,
    {
      method: 'PATCH',
      body: JSON.stringify({ muted }),
    },
  )
}

export async function blockUser(userId: string) {
  return authorizedJson<{ blocked: true }>(
    `/users/${encodeURIComponent(userId)}/block`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function unblockUser(userId: string) {
  return authorizedJson<{ unblocked: true }>(
    `/users/${encodeURIComponent(userId)}/block`,
    { method: 'DELETE' },
  )
}

export async function listBlockedUsers() {
  return authorizedJson<BlockedUserDto[]>('/blocks')
}
