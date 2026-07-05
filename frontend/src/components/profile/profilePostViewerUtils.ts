import type { FeedPost } from '../IgPostCard'

/** Posts that have a photo or video — used for profile media viewer navigation. */
export function filterProfileMediaPosts(posts: FeedPost[]): FeedPost[] {
  return posts.filter((p) => Boolean(p.image || p.video) && !p.is_delvers_highlight)
}

export function formatEngagementCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

export function profilePostPreview(body: string): string {
  const t = body.trim()
  if (!t) return 'Travel moment'
  return t.length > 120 ? `${t.slice(0, 120)}…` : t
}
