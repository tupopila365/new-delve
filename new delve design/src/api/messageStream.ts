import type { DirectMessageDto, MessageAuthor } from '@delve/contracts'
import { getStoredAccessToken } from './authClient'

export type MessageStreamHandlers = {
  onInbox: (data: { conversationId: string }) => void
  onMessage: (data: { conversationId: string; message: DirectMessageDto }) => void
  onTyping: (data: {
    conversationId: string
    userId: string
    typing: boolean
    author?: MessageAuthor
  }) => void
}

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v2'
  return raw.replace(/\/$/, '')
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (!dataLines.length) return null
  return { event, data: dataLines.join('\n') }
}

/**
 * Authenticated SSE over fetch (supports Bearer token; EventSource cannot).
 * Rejects when the stream fails to connect; abort via signal to close cleanly.
 */
export async function connectMessageStream(
  handlers: MessageStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  const token = getStoredAccessToken()
  if (!token) throw new Error('Sign in required')

  const res = await fetch(`${apiBase()}/messages/stream`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error(`Message stream unavailable (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let splitAt = buffer.indexOf('\n\n')
    while (splitAt !== -1) {
      const block = buffer.slice(0, splitAt).trim()
      buffer = buffer.slice(splitAt + 2)
      if (block && !block.startsWith(':')) {
        const parsed = parseSseBlock(block)
        if (parsed?.data) {
          try {
            const payload = JSON.parse(parsed.data) as unknown
            if (parsed.event === 'inbox') handlers.onInbox(payload as { conversationId: string })
            else if (parsed.event === 'message') {
              handlers.onMessage(payload as { conversationId: string; message: DirectMessageDto })
            } else if (parsed.event === 'typing') {
              handlers.onTyping(
                payload as {
                  conversationId: string
                  userId: string
                  typing: boolean
                  author?: MessageAuthor
                },
              )
            }
          } catch {
            /* ignore malformed frames */
          }
        }
      }
      splitAt = buffer.indexOf('\n\n')
    }
  }
}
