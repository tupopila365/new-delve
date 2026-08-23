import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConversationSummary, DirectMessageDto, MessageAuthor, SendMessageBody } from '@delve/contracts'
import {
  acceptConversationRequest,
  archiveConversation,
  blockUser,
  createConversation,
  declineConversationRequest,
  fetchConversationMessages,
  listConversations,
  markConversationRead,
  muteConversation,
  openJourneyConversation,
  sendConversationMessage,
  signalConversationTyping,
  unarchiveConversation,
} from '../../api/messageClient'
import { connectMessageStream } from '../../api/messageStream'
import type { ChatMessage, Conversation } from './types'

const INBOX_POLL_MS = 20_000
const INBOX_POLL_STREAM_MS = 120_000
const THREAD_POLL_MS = 4_000
const UNREAD_POLL_MS = 30_000
const STREAM_RETRY_MS = 3_000

export function relativeMessageTime(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'Now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

export function summaryToConversation(s: ConversationSummary): Conversation {
  if (s.type === 'JOURNEY') {
    const j = s.journey
    return {
      id: s.id,
      type: 'journey',
      name: j.title,
      handle: `${s.participantCount} traveler${s.participantCount === 1 ? '' : 's'}`,
      avatar: j.coverUrl,
      preview: s.preview,
      time: relativeMessageTime(s.lastMessageAt),
      unread: s.unreadCount,
      muted: s.muted,
      pinned: false,
      verified: false,
      archived: s.archived,
      canReply: true,
      journeyId: j.id,
      journeySlug: j.slug,
      onlineAllowed: false,
      readReceiptsAllowed: true,
      contextLabel: `${j.durationDays} days · ${j.startPlace} → ${j.endPlace}`,
    }
  }

  const p = s.otherParticipant
  const isRequest = s.requestStatus === 'PENDING' && !s.isInitiator
  return {
    id: s.id,
    type: isRequest ? 'request' : 'personal',
    name: p.displayName || p.username,
    handle: isRequest ? `@${p.username} · Request` : `@${p.username}`,
    avatar: p.avatarUrl,
    preview: s.preview,
    time: relativeMessageTime(s.lastMessageAt),
    unread: s.unreadCount,
    muted: s.muted,
    pinned: false,
    verified: false,
    archived: s.archived,
    isRequest,
    canReply: s.canReply,
    otherUserId: p.id,
    onlineAllowed: false,
    readReceiptsAllowed: !isRequest,
    contextLabel: isRequest ? 'Message request' : undefined,
  }
}

export function dtoToChatMessage(m: DirectMessageDto): ChatMessage {
  const entity = m.sharedEntity
    ? {
        type: m.sharedEntity.type,
        title: m.sharedEntity.title,
        subtitle: m.sharedEntity.subtitle,
        meta: m.sharedEntity.meta,
        status: m.sharedEntity.status,
        price: m.sharedEntity.price,
        image: m.sharedEntity.image ?? undefined,
      }
    : undefined

  return {
    id: m.id,
    conversationId: m.conversationId,
    from: m.fromMe ? 'me' : 'other',
    senderName: m.fromMe ? undefined : m.sender.displayName || m.sender.username,
    kind:
      m.kind === 'journey' ? 'journey'
      : m.kind === 'deal' ? 'deal'
      : m.kind === 'image' ? 'image'
      : 'text',
    text: m.body,
    time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: m.createdAt,
    delivery: m.fromMe ? 'sent' : undefined,
    entity,
    mediaUrl: m.media?.url,
    mediaResourceType: m.media?.resourceType,
  }
}

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]) {
  if (!incoming.length) return existing
  const seen = new Set(existing.map(m => m.id))
  const next = [...existing]
  for (const msg of incoming) {
    if (!seen.has(msg.id)) {
      seen.add(msg.id)
      next.push(msg)
    }
  }
  return next
}

