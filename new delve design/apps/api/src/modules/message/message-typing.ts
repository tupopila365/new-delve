const TYPING_TTL_MS = 5000
const buckets = new Map<string, Map<string, number>>()

function prune(conversationId: string, now: number) {
  const row = buckets.get(conversationId)
  if (!row) return
  for (const [userId, expiresAt] of row) {
    if (expiresAt <= now) row.delete(userId)
  }
  if (!row.size) buckets.delete(conversationId)
}

export function setConversationTyping(conversationId: string, userId: string, typing: boolean) {
  const now = Date.now()
  prune(conversationId, now)
  if (!typing) {
    buckets.get(conversationId)?.delete(userId)
    return
  }
  const row = buckets.get(conversationId) ?? new Map<string, number>()
  row.set(userId, now + TYPING_TTL_MS)
  buckets.set(conversationId, row)
}

export function listTypingUserIds(conversationId: string, excludeUserId?: string): string[] {
  const now = Date.now()
  prune(conversationId, now)
  const row = buckets.get(conversationId)
  if (!row) return []
  return [...row.keys()].filter(id => id !== excludeUserId)
}

export function resetConversationTyping() {
  buckets.clear()
}
