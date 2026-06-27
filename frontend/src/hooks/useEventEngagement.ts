import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { EventListing } from '../utils/eventDisplay'

type EngagementOverride = {
  liked?: boolean
  likesCount?: number
  saved?: boolean
  savesCount?: number
}

export function useEventEngagement(events: EventListing[]) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [overrides, setOverrides] = useState<Map<number, EngagementOverride>>(new Map())
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    setOverrides(new Map())
  }, [events])

  useEffect(() => {
    if (!shareMsg) return
    const timer = window.setTimeout(() => setShareMsg(''), 1800)
    return () => window.clearTimeout(timer)
  }, [shareMsg])

  const likeMut = useMutation({
    mutationFn: (eventId: number) =>
      apiFetch<{ liked: boolean; likes_count: number }>(`/api/events/${eventId}/like/`, { method: 'POST' }),
    onSuccess: (data, eventId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        next.set(eventId, { ...next.get(eventId), liked: data.liked, likesCount: data.likes_count })
        return next
      })
      void qc.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const saveMut = useMutation({
    mutationFn: (eventId: number) =>
      apiFetch<{ saved: boolean; saves_count: number }>(`/api/events/${eventId}/save/`, { method: 'POST' }),
    onSuccess: (data, eventId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        next.set(eventId, { ...next.get(eventId), saved: data.saved, savesCount: data.saves_count })
        return next
      })
      void qc.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const isSaved = useCallback(
    (event: EventListing) => overrides.get(event.id)?.saved ?? Boolean(event.saved_by_me),
    [overrides],
  )

  const isLiked = useCallback(
    (event: EventListing) => overrides.get(event.id)?.liked ?? Boolean(event.liked_by_me),
    [overrides],
  )

  const likeCount = useCallback(
    (event: EventListing) => overrides.get(event.id)?.likesCount ?? event.likes_count ?? 0,
    [overrides],
  )

  const toggleLike = useCallback(
    (event: EventListing, clickEvent: MouseEvent) => {
      clickEvent.preventDefault()
      clickEvent.stopPropagation()
      if (!profile) return
      likeMut.mutate(event.id)
    },
    [likeMut, profile],
  )

  const toggleSave = useCallback(
    (event: EventListing, clickEvent: MouseEvent) => {
      clickEvent.preventDefault()
      clickEvent.stopPropagation()
      if (!profile) return
      saveMut.mutate(event.id)
    },
    [profile, saveMut],
  )

  const shareEvent = useCallback(async (event: EventListing, clickEvent: MouseEvent) => {
    clickEvent.preventDefault()
    clickEvent.stopPropagation()
    const url = `${window.location.origin}/events/${event.id}`
    const text = [event.title, event.venue].filter(Boolean).join(' · ')
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url })
        setShareMsg('Shared')
        return
      }
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Share failed')
    }
  }, [])

  const pendingIds = useMemo(
    () => new Set([...(likeMut.isPending && likeMut.variables ? [likeMut.variables] : []), ...(saveMut.isPending && saveMut.variables ? [saveMut.variables] : [])]),
    [likeMut.isPending, likeMut.variables, saveMut.isPending, saveMut.variables],
  )

  return {
    shareMsg,
    isSaved,
    isLiked,
    likeCount,
    toggleLike,
    toggleSave,
    shareEvent,
    pendingIds,
    requiresAuth: !profile,
  }
}