export function useLiveMessages(enabled: boolean, activeConversationId: string | null = null) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([])
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({})
  const [typingUsers, setTypingUsers] = useState<Record<string, MessageAuthor[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamConnected, setStreamConnected] = useState(false)
  const threadsRef = useRef(threads)
  const activeConversationIdRef = useRef(activeConversationId)
  threadsRef.current = threads
  activeConversationIdRef.current = activeConversationId

  const refreshInbox = useCallback(async () => {
    if (!enabled) return
    try {
      const rows = await listConversations(false)
      setConversations(rows.map(summaryToConversation))
    } catch {
      /* silent refresh */
    }
  }, [enabled])

  const applyStreamMessage = useCallback((conversationId: string, message: DirectMessageDto) => {
    const msg = dtoToChatMessage(message)
    setThreads(prev => ({
      ...prev,
      [conversationId]: mergeMessages(prev[conversationId] ?? [], [msg]),
    }))
    const preview = message.body?.trim() || (message.kind === 'image' ? 'Photo' : 'Shared content')
    const isActive = activeConversationIdRef.current === conversationId
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId
          ? {
              ...c,
              preview,
              time: 'Now',
              unread: message.fromMe ? c.unread : isActive ? 0 : c.unread + 1,
            }
          : c,
      ),
    )
    if (!message.fromMe && isActive) {
      void markConversationRead(conversationId).catch(() => undefined)
    }
  }, [])

  const applyStreamTyping = useCallback((
    conversationId: string,
    userId: string,
    typing: boolean,
    author?: MessageAuthor,
  ) => {
    setTypingUsers(prev => {
      const current = prev[conversationId] ?? []
      if (!typing) {
        const next = current.filter(u => u.id !== userId)
        if (next.length === current.length) return prev
        return { ...prev, [conversationId]: next }
      }
      if (!author || current.some(u => u.id === userId)) return prev
      return { ...prev, [conversationId]: [...current, author] }
    })
  }, [])

  useEffect(() => {
    if (!enabled) {
      setStreamConnected(false)
      return
    }
    let cancelled = false
    let retryTimer: number | null = null
    let abort: AbortController | null = null

    const connect = () => {
      abort?.abort()
      abort = new AbortController()
      void connectMessageStream(
        {
          onInbox: () => {
            void refreshInbox()
          },
          onMessage: ({ conversationId, message }) => {
            applyStreamMessage(conversationId, message)
          },
          onTyping: ({ conversationId, userId, typing, author }) => {
            applyStreamTyping(conversationId, userId, typing, author)
          },
        },
        abort.signal,
      )
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) {
            setStreamConnected(false)
            retryTimer = window.setTimeout(connect, STREAM_RETRY_MS)
          }
        })

      setStreamConnected(true)
    }

    connect()
    return () => {
      cancelled = true
      abort?.abort()
      if (retryTimer) window.clearTimeout(retryTimer)
      setStreamConnected(false)
    }
  }, [enabled, applyStreamMessage, applyStreamTyping, refreshInbox])

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const rows = await listConversations(false)
      setConversations(rows.map(summaryToConversation))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load conversations')
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  const loadArchived = useCallback(async () => {
    if (!enabled) return
    try {
      const rows = await listConversations(true)
      setArchivedConversations(rows.map(summaryToConversation))
    } catch {
      setArchivedConversations([])
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!enabled) return
    const pollMs = streamConnected ? INBOX_POLL_STREAM_MS : INBOX_POLL_MS
    const timer = window.setInterval(() => {
      void refreshInbox()
    }, pollMs)
    return () => window.clearInterval(timer)
  }, [enabled, streamConnected, refreshInbox])

  const loadThread = useCallback(
    async (conversationId: string) => {
      if (!enabled) return
      try {
        const thread = await fetchConversationMessages(conversationId)
        setThreads(prev => ({ ...prev, [conversationId]: thread.messages.map(dtoToChatMessage) }))
        setTypingUsers(prev => ({ ...prev, [conversationId]: thread.typingUsers }))
        await markConversationRead(conversationId)
        setConversations(prev =>
          prev.map(c => (c.id === conversationId ? { ...c, unread: 0 } : c)),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load messages')
      }
    },
    [enabled],
  )

  const pollThread = useCallback(
    async (conversationId: string) => {
      if (!enabled) return
      try {
        const existing = threadsRef.current[conversationId] ?? []
        const last = existing[existing.length - 1]
        const thread = await fetchConversationMessages(conversationId, last?.createdAt)
        if (thread.messages.length) {
          const mapped = thread.messages.map(dtoToChatMessage)
          setThreads(prev => ({
            ...prev,
            [conversationId]: mergeMessages(prev[conversationId] ?? [], mapped),
          }))
          if (thread.messages.some(m => !m.fromMe)) {
            await markConversationRead(conversationId)
            setConversations(prev =>
              prev.map(c => (c.id === conversationId ? { ...c, unread: 0 } : c)),
            )
          }
        }
        setTypingUsers(prev => ({ ...prev, [conversationId]: thread.typingUsers }))
      } catch {
        /* silent poll */
      }
    },
    [enabled],
  )

  useEffect(() => {
    if (!enabled || !activeConversationId || streamConnected) return
    const timer = window.setInterval(() => {
      void pollThread(activeConversationId)
    }, THREAD_POLL_MS)
    return () => window.clearInterval(timer)
  }, [enabled, activeConversationId, streamConnected, pollThread])

  const send = useCallback(
    async (conversationId: string, body: SendMessageBody) => {
      const created = await sendConversationMessage(conversationId, body)
      const msg = dtoToChatMessage(created)
      setThreads(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), msg],
      }))
      const preview = body.body?.trim() || created.body || msg.text || 'Shared content'
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId
            ? {
                ...c,
                preview,
                time: 'Now',
              }
            : c,
        ),
      )
      void signalConversationTyping(conversationId, false).catch(() => undefined)
      return msg
    },
    [],
  )

  const signalTyping = useCallback((conversationId: string, typing: boolean) => {
    void signalConversationTyping(conversationId, typing).catch(() => undefined)
  }, [])

  const startWithUser = useCallback(async (participantUserId: string) => {
    const summary = await createConversation({ participantUserId })
    const conv = summaryToConversation(summary)
    setConversations(prev => {
      const exists = prev.some(c => c.id === conv.id)
      return exists ? prev : [conv, ...prev]
    })
    setThreads(prev => ({ ...prev, [conv.id]: prev[conv.id] ?? [] }))
    return conv.id
  }, [])

  const openJourneyChat = useCallback(async (journeyId: string) => {
    const summary = await openJourneyConversation(journeyId)
    const conv = summaryToConversation(summary)
    setConversations(prev => {
      const exists = prev.some(c => c.id === conv.id)
      return exists ? prev.map(c => (c.id === conv.id ? conv : c)) : [conv, ...prev]
    })
    setThreads(prev => ({ ...prev, [conv.id]: prev[conv.id] ?? [] }))
    return conv.id
  }, [])

  const acceptRequest = useCallback(async (conversationId: string) => {
    const summary = await acceptConversationRequest(conversationId)
    const conv = summaryToConversation(summary)
    setConversations(prev => prev.map(c => (c.id === conversationId ? conv : c)))
    return conv
  }, [])

  const declineRequest = useCallback(async (conversationId: string) => {
    await declineConversationRequest(conversationId)
    setConversations(prev => prev.filter(c => c.id !== conversationId))
    setThreads(prev => {
      const next = { ...prev }
      delete next[conversationId]
      return next
    })
  }, [])

  const blockOtherUser = useCallback(async (otherUserId: string, conversationId?: string) => {
    await blockUser(otherUserId)
    setConversations(prev =>
      conversationId ? prev.filter(c => c.id !== conversationId) : prev.filter(c => c.otherUserId !== otherUserId),
    )
    if (conversationId) {
      setThreads(prev => {
        const next = { ...prev }
        delete next[conversationId]
        return next
      })
    }
  }, [])

  const archive = useCallback(async (conversationId: string) => {
    await archiveConversation(conversationId)
    let moved: Conversation | undefined
    setConversations(prev => {
      moved = prev.find(c => c.id === conversationId)
      return prev.filter(c => c.id !== conversationId)
    })
    if (moved) {
      setArchivedConversations(prev => [{ ...moved!, archived: true }, ...prev.filter(c => c.id !== conversationId)])
    }
  }, [])

  const unarchive = useCallback(async (conversationId: string) => {
    await unarchiveConversation(conversationId)
    let restored: Conversation | undefined
    setArchivedConversations(prev => {
      restored = prev.find(c => c.id === conversationId)
      return prev.filter(c => c.id !== conversationId)
    })
    if (restored) {
      setConversations(prev => [{ ...restored!, archived: false }, ...prev.filter(c => c.id !== conversationId)])
    } else {
      void reload()
    }
  }, [reload])

  const setMuted = useCallback(async (conversationId: string, muted: boolean) => {
    await muteConversation(conversationId, muted)
    const patch = (list: Conversation[]) =>
      list.map(c => (c.id === conversationId ? { ...c, muted } : c))
    setConversations(patch)
    setArchivedConversations(patch)
  }, [])

  return {
    conversations,
    archivedConversations,
    setConversations,
    threads,
    setThreads,
    typingUsers,
    loading,
    error,
    reload,
    loadArchived,
    loadThread,
    send,
    signalTyping,
    startWithUser,
    openJourneyChat,
    acceptRequest,
    declineRequest,
    blockOtherUser,
    archive,
    unarchive,
    setMuted,
    streamConnected,
  }
}

export function useMessageUnreadCount(enabled: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    const poll = () => {
      void listConversations(false)
        .then(rows => setCount(rows.reduce((total, row) => total + row.unreadCount, 0)))
        .catch(() => undefined)
    }
    poll()
    const timer = window.setInterval(poll, UNREAD_POLL_MS)
    return () => window.clearInterval(timer)
  }, [enabled])

  return count
}
