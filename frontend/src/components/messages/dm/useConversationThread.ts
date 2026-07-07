import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../api/client'
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder'
import { formatApiErrorMessage } from '../../../utils/apiErrorMessage'
import type { DmMessageReplyTo } from './dmMessageUtils'
import { dmMessageDeletePath, dmMessageForwardPath } from './dmMessageUtils'
import type { DmMessageDeleteScope } from './dmMessageUtils'

type DetachedMediaUrls = {
  image?: string | null
  video?: string | null
  audio?: string | null
}

function revokeDetachedMedia(urls?: DetachedMediaUrls) {
  if (!urls) return
  for (const url of [urls.image, urls.video, urls.audio]) {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
  }
}

export type DmMessage = {
  id: number | string
  sender_username: string
  body: string
  image?: string | null
  video?: string | null
  audio?: string | null
  created_at?: string
  is_automated?: boolean
  reply_to?: DmMessageReplyTo | null
  forwarded_from?: DmMessageReplyTo | null
  is_deleted?: boolean
  can_unsend?: boolean
  pending?: boolean
  failed?: boolean
}

export type ThreadMessage = DmMessage & {
  sender?: number
  read?: boolean
  local_image?: string | null
  local_video?: string | null
  local_audio?: string | null
  audio_duration_sec?: number | null
}

