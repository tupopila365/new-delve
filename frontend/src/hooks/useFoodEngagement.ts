import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { FoodVenueListing } from '../utils/foodListing'

type EngagementVenue = Pick<
  FoodVenueListing,
  'id' | 'name' | 'liked_by_me' | 'likes_count' | 'saved_by_me' | 'saves_count'
>

type EngagementOverride = {
  liked?: boolean
  likesCount?: number
  saved?: boolean
  savesCount?: number
}

export function useFoodEngagement(venues: EngagementVenue[] = []) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [overrides, setOverrides] = useState<Map<number, EngagementOverride>>(new Map())
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    setOverrides(new Map())
  }, [venues])

  useEffect(() => {
    if (!shareMsg) return
    const timer = window.setTimeout(() => setShareMsg(''), 1800)
    return () => window.clearTimeout(timer)
  }, [shareMsg])

  const likeMut = useMutation({
    mutationFn: (venueId: number) =>
      apiFetch<{ liked: boolean; likes_count: number }>(`/api/food/venues/${venueId}/like/`, {
        method: 'POST',
      }),
    onMutate: async (venueId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        const current = next.get(venueId) ?? {}
        const venue = venues.find((v) => v.id === venueId)
        const liked = !(current.liked ?? Boolean(venue?.liked_by_me))
        const baseCount = current.likesCount ?? venue?.likes_count ?? 0
        next.set(venueId, {
          ...current,
          liked,
          likesCount: Math.max(0, baseCount + (liked ? 1 : -1)),
        })
        return next
      })
    },
    onSuccess: (data, venueId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        next.set(venueId, { ...next.get(venueId), liked: data.liked, likesCount: data.likes_count })
        return next
      })
      void qc.invalidateQueries({ queryKey: ['food'] })
      void qc.invalidateQueries({ queryKey: ['saved-food'] })
    },
    onError: (_err, venueId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        next.delete(venueId)
        return next
      })
    },
  })

  const saveMut = useMutation({
    mutationFn: (venueId: number) =>
      apiFetch<{ saved: boolean; saves_count: number }>(`/api/food/venues/${venueId}/save/`, {
        method: 'POST',
      }),
    onMutate: async (venueId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        const current = next.get(venueId) ?? {}
        const venue = venues.find((v) => v.id === venueId)
        const saved = !(current.saved ?? Boolean(venue?.saved_by_me))
        const baseCount = current.savesCount ?? venue?.saves_count ?? 0
        next.set(venueId, {
          ...current,
          saved,
          savesCount: Math.max(0, baseCount + (saved ? 1 : -1)),
        })
        return next
      })
    },
    onSuccess: (data, venueId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        next.set(venueId, { ...next.get(venueId), saved: data.saved, savesCount: data.saves_count })
        return next
      })
      void qc.invalidateQueries({ queryKey: ['food'] })
      void qc.invalidateQueries({ queryKey: ['saved-food'] })
    },
    onError: (_err, venueId) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        next.delete(venueId)
        return next
      })
    },
  })

  const isSaved = useCallback(
    (venue: EngagementVenue) => overrides.get(venue.id)?.saved ?? Boolean(venue.saved_by_me),
    [overrides],
  )

  const isLiked = useCallback(
    (venue: EngagementVenue) => overrides.get(venue.id)?.liked ?? Boolean(venue.liked_by_me),
    [overrides],
  )

  const likeCount = useCallback(
    (venue: EngagementVenue) => overrides.get(venue.id)?.likesCount ?? venue.likes_count ?? 0,
    [overrides],
  )

  const saveCount = useCallback(
    (venue: EngagementVenue) => overrides.get(venue.id)?.savesCount ?? venue.saves_count ?? 0,
    [overrides],
  )

  const isLikeBusy = useCallback(
    (venueId: number) => likeMut.isPending && likeMut.variables === venueId,
    [likeMut.isPending, likeMut.variables],
  )

  const isSaveBusy = useCallback(
    (venueId: number) => saveMut.isPending && saveMut.variables === venueId,
    [saveMut.isPending, saveMut.variables],
  )

  const likeVenue = useCallback(
    (venue: EngagementVenue) => {
      if (!profile) return
      likeMut.mutate(venue.id)
    },
    [likeMut, profile],
  )

  const saveVenue = useCallback(
    (venue: EngagementVenue) => {
      if (!profile) return
      saveMut.mutate(venue.id)
    },
    [profile, saveMut],
  )

  const shareVenuePlain = useCallback(async (venue: EngagementVenue) => {
    const url = `${window.location.origin}/food/${venue.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: venue.name, url })
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
    (venue: EngagementVenue, clickEvent: MouseEvent) => {
      clickEvent.preventDefault()
      clickEvent.stopPropagation()
      likeVenue(venue)
    },
    [likeVenue],
  )

  const toggleSave = useCallback(
    (venue: EngagementVenue, clickEvent: MouseEvent) => {
      clickEvent.preventDefault()
      clickEvent.stopPropagation()
      saveVenue(venue)
    },
    [saveVenue],
  )

  const shareVenue = useCallback(
    async (venue: EngagementVenue, clickEvent: MouseEvent) => {
      clickEvent.preventDefault()
      clickEvent.stopPropagation()
      await shareVenuePlain(venue)
    },
    [shareVenuePlain],
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
    likeVenue,
    saveVenue,
    shareVenuePlain,
    toggleLike,
    toggleSave,
    shareVenue,
    pendingIds,
    requiresAuth: !profile,
  }
}
