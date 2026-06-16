import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import type { MockTrip } from '../data/mockTrips'

const STORAGE_KEY = 'delve:saved-journeys'

function loadSavedIds(trips: MockTrip[]) {
  const ids = new Set<number>()
  trips.forEach((trip) => {
    if (trip.saved_by_me) ids.add(trip.id)
  })
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return ids
    const parsed = JSON.parse(raw) as number[]
    if (Array.isArray(parsed)) parsed.forEach((id) => ids.add(id))
  } catch {
    // ignore invalid storage
  }
  return ids
}

function persistSavedIds(ids: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function useJourneyEngagement(trips: MockTrip[]) {
  const initialLiked = useMemo(() => new Set(trips.filter((trip) => trip.liked_by_me).map((trip) => trip.id)), [trips])
  const [likedIds, setLikedIds] = useState<Set<number>>(() => new Set(initialLiked))
  const [savedIds, setSavedIds] = useState<Set<number>>(() => loadSavedIds(trips))
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    setLikedIds(new Set(trips.filter((trip) => trip.liked_by_me).map((trip) => trip.id)))
    setSavedIds(loadSavedIds(trips))
  }, [trips])

  useEffect(() => {
    if (!shareMsg) return
    const timer = window.setTimeout(() => setShareMsg(''), 1800)
    return () => window.clearTimeout(timer)
  }, [shareMsg])

  const isSaved = useCallback((trip: MockTrip) => savedIds.has(trip.id), [savedIds])

  const isLiked = useCallback((trip: MockTrip) => likedIds.has(trip.id), [likedIds])

  const likeCount = useCallback(
    (trip: MockTrip) => {
      const initiallyLiked = trip.liked_by_me
      const nowLiked = likedIds.has(trip.id)
      let count = trip.likes_count
      if (initiallyLiked && !nowLiked) count -= 1
      if (!initiallyLiked && nowLiked) count += 1
      return Math.max(0, count)
    },
    [likedIds],
  )

  const saveCount = useCallback(
    (trip: MockTrip) => {
      const initiallySaved = trip.saved_by_me
      const nowSaved = savedIds.has(trip.id)
      let count = trip.saves_count
      if (initiallySaved && !nowSaved) count -= 1
      if (!initiallySaved && nowSaved) count += 1
      return Math.max(0, count)
    },
    [savedIds],
  )

  const toggleLike = useCallback((trip: MockTrip, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (next.has(trip.id)) next.delete(trip.id)
      else next.add(trip.id)
      return next
    })
  }, [])

  const toggleSave = useCallback((trip: MockTrip, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (next.has(trip.id)) next.delete(trip.id)
      else next.add(trip.id)
      persistSavedIds(next)
      return next
    })
  }, [])

  const shareJourney = useCallback(async (trip: MockTrip, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
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

  return {
    shareMsg,
    isSaved,
    isLiked,
    likeCount,
    saveCount,
    toggleLike,
    toggleSave,
    shareJourney,
  }
}
