import { normalizeTag } from './hashtags'

export function communityTagPath(slug: string): string {
  const normalized = normalizeTag(slug)
  return `/community/tags/${encodeURIComponent(normalized)}`
}

/** Returns a tag slug when the query is a single hashtag like `#food`. */
export function parseTagFromSearch(query: string): string | null {
  const trimmed = query.trim()
  if (!trimmed.startsWith('#')) return null
  const slug = normalizeTag(trimmed.slice(1))
  return slug || null
}
