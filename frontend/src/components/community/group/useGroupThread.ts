import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../api/client'
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder'
import type { GroupMessage, GroupMessageDeleteScope, GroupMessageReaction, GroupMessagesPage } from '../../../utils/communityGroups'
import {
  groupMessageDeletePath,
  groupMessageForwardPath,
  groupMessageReactPath,
  groupMessagesPath,
} from '../../../utils/communityGroups'

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

export type GroupThreadMessage = GroupMessage & {
  pending?: boolean
  failed?: boolean
  local_image?: string | null
  local_video?: string | null
  local_audio?: string | null
  audio_duration_sec?: number | null
}

export type GroupSendPayload = {
  body: string
  imageFile?: File | null
  videoFile?: File | null
  audioFile?: File | null
  replyToId?: number | null
}

type Options = {
  slug: string | undefined
  myUsername?: string
  enabled?: boolean
  pageSize?: number
}

function messageSortKey(m: GroupThreadMessage): number {
  if (typeof m.id === 'number') return m.id
  if (m.created_at) {
    const t = Date.parse(m.created_at)
    if (!Number.isNaN(t)) return t
  }
  return 0
}

function mergeMessages(a: GroupThreadMessage[], b: GroupThreadMessage[]): GroupThreadMessage[] {
  const byId = new Map<string | number, GroupThreadMessage>()
  for (const m of a) byId.set(m.id, m)
  for (const m of b) {
    const existing = byId.get(m.id)
    if (existing?.pending && !m.pending) byId.set(m.id, m)
    else if (!existing || !existing.pending) byId.set(m.id, m)
  }
  return [...byId.values()].sort((x, y) => messageSortKey(x) - messageSortKey(y))
}