export type DmSendPayload = {
  body: string
  imageFile?: File | null
  videoFile?: File | null
  audioFile?: File | null
  audioDurationSec?: number
  replyToId?: number | null
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
    if (existing?.pending && !m.pending) byId.set(m.id, m)
    else if (!existing || !existing.pending) byId.set(m.id, m)
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [olderMessages, setOlderMessages] = useState<ThreadMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [replyTo, setReplyTo] = useState<ThreadMessage | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const typingPingAt = useRef(0)
  const voice = useVoiceRecorder()
  const id = conversationId != null && conversationId !== '' ? String(conversationId) : ''
  const active = Boolean(enabled && id && myUsername)

  useEffect(() => {
    setOlderMessages([])
    setHasMore(false)
    setNextBeforeId(null)
    setReplyTo(null)
  }, [id])

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      if (videoPreview) URL.revokeObjectURL(videoPreview)
    },
    [imagePreview, videoPreview],
  )

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

  const clearMedia = (opts?: { retainBlobUrls?: boolean }) => {
    if (!opts?.retainBlobUrls) {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      if (videoPreview) URL.revokeObjectURL(videoPreview)
      voice.clearAudio()
    } else {
      voice.releaseAudioWithoutRevoke()
    }
    setImageFile(null)
    setImagePreview(null)
    setVideoFile(null)
    setVideoPreview(null)
  }

  const patchMessage = (messageId: number | string, patch: Partial<ThreadMessage>) => {
    qc.setQueryData<MessagesPage>(['msgs', id, pageSize], (old) => {
      if (!old) return old
      return {
        ...old,
        results: old.results.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      }
    })
    setOlderMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)))
  }

  const removeMessage = (messageId: number | string) => {
    qc.setQueryData<MessagesPage>(['msgs', id, pageSize], (old) => {
      if (!old) return old
      return {
        ...old,
        results: old.results.filter((m) => m.id !== messageId),
      }
    })
    setOlderMessages((prev) => prev.filter((m) => m.id !== messageId))
  }

  const deleteMut = useMutation({
    mutationFn: ({
      messageId,
      scope,
    }: {
      messageId: number | string
      scope: DmMessageDeleteScope
    }) =>
      apiFetch<{ scope: DmMessageDeleteScope; removed?: boolean; message?: ThreadMessage }>(
        dmMessageDeletePath(id, messageId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope }),
        },
      ),
    onSuccess: (data, vars) => {
      if (data.scope === 'me') {
        removeMessage(vars.messageId)
        return
      }
      if (data.message) {
        patchMessage(vars.messageId, {
          ...data.message,
          body: '',
          image: null,
          video: null,
          audio: null,
          is_deleted: true,
        })
      }
      refreshInboxBadges(qc)
    },
  })

  const forwardMut = useMutation({
    mutationFn: ({
      messageId,
      toConversationId,
    }: {
      messageId: number | string
      toConversationId: number
    }) =>
      apiFetch<{ message: ThreadMessage; to_conversation_id: number }>(
        dmMessageForwardPath(id, messageId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to_conversation_id: toConversationId }),
        },
      ),
    onSuccess: (data) => {
      if (String(data.to_conversation_id) === id) {
        qc.setQueryData<MessagesPage>(['msgs', id, pageSize], (old) => ({
          results: [...(old?.results ?? []), data.message],
          has_more: old?.has_more ?? false,
          next_before_id: old?.next_before_id ?? null,
        }))
      }
      refreshInboxBadges(qc)
    },
  })

  const sendMut = useMutation({
    mutationFn: (payload: DmSendPayload) => {
      const form = new FormData()
      if (payload.body.trim()) form.set('body', payload.body.trim())
      if (payload.imageFile) form.set('image', payload.imageFile)
      if (payload.videoFile) form.set('video', payload.videoFile)
      if (payload.audioFile) form.set('audio', payload.audioFile)
      if (payload.replyToId != null) form.set('reply_to_id', String(payload.replyToId))
      return apiFetch<ThreadMessage>(`/api/messaging/conversations/${id}/messages/`, {
        method: 'POST',
        body: form,
      })
    },
    onMutate: async (payload) => {
      const tempId = `temp-${Date.now()}`
      const optimistic: ThreadMessage = {
        id: tempId,
        sender_username: myUsername!,
        body: payload.body.trim(),
        created_at: new Date().toISOString(),
        read: true,
        pending: true,
        local_image: imagePreview,
        local_video: videoPreview,
        local_audio: voice.audioPreview,
        audio_duration_sec: voice.durationSec || null,
        reply_to: replyTo
          ? {
              id: Number(replyTo.id),
              sender_username: replyTo.sender_username,
              body: replyTo.body,
              image: replyTo.image ?? replyTo.local_image ?? null,
              video: replyTo.video ?? replyTo.local_video ?? null,
              audio: replyTo.audio ?? replyTo.local_audio ?? null,
            }
          : null,
      }
      await qc.cancelQueries({ queryKey: ['msgs', id, pageSize] })
      const previous = qc.getQueryData<MessagesPage>(['msgs', id, pageSize])
      qc.setQueryData<MessagesPage>(['msgs', id, pageSize], (old) => ({
        results: [...(old?.results ?? []), optimistic],
        has_more: old?.has_more ?? false,
        next_before_id: old?.next_before_id ?? null,
      }))
      const detachedMedia: DetachedMediaUrls = {
        image: imagePreview,
        video: videoPreview,
        audio: voice.audioPreview,
      }
      setBody('')
      clearMedia({ retainBlobUrls: true })
      setReplyTo(null)
      return { previous, tempId, payload, detachedMedia }
    },
    onError: (err, _payload, ctx) => {
      if (ctx?.previous) qc.setQueryData(['msgs', id, pageSize], ctx.previous)
      if (ctx?.payload) {
        setBody(ctx.payload.body)
        if (ctx.payload.imageFile) {
          setImageFile(ctx.payload.imageFile)
          setImagePreview(ctx.detachedMedia?.image ?? null)
        }
        if (ctx.payload.videoFile) {
          setVideoFile(ctx.payload.videoFile)
          setVideoPreview(ctx.detachedMedia?.video ?? null)
        }
        if (ctx.payload.audioFile && ctx.detachedMedia?.audio) {
          voice.restoreAudio(
            ctx.payload.audioFile,
            ctx.detachedMedia.audio,
            ctx.payload.audioDurationSec ?? 0,
          )
        }
      }
      setSendError(formatApiErrorMessage(err, 'Could not send message.'))
    },
    onSuccess: (serverMsg, _payload, ctx) => {
      revokeDetachedMedia(ctx?.detachedMedia)
      setSendError(null)
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
    if ((!text && !imageFile && !videoFile && !voice.audioFile) || !active || sendMut.isPending || !myUsername) {
      return
    }
    setSendError(null)
    const replyToId =
      replyTo && typeof replyTo.id === 'number' ? replyTo.id : replyTo ? Number(replyTo.id) : null
    sendMut.mutate({
      body: text,
      imageFile,
      videoFile,
      audioFile: voice.audioFile,
      audioDurationSec: voice.durationSec,
      replyToId: Number.isFinite(replyToId) ? replyToId : null,
    })
  }

  function deleteMessage(messageId: number | string, scope: DmMessageDeleteScope) {
    if (!active || deleteMut.isPending || (typeof messageId === 'string' && messageId.startsWith('temp-'))) return
    deleteMut.mutate({ messageId, scope })
  }

  function forwardMessage(messageId: number | string, toConversationId: number) {
    if (!active || forwardMut.isPending || (typeof messageId === 'string' && messageId.startsWith('temp-'))) return
    forwardMut.mutate({ messageId, toConversationId })
  }

  function onImagePick(file: File | null, preview: string | null) {
    if (imagePreview && imagePreview !== preview) URL.revokeObjectURL(imagePreview)
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    voice.clearAudio()
    setImageFile(file)
    setImagePreview(preview)
    setVideoFile(null)
    setVideoPreview(null)
  }

  function onVideoPick(file: File | null, preview: string | null) {
    if (videoPreview && videoPreview !== preview) URL.revokeObjectURL(videoPreview)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    voice.clearAudio()
    setVideoFile(file)
    setVideoPreview(preview)
    setImageFile(null)
    setImagePreview(null)
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

  const canSendNow = Boolean(body.trim() || imageFile || videoFile || voice.audioFile)

  return {
    messages,
    isLoading: messagesQuery.isLoading && !messagesQuery.data,
    body,
    setBody: onBodyChange,
    send,
    sending: sendMut.isPending,
    sendError,
    clearSendError: () => setSendError(null),
    canSendNow,
    imagePreview,
    videoPreview,
    onImagePick,
    onVideoPick,
    hasMore,
    loadOlder,
    loadingOlder,
    typingUsernames,
    replyTo,
    setReplyTo,
    clearReplyTo: () => setReplyTo(null),
    deleteMessage,
    deleting: deleteMut.isPending,
    forwardMessage,
    forwarding: forwardMut.isPending,
    voice,
  }
}
