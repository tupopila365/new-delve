import type { DirectMessageDto, MessageAuthor } from '@delve/contracts'

export type MessageStreamEvent =
  | { type: 'inbox'; data: { conversationId: string } }
  | {
      type: 'message'
      data: { conversationId: string; message: DirectMessageDto }
    }
  | {
      type: 'typing'
      data: {
        conversationId: string
        userId: string
        typing: boolean
        author?: MessageAuthor
      }
    }

type Listener = (event: MessageStreamEvent) => void

const subscribers = new Map<string, Set<Listener>>()

export function subscribeMessageStream(userId: string, listener: Listener) {
  let set = subscribers.get(userId)
  if (!set) {
    set = new Set()
    subscribers.set(userId, set)
  }
  set.add(listener)
  return () => {
    set!.delete(listener)
    if (!set!.size) subscribers.delete(userId)
  }
}

export function publishMessageStream(userId: string, event: MessageStreamEvent) {
  const set = subscribers.get(userId)
  if (!set) return
  for (const listener of set) {
    try {
      listener(event)
    } catch {
      /* ignore listener errors */
    }
  }
}

export function resetMessageStream() {
  subscribers.clear()
}