export function useGroupThread({ slug, myUsername, enabled = true, pageSize = 50 }: Options) {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [olderMessages, setOlderMessages] = useState<GroupThreadMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [replyTo, setReplyTo] = useState<GroupThreadMessage | null>(null)
  const voice = useVoiceRecorder()
  const active = Boolean(enabled && slug)

  useEffect(() => {
    setOlderMessages([])
    setHasMore(false)
    setNextBeforeId(null)
    setReplyTo(null)
  }, [slug])

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      if (videoPreview) URL.revokeObjectURL(videoPreview)
    },
    [imagePreview, videoPreview],
  )

  const messagesQuery = useQuery({
    queryKey: ['group-msgs', slug, pageSize],
    enabled: active,
    queryFn: () => apiFetch<GroupMessagesPage>(groupMessagesPath(slug!, { limit: pageSize })),
    refetchInterval: 4000,
  })

  useEffect(() => {
    const page = messagesQuery.data
    if (!page) return
    if (olderMessages.length === 0) {
      setHasMore(Boolean(page.has_more))
      setNextBeforeId(page.next_before_id ?? null)
    }
    void qc.invalidateQueries({ queryKey: ['messaging-unread-count'] })
    void qc.invalidateQueries({ queryKey: ['group-inbox'] })
  }, [messagesQuery.data, olderMessages.length, qc])

  const latestMessages = messagesQuery.data?.results ?? []
  const messages = useMemo(
    () => mergeMessages(olderMessages, latestMessages),
    [olderMessages, latestMessages],
  )

  const loadOlder = useCallback(async () => {
    if (!active || !hasMore || nextBeforeId == null || loadingOlder || !slug) return
    setLoadingOlder(true)
    try {
      const page = await apiFetch<GroupMessagesPage>(
        groupMessagesPath(slug, { limit: pageSize, beforeId: nextBeforeId }),
      )
      setOlderMessages((prev) => mergeMessages(page.results, prev))
      setHasMore(Boolean(page.has_more))
      setNextBeforeId(page.next_before_id ?? null)
    } finally {
      setLoadingOlder(false)
    }
  }, [active, hasMore, loadingOlder, nextBeforeId, pageSize, slug])

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

  const patchMessage = (messageId: number | string, patch: Partial<GroupThreadMessage>) => {
    qc.setQueryData<GroupMessagesPage>(['group-msgs', slug, pageSize], (old) => {
      if (!old) return old
      return {
        ...old,
        results: old.results.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      }
    })
    setOlderMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)))
  }

  const removeMessage = (messageId: number | string) => {
    qc.setQueryData<GroupMessagesPage>(['group-msgs', slug, pageSize], (old) => {
      if (!old) return old
      return {
        ...old,
        results: old.results.filter((m) => m.id !== messageId),
      }
    })
    setOlderMessages((prev) => prev.filter((m) => m.id !== messageId))
  }

  const patchMessageReactions = (messageId: number | string, reactions: GroupMessageReaction[]) => {
    patchMessage(messageId, { reactions })
  }

  const reactMut = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number | string; emoji: string }) =>
      apiFetch<{ reactions: GroupMessageReaction[] }>(groupMessageReactPath(slug!, messageId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      }),
    onSuccess: (data, vars) => {
      patchMessageReactions(vars.messageId, data.reactions)
    },
  })

  const deleteMut = useMutation({
    mutationFn: ({
      messageId,
      scope,
    }: {
      messageId: number | string
      scope: GroupMessageDeleteScope
    }) =>
      apiFetch<{ scope: GroupMessageDeleteScope; removed?: boolean; message?: GroupMessage }>(
        groupMessageDeletePath(slug!, messageId),
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
          reactions: [],
        })
      }
      void qc.invalidateQueries({ queryKey: ['group-inbox'] })
      void qc.invalidateQueries({ queryKey: ['community-groups'] })
    },
  })

  const forwardMut = useMutation({
    mutationFn: ({
      messageId,
      toGroupSlug,
    }: {
      messageId: number | string
      toGroupSlug: string
    }) =>
      apiFetch<{ message: GroupMessage; to_group_slug: string }>(
        groupMessageForwardPath(slug!, messageId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to_group_slug: toGroupSlug }),
        },
      ),
    onSuccess: (data) => {
      if (data.to_group_slug === slug) {
        qc.setQueryData<GroupMessagesPage>(['group-msgs', slug, pageSize], (old) => ({
          results: [...(old?.results ?? []), data.message],
          has_more: old?.has_more ?? false,
          next_before_id: old?.next_before_id ?? null,
        }))
      }
      void qc.invalidateQueries({ queryKey: ['group-inbox'] })
      void qc.invalidateQueries({ queryKey: ['community-groups'] })
    },
  })

  const sendMut = useMutation({
    mutationFn: (payload: GroupSendPayload) => {
      const form = new FormData()
      if (payload.body.trim()) form.set('body', payload.body.trim())
      if (payload.imageFile) form.set('image', payload.imageFile)
      if (payload.videoFile) form.set('video', payload.videoFile)
      if (payload.audioFile) form.set('audio', payload.audioFile)
      if (payload.replyToId != null) form.set('reply_to_id', String(payload.replyToId))
      return apiFetch<GroupMessage>(groupMessagesPath(slug!), { method: 'POST', body: form })
    },
    onMutate: async (payload) => {
      const tempId = `temp-${Date.now()}`
      const optimistic: GroupThreadMessage = {
        id: tempId,
        sender_username: myUsername ?? '',
        body: payload.body.trim(),
        created_at: new Date().toISOString(),
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
        reactions: [],
      }
      await qc.cancelQueries({ queryKey: ['group-msgs', slug, pageSize] })
      const previous = qc.getQueryData<GroupMessagesPage>(['group-msgs', slug, pageSize])
      qc.setQueryData<GroupMessagesPage>(['group-msgs', slug, pageSize], (old) => ({
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
    onError: (_err, _payload, ctx) => {
      revokeDetachedMedia(ctx?.detachedMedia)
      if (ctx?.previous) qc.setQueryData(['group-msgs', slug, pageSize], ctx.previous)
      if (ctx?.payload) {
        setBody(ctx.payload.body)
      }
    },
    onSuccess: (serverMsg, _payload, ctx) => {
      revokeDetachedMedia(ctx?.detachedMedia)
      qc.setQueryData<GroupMessagesPage>(['group-msgs', slug, pageSize], (old) => {
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
      void qc.invalidateQueries({ queryKey: ['community-groups'] })
      void qc.invalidateQueries({ queryKey: ['group-inbox'] })
      void qc.invalidateQueries({ queryKey: ['messaging-unread-count'] })
    },
  })

  function send() {
    const text = body.trim()
    if ((!text && !imageFile && !videoFile && !voice.audioFile) || !active || sendMut.isPending || !myUsername) return
    const replyToId =
      replyTo && typeof replyTo.id === 'number' ? replyTo.id : replyTo ? Number(replyTo.id) : null
    sendMut.mutate({
      body: text,
      imageFile,
      videoFile,
      audioFile: voice.audioFile,
      replyToId: Number.isFinite(replyToId) ? replyToId : null,
    })
  }

  function react(messageId: number | string, emoji: string) {
    if (!active || reactMut.isPending || typeof messageId === 'string' && messageId.startsWith('temp-')) return
    reactMut.mutate({ messageId, emoji })
  }

  function deleteMessage(messageId: number | string, scope: GroupMessageDeleteScope) {
    if (!active || deleteMut.isPending || typeof messageId === 'string' && messageId.startsWith('temp-')) return
    deleteMut.mutate({ messageId, scope })
  }

  function forwardMessage(messageId: number | string, toGroupSlug: string) {
    if (!active || forwardMut.isPending || typeof messageId === 'string' && messageId.startsWith('temp-')) return
    forwardMut.mutate({ messageId, toGroupSlug })
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

  const canSendNow = Boolean(body.trim() || imageFile || videoFile || voice.audioFile)

  return {
    messages,
    isLoading: messagesQuery.isLoading && !messagesQuery.data,
    body,
    setBody,
    send,
    sending: sendMut.isPending,
    canSendNow,
    imagePreview,
    videoPreview,
    onImagePick,
    onVideoPick,
    clearMedia,
    hasMore,
    loadOlder,
    loadingOlder,
    error: messagesQuery.error,
    replyTo,
    setReplyTo,
    clearReplyTo: () => setReplyTo(null),
    react,
    reacting: reactMut.isPending,
    deleteMessage,
    deleting: deleteMut.isPending,
    forwardMessage,
    forwarding: forwardMut.isPending,
    voice,
  }
}
