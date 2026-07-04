import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../api/client'
import type { DmMessage } from './DmChatView'

export type ThreadMessage = DmMessage & {
  sender?: number
  read?: boolean
  pending?: boolean
  failed?: boolean
}

type MessagesPage = {
  results: ThreadMessage[]
  has_more: boolean
  next_before_id: number | null
}

type Options = {
  conversationId: string | number | undefined | null
  myUsername: string | undefined
  enabled?: boolean
  pageSize?: number
}

function messageSortKey(m: ThreadMessage): number {
  if (typeof m.id === 'number') return m.id
  if (m.created_at) {
    const t = Date.parse(m.created_at)
    if (!Number.isNaN(t)) return t
  }
  return 0
}

function mergeMessages(a: ThreadMessage[], b: ThreadMessage[]): ThreadMessage[] {
  const byId = new Map<string | number, ThreadMessage>()
  for (const m of a) byId.set(m.id, m)
  for (const m of b) {
    const existing = byId.get(m.id)
    if (existing?.pending && !m.pending) {
      byId.set(m.id, m)
    } else if (!existing || !existing.pending) {
      byId.set(m.id, m)
    }
  }
  return [...byId.values()].sort((x, y) => messageSortKey(x) - messageSortKey(y))
}

function refreshInboxBadges(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['conversations'] })
  void qc.invalidateQueries({ queryKey: ['messaging-unread-count'] })
}

export function useConversationThread({
  conversationId,
  myUsername,
  enabled = true,
  pageSize = 50,
}: Options) {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [olderMessages, setOlderMessages] = useState<ThreadMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const typingPingAt = useRef(0)
  const id = conversationId != null && conversationId !== '' ? String(conversationId) : ''
  const active = Boolean(enabled && id && myUsername)

  useEffect(() => {
    setOlderMessages([])
    setHasMore(false)
    setNextBeforeId(null)
  }, [id])

  const messagesQuery = useQuery({
    queryKey: ['msgs', id, pageSize],
    enabled: active,
    queryFn: () =>
      apiFetch<MessagesPage>(`/api/messaging/conversations/${id}/messages/?limit=${pageSize}`),
    refetchInterval: 4000,
  })

  const typingQuery = useQuery({
    queryKey: ['typing', id],
    enabled: active,
    queryFn: () =>
      apiFetch<{ typing: { id: number; username: string }[] }>(
        `/api/messaging/conversations/${id}/typing/`,
      ),
    refetchInterval: 2000,
  })

  useEffect(() => {
    const page = messagesQuery.data
    if (!page) return
    if (olderMessages.length === 0) {
      setHasMore(Boolean(page.has_more))
      setNextBeforeId(page.next_before_id ?? null)
    }
  }, [messagesQuery.data, olderMessages.length])

  // Mark received messages read when the thread is open.
  useEffect(() => {
    if (!active) return
    let cancelled = false
    void apiFetch<{ marked_read: number }>(`/api/messaging/conversations/${id}/read/`, {
      method: 'POST',
    })
      .then(() => {
        if (cancelled) return
        refreshInboxBadges(qc)
      })
      .catch(() => {
        /* non-fatal */
      })
    return () => {
      cancelled = true
    }
  }, [active, id, qc])

  const latestMessages = messagesQuery.data?.results ?? []
  const messages = useMemo(
    () => mergeMessages(olderMessages, latestMessages),
    [olderMessages, latestMessages],
  )

  const loadOlder = useCallback(async () => {
    if (!active || !hasMore || nextBeforeId == null || loadingOlder) return
    setLoadingOlder(true)
    try {
      const page = await apiFetch<MessagesPage>(
        `/api/messaging/conversations/${id}/messages/?limit=${pageSize}&before_id=${nextBeforeId}`,
      )
      setOlderMessages((prev) => mergeMessages(page.results, prev))
      setHasMore(Boolean(page.has_more))
      setNextBeforeId(page.next_before_id ?? null)
    } finally {
      setLoadingOlder(false)
    }
  }, [active, hasMore, id, loadingOlder, nextBeforeId, pageSize])

  const sendMut = useMutation({
    mutationFn: (text: string) =>
      apiFetch<ThreadMessage>(`/api/messaging/conversations/${id}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      }),
    onMutate: async (text) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const optimistic: ThreadMessage = {
        id: tempId,
        sender_username: myUsername!,
        body: text,
        created_at: new Date().toISOString(),
        read: true,
        pending: true,
      }
      await qc.cancelQueries({ queryKey: ['msgs', id, pageSize] })
      const previous = qc.getQueryData<MessagesPage>(['msgs', id, pageSize])
      qc.setQueryData<MessagesPage>(['msgs', id, pageSize], (old) => ({
        results: [...(old?.results ?? []), optimistic],
        has_more: old?.has_more ?? false,
        next_before_id: old?.next_before_id ?? null,
      }))
      setBody('')
      return { previous, tempId }
    },
    onError: (_err, text, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['msgs', id, pageSize], ctx.previous)
      }
      setBody((current) => (current.trim() ? current : text))
    },
    onSuccess: (serverMsg, _text, ctx) => {
      qc.setQueryData<MessagesPage>(['msgs', id, pageSize], (old) => {
        const results = (old?.results ?? []).filter((m) => m.id !== ctx?.tempId)
        if (!results.some((m) => m.id === serverMsg.id)) {
          results.push({ ...serverMsg, pending: false })
        }
        return {
          results,
          has_more: old?.has_more ?? false,
          next_before_id: old?.next_before_id ?? null,
        }
      })
      refreshInboxBadges(qc)
    },
  })

  function send() {
    const text = body.trim()
    if (!text || !active || sendMut.isPending) return
    sendMut.mutate(text)
  }

  function onBodyChange(value: string) {
    setBody(value)
    if (!active || !value.trim()) return
    const now = Date.now()
    if (now - typingPingAt.current < 1500) return
    typingPingAt.current = now
    void apiFetch(`/api/messaging/conversations/${id}/typing/`, { method: 'POST' }).catch(() => {
      /* non-fatal */
    })
  }

  const typingUsernames = (typingQuery.data?.typing ?? [])
    .map((row) => row.username)
    .filter((username) => username !== myUsername)

  return {
    messages,
    isLoading: messagesQuery.isLoading && !messagesQuery.data,
    body,
    setBody: onBodyChange,
    send,
    sending: sendMut.isPending,
    sendError: sendMut.isError,
    hasMore,
    loadOlder,
    loadingOlder,
    typingUsernames,
  }
}
