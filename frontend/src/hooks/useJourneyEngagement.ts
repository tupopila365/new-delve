import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { MockTrip } from '../data/mockTrips'
import { journeyPermalinkUrl } from '../utils/journeyPermalink'

type EngagementOverride = {
  liked?: boolean
  likesCount?: number
  saved?: boolean
  savesCount?: number
}

type LikeContext = { prevLiked: boolean; prevCount: number }
type SaveContext = { prevSaved: boolean; prevCount: number }

function readBase(trip: MockTrip | undefined, override: EngagementOverride | undefined) {
  return {
    liked: override?.liked ?? Boolean(trip?.liked_by_me),
    likesCount: override?.likesCount ?? trip?.likes_count ?? 0,
    saved: override?.saved ?? Boolean(trip?.saved_by_me),
    savesCount: override?.savesCount ?? trip?.saves_count ?? 0,
  }
}

export function useJourneyEngagement(trips: MockTrip[]) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [overrides, setOverrides] = useState<Map<number, EngagementOverride>>(new Map())
  const [shareMsg, setShareMsg] = useState('')
  const tripIdsKey = useMemo(() => trips.map((t) => t.id).join(','), [trips])
  const tripsById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips])

  // Only clear local toggles when the set of journeys changes — not on every new array ref.
  useEffect(() => {
    setOverrides(new Map())
  }, [tripIdsKey])

  useEffect(() => {
    if (!shareMsg) return
    const timer = window.setTimeout(() => setShareMsg(''), 1800)
    return () => window.clearTimeout(timer)
  }, [shareMsg])

  const patchOverride = useCallback((journeyId: number, patch: EngagementOverride) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(journeyId, { ...next.get(journeyId), ...patch })
      return next
    })
  }, [])

  const likeMut = useMutation({
    mutationFn: (journeyId: number) =>
      apiFetch<{ liked: boolean; likes_count: number }>(`/api/journeys/${journeyId}/like/`, {
        method: 'POST',
      }),
    onMutate: (journeyId): LikeContext => {
      let ctx: LikeContext = { prevLiked: false, prevCount: 0 }
      setOverrides((prev) => {
        const base = readBase(tripsById.get(journeyId), prev.get(journeyId))
        ctx = { prevLiked: base.liked, prevCount: base.likesCount }
        const nextLiked = !base.liked
        const next = new Map(prev)
        next.set(journeyId, {
          ...prev.get(journeyId),
          liked: nextLiked,
          likesCount: Math.max(0, base.likesCount + (nextLiked ? 1 : -1)),
        })
        return next
      })
      return ctx
    },
    onSuccess: (data, journeyId) => {
      patchOverride(journeyId, { liked: data.liked, likesCount: data.likes_count })
      void qc.invalidateQueries({ queryKey: ['journeys'] })
      void qc.invalidateQueries({ queryKey: ['journey', String(journeyId)] })
    },
    onError: (_err, journeyId, ctx) => {
      if (ctx) {
        patchOverride(journeyId, { liked: ctx.prevLiked, likesCount: ctx.prevCount })
      }
      setShareMsg('Could not update like')
    },
  })

  const saveMut = useMutation({
    mutationFn: (journeyId: number) =>
      apiFetch<{ saved: boolean; saves_count: number }>(`/api/journeys/${journeyId}/save/`, {
        method: 'POST',
      }),
    onMutate: (journeyId): SaveContext => {
      let ctx: SaveContext = { prevSaved: false, prevCount: 0 }
      setOverrides((prev) => {
        const base = readBase(tripsById.get(journeyId), prev.get(journeyId))
        ctx = { prevSaved: base.saved, prevCount: base.savesCount }
        const nextSaved = !base.saved
        const next = new Map(prev)
        next.set(journeyId, {
          ...prev.get(journeyId),
          saved: nextSaved,
          savesCount: Math.max(0, base.savesCount + (nextSaved ? 1 : -1)),
        })
        return next
      })
      return ctx
    },
    onSuccess: (data, journeyId) => {
      patchOverride(journeyId, { saved: data.saved, savesCount: data.saves_count })
      setShareMsg(data.saved ? 'Saved' : 'Removed from saved')
      void qc.invalidateQueries({ queryKey: ['journeys'] })
      void qc.invalidateQueries({ queryKey: ['journey', String(journeyId)] })
    },
    onError: (_err, journeyId, ctx) => {
      if (ctx) {
        patchOverride(journeyId, { saved: ctx.prevSaved, savesCount: ctx.prevCount })
      }
      setShareMsg('Could not update save')
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

  const isLikeBusy = useCallback(
    (tripId: number) => likeMut.isPending && likeMut.variables === tripId,
    [likeMut.isPending, likeMut.variables],
  )

  const isSaveBusy = useCallback(
    (tripId: number) => saveMut.isPending && saveMut.variables === tripId,
    [saveMut.isPending, saveMut.variables],
  )

  const requireAuth = useCallback(() => {
    if (profile) return true
    navigate('/login')
    return false
  }, [navigate, profile])

  const likeTrip = useCallback(
    (trip: MockTrip) => {
      if (!requireAuth()) return
      if (isLikeBusy(trip.id)) return
      likeMut.mutate(trip.id)
    },
    [isLikeBusy, likeMut, requireAuth],
  )

  const saveTrip = useCallback(
    (trip: MockTrip) => {
      if (!requireAuth()) return
      if (isSaveBusy(trip.id)) return
      saveMut.mutate(trip.id)
    },
    [isSaveBusy, requireAuth, saveMut],
  )

  const shareTrip = useCallback(async (trip: MockTrip) => {
    const url = journeyPermalinkUrl(trip.id)
    try {
      // Prefer native share sheet when available ("send"), else Delvers-style copy.
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: trip.title, text: trip.summary, url })
          setShareMsg('Shared')
          return
        } catch (err) {
          // User cancelled — don't treat as failure.
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
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
    isLikeBusy,
    isSaveBusy,
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
