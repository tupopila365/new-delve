import { useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import { homeCoverSrc } from '../data/homeDefaults'
import {
  FOR_YOU_DEEP_CHANGED_EVENT,
  readRecentSessionViews,
  readTopDeepItemsPersonal,
} from '../lib/forYouDeep'
import type { ForYouVertical } from '../lib/forYou'

export type MyDelveCard = {
  key: string
  to: string
  imageSrc: string
  imageAlt: string
  title: string
  meta: string
  rating?: { avg: string | number; count: number }
}

type StayPoolItem = {
  id: number
  title: string
  region: string
  city?: string | null
  cover_image: string | null
  rating_avg?: string | number
  rating_count?: number
  price_per_night?: string
}

type FoodPoolItem = {
  id: number
  name: string
  cuisine: string
  region: string
  city?: string | null
  cover_image: string | null
  rating_avg?: string | number
  rating_count?: number
}

type GuidePoolItem = {
  id: number
  headline: string
  username: string
  photo: string | null
  rating_avg?: string | number
  rating_count?: number
  hourly_rate?: string | null
}

type SavedStay = StayPoolItem
type SavedFood = FoodPoolItem
type SavedGuide = GuidePoolItem

function stayCard(s: StayPoolItem): MyDelveCard {
  const place = `${s.city ? `${s.city}, ` : ''}${s.region}`
  return {
    key: `stays:${s.id}`,
    to: `/accommodation/${s.id}`,
    imageSrc: homeCoverSrc(s.cover_image, 'stay'),
    imageAlt: `${s.title}, ${place}`,
    title: s.title,
    meta: place,
    rating:
      s.rating_avg != null && s.rating_count != null
        ? { avg: s.rating_avg, count: s.rating_count }
        : undefined,
  }
}

function foodCard(f: FoodPoolItem): MyDelveCard {
  return {
    key: `food:${f.id}`,
    to: `/food/${f.id}`,
    imageSrc: homeCoverSrc(f.cover_image, 'food'),
    imageAlt: `${f.name} — ${f.cuisine}, ${f.region}`,
    title: f.name,
    meta: `${f.cuisine} · ${f.region}`,
    rating:
      f.rating_avg != null && f.rating_count != null
        ? { avg: f.rating_avg, count: f.rating_count }
        : undefined,
  }
}

function guideCard(g: GuidePoolItem): MyDelveCard {
  return {
    key: `guides:${g.id}`,
    to: `/guides/${g.id}`,
    imageSrc: homeCoverSrc(g.photo, 'guide'),
    imageAlt: `${g.headline} — guide @${g.username}`,
    title: g.headline,
    meta: `@${g.username}${g.hourly_rate ? ` · from ${g.hourly_rate}/hr` : ''}`,
    rating:
      g.rating_avg != null && g.rating_count != null
        ? { avg: g.rating_avg, count: g.rating_count }
        : undefined,
  }
}

function resolveFromPools(
  vertical: ForYouVertical,
  id: string,
  stays: StayPoolItem[],
  food: FoodPoolItem[],
  guides: GuidePoolItem[],
): MyDelveCard | null {
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  if (vertical === 'stays') {
    const hit = stays.find((s) => s.id === n)
    return hit ? stayCard(hit) : null
  }
  if (vertical === 'food') {
    const hit = food.find((f) => f.id === n)
    return hit ? foodCard(hit) : null
  }
  if (vertical === 'guides') {
    const hit = guides.find((g) => g.id === n)
    return hit ? guideCard(hit) : null
  }
  return null
}

/**
 * My Delve Home personal rails — Continue browsing, Saved, Liked (Sprint 3 / Phase 5).
 * Only meaningful when Explore mode is OFF.
 */
export function useMyDelveHome(opts: {
  enabled: boolean
  loggedIn: boolean
  stayPool: StayPoolItem[]
  foodPool: FoodPoolItem[]
  guidePool?: GuidePoolItem[]
}) {
  const { enabled, loggedIn, stayPool, foodPool, guidePool = [] } = opts
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const sync = () => setTick((n) => n + 1)
    window.addEventListener(FOR_YOU_DEEP_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FOR_YOU_DEEP_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [enabled])

  const sessionViews = useMemo(() => {
    void tick
    if (!enabled) return []
    return readRecentSessionViews(8)
  }, [enabled, tick])

  const likedRefs = useMemo(() => {
    void tick
    if (!enabled) return []
    return readTopDeepItemsPersonal(10, 3).filter(
      (r) => r.vertical === 'stays' || r.vertical === 'food' || r.vertical === 'guides',
    )
  }, [enabled, tick])

  const missingSessionFetches = useMemo(() => {
    if (!enabled) return [] as Array<{ vertical: ForYouVertical; id: string }>
    const out: Array<{ vertical: ForYouVertical; id: string }> = []
    for (const v of sessionViews) {
      if (v.vertical !== 'stays' && v.vertical !== 'food') continue
      if (resolveFromPools(v.vertical, v.id, stayPool, foodPool, guidePool)) continue
      out.push({ vertical: v.vertical, id: v.id })
    }
    return out.slice(0, 6)
  }, [enabled, sessionViews, stayPool, foodPool, guidePool])

  const detailQueries = useQueries({
    queries: missingSessionFetches.map((row) => ({
      queryKey: ['my-delve-detail', row.vertical, row.id],
      enabled: enabled && Boolean(row.id),
      staleTime: 60_000,
      queryFn: async (): Promise<MyDelveCard | null> => {
        try {
          if (row.vertical === 'stays') {
            const s = await apiFetch<StayPoolItem>(`/api/accommodation/listings/${row.id}/`, {
              auth: false,
            })
            return stayCard(s)
          }
          if (row.vertical === 'food') {
            const f = await apiFetch<FoodPoolItem>(`/api/food/venues/${row.id}/`, { auth: false })
            return foodCard(f)
          }
        } catch {
          return null
        }
        return null
      },
    })),
  })

  const fetchedByKey = useMemo(() => {
    const map = new Map<string, MyDelveCard>()
    missingSessionFetches.forEach((row, i) => {
      const card = detailQueries[i]?.data
      if (card) map.set(`${row.vertical}:${row.id}`, card)
    })
    return map
  }, [missingSessionFetches, detailQueries])

  const continueBrowsing = useMemo(() => {
    if (!enabled) return [] as MyDelveCard[]
    const cards: MyDelveCard[] = []
    const seen = new Set<string>()
    for (const v of sessionViews) {
      if (v.vertical !== 'stays' && v.vertical !== 'food' && v.vertical !== 'guides') continue
      const fromPool = resolveFromPools(v.vertical, v.id, stayPool, foodPool, guidePool)
      const card = fromPool || fetchedByKey.get(`${v.vertical}:${v.id}`) || null
      if (!card || seen.has(card.key)) continue
      seen.add(card.key)
      cards.push(card)
      if (cards.length >= 8) break
    }
    return cards
  }, [enabled, sessionViews, stayPool, foodPool, guidePool, fetchedByKey])

  const { data: savedStays = [], isLoading: loadingSavedStays } = useQuery({
    queryKey: ['home-my-delve-saved-stays'],
    enabled: enabled && loggedIn,
    staleTime: 45_000,
    queryFn: async () => {
      try {
        return asArray<SavedStay>(await apiFetch('/api/accommodation/listings/saved/', { auth: true }))
      } catch {
        return []
      }
    },
  })

  const { data: savedFood = [], isLoading: loadingSavedFood } = useQuery({
    queryKey: ['home-my-delve-saved-food'],
    enabled: enabled && loggedIn,
    staleTime: 45_000,
    queryFn: async () => {
      try {
        return asArray<SavedFood>(await apiFetch('/api/food/venues/saved/', { auth: true }))
      } catch {
        return []
      }
    },
  })

  const { data: savedGuides = [], isLoading: loadingSavedGuides } = useQuery({
    queryKey: ['home-my-delve-saved-guides'],
    enabled: enabled && loggedIn,
    staleTime: 45_000,
    queryFn: async () => {
      try {
        return asArray<SavedGuide>(await apiFetch('/api/guides/profiles/saved/', { auth: true }))
      } catch {
        return []
      }
    },
  })

  const savedCards = useMemo(() => {
    if (!enabled || !loggedIn) return [] as MyDelveCard[]
    const cards: MyDelveCard[] = []
    for (const s of savedStays.slice(0, 6)) cards.push(stayCard(s))
    for (const f of savedFood.slice(0, 6)) cards.push(foodCard(f))
    for (const g of savedGuides.slice(0, 4)) cards.push(guideCard(g))
    return cards.slice(0, 12)
  }, [enabled, loggedIn, savedStays, savedFood, savedGuides])

  const likedCards = useMemo(() => {
    if (!enabled) return [] as MyDelveCard[]
    const cards: MyDelveCard[] = []
    const savedKeys = new Set(savedCards.map((c) => c.key))
    for (const ref of likedRefs) {
      const card = resolveFromPools(ref.vertical, ref.id, stayPool, foodPool, guidePool)
      if (!card || savedKeys.has(card.key)) continue
      if (cards.some((c) => c.key === card.key)) continue
      cards.push(card)
      if (cards.length >= 8) break
    }
    return cards
  }, [enabled, likedRefs, stayPool, foodPool, guidePool, savedCards])

  const loadingContinue = detailQueries.some((q) => q.isLoading)
  const loadingSaved = loggedIn && (loadingSavedStays || loadingSavedFood || loadingSavedGuides)

  return {
    continueBrowsing,
    savedCards,
    likedCards,
    loadingContinue,
    loadingSaved,
    hasPersonalRails:
      continueBrowsing.length > 0 || savedCards.length > 0 || likedCards.length > 0,
  }
}
