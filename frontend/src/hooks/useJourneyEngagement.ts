import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { MockTrip } from '../data/mockTrips'

type EngagementOverride = {
  liked?: boolean
  likesCount?: number
  saved?: boolean
  savesCount?: number
}

export function useJourneyEngagement(trips: MockTrip[]) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [overrides, setOverrides] = useState<Map<number, EngagementOverride>>(new Map())
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    setOverrides(new Map())
  }, [trips])

  useEffect(() => {
    if (!shareMsg) return
    const timer = window.setTimeout(() => setShareMsg(''), 1800)
    return () => window.clearTimeout(timer)
  }, [shareMsg])

  const likeMut = useMutation({
    mutationFn: (journeyId: number) =>
      apiFetch<{ liked: boolean; likes_count: number }>(`/api/journeys/${journeyId}/like/`, {
        method: 'POST',
      }),
    onSuccess: (data, journeyId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        next.set(journeyId, { ...next.get(journeyId), liked: data.liked, likesCount: data.likes_count })
        return next
      })
      void qc.invalidateQueries({ queryKey: ['journeys'] })
      void qc.invalidateQueries({ queryKey: ['journey', String(journeyId)] })
    },
  })

  const saveMut = useMutation({
    mutationFn: (journeyId: number) =>
      apiFetch<{ saved: boolean; saves_count: number }>(`/api/journeys/${journeyId}/save/`, {
        method: 'POST',
      }),
    onSuccess: (data, journeyId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        next.set(journeyId, { ...next.get(journeyId), saved: data.saved, savesCount: data.saves_count })
        return next
      })
      void qc.invalidateQueries({ queryKey: ['journeys'] })
      void qc.invalidateQueries({ queryKey: ['journey', String(journeyId)] })
    },
  })

  const isSaved = useCallback(
    (trip: MockTrip) => overrides.get(trip.id)?.saved ?? Boolean(trip.saved_by_me),
    [overrides],
  )

  const isLiked = useCallback(
    (trip: MockTrip) => overrides.get(trip.id)?.liked ?? Boolean(trip.liked_by_me),
    [overrides],
  )

  const likeCount = useCallback(
    (trip: MockTrip) => overrides.get(trip.id)?.likesCount ?? trip.likes_count ?? 0,
    [overrides],
  )

  const saveCount = useCallback(
    (trip: MockTrip) => overrides.get(trip.id)?.savesCount ?? trip.saves_count ?? 0,
    [overrides],
  )

  const likeTrip = useCallback(
    (trip: MockTrip) => {
      if (!profile) return
      likeMut.mutate(trip.id)
    },
    [likeMut, profile],
  )

  const saveTrip = useCallback(
    (trip: MockTrip) => {
      if (!profile) return
      saveMut.mutate(trip.id)
    },
    [profile, saveMut],
  )

  const shareTrip = useCallback(async (trip: MockTrip) => {
    const url = `${window.location.origin}/journeys/${trip.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: trip.title, text: trip.summary, url })
        setShareMsg('Shared')
        return
      }
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Share failed')
    }
  }, [])

  const toggleLike = useCallback(
    (trip: MockTrip, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      likeTrip(trip)
    },
    [likeTrip],
  )

  const toggleSave = useCallback(
    (trip: MockTrip, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      saveTrip(trip)
    },
    [saveTrip],
  )

  const shareJourney = useCallback(
    async (trip: MockTrip, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      await shareTrip(trip)
    },
    [shareTrip],
  )

  const pendingIds = useMemo(
    () =>
      new Set([
        ...(likeMut.isPending && likeMut.variables ? [likeMut.variables] : []),
        ...(saveMut.isPending && saveMut.variables ? [saveMut.variables] : []),
      ]),
    [likeMut.isPending, likeMut.variables, saveMut.isPending, saveMut.variables],
  )

  return {
    shareMsg,
    isSaved,
    isLiked,
    likeCount,
    saveCount,
    toggleLike,
    toggleSave,
    shareJourney,
    likeTrip,
    saveTrip,
    shareTrip,
    pendingIds,
    requiresAuth: !profile,
  }
}
