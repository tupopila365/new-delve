import { apiFetch } from './client'

export type TagSummary = {
  slug: string
  use_count: number
}

export type TagDetail = TagSummary & {
  post_count: number
  last_used_at: string | null
}

export function fetchTagSuggest(q: string, scope = 'community', limit = 8) {
  const params = new URLSearchParams({ scope, limit: String(limit) })
  if (q) params.set('q', q)
  return apiFetch<TagSummary[]>(`/api/tags/suggest/?${params}`, { auth: false })
}

export function fetchTagTrending(scope = 'community', limit = 10) {
  const params = new URLSearchParams({ scope, limit: String(limit) })
  return apiFetch<TagSummary[]>(`/api/tags/trending/?${params}`, { auth: false })
}

export function fetchTagDetail(slug: string, scope = 'community') {
  const params = new URLSearchParams({ scope })
  return apiFetch<TagDetail>(`/api/tags/${encodeURIComponent(slug)}/?${params}`, { auth: false })
}
