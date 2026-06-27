import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray, mediaUrl } from '../api/client'
import { buildHostAccommodationSlides, type HostStoryPost } from '../data/hostAccommodationStories'
import { ProviderStoriesRow, type ProviderStoryItem } from './ProviderStoriesRow'

function hostLabel(displayName: string, username: string) {
  const d = displayName.trim()
  if (!d || d.toLowerCase() === username.toLowerCase()) return `@${username}`
  return d
}

/** Host stories on the stays page — live feed from accommodation story posts. */
export function HostStoriesRow() {
  const { data: storyPosts = [] } = useQuery({
    queryKey: ['accommodation-stories'],
    queryFn: async () => {
      const rows = await apiFetch<HostStoryPost[]>('/api/social/accommodation-stories/', { auth: false })
      return asArray<HostStoryPost>(rows)
    },
  })

  const items = useMemo((): ProviderStoryItem[] => {
    const map = new Map<string, HostStoryPost[]>()
    for (const p of storyPosts) {
      const u = p.author.username
      if (!map.has(u)) map.set(u, [])
      map.get(u)!.push(p)
    }

    const rows: (ProviderStoryItem & { latest: number })[] = []
    for (const [, userPosts] of map) {
      const slides = buildHostAccommodationSlides(userPosts)
      if (slides.length === 0) continue
      const first = userPosts[0]
      const username = first.author.username
      const displayName = first.author.display_name || username
      const latest = Math.max(...userPosts.map((x) => new Date(x.created_at || 0).getTime()))
      rows.push({
        id: username,
        label: hostLabel(displayName, username),
        channelLabel: `@${username}`,
        explorePath: `/u/${encodeURIComponent(username)}`,
        coverSrc: first.author.avatar ? mediaUrl(first.author.avatar) || null : null,
        fallbackInitial: displayName,
        slides,
        latest,
      })
    }

    rows.sort((a, b) => b.latest - a.latest)
    return rows.slice(0, 12).map(({ latest: _latest, ...item }) => item)
  }, [storyPosts])

  if (items.length === 0) return null

  return (
    <ProviderStoriesRow
      items={items}
      ariaLabel="Host stories"
      ctaLabel="View host"
    />
  )
}
