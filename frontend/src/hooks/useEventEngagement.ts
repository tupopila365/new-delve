import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import type { EventListing } from '../utils/eventDisplay'

const STORAGE_KEY = 'delve:saved-events'

function loadSavedIds(events: EventListing[]) {
  const ids = new Set<number>()
  events.forEach((event) => {
    if (event.saved_by_me) ids.add(event.id)
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

export function useEventEngagement(events: EventListing[]) {
  const initialLiked = useMemo(
    () => new Set(events.filter((event) => event.liked_by_me).map((event) => event.id)),
    [events],
  )
  const [likedIds, setLikedIds] = useState<Set<number>>(() => new Set(initialLiked))
  const [savedIds, setSavedIds] = useState<Set<number>>(() => loadSavedIds(events))
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    setLikedIds(new Set(events.filter((event) => event.liked_by_me).map((event) => event.id)))
    setSavedIds(loadSavedIds(events))
  }, [events])

  useEffect(() => {
    if (!shareMsg) return
    const timer = window.setTimeout(() => setShareMsg(''), 1800)
    return () => window.clearTimeout(timer)
  }, [shareMsg])

  const isSaved = useCallback((event: EventListing) => savedIds.has(event.id), [savedIds])

  const isLiked = useCallback((event: EventListing) => likedIds.has(event.id), [likedIds])

  const likeCount = useCallback(
    (event: EventListing) => {
      const initiallyLiked = !!event.liked_by_me
      const nowLiked = likedIds.has(event.id)
      let count = event.likes_count ?? 0
      if (initiallyLiked && !nowLiked) count -= 1
      if (!initiallyLiked && nowLiked) count += 1
      return Math.max(0, count)
    },
    [likedIds],
  )

  const toggleLike = useCallback((event: EventListing, clickEvent: MouseEvent) => {
    clickEvent.preventDefault()
    clickEvent.stopPropagation()
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (next.has(event.id)) next.delete(event.id)
      else next.add(event.id)
      return next
    })
  }, [])

  const toggleSave = useCallback((event: EventListing, clickEvent: MouseEvent) => {
    clickEvent.preventDefault()
    clickEvent.stopPropagation()
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (next.has(event.id)) next.delete(event.id)
      else next.add(event.id)
      persistSavedIds(next)
      return next
    })
  }, [])

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

  return {
    shareMsg,
    isSaved,
    isLiked,
    likeCount,
    toggleLike,
    toggleSave,
    shareEvent,
  }
}
